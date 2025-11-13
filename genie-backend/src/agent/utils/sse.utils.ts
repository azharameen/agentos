import { Response } from 'express';

/**
 * Utility to send Server-Sent Events (SSE) in a standardized way.
 * Handles event formatting, error propagation, and client disconnects.
 */
export function sendSSE(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Utility to initialize SSE response headers.
 */
export function initSSE(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

/**
 * Utility to handle SSE client disconnects.
 */
export function handleSSEDisconnect(req: any, res: Response, cleanup: () => void) {
  req.on('close', () => {
    cleanup();
  });
}
