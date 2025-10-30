/**
 * Rate Limiter - Token Bucket Algorithm
 * Prevents abuse and ensures fair resource allocation
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '@/common/logger.js';

export interface RateLimitConfig {
  capacity: number; // Max tokens in bucket
  refillRate: number; // Tokens added per second
  keyGenerator: (req: Request) => string; // How to identify clients
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

// In-memory store (use Redis in production)
const buckets = new Map<string, TokenBucket>();

/**
 * Token bucket rate limiter
 */
export class RateLimiter {
  constructor(private config: RateLimitConfig) {}

  /**
   * Check if request is allowed
   */
  async consume(key: string, tokens: number = 1): Promise<{
    allowed: boolean;
    remaining: number;
    resetIn: number; // Seconds until full refill
  }> {
    const now = Date.now() / 1000; // Seconds
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: this.config.capacity,
        lastRefill: now,
      };
      buckets.set(key, bucket);
    }

    // Refill tokens based on time elapsed
    const elapsed = now - bucket.lastRefill;
    const refillAmount = elapsed * this.config.refillRate;
    bucket.tokens = Math.min(bucket.tokens + refillAmount, this.config.capacity);
    bucket.lastRefill = now;

    // Check if enough tokens available
    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      const resetIn = (this.config.capacity - bucket.tokens) / this.config.refillRate;

      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        resetIn: Math.ceil(resetIn),
      };
    } else {
      const resetIn = (tokens - bucket.tokens) / this.config.refillRate;

      return {
        allowed: false,
        remaining: Math.floor(bucket.tokens),
        resetIn: Math.ceil(resetIn),
      };
    }
  }

  /**
   * Express middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const key = this.config.keyGenerator(req);
      const result = await this.consume(key);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', this.config.capacity);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', result.resetIn);

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          key: key.substring(0, 32),
          remaining: result.remaining,
          resetIn: result.resetIn,
        });

        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: result.resetIn,
        });
        return;
      }

      next();
    };
  }
}

/**
 * Common rate limit configurations
 */

// By IP address
export const ipRateLimiter = new RateLimiter({
  capacity: 100, // 100 requests
  refillRate: 10, // 10 requests per second = 600/min
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  },
});

// By API key
export const apiKeyRateLimiter = new RateLimiter({
  capacity: 1000, // Higher limit for authenticated
  refillRate: 100, // 100/sec = 6000/min
  keyGenerator: (req) => {
    const apiKey = req.headers['x-api-key'] as string;
    return `key:${apiKey || 'anonymous'}`;
  },
});

// By tenant
export const tenantRateLimiter = new RateLimiter({
  capacity: 500,
  refillRate: 50, // 50/sec
  keyGenerator: (req) => {
    const tenantId = (req as any).tenantId || 'unknown';
    return `tenant:${tenantId}`;
  },
});

// Stricter limit for expensive operations
export const expensiveOpRateLimiter = new RateLimiter({
  capacity: 10,
  refillRate: 1, // 1/sec
  keyGenerator: (req) => {
    const tenantId = (req as any).tenantId || 'unknown';
    return `expensive:${tenantId}`;
  },
});

/**
 * Periodic cleanup of old buckets
 */
export function cleanupOldBuckets(maxAgeSeconds: number = 3600): void {
  const now = Date.now() / 1000;
  let cleaned = 0;

  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAgeSeconds) {
      buckets.delete(key);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned up old rate limit buckets', { count: cleaned });
  }
}

// Cleanup every hour
setInterval(() => cleanupOldBuckets(), 3600 * 1000);
