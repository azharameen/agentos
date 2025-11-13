import { z } from "zod";
import { Tool } from "@langchain/core/tools";
import { Logger } from "@nestjs/common";

export interface SafeToolOptions {
  timeoutMs?: number;
  maxRetries?: number;
  allowedPaths?: string[];
  schema?: z.ZodType<any>;
}

/**
 * SafeToolWrapper - Wraps tools with validation, timeout, retry, and sandboxing
 *
 * Features:
 * - Input validation with Zod schemas
 * - Execution timeout with configurable duration
 * - Automatic retry with exponential backoff
 * - Path sandboxing for filesystem operations
 *
 * Usage:
 *   const safeTool = new SafeToolWrapper(originalTool, {
 *     timeoutMs: 30000,
 *     maxRetries: 3,
 *     allowedPaths: ['/workspace'],
 *     schema: z.object({ path: z.string() })
 *   });
 */
export class SafeToolWrapper extends Tool {
  private readonly logger = new Logger(SafeToolWrapper.name);
  private readonly originalTool: Tool;
  private readonly options: Required<SafeToolOptions>;

  constructor(tool: Tool, options: SafeToolOptions = {}) {
    super();
    this.originalTool = tool;
    this.options = {
      timeoutMs: options.timeoutMs ?? 30000,
      maxRetries: options.maxRetries ?? 2,
      allowedPaths: options.allowedPaths ?? [],
      schema: options.schema ?? z.any(),
    };
  }

  get name(): string {
    return this.originalTool.name;
  }

  get description(): string {
    return this.originalTool.description;
  }

  /**
   * Execute tool with safety checks
   */
  protected async _call(input: string): Promise<string> {
    // Parse input if it's JSON
    let parsedInput: any;
    try {
      parsedInput = typeof input === "string" ? JSON.parse(input) : input;
    } catch {
      parsedInput = input;
    }

    // Validate input with Zod schema
    try {
      parsedInput = this.options.schema.parse(parsedInput);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.logger.error(
          `Tool ${this.name} validation error:`,
          error.format(),
        );
        return JSON.stringify({
          error: "Invalid input",
          details: error.format(),
        });
      }
      throw error;
    }

    // Check path sandboxing
    if (this.options.allowedPaths.length > 0) {
      const pathViolation = this.checkPathViolation(parsedInput);
      if (pathViolation) {
        this.logger.warn(
          `Tool ${this.name} blocked: path outside allowed directories`,
        );
        return JSON.stringify({
          error: "Path access denied",
          message: pathViolation,
        });
      }
    }

    // Execute with retry logic
    return this.executeWithRetry(parsedInput);
  }

  /**
   * Execute tool with timeout and retry logic
   */
  private async executeWithRetry(input: any): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(input);
        return result;
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(
          `Tool ${this.name} attempt ${attempt + 1}/${this.options.maxRetries + 1} failed: ${lastError.message}`,
        );

        // Don't retry if it's a validation or permission error
        if (
          lastError.message.includes("validation") ||
          lastError.message.includes("denied")
        ) {
          break;
        }

        // Exponential backoff before retry
        if (attempt < this.options.maxRetries) {
          await this.sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    return JSON.stringify({
      error: "Tool execution failed after retries",
      message: lastError?.message || "Unknown error",
    });
  }

  /**
   * Execute tool with timeout
   */
  private async executeWithTimeout(input: any): Promise<string> {
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(
        () => reject(new Error("Tool execution timeout")),
        this.options.timeoutMs,
      );
    });

    const executionPromise = this.originalTool.call(
      typeof input === "string" ? input : JSON.stringify(input),
    );

    return Promise.race([executionPromise, timeoutPromise]);
  }

  /**
   * Check if input contains paths outside allowed directories
   */
  private checkPathViolation(input: any): string | null {
    const paths = this.extractPaths(input);

    for (const path of paths) {
      const normalizedPath = path.replace(/\\/g, "/");

      // Check for directory traversal attempts
      if (normalizedPath.includes("..")) {
        return `Directory traversal detected: ${path}`;
      }

      // Check against allowed paths
      const isAllowed = this.options.allowedPaths.some((allowedPath) => {
        const normalizedAllowed = allowedPath.replace(/\\/g, "/");
        return normalizedPath.startsWith(normalizedAllowed);
      });

      if (!isAllowed) {
        return `Path outside allowed directories: ${path}`;
      }
    }

    return null;
  }

  /**
   * Extract all path-like strings from input object
   */
  private extractPaths(input: any): string[] {
    const paths: string[] = [];

    const extract = (obj: any) => {
      if (typeof obj === "string" && this.looksLikePath(obj)) {
        paths.push(obj);
      } else if (typeof obj === "object" && obj !== null) {
        for (const key of Object.keys(obj)) {
          if (
            key.toLowerCase().includes("path") ||
            key.toLowerCase().includes("file") ||
            key.toLowerCase().includes("dir")
          ) {
            if (typeof obj[key] === "string") {
              paths.push(obj[key]);
            }
          }
          extract(obj[key]);
        }
      }
    };

    extract(input);
    return paths;
  }

  /**
   * Check if string looks like a file path
   */
  private looksLikePath(str: string): boolean {
    return (
      str.includes("/") ||
      str.includes("\\") ||
      /^[a-zA-Z]:[/\\]/.test(str) || // Windows absolute path
      str.startsWith("~") || // Unix home directory
      str.startsWith(".")
    ); // Relative path
  }

  /**
   * Sleep utility for retry backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
