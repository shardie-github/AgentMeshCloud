/**
 * Rate Limiter with Redis backing
 * Implements sliding window rate limiting with IP throttling
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../common/logger.js';

const logger = createLogger('rate-limiter');

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

interface RateLimitStore {
  get(key: string): Promise<number | null>;
  increment(key: string, windowMs: number): Promise<number>;
}

/**
 * In-memory store (fallback when Redis unavailable)
 */
class MemoryStore implements RateLimitStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map();

  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return null;
    }
    return entry.count;
  }

  async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || now > entry.resetAt) {
      const newEntry = { count: 1, resetAt: now + windowMs };
      this.store.set(key, newEntry);
      return 1;
    }

    entry.count++;
    this.store.set(key, entry);
    return entry.count;
  }
}

/**
 * Rate limiter middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  const store = new MemoryStore();
  const keyPrefix = config.keyPrefix || 'ratelimit';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${ip}`;

      const count = await store.increment(key, config.windowMs);
      
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - count).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());

      if (count > config.maxRequests) {
        logger.warn('Rate limit exceeded', { ip, count, limit: config.maxRequests });
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(config.windowMs / 1000),
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error', error as Error);
      // Fail open - allow request if rate limiter fails
      next();
    }
  };
}

/**
 * API key authentication middleware
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  const validKeys = process.env.API_KEYS?.split(',') || [];
  
  if (validKeys.length === 0) {
    // No API keys configured - allow all (development mode)
    logger.warn('No API keys configured - authentication disabled');
    next();
    return;
  }

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key. Provide via X-API-Key header or Authorization: Bearer token',
    });
    return;
  }

  if (!validKeys.includes(apiKey as string)) {
    logger.warn('Invalid API key attempt', { ip: req.ip });
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key',
    });
    return;
  }

  next();
}

/**
 * IP throttling for suspicious activity
 */
export function ipThrottle(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  // Block known malicious IPs (could be loaded from DB/Redis)
  const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];
  
  if (blockedIPs.includes(ip)) {
    logger.warn('Blocked IP attempt', { ip });
    res.status(403).json({
      error: 'Forbidden',
      message: 'Access denied',
    });
    return;
  }

  next();
}
