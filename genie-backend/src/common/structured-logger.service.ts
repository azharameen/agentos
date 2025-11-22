import { Injectable, LoggerService, LogLevel, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Context storage for correlation IDs across async operations
 */
export const correlationContext = new AsyncLocalStorage<Map<string, any>>();

interface StructuredLogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * STRUCTURED LOGGING SERVICE
 * 
 * Provides JSON-formatted logs with correlation IDs for distributed tracing.
 * Integrates with NestJS's LoggerService interface.
 * 
 * Features:
 * - JSON output for easy parsing by log aggregators (ELK, Datadog, Splunk)
 * - Correlation IDs to track requests across services
 * - User/Session IDs for user activity tracking
 * - OpenTelemetry-compatible trace/span IDs
 * - Structured metadata for rich context
 * - Error stack traces with proper formatting
 * 
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   private readonly logger = new StructuredLogger(MyService.name);
 * 
 *   doSomething() {
 *     this.logger.log('Operation started', { operationId: '123' });
 *     this.logger.error('Operation failed', new Error('Network timeout'));
 *   }
 * }
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLogger implements LoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Set context name for all subsequent logs
   */
  setContext(context: string) {
    this.context = context;
  }

  /**
   * Get correlation context (ID, user, session, trace)
   */
  private getCorrelationContext(): Partial<StructuredLogEntry> {
    const store = correlationContext.getStore();
    if (!store) return {};

    return {
      correlationId: store.get('correlationId'),
      userId: store.get('userId'),
      sessionId: store.get('sessionId'),
      traceId: store.get('traceId'),
      spanId: store.get('spanId'),
    };
  }

  /**
   * Format and output structured log entry
   */
  private writeLog(
    level: LogLevel,
    message: any,
    metadataOrError?: Record<string, any> | Error,
  ) {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      context: this.context,
      ...this.getCorrelationContext(),
    };

    // Handle error parameter
    if (metadataOrError instanceof Error) {
      entry.error = {
        name: metadataOrError.name,
        message: metadataOrError.message,
        stack: metadataOrError.stack,
      };
    } else if (metadataOrError) {
      entry.metadata = metadataOrError;
    }

    // Output as JSON for production, pretty-print for development
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      // Development: Pretty-print with colors
      const color = this.getColorForLevel(level);
      const resetColor = '\x1b[0m';
      const contextStr = entry.context ? ` [${entry.context}]` : '';
      const correlationStr = entry.correlationId ? ` (${entry.correlationId})` : '';

      console.log(
        `${color}[${entry.level.toUpperCase()}]${resetColor}${contextStr}${correlationStr} ${entry.message}`
      );

      if (entry.metadata) {
        console.log('  Metadata:', entry.metadata);
      }
      if (entry.error) {
        console.error('  Error:', entry.error.message);
        if (entry.error.stack) {
          console.error(entry.error.stack);
        }
      }
    }
  }

  /**
   * Get ANSI color code for log level (development mode)
   */
  private getColorForLevel(level: string): string {
    switch (level) {
      case 'error':
      case 'fatal':
        return '\x1b[31m'; // Red
      case 'warn':
        return '\x1b[33m'; // Yellow
      case 'debug':
        return '\x1b[36m'; // Cyan
      case 'verbose':
        return '\x1b[35m'; // Magenta
      default:
        return '\x1b[32m'; // Green
    }
  }

  /**
   * Log informational message
   */
  log(message: any, metadata?: Record<string, any>) {
    this.writeLog('log', message, metadata);
  }

  /**
   * Log error message
   */
  error(message: any, error?: Error | Record<string, any>) {
    this.writeLog('error', message, error);
  }

  /**
   * Log warning message
   */
  warn(message: any, metadata?: Record<string, any>) {
    this.writeLog('warn', message, metadata);
  }

  /**
   * Log debug message
   */
  debug(message: any, metadata?: Record<string, any>) {
    this.writeLog('debug', message, metadata);
  }

  /**
   * Log verbose message
   */
  verbose(message: any, metadata?: Record<string, any>) {
    this.writeLog('verbose', message, metadata);
  }

  /**
   * Log fatal error message
   */
  fatal(message: any, error?: Error | Record<string, any>) {
    this.writeLog('fatal', message, error);
  }
}

/**
 * Helper functions for setting correlation context
 */
export class CorrelationHelper {
  /**
   * Set correlation ID for current async context
   */
  static setCorrelationId(correlationId: string) {
    const store = correlationContext.getStore();
    if (store) {
      store.set('correlationId', correlationId);
    }
  }

  /**
   * Set user ID for current async context
   */
  static setUserId(userId: string) {
    const store = correlationContext.getStore();
    if (store) {
      store.set('userId', userId);
    }
  }

  /**
   * Set session ID for current async context
   */
  static setSessionId(sessionId: string) {
    const store = correlationContext.getStore();
    if (store) {
      store.set('sessionId', sessionId);
    }
  }

  /**
   * Set trace/span IDs for OpenTelemetry compatibility
   */
  static setTraceContext(traceId: string, spanId?: string) {
    const store = correlationContext.getStore();
    if (store) {
      store.set('traceId', traceId);
      if (spanId) {
        store.set('spanId', spanId);
      }
    }
  }

  /**
   * Get correlation ID from current context
   */
  static getCorrelationId(): string | undefined {
    const store = correlationContext.getStore();
    return store?.get('correlationId');
  }

  /**
   * Clear all context data
   */
  static clearContext() {
    const store = correlationContext.getStore();
    if (store) {
      store.clear();
    }
  }
}
