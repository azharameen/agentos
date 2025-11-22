import { Injectable, Logger } from "@nestjs/common";
import { LangChainAgentService } from "./langchain-agent.service";
import { LangGraphWorkflowService } from "../workflow/langgraph-workflow.service";
import { ToolRegistryService } from "./tool-registry.service";
import { AzureOpenAIAdapter } from "../shared/azure-openai-adapter.service";
import { DEFAULT_AGENT_MODEL } from "../../shared/agent-models.constants";

/**
 * Agent Execution Service
 *
 * Handles the core agent execution logic:
 * - LangChain agent execution
 * - LangGraph workflow execution
 * - Tool invocation and orchestration
 * - Response generation
 *
 * Extracted from AgentOrchestratorService for better separation of concerns
 */
@Injectable()
export class AgentExecutionService {
  private readonly logger = new Logger(AgentExecutionService.name);

  constructor(
    private readonly langChainAgent: LangChainAgentService,
    private readonly langGraphWorkflow: LangGraphWorkflowService,
    private readonly toolRegistry: ToolRegistryService,
    private readonly azureAdapter: AzureOpenAIAdapter,
  ) { }

  /**
   * Execute task using LangChain agent
   */
  async executeLangChainAgent(
    prompt: string,
    sessionId: string,
    conversationHistory: any[],
    options: {
      model?: string;
      agent?: string;
      temperature?: number;
      maxIterations?: number;
      enabledToolCategories?: string[];
      specificTools?: string[];
    },
  ): Promise<{
    output: string;
    intermediateSteps: any[];
    toolsUsed: string[];
  }> {
    try {
      const model = options.model || DEFAULT_AGENT_MODEL;
      const temperature = options.temperature ?? 0.7;

      this.logger.debug(`Executing LangChain agent with model ${model}`);

      const llm = this.azureAdapter.getLLM(model, temperature);

      const tools = this.toolRegistry.getToolsForExecution(
        options.enabledToolCategories || ["all"],
        options.specificTools || [],
      );

      const result = await this.langChainAgent.execute(
        prompt,
        llm,
        tools,
        conversationHistory,
        options.maxIterations || 10,
        sessionId,
      );

      return {
        output: result.output,
        intermediateSteps: result.intermediateSteps || [],
        toolsUsed: result.toolsUsed || [],
      };
    } catch (error: any) {
      this.logger.error(`LangChain agent execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute task using LangGraph workflow
   */
  async executeLangGraphWorkflow(
    prompt: string,
    sessionId: string,
    conversationHistory: any[],
    options: {
      model?: string;
      agent?: string;
      temperature?: number;
      workflowVersion?: string;
    },
  ): Promise<{
    output: string;
    intermediateSteps: any[];
    toolsUsed: string[];
  }> {
    try {
      const model = options.model || DEFAULT_AGENT_MODEL;

      this.logger.debug(`Executing LangGraph workflow with model ${model}`);

      const llm = this.azureAdapter.getLLM(model, options.temperature ?? 0.7);

      const result = await this.langGraphWorkflow.executeWorkflow(
        prompt,
        llm,
        [],
        conversationHistory,
        10,
        undefined,
      );

      return {
        output: result.output || "",
        intermediateSteps: result.intermediateSteps || [],
        toolsUsed: result.toolsUsed || [],
      };
    } catch (error: any) {
      this.logger.error(
        `LangGraph workflow execution failed: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Execute agent (chooses between LangChain and LangGraph)
   */
  async executeAgent(
    prompt: string,
    sessionId: string,
    conversationHistory: any[],
    options: {
      useGraph?: boolean;
      model?: string;
      agent?: string;
      temperature?: number;
      maxIterations?: number;
      enabledToolCategories?: string[];
      specificTools?: string[];
      workflowVersion?: string;
    },
  ): Promise<{
    output: string;
    intermediateSteps: any[];
    toolsUsed: string[];
    executionMethod: "langchain" | "langgraph";
  }> {
    const useGraph = options.useGraph || false;

    if (useGraph) {
      const result = await this.executeLangGraphWorkflow(
        prompt,
        sessionId,
        conversationHistory,
        options,
      );
      return {
        ...result,
        executionMethod: "langgraph",
      };
    } else {
      const result = await this.executeLangChainAgent(
        prompt,
        sessionId,
        conversationHistory,
        options,
      );
      return {
        ...result,
        executionMethod: "langchain",
      };
    }
  }

  /**
   * Execute agent with streaming (chooses between LangChain and LangGraph)
   * Yields fine-grained events: TEXT_MESSAGE_CONTENT, TOOL_CALL_START, TOOL_COMPLETE
   */
  async *executeAgentStream(
    prompt: string,
    sessionId: string,
    conversationHistory: any[],
    options: {
      useGraph?: boolean;
      model?: string;
      agent?: string;
      temperature?: number;
      maxIterations?: number;
      enabledToolCategories?: string[];
      specificTools?: string[];
      workflowVersion?: string;
    },
    signal?: AbortSignal,
  ): AsyncGenerator<any, void, unknown> {
    const useGraph = options.useGraph || false;
    const model = options.model || DEFAULT_AGENT_MODEL;
    const temperature = options.temperature ?? 0.7;

    this.logger.debug(`Streaming agent execution (useGraph: ${useGraph})`);

    const llm = this.azureAdapter.getLLM(model, temperature);

    if (useGraph) {
      // Fetch tools for LangGraph execution
      const tools = this.toolRegistry.getToolsForExecution(
        options.enabledToolCategories || ["all"],
        options.specificTools || [],
      );

      const stream = this.langGraphWorkflow.executeWorkflowStream(
        prompt,
        llm,
        tools,
        conversationHistory,
        options.maxIterations || 10,
        undefined, // ragContext - handled in coordination service
        signal,
      );

      for await (const event of stream) {
        yield event;
      }

      // Note: RUN_FINISHED is handled by the coordination service based on the final output
      // But if the graph yields it, we can forward it.
      // The coordination service expects text content and tool events.
    } else {
      // Use LangChain streaming
      const tools = this.toolRegistry.getToolsForExecution(
        options.enabledToolCategories || ["all"],
        options.specificTools || [],
      );

      const stream = this.langChainAgent.executeStream(
        prompt,
        llm,
        tools,
        conversationHistory,
        options.maxIterations || 10,
        sessionId,
        signal,
      );

      for await (const event of stream) {
        yield event;
      }
    }
  }
}
