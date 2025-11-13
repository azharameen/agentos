import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * TracingMetadata - Metadata to attach to trace spans
 */
export interface TracingMetadata {
  sessionId?: string;
  userId?: string;
  model?: string;
  toolsUsed?: string[];
  promptTokens?: number;
  completionTokens?: number;
  totalCost?: number;
  [key: string]: any;
}

/**
 * TracingService
 *
 * Provides LOCAL observability and distributed tracing capabilities.
 * NO DATA is sent to external services (LangSmith removed).
 *
 * Features:
 * - Local-only tracing (logs to console/files via Pino)
 * - Attaches custom metadata to traces (session, user, model, costs)
 * - Generates trace IDs for distributed tracing correlation
 * - Provides span utilities for custom instrumentation
 * - Structured logs for Prometheus/Grafana/Loki consumption
 *
 * Privacy Guarantee:
 * - All traces stay on your infrastructure
 * - No external API calls
 * - No cloud dependencies
 *
 * Usage:
 *   constructor(private readonly tracing: TracingService) {}
 *
 *   const traceId = this.tracing.startTrace('agent_execution');
 *   // ... execute work ...
 *   this.tracing.endTrace(traceId, { sessionId: 'abc', model: 'gpt-4' });
 */
@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);
  private readonly tracingEnabled: boolean = true; // Always enabled (local-only)
  private readonly activeTraces = new Map<
    string,
    { name: string; startTime: number; metadata: TracingMetadata }
  >();

  constructor(private readonly configService: ConfigService) {
    this.logger.log("Local tracing is ENABLED (no external data sharing)");
    this.logger.log("All traces are logged locally via Pino");
  }

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.tracingEnabled;
  }

  /**
   * Start a custom trace span
   *
   * @param name - Name of the trace (e.g., 'agent_execution', 'rag_query')
   * @param metadata - Optional metadata to attach
   * @returns traceId - Unique identifier for this trace
   */
  startTrace(name: string, metadata: TracingMetadata = {}): string {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    this.activeTraces.set(traceId, { name, startTime, metadata });

    if (this.tracingEnabled) {
      this.logger.debug(`Started trace: ${name} [${traceId}]`);
    }

    return traceId;
  }

  /**
   * End a trace span and log results
   *
   * @param traceId - The trace ID returned from startTrace
   * @param additionalMetadata - Additional metadata to attach at end
   */
  endTrace(traceId: string, additionalMetadata: TracingMetadata = {}): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      this.logger.warn(`Attempted to end non-existent trace: ${traceId}`);
      return;
    }

    const duration = Date.now() - trace.startTime;
    const finalMetadata = { ...trace.metadata, ...additionalMetadata };

    if (this.tracingEnabled) {
      this.logger.debug(
        `Ended trace: ${trace.name} [${traceId}] - ${duration}ms`,
      );
      this.logger.debug(`Metadata: ${JSON.stringify(finalMetadata)}`);
    }

    // Log structured trace data for external collectors (e.g., Prometheus, Datadog)
    this.logger.log({
      event: "trace_completed",
      traceId,
      name: trace.name,
      durationMs: duration,
      ...finalMetadata,
    });

    this.activeTraces.delete(traceId);
  }

  /**
   * Add metadata to an active trace
   *
   * @param traceId - The trace ID
   * @param metadata - Metadata to merge
   */
  addMetadata(traceId: string, metadata: TracingMetadata): void {
    const trace = this.activeTraces.get(traceId);
    if (trace) {
      trace.metadata = { ...trace.metadata, ...metadata };
    }
  }

  /**
   * Get metadata from an active trace
   *
   * @param traceId - The trace ID
   * @returns The current metadata or undefined
   */
  getMetadata(traceId: string): TracingMetadata | undefined {
    return this.activeTraces.get(traceId)?.metadata;
  }

  /**
   * Generate a unique trace ID
   * Format: trace_<timestamp>_<random>
   */
  private generateTraceId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `trace_${timestamp}_${random}`;
  }

  /**
   * Get tracing statistics
   */
  getStats(): {
    enabled: boolean;
    activeTraces: number;
    traceIds: string[];
  } {
    return {
      enabled: this.tracingEnabled,
      activeTraces: this.activeTraces.size,
      traceIds: Array.from(this.activeTraces.keys()),
    };
  }

  /**
   * Utility: Wrap an async function with automatic tracing
   *
   * @param name - Name of the trace
   * @param fn - The async function to execute
   * @param metadata - Initial metadata
   * @returns The function's result
   */
  async trace<T>(
    name: string,
    fn: () => Promise<T>,
    metadata: TracingMetadata = {},
  ): Promise<T> {
    const traceId = this.startTrace(name, metadata);
    try {
      const result = await fn();
      this.endTrace(traceId, { success: true });
      return result;
    } catch (error) {
      this.endTrace(traceId, {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Create distributed tracing context for external calls
   * Returns headers to propagate trace context (W3C Trace Context format)
   */
  createDistributedContext(traceId: string): Record<string, string> {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      return {};
    }

    // W3C Trace Context format
    // traceparent: 00-<trace-id>-<parent-id>-<flags>
    const traceIdHex = Buffer.from(traceId).toString("hex").padEnd(32, "0");
    const spanIdHex = Math.random()
      .toString(16)
      .substring(2, 18)
      .padEnd(16, "0");

    return {
      traceparent: `00-${traceIdHex}-${spanIdHex}-01`,
      tracestate: `langsmith=${traceId}`,
    };
  }
}
