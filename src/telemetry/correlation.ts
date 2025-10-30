/**
 * Correlation ID injection and propagation
 * Ensures all logs and traces can be correlated across services
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'async_hooks';

export const correlationStorage = new AsyncLocalStorage<string>();

/**
 * Middleware to inject correlation ID into requests
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = 
    req.headers['x-correlation-id'] as string ||
    req.headers['x-request-id'] as string ||
    randomUUID();

  // Set response header
  res.setHeader('X-Correlation-ID', correlationId);

  // Store in async local storage for access throughout request lifecycle
  correlationStorage.run(correlationId, () => {
    next();
  });
}

/**
 * Get current correlation ID from context
 */
export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore();
}
