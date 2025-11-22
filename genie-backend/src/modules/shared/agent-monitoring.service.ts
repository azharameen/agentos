import { Injectable, Logger } from "@nestjs/common";
import { TracingService } from "./tracing.service";
import { TokenUsageService } from "./token-usage.service";
import { UnifiedMemoryService } from "../memory/unified-memory.service";

/**
 * Agent Monitoring Service
 * 
 * Handles execution monitoring and observability:
 * - Distributed tracing
 * - Token usage tracking
 * - Performance metrics
 * - Memory persistence
 * - Error tracking
 * 
 * Extracted from AgentOrchestratorService for better separation of concerns
 * Updated to use UnifiedMemoryService for all memory operations
 */
@Injectable()
export class AgentMonitoringService {
  private readonly logger = new Logger(AgentMonitoringService.name);

  constructor(
    private readonly tracing: TracingService,
    private readonly tokenUsage: TokenUsageService,
    private readonly memoryService: UnifiedMemoryService,
  ) { }

  /**
   * Start execution trace
   */
  startTrace(sessionId: string, metadata: Record<string, any>): string {
    const traceId = this.tracing.startTrace("agent_execution", {
      sessionId,
      ...metadata
    });

    this.logger.debug(`Started trace ${traceId} for session ${sessionId}`);

    return traceId;
  }

  /**
   * End execution trace
   */
  endTrace(traceId: string, metadata: Record<string, any> = {}): void {
    this.tracing.endTrace(traceId, metadata);

    this.logger.debug(`Ended trace ${traceId}`);
  }

  /**
   * Track token usage
   */
  trackTokenUsage(
    sessionId: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    totalTokens: number,
  ): void {
    try {
      this.tokenUsage.trackUsage(
        sessionId,
        {
          promptTokens,
          completionTokens,
          totalTokens,
        },
        model,
      );

      this.logger.debug(
        `Tracked token usage for session ${sessionId}: ${totalTokens} total tokens`,
      );
    } catch (error: any) {
      this.logger.warn(`Failed to track token usage: ${error.message}`);
    }
  }

  /**
   * Persist conversation to memory
   */
  async persistConversation(
    sessionId: string,
    userPrompt: string,
    agentResponse: string,
  ): Promise<void> {
    try {
      await this.memoryService.addMessage(sessionId, 'human', userPrompt);
      await this.memoryService.addMessage(sessionId, 'ai', agentResponse);

      this.logger.debug(
        `Persisted conversation to memory for session ${sessionId}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to persist conversation: ${error.message}`);
    }
  }

  /**
   * Track execution metrics
   */
  trackMetrics(
    sessionId: string,
    metrics: {
      executionTime: number;
      toolsUsed: string[];
      intermediateSteps: number;
      executionMethod: string;
      success: boolean;
    }
  ): void {
    this.logger.log(
      `Execution metrics for session ${sessionId}: ` +
      `time=${metrics.executionTime}ms, ` +
      `tools=${metrics.toolsUsed.length}, ` +
      `steps=${metrics.intermediateSteps}, ` +
      `method=${metrics.executionMethod}, ` +
      `success=${metrics.success}`
    );

    // TODO: Send to metrics collection system (Prometheus, etc.)
  }

  /**
   * Log error with context
   */
  logError(
    sessionId: string,
    traceId: string,
    error: Error,
    context: Record<string, any> = {}
  ): void {
    this.logger.error(
      `Error in session ${sessionId} [trace: ${traceId}]: ${error.message}`,
      {
        error: error.stack,
        ...context
      }
    );
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    messageCount: number;
    memoryStats: any;
    tokenUsage: any;
  }> {
    const conversationHistory =
      await this.memoryService.getRecentMessages(sessionId, 100);
    const memoryStats = await this.memoryService.getStats(sessionId);
    const tokenStats = this.tokenUsage.getSessionUsage(sessionId);

    return {
      messageCount: conversationHistory.length,
      memoryStats,
      tokenUsage: tokenStats,
    };
  }
}

