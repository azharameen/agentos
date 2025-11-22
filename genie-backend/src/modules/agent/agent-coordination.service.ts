import { Injectable, Logger } from "@nestjs/common";
import { AgentPlanningService } from "./agent-planning.service";
import { AgentExecutionService } from "./agent-execution.service";
import { AgentMonitoringService } from "../shared/agent-monitoring.service";
import {
  AgentExecutionResult,
  AgentExecutionOptions,
} from "../../shared/agent.interface";
import {
  RunStartedEvent,
  ContextEvent,
  RunErrorEvent,
  RunFinishedEvent,
} from "../../shared/agent-events.interface";

/**
 * Agent Coordination Service
 *
 * Coordinates the entire agent execution pipeline:
 * - Planning → Execution → Monitoring
 * - Event streaming support
 * - Error handling and recovery
 * - Result aggregation
 *
 * This is the main orchestration service that ties together the refactored components.
 * Replaces the monolithic AgentOrchestratorService with a coordinated approach.
 */
@Injectable()
export class AgentCoordinationService {
  private readonly logger = new Logger(AgentCoordinationService.name);

  constructor(
    private readonly planning: AgentPlanningService,
    private readonly execution: AgentExecutionService,
    private readonly monitoring: AgentMonitoringService,
  ) { }

  /**
   * Execute agentic task with full pipeline coordination
   */
  async executeTask(
    prompt: string,
    sessionId: string,
    options: AgentExecutionOptions = {},
    eventCallback?: (event: any) => void,
  ): Promise<AgentExecutionResult> {
    const traceId = this.monitoring.startTrace(sessionId, {
      model: options.model,
      useGraph: options.useGraph,
      enableRAG: options.enableRAG,
    });

    this.logger.log(
      `Executing agentic task for session ${sessionId}: ${prompt.substring(0, 100)}... [trace: ${traceId}]`,
    );

    const startTime = Date.now();

    try {
      // === PHASE 1: PLANNING ===
      this.emitEvent(eventCallback, {
        type: "RUN_STARTED",
        data: {
          sessionId,
          prompt,
          model: options.model,
          timestamp: Date.now(),
        },
      } as RunStartedEvent);

      // 1. Content Safety
      const safetyResult = await this.planning.validatePrompt(
        prompt,
        sessionId,
      );

      if (!safetyResult.safe) {
        const violations = safetyResult.violations
          ?.map((v) => v.category)
          .join(", ");
        throw new Error(`Content safety violation: ${violations}`);
      }

      // 2. RAG Context
      const ragContext = await this.planning.gatherRAGContext(
        prompt,
        sessionId,
        options.enableRAG !== false,
      );

      if (ragContext) {
        this.emitEvent(eventCallback, {
          type: "CONTEXT",
          data: {
            context: ragContext,
            source: "RAG",
          },
        } as ContextEvent);
      }

      // 3. Memory Context
      const { conversationHistory, sessionContext } =
        await this.planning.loadMemoryContext(sessionId, 10);

      // 4. Prepare Enhanced Prompt
      const enhancedPrompt = this.planning.prepareEnhancedPrompt(
        prompt,
        ragContext,
        sessionContext,
      );

      // === PHASE 2: EXECUTION ===
      const executionResult = await this.execution.executeAgent(
        enhancedPrompt,
        sessionId,
        conversationHistory,
        {
          useGraph: options.useGraph,
          model: options.model,
          agent: options.agent,
          temperature: options.temperature,
          maxIterations: options.maxIterations,
          enabledToolCategories: options.enabledToolCategories,
          specificTools: options.specificTools,
          workflowVersion: options.workflowVersion,
        },
      );

      // === PHASE 3: MONITORING ===
      const executionTime = Date.now() - startTime;

      this.monitoring.trackMetrics(sessionId, {
        executionTime,
        toolsUsed: executionResult.toolsUsed,
        intermediateSteps: executionResult.intermediateSteps.length,
        executionMethod: executionResult.executionMethod,
        success: true,
      });

      // Persist conversation
      await this.monitoring.persistConversation(
        sessionId,
        prompt,
        executionResult.output,
      );

      // Track token usage (if available)
      // Note: Would need to extract from LLM response metadata
      // this.monitoring.trackTokenUsage(sessionId, options.model || "gpt-4", ...);

      this.monitoring.endTrace(traceId, {
        executionTime,
        toolsUsed: executionResult.toolsUsed.length,
        success: true,
      });

      this.emitEvent(eventCallback, {
        type: "RUN_FINISHED",
        data: {
          output: executionResult.output,
          toolsUsed: executionResult.toolsUsed,
          sessionId,
          executionTime,
        },
      } as RunFinishedEvent);

      return {
        output: executionResult.output,
        toolsUsed: executionResult.toolsUsed,
        intermediateSteps: executionResult.intermediateSteps,
        sessionId,
        executionTime,
        success: true,
        metadata: {
          model: options.model,
          executionMethod: executionResult.executionMethod,
          ragContextUsed: !!ragContext,
        },
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      this.monitoring.logError(sessionId, traceId, error, {
        prompt,
        options,
      });

      this.monitoring.endTrace(traceId, {
        error: error.message,
        executionTime,
        success: false,
      });

      this.emitEvent(eventCallback, {
        type: "RUN_ERROR",
        data: {
          error: error.message,
          sessionId,
        },
      } as RunErrorEvent);

      return {
        output: "",
        toolsUsed: [],
        intermediateSteps: [],
        sessionId,
        executionTime,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute task with streaming support
   * Yields events as they occur during execution
   */
  async *executeTaskStream(
    prompt: string,
    sessionId: string,
    options: AgentExecutionOptions = {},
    signal?: AbortSignal,
  ): AsyncGenerator<any, void, unknown> {
    if (!prompt || typeof prompt !== "string") {
      this.logger.error(
        "Streaming agentic task failed: prompt is missing or not a string.",
      );
      throw new Error("Missing required parameter: prompt");
    }

    const traceId = this.monitoring.startTrace(sessionId, {
      model: options.model,
      useGraph: options.useGraph,
      enableRAG: options.enableRAG,
    });

    const startTime = Date.now();

    try {
      // Yield RUN_STARTED event
      yield {
        type: "RUN_STARTED",
        data: {
          sessionId,
          prompt,
          model: options.model,
          timestamp: startTime,
        },
      } as RunStartedEvent;

      if (signal?.aborted) {
        throw new Error("Aborted");
      }

      // Planning phase
      const safetyResult = await this.planning.validatePrompt(
        prompt,
        sessionId,
      );

      if (!safetyResult.safe) {
        const violations = safetyResult.violations
          ?.map((v) => v.category)
          .join(", ");
        throw new Error(`Content safety violation: ${violations}`);
      }

      const ragContext = await this.planning.gatherRAGContext(
        prompt,
        sessionId,
        options.enableRAG !== false,
      );

      if (ragContext) {
        yield {
          type: "CONTEXT",
          data: {
            context: ragContext,
            source: "RAG",
          },
        } as ContextEvent;
      }

      const { conversationHistory, sessionContext } =
        await this.planning.loadMemoryContext(sessionId, 10);

      const enhancedPrompt = this.planning.prepareEnhancedPrompt(
        prompt,
        ragContext,
        sessionContext,
      );

      // Execution phase - use streaming execution service
      let finalOutput = "";
      const toolsUsedSet = new Set<string>();

      const executionStream = this.execution.executeAgentStream(
        enhancedPrompt,
        sessionId,
        conversationHistory,
        {
          useGraph: options.useGraph,
          model: options.model,
          agent: options.agent,
          temperature: options.temperature,
          maxIterations: options.maxIterations,
          enabledToolCategories: options.enabledToolCategories,
          specificTools: options.specificTools,
          workflowVersion: options.workflowVersion,
        },
        signal,
      );

      // Forward all events from execution stream
      for await (const event of executionStream) {
        if (signal?.aborted) break;

        // Track output and tools for monitoring
        if (event.type === "TEXT_MESSAGE_CONTENT") {
          finalOutput = event.data.content;
        } else if (event.type === "TOOL_CALL_START") {
          toolsUsedSet.add(event.data.tool);
        } else if (event.type === "RUN_FINISHED") {
          finalOutput = event.data.output;
          event.data.toolsUsed.forEach((tool: string) =>
            toolsUsedSet.add(tool),
          );
        }

        // Yield event to client
        yield event;
      }

      if (signal?.aborted) {
        yield {
          type: "RUN_CANCELLED",
          data: {
            message: "Run cancelled by user",
            sessionId,
          },
        };
        return;
      }

      // Monitoring phase
      const executionTime = Date.now() - startTime;
      const toolsUsed = Array.from(toolsUsedSet);

      this.monitoring.trackMetrics(sessionId, {
        executionTime,
        toolsUsed,
        intermediateSteps: 0, // Not tracked in streaming mode
        executionMethod: options.useGraph ? "langgraph" : "langchain",
        success: true,
      });

      await this.monitoring.persistConversation(sessionId, prompt, finalOutput);

      this.monitoring.endTrace(traceId, {
        executionTime,
        toolsUsed: toolsUsed.length,
        success: true,
      });
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      this.monitoring.logError(sessionId, traceId, error, {
        prompt,
        options,
      });

      this.monitoring.endTrace(traceId, {
        error: error.message,
        executionTime,
        success: false,
      });

      yield {
        type: "RUN_ERROR",
        data: {
          error: error.message,
          sessionId,
        },
      } as RunErrorEvent;
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): any {
    return this.monitoring.getSessionStats(sessionId);
  }

  /**
   * Emit event to callback if provided
   */
  private emitEvent(
    callback: ((event: any) => void) | undefined,
    event: any,
  ): void {
    if (callback) {
      try {
        callback(event);
      } catch (error: any) {
        this.logger.warn(`Failed to emit event: ${error.message}`);
      }
    }
  }
}
