import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import logger from '../utils/logger';

// Simple in-memory rate limiter (in production, use Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (req: Request, res: Response, next: NextFunction): void => {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = config.rateLimit.windowMs;
  const maxRequests = config.rateLimit.maxRequests;

  const clientData = requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    // First request or window expired
    requestCounts.set(clientId, {
      count: 1,
      resetTime: now + windowMs
    });
    next();
    return;
  }

  if (clientData.count >= maxRequests) {
    logger.warn('Rate limit exceeded', { clientId, count: clientData.count });
    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil((clientData.resetTime - now) / 1000)} seconds.`
    });
    return;
  }

  // Increment count
  clientData.count++;
  next();
};

export default rateLimiter;
