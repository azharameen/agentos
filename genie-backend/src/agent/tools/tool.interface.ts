import { DynamicStructuredTool } from '@langchain/core/tools';
import { ZodSchema } from 'zod';
import { Logger } from '@nestjs/common';
import { ToolCategory, TOOL_DEFAULTS } from '../../shared/tool.constants';

/**
 * Metadata for a tool instance
 */
export interface ToolMetadata {
  name: string;
  category: ToolCategory;
  enabled: boolean;
  description?: string;
  version?: string;
  tags?: string[];
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  sessionId?: string;
  userId?: string;
  timeout?: number;
  maxRetries?: number;
  metadata?: Record<string, any>;
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  executionTimeMs?: number;
  retryCount?: number;
}

/**
 * Configuration for SafeToolWrapper
 */
export interface SafeToolConfig {
  timeout?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  validateInput?: boolean;
  validateOutput?: boolean;
  enableLogging?: boolean;
}

/**
 * SafeToolWrapper - Wraps LangChain tools with validation, timeout, and error handling
 * 
 * Features:
 * - Input validation using Zod schemas
 * - Configurable timeout for long-running operations
 * - Automatic retry logic with exponential backoff
 * - Structured error handling and logging
 * - Execution metrics (timing, retry count)
 */
export class SafeToolWrapper {
  private readonly logger: Logger;
  private readonly config: Required<SafeToolConfig>;

  constructor(
    private readonly tool: DynamicStructuredTool,
    private readonly metadata: ToolMetadata,
    config?: SafeToolConfig,
  ) {
    this.logger = new Logger(`SafeTool:${metadata.name}`);
    this.config = {
      timeout: config?.timeout ?? TOOL_DEFAULTS.TIMEOUT_MS,
      maxRetries: config?.maxRetries ?? TOOL_DEFAULTS.MAX_RETRIES,
      retryDelayMs: config?.retryDelayMs ?? 1000,
      validateInput: config?.validateInput ?? true,
      validateOutput: config?.validateOutput ?? false,
      enableLogging: config?.enableLogging ?? TOOL_DEFAULTS.ENABLE_LOGGING,
    };
  }

  /**
   * Execute the wrapped tool with safety guarantees
   */
  async execute<TInput = any, TOutput = string>(
    input: TInput,
    context?: ToolExecutionContext,
  ): Promise<ToolExecutionResult<TOutput>> {
    const startTime = Date.now();
    const effectiveTimeout = context?.timeout ?? this.config.timeout;
    const effectiveMaxRetries = context?.maxRetries ?? this.config.maxRetries;

    if (!this.metadata.enabled) {
      return {
        success: false,
        error: `Tool ${this.metadata.name} is disabled`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Input validation (skip for now - LangChain DynamicStructuredTool handles this)
    // The tool.schema from DynamicStructuredTool is already a Zod schema,
    // and validation happens during tool.invoke()
    if (this.config.validateInput) {
      // Schema validation is handled by LangChain's DynamicStructuredTool.invoke()
      // We could add additional validation here if needed
    }

    // Execute with retry logic
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= effectiveMaxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.config.retryDelayMs * Math.pow(2, attempt - 1); // exponential backoff
          await this.sleep(delay);
          this.log(`Retry attempt ${attempt}/${effectiveMaxRetries}`);
        }

        // Execute with timeout
        const result = await this.executeWithTimeout(input, effectiveTimeout);
        const executionTime = Date.now() - startTime;

        this.log(`Execution successful (${executionTime}ms, ${attempt} retries)`);

        return {
          success: true,
          data: result as TOutput,
          executionTimeMs: executionTime,
          retryCount: attempt,
        };
      } catch (error: any) {
        lastError = error;
        this.logError(`Execution attempt ${attempt + 1} failed`, error);

        // Don't retry on validation errors or timeout errors
        if (error.name === 'ValidationError' || error.name === 'TimeoutError') {
          break;
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError?.message ?? 'Unknown error',
      executionTimeMs: Date.now() - startTime,
      retryCount: effectiveMaxRetries,
    };
  }

  /**
   * Execute tool with timeout
   */
  private async executeWithTimeout<TInput, TOutput>(
    input: TInput,
    timeoutMs: number,
  ): Promise<TOutput> {
    return new Promise<TOutput>(async (resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        const error = new Error(`Tool execution timeout after ${timeoutMs}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, timeoutMs);

      try {
        const result = await this.tool.invoke(input as any);
        clearTimeout(timeoutHandle);
        resolve(result as TOutput);
      } catch (error) {
        clearTimeout(timeoutHandle);
        reject(error);
      }
    });
  }

  /**
   * Get the underlying LangChain tool
   */
  getTool(): DynamicStructuredTool {
    return this.tool;
  }

  /**
   * Get tool metadata
   */
  getMetadata(): ToolMetadata {
    return { ...this.metadata };
  }

  /**
   * Check if tool is enabled
   */
  isEnabled(): boolean {
    return this.metadata.enabled;
  }

  /**
   * Update tool enabled status
   */
  setEnabled(enabled: boolean): void {
    this.metadata.enabled = enabled;
    this.log(`Tool ${enabled ? 'enabled' : 'disabled'}`);
  }

  private log(message: string): void {
    if (this.config.enableLogging) {
      this.logger.log(message);
    }
  }

  private logError(message: string, error: Error): void {
    if (this.config.enableLogging) {
      this.logger.error(`${message}: ${error.message}`, error.stack);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a SafeToolWrapper from a DynamicStructuredTool
 */
export function createSafeTool(
  tool: DynamicStructuredTool,
  metadata: ToolMetadata,
  config?: SafeToolConfig,
): SafeToolWrapper {
  return new SafeToolWrapper(tool, metadata, config);
}

/**
 * Helper to validate a Zod schema against input
 */
export function validateToolInput<T>(schema: ZodSchema<T>, input: unknown): T {
  return schema.parse(input);
}

/**
 * Helper to create JSON output wrapper for consistent tool responses
 */
export function createJsonOutput<T>(success: boolean, data?: T, error?: string): string {
  return JSON.stringify({
    success,
    data: data ?? null,
    error: error ?? null,
    timestamp: new Date().toISOString(),
  });
}
