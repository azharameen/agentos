import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { correlationContext } from './structured-logger.service';

/**
 * CORRELATION ID MIDDLEWARE
 * 
 * Automatically generates and attaches correlation IDs to all incoming requests.
 * Supports distributed tracing by:
 * - Accepting existing correlation IDs from headers (X-Correlation-ID, X-Request-ID)
 * - Generating new UUIDs for requests without IDs
 * - Propagating IDs through async context (AsyncLocalStorage)
 * - Adding IDs to response headers for client tracking
 * 
 * Integration with OpenTelemetry:
 * - Reads trace context from traceparent header (W3C standard)
 * - Extracts trace-id and span-id for distributed tracing
 * 
 * Headers:
 * - Incoming: X-Correlation-ID, X-Request-ID, traceparent, X-User-ID, X-Session-ID
 * - Outgoing: X-Correlation-ID (echoed back)
 * 
 * Usage:
 * Apply globally in AppModule:
 * ```typescript
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(CorrelationIdMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Initialize correlation context store
    const store = new Map<string, any>();

    correlationContext.run(store, () => {
      // 1. Extract or generate correlation ID
      let correlationId =
        req.headers['x-correlation-id'] as string ||
        req.headers['x-request-id'] as string ||
        uuidv4();

      store.set('correlationId', correlationId);

      // 2. Extract user and session IDs if present
      const userId = req.headers['x-user-id'] as string;
      const sessionId = req.headers['x-session-id'] as string;

      if (userId) {
        store.set('userId', userId);
      }
      if (sessionId) {
        store.set('sessionId', sessionId);
      }

      // 3. Extract OpenTelemetry trace context (W3C traceparent header)
      // Format: 00-{trace-id}-{parent-id}-{trace-flags}
      const traceparent = req.headers['traceparent'] as string;
      if (traceparent) {
        const parts = traceparent.split('-');
        if (parts.length === 4) {
          const traceId = parts[1];
          const spanId = parts[2];
          store.set('traceId', traceId);
          store.set('spanId', spanId);
        }
      }

      // 4. Attach correlation ID to response headers
      res.setHeader('X-Correlation-ID', correlationId);

      // 5. Attach to request object for easy access
      (req as any).correlationId = correlationId;

      next();
    });
  }
}

/**
 * Request logger middleware - logs incoming requests with correlation IDs
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const correlationId = (req as any).correlationId || 'unknown';

    // Log request start
    const requestLog = {
      timestamp: new Date().toISOString(),
      level: 'log',
      message: 'Incoming request',
      context: 'HTTP',
      correlationId,
      metadata: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      },
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(requestLog));
    } else {
      console.log(
        `\x1b[36m[HTTP]\x1b[0m (${correlationId}) ${req.method} ${req.originalUrl}`
      );
    }

    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const responseLog = {
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 400 ? 'warn' : 'log',
        message: 'Request completed',
        context: 'HTTP',
        correlationId,
        metadata: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
        },
      };

      if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(responseLog));
      } else {
        const statusColor = res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
        console.log(
          `\x1b[36m[HTTP]\x1b[0m (${correlationId}) ${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}\x1b[0m ${duration}ms`
        );
      }
    });

    next();
  }
}
