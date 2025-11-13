// ...existing code...
import { Injectable, Logger } from "@nestjs/common";
import { AzureOpenAIAdapter } from "./azure-openai-adapter.service";
import { ToolRegistryService } from "./tool-registry.service";
import { AgentMemoryService } from "./agent-memory.service";
import { LangChainAgentService } from "./langchain-agent.service";
import { RagService } from "./rag.service";
import { LangGraphWorkflowService } from "./langgraph-workflow.service";
import { TracingService } from "./tracing.service";
import { TokenUsageService } from "./token-usage.service";
import { ContentSafetyService } from "./content-safety.service";
import { DEFAULT_AGENT_MODEL } from "../../shared/agent-models.constants";
import {
  AgentExecutionResult,
  AgentExecutionOptions,
} from "../../shared/agent.interface";

/**
 * AgentOrchestratorService
 * Orchestrates agentic workflows using LangChain agents and LangGraph workflows with Azure OpenAI
 * Following Single Responsibility Principle: Only manages agent execution and orchestration
 */
@Injectable()
export class AgentOrchestratorService {
  /**
   * Thin wrapper for agentic task execution from DTO
   */
  async executeAgenticTask(
    dto: import("../dto/agentic-task.dto").AgenticTaskDto,
  ): Promise<any> {
    const sessionId = dto.sessionId ?? `session-${Math.random().toString(36).substring(2, 10)}`;
    return await this.executeTask(dto.prompt, sessionId, {
      model: dto.model,
      temperature: dto.temperature,
      maxIterations: dto.maxIterations,
      enabledToolCategories: dto.enabledToolCategories,
      specificTools: dto.specificTools,
      useGraph: dto.useGraph,
      enableRAG: dto.enableRAG,
    });
  }
  private readonly logger = new Logger(AgentOrchestratorService.name);

  constructor(
    private readonly azureAdapter: AzureOpenAIAdapter,
    private readonly toolRegistry: ToolRegistryService,
    private readonly memoryService: AgentMemoryService,
    private readonly langChainAgent: LangChainAgentService,
    private readonly ragService: RagService,
    private readonly langGraphWorkflow: LangGraphWorkflowService,
    private readonly tracing: TracingService,
    private readonly tokenUsage: TokenUsageService,
    private readonly contentSafety: ContentSafetyService,
  ) { }

  /**
   * Execute an agentic task with autonomous tool use and planning
   * Uses LangChain AgentExecutor or LangGraph workflow based on options
   */
  async executeTask(
    prompt: string,
    sessionId: string,
    options: AgentExecutionOptions = {},
  ): Promise<AgentExecutionResult> {
    // Start distributed trace
    const traceId = this.tracing.startTrace("agent_execution", {
      sessionId,
      model: options.model || DEFAULT_AGENT_MODEL,
      useGraph: options.useGraph || false,
      enableRAG: options.enableRAG !== false,
    });

    this.logger.log(
      `Executing agentic task for session ${sessionId}: ${prompt.substring(0, 100)}... [trace: ${traceId}]`,
    );

    try {
      const startTime = Date.now();

      // 1. Content Safety: Validate input prompt
      if (this.contentSafety.isEnabled()) {
        const safetyResult = await this.contentSafety.validatePrompt(prompt);
        if (!safetyResult.safe) {
          const violations = safetyResult.violations
            .map((v) => `${v.category}(${v.severity}/${v.threshold})`)
            .join(", ");
          this.logger.warn(
            `Content safety violation in prompt for session ${sessionId}: ${violations}`,
          );
          this.tracing.endTrace(traceId, {
            status: "failed",
            reason: "content_safety_violation",
            violations,
          });
          throw new Error(
            `Content policy violation detected: ${violations}. Please modify your request.`,
          );
        }
        this.logger.debug(
          `Prompt passed content safety check (${safetyResult.analysisTime}ms)`,
        );
      }

      // 2. Get LLM
      const llm = this.azureAdapter.getLLM(
        options.model,
        options.temperature || 0.7,
      );

      // 2. Get tools for execution
      const tools = this.getToolsForExecution(options);
      this.logger.debug(
        `Using ${tools.length} tools: ${tools.map((t) => t.name).join(", ")}`,
      );

      // 3. Get conversation history
      const conversationHistory = this.memoryService.getRecentHistory(
        sessionId,
        10,
      );

      // 4. Optional: Enhance with RAG context
      let ragContext: string | null = null;
      if (options.enableRAG !== false) {
        // Enable by default unless explicitly disabled
        ragContext = await this.getRAGContext(prompt);
      }

      // 5. Execute using LangGraph workflow or LangChain agent
      let result: AgentExecutionResult;

      if (options.useGraph) {
        this.logger.debug("Using LangGraph workflow for execution");
        const workflowResult = await this.langGraphWorkflow.executeWorkflow(
          prompt,
          llm,
          tools,
          conversationHistory,
          options.maxIterations || 10,
          ragContext || undefined,
        );

        result = {
          output: workflowResult.output,
          intermediateSteps: [workflowResult.intermediateSteps],
          toolsUsed: workflowResult.toolsUsed,
          model: options.model || DEFAULT_AGENT_MODEL,
          sessionId,
        };
      } else {
        this.logger.debug("Using LangChain AgentExecutor for execution");
        let enhancedPrompt = prompt;
        if (ragContext) {
          enhancedPrompt = `Context from knowledge base:\n${ragContext}\n\nUser question: ${prompt}`;
        }

        result = await this.langChainAgent.execute(
          enhancedPrompt,
          llm,
          tools,
          conversationHistory,
          options.maxIterations || 10,
          sessionId,
        );
      }

      const executionTime = Date.now() - startTime;

      this.logger.log(
        `Agent execution completed in ${executionTime}ms for session ${sessionId}`,
      );

      // 6. Content Safety: Validate output response
      if (this.contentSafety.isEnabled()) {
        const safetyResult = await this.contentSafety.validateResponse(
          result.output
        );
        if (!safetyResult.safe) {
          const violations = safetyResult.violations
            .map((v) => `${v.category}(${v.severity}/${v.threshold})`)
            .join(", ");
          this.logger.warn(
            `Content safety violation in response for session ${sessionId}: ${violations}`,
          );
          this.tracing.endTrace(traceId, {
            status: "failed",
            reason: "content_safety_violation_output",
            violations,
          });
          // Return sanitized response
          result.output =
            "I'm sorry, but I cannot provide that response as it violates content safety policies. Please rephrase your request.";
        } else {
          this.logger.debug(
            `Response passed content safety check (${safetyResult.analysisTime}ms)`,
          );
        }
      }

      // End trace with success metrics
      this.tracing.endTrace(traceId, {
        success: true,
        executionTimeMs: executionTime,
        toolsUsed: result.toolsUsed,
        outputLength: result.output.length,
      });

      // 7. Update memory
      this.memoryService.addMessage(sessionId, "human", prompt);
      this.memoryService.addMessage(sessionId, "ai", result.output);
      this.memoryService.updateContext(sessionId, {
        lastExecutionTime: executionTime,
        lastToolsUsed: result.toolsUsed,
        lastModel: options.model || DEFAULT_AGENT_MODEL,
      });

      return result;
    } catch (error: any) {
      // End trace with error
      this.tracing.endTrace(traceId, {
        success: false,
        error: error.message,
      });

      this.logger.error(
        `Agent execution failed for session ${sessionId}: ${error.message}`,
      );
      this.logger.error(error.stack);
      throw new Error(`Agent execution failed: ${error.message}`);
    }
  }

  /**
   * Execute an agentic task with streaming support
   * Yields chunks of agent execution progress and LLM tokens in real-time
   */
  async *executeTaskStream(
    prompt: string,
    sessionId: string,
    options: AgentExecutionOptions = {},
  ): AsyncGenerator<any, void, unknown> {
    if (!prompt || typeof prompt !== "string") {
      this.logger.error(
        `Streaming agentic task failed: prompt is missing or not a string.`,
      );
      throw new Error("Missing required parameter: prompt");
    }
    this.logger.log(
      `Streaming agentic task for session ${sessionId}: ${prompt.substring(0, 100)}...`,
    );

    try {
      const startTime = Date.now();

      // 1. Get LLM
      const llm = this.azureAdapter.getLLM(
        options.model,
        options.temperature || 0.7,
      );

      // 2. Get tools for execution
      const tools = this.getToolsForExecution(options);

      // 3. Get conversation history
      const conversationHistory = this.memoryService.getRecentHistory(
        sessionId,
        10,
      );

      // 4. Optional: Enhance with RAG context
      let ragContext: string | null = null;
      if (options.enableRAG !== false) {
        ragContext = await this.getRAGContext(prompt);
        if (ragContext) {
          yield {
            type: "context",
            data: { context: ragContext },
          };
        }
      }

      // 5. Stream agent execution using LangChain agent
      let enhancedPrompt = prompt;
      if (ragContext) {
        enhancedPrompt = `Context from knowledge base:\n${ragContext}\n\nUser question: ${prompt}`;
      }

      // Stream from LangChain agent with cancellation support
      yield* this.langChainAgent.executeStream(
        enhancedPrompt,
        llm,
        tools,
        conversationHistory,
        options.maxIterations || 10,
        sessionId,
        options.signal,
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Agent streaming completed in ${executionTime}ms for session ${sessionId}`,
      );

      // 6. Update memory (final output will be sent by agent service)
      this.memoryService.addMessage(sessionId, "human", prompt);
      this.memoryService.updateContext(sessionId, {
        lastExecutionTime: executionTime,
        lastModel: options.model || DEFAULT_AGENT_MODEL,
      });
    } catch (error: any) {
      this.logger.error(
        `Agent streaming failed for session ${sessionId}: ${error.message}`,
      );
      yield {
        type: "error",
        data: { error: error.message },
      };
    }
  }

  /**
   * Execute a simple query without full agent orchestration (direct LLM call)
   */
  async executeSimpleQuery(
    prompt: string,
    sessionId: string,
    options: AgentExecutionOptions = {},
  ): Promise<AgentExecutionResult> {
    this.logger.log(
      `Executing simple query for session ${sessionId}: ${prompt.substring(0, 100)}...`,
    );

    try {
      const llm = this.azureAdapter.getLLM(
        options.model,
        options.temperature || 0.7,
      );

      // Get conversation history
      const history = this.memoryService.getRecentHistory(sessionId, 5);

      // Simple prompt with history
      const messages = [
        ...history,
        {
          role: "user",
          content: prompt,
        },
      ];

      const result = await llm.invoke(messages as any);

      // Update memory
      this.memoryService.addMessage(sessionId, "human", prompt);
      this.memoryService.addMessage(sessionId, "ai", result.content as string);

      return {
        output: result.content as string,
        toolsUsed: [],
        model: options.model || DEFAULT_AGENT_MODEL,
        sessionId,
      };
    } catch (error: any) {
      this.logger.error(
        `Simple query execution failed for session ${sessionId}: ${error.message}`,
      );
      throw new Error(`Query execution failed: ${error.message}`);
    }
  }

  /**
   * Get tools for execution based on options
   */
  private getToolsForExecution(options: AgentExecutionOptions): any[] {
    if (options.specificTools && options.specificTools.length > 0) {
      // Use specific tools
      return options.specificTools
        .map((name) => this.toolRegistry.getTool(name))
        .filter((tool) => tool !== undefined);
    } else if (
      options.enabledToolCategories &&
      options.enabledToolCategories.length > 0
    ) {
      // Use tools from specific categories
      const tools: any[] = [];
      for (const category of options.enabledToolCategories) {
        tools.push(...this.toolRegistry.getToolsByCategory(category));
      }
      return tools;
    } else {
      // Use all enabled tools
      return this.toolRegistry.getAllTools();
    }
  }

  /**
   * Extract tool names from intermediate steps
   */
  private extractToolsUsed(intermediateSteps: any[]): string[] {
    const toolNames = new Set<string>();

    for (const step of intermediateSteps) {
      if (step && step.action && step.action.tool) {
        toolNames.add(step.action.tool);
      }
    }

    return Array.from(toolNames);
  }

  /**
   * Get available models
   */
  getAvailableModels(): string[] {
    return this.azureAdapter.getAvailableModels();
  }

  /**
   * Get available tool categories
   */
  getAvailableToolCategories(): string[] {
    const metadata = this.toolRegistry.getAllToolMetadata();
    const categories = new Set<string>();

    for (const meta of metadata) {
      if (meta.category) {
        categories.add(meta.category);
      }
    }

    return Array.from(categories);
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): any {
    const context = this.memoryService.getContext(sessionId);
    const history = this.memoryService.getConversationHistory(sessionId);

    return {
      sessionId,
      messageCount: history.length,
      lastExecutionTime: context.lastExecutionTime || 0,
      lastToolsUsed: context.lastToolsUsed || [],
      lastModel: context.lastModel || "unknown",
    };
  }

  /**
   * Get RAG context for a query
   * Performs similarity search and returns relevant context
   */
  private async getRAGContext(
    query: string,
    topK: number = 3,
  ): Promise<string | null> {
    try {
      const stats = this.ragService.getStats();
      if (stats.totalDocuments === 0) {
        this.logger.debug(
          "No documents in RAG store, skipping RAG enhancement",
        );
        return null;
      }

      const results = await this.ragService.similaritySearch(query, topK);

      if (results.length === 0) {
        return null;
      }

      // Format context from retrieved documents
      const context = results
        .map((doc, i) => `[${i + 1}] ${doc.pageContent}`)
        .join("\n\n");

      this.logger.debug(
        `Retrieved ${results.length} relevant documents for RAG context`,
      );
      return context;
    } catch (error: any) {
      this.logger.error(`Failed to get RAG context: ${error.message}`);
      return null;
    }
  }
}
