import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { Serialized } from "@langchain/core/load/serializable";
import { AgentAction, AgentFinish } from "@langchain/core/agents";
import { ChainValues } from "@langchain/core/utils/types";

/**
 * Observability Service
 * Provides tracing, monitoring, and streaming capabilities for LangChain/LangGraph agents
 *
 * Features:
 * - LangSmith automatic tracing (via environment variables)
 * - Custom callback handlers for streaming
 * - Token usage tracking
 * - Performance metrics collection
 * - Error tracking and logging
 *
 * LangSmith Setup:
 * Set these environment variables to enable LangSmith tracing:
 * - LANGCHAIN_TRACING_V2=true
 * - LANGCHAIN_API_KEY=<your-langsmith-api-key>
 * - LANGCHAIN_PROJECT=<your-project-name> (optional, defaults to "default")
 * - LANGCHAIN_ENDPOINT=https://api.smith.langchain.com (optional)
 */
@Injectable()
export class ObservabilityService implements OnModuleInit {
  private readonly logger = new Logger(ObservabilityService.name);
  private tracingEnabled = false;
  private projectName = "default";

  onModuleInit() {
    this.initializeTracing();
  }

  /**
   * Initialize LangSmith tracing
   */
  private initializeTracing(): void {
    this.tracingEnabled = process.env.LANGCHAIN_TRACING_V2 === "true";
    this.projectName = process.env.LANGCHAIN_PROJECT || "default";

    if (this.tracingEnabled) {
      const apiKey = process.env.LANGCHAIN_API_KEY;
      if (!apiKey) {
        this.logger.warn(
          "LANGCHAIN_TRACING_V2 is enabled but LANGCHAIN_API_KEY is not set. Tracing will not work.",
        );
        this.tracingEnabled = false;
      } else {
        this.logger.log(
          `LangSmith tracing enabled for project: ${this.projectName}`,
        );
      }
    } else {
      this.logger.log(
        "LangSmith tracing is disabled. Set LANGCHAIN_TRACING_V2=true to enable.",
      );
    }
  }

  /**
   * Check if tracing is enabled
   */
  isTracingEnabled(): boolean {
    return this.tracingEnabled;
  }

  /**
   * Get current project name
   */
  getProjectName(): string {
    return this.projectName;
  }

  /**
   * Create a streaming callback handler for real-time token streaming
   */
  createStreamingHandler(
    onToken?: (token: string) => void,
    onComplete?: (response: string) => void,
    onError?: (error: Error) => void,
  ): BaseCallbackHandler {
    return new StreamingCallbackHandler(
      onToken,
      onComplete,
      onError,
      this.logger,
    );
  }

  /**
   * Create a metrics callback handler for performance tracking
   */
  createMetricsHandler(
    sessionId: string,
    onMetrics?: (metrics: AgentMetrics) => void,
  ): BaseCallbackHandler {
    return new MetricsCallbackHandler(sessionId, onMetrics, this.logger);
  }

  /**
   * Create a logging callback handler for detailed debugging
   */
  createLoggingHandler(verbose: boolean = false): BaseCallbackHandler {
    return new LoggingCallbackHandler(verbose, this.logger);
  }

  /**
   * Get configuration for LangChain/LangGraph with tracing metadata
   */
  getTracingConfig(metadata?: Record<string, any>) {
    if (!this.tracingEnabled) {
      return {};
    }

    return {
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        project: this.projectName,
      },
      tags: metadata?.tags || [],
    };
  }
}

/**
 * Streaming Callback Handler
 * Handles real-time token streaming from LLM responses
 */
class StreamingCallbackHandler extends BaseCallbackHandler {
  name = "StreamingCallbackHandler";
  private accumulatedTokens = "";

  constructor(
    private onToken?: (token: string) => void,
    private onComplete?: (response: string) => void,
    private onError?: (error: Error) => void,
    private logger?: Logger,
  ) {
    super();
  }

  async handleLLMNewToken(token: string): Promise<void> {
    this.accumulatedTokens += token;
    if (this.onToken) {
      this.onToken(token);
    }
  }

  async handleLLMEnd(): Promise<void> {
    if (this.onComplete) {
      this.onComplete(this.accumulatedTokens);
    }
    this.accumulatedTokens = "";
  }

  async handleLLMError(error: Error): Promise<void> {
    if (this.onError) {
      this.onError(error);
    }
    if (this.logger) {
      this.logger.error(`LLM Error: ${error.message}`);
    }
  }
}

/**
 * Metrics Callback Handler
 * Tracks performance metrics and token usage
 */
class MetricsCallbackHandler extends BaseCallbackHandler {
  name = "MetricsCallbackHandler";
  private metrics: AgentMetrics;
  private startTime: number = 0;

  constructor(
    private sessionId: string,
    private onMetrics?: (metrics: AgentMetrics) => void,
    private logger?: Logger,
  ) {
    super();
    this.metrics = {
      sessionId,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      llmCalls: 0,
      toolCalls: 0,
      totalDuration: 0,
      llmDuration: 0,
      toolDuration: 0,
      errors: 0,
    };
  }

  async handleChainStart(): Promise<void> {
    this.startTime = Date.now();
  }

  async handleChainEnd(): Promise<void> {
    this.metrics.totalDuration = Date.now() - this.startTime;
    if (this.onMetrics) {
      this.onMetrics(this.metrics);
    }
    if (this.logger) {
      this.logger.debug(
        `Metrics for session ${this.sessionId}: ${JSON.stringify(this.metrics)}`,
      );
    }
  }

  async handleLLMStart(): Promise<void> {
    this.metrics.llmCalls++;
  }

  async handleLLMEnd(output: any): Promise<void> {
    // Extract token usage if available
    if (output?.llmOutput?.tokenUsage) {
      const usage = output.llmOutput.tokenUsage;
      this.metrics.promptTokens += usage.promptTokens || 0;
      this.metrics.completionTokens += usage.completionTokens || 0;
      this.metrics.totalTokens += usage.totalTokens || 0;
    }
  }

  async handleToolStart(): Promise<void> {
    this.metrics.toolCalls++;
  }

  async handleChainError(): Promise<void> {
    this.metrics.errors++;
  }

  async handleLLMError(): Promise<void> {
    this.metrics.errors++;
  }

  async handleToolError(): Promise<void> {
    this.metrics.errors++;
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }
}

/**
 * Logging Callback Handler
 * Provides detailed logging of agent execution
 */
class LoggingCallbackHandler extends BaseCallbackHandler {
  name = "LoggingCallbackHandler";

  constructor(
    private verbose: boolean,
    private logger: Logger,
  ) {
    super();
  }

  async handleChainStart(
    chain: Serialized,
    inputs: ChainValues,
  ): Promise<void> {
    if (this.verbose) {
      this.logger.debug(
        `Chain started: ${chain.id?.[chain.id.length - 1] || "unknown"}`,
      );
      this.logger.debug(`Inputs: ${JSON.stringify(inputs, null, 2)}`);
    }
  }

  async handleChainEnd(outputs: ChainValues): Promise<void> {
    if (this.verbose) {
      this.logger.debug("Chain completed");
      this.logger.debug(`Outputs: ${JSON.stringify(outputs, null, 2)}`);
    }
  }

  async handleLLMStart(llm: Serialized, prompts: string[]): Promise<void> {
    if (this.verbose) {
      this.logger.debug(
        `LLM call started: ${llm.id?.[llm.id.length - 1] || "unknown"}`,
      );
      this.logger.debug(`Prompts: ${prompts.join(", ")}`);
    }
  }

  async handleLLMEnd(output: any): Promise<void> {
    if (this.verbose) {
      this.logger.debug("LLM call completed");
      this.logger.debug(`Output: ${JSON.stringify(output, null, 2)}`);
    }
  }

  async handleToolStart(tool: Serialized, input: string): Promise<void> {
    this.logger.log(
      `Tool execution: ${tool.id?.[tool.id.length - 1] || "unknown"}`,
    );
    if (this.verbose) {
      this.logger.debug(`Input: ${input}`);
    }
  }

  async handleToolEnd(output: string): Promise<void> {
    if (this.verbose) {
      this.logger.debug(`Tool output: ${output}`);
    }
  }

  async handleAgentAction(action: AgentAction): Promise<void> {
    this.logger.log(`Agent action: ${action.tool}`);
    if (this.verbose) {
      this.logger.debug(`Tool input: ${JSON.stringify(action.toolInput)}`);
    }
  }

  async handleAgentEnd(finish: AgentFinish): Promise<void> {
    this.logger.log("Agent finished");
    if (this.verbose) {
      this.logger.debug(`Final output: ${JSON.stringify(finish.returnValues)}`);
    }
  }

  async handleChainError(error: Error): Promise<void> {
    this.logger.error(`Chain error: ${error.message}`);
    if (this.verbose) {
      this.logger.error(error.stack || "No stack trace available");
    }
  }

  async handleLLMError(error: Error): Promise<void> {
    this.logger.error(`LLM error: ${error.message}`);
    if (this.verbose) {
      this.logger.error(error.stack || "No stack trace available");
    }
  }

  async handleToolError(error: Error): Promise<void> {
    this.logger.error(`Tool error: ${error.message}`);
    if (this.verbose) {
      this.logger.error(error.stack || "No stack trace available");
    }
  }
}

/**
 * Agent Metrics Interface
 */
export interface AgentMetrics {
  sessionId: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  llmCalls: number;
  toolCalls: number;
  totalDuration: number;
  llmDuration: number;
  toolDuration: number;
  errors: number;
}
