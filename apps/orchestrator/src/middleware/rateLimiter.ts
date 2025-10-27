/**
 * Rate limiting middleware for AgentMesh Cloud Orchestrator
 * Implements rate limiting using Redis for distributed systems
 */

import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { logger } from '@/utils/logger';
import { config } from '@/config';
import { RateLimitError } from './errorHandler';

// Redis client for rate limiting
const redis = new Redis(config.redis.url, {
  password: config.redis.password,
  db: config.redis.db,
  retryDelayOnFailover: config.redis.retryDelayOnFailover,
  maxRetriesPerRequest: config.redis.maxRetriesPerRequest,
});

// Rate limit store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Default rate limit configuration
const defaultRateLimit = {
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skipSuccessfulRequests: config.rateLimit.skipSuccessfulRequests,
};

// Rate limit configurations for different endpoints
const rateLimitConfigs: Record<string, any> = {
  '/api/v1/agents': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    skipSuccessfulRequests: false,
  },
  '/api/v1/workflows': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    skipSuccessfulRequests: false,
  },
  '/api/v1/mcp': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // 200 requests per window
    skipSuccessfulRequests: true,
  },
  '/api/v1/a2a': {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 1000, // 1000 requests per window
    skipSuccessfulRequests: true,
  },
  '/health': {
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60, // 60 requests per window
    skipSuccessfulRequests: true,
  },
};

// Get client identifier
function getClientId(req: Request): string {
  // Try to get user ID from JWT token first
  const userId = (req as any).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

// Get rate limit configuration for endpoint
function getRateLimitConfig(path: string): any {
  // Find matching configuration
  for (const [pattern, config] of Object.entries(rateLimitConfigs)) {
    if (path.startsWith(pattern)) {
      return config;
    }
  }
  
  // Return default configuration
  return defaultRateLimit;
}

// Check rate limit using Redis
async function checkRateLimitRedis(
  key: string,
  windowMs: number,
  max: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const redisKey = `rate_limit:${key}:${window}`;
    
    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();
    pipeline.incr(redisKey);
    pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results?.[0]?.[1] as number || 0;
    
    const allowed = count <= max;
    const remaining = Math.max(0, max - count);
    const resetTime = (window + 1) * windowMs;
    
    return { allowed, remaining, resetTime };
  } catch (error) {
    logger.error('Redis rate limit check failed:', error);
    // Fall back to allowing the request if Redis is unavailable
    return { allowed: true, remaining: max, resetTime: Date.now() + windowMs };
  }
}

// Check rate limit using in-memory store
function checkRateLimitMemory(
  key: string,
  windowMs: number,
  max: number
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const stored = rateLimitStore.get(key);
  
  if (!stored || now > stored.resetTime) {
    // New window or expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: max - 1, resetTime: now + windowMs };
  }
  
  if (stored.count >= max) {
    return { allowed: false, remaining: 0, resetTime: stored.resetTime };
  }
  
  stored.count++;
  return { allowed: true, remaining: max - stored.count, resetTime: stored.resetTime };
}

// Main rate limiting middleware
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientId = getClientId(req);
  const path = req.path;
  const config = getRateLimitConfig(path);
  
  const key = `${clientId}:${path}`;
  const { windowMs, max, skipSuccessfulRequests } = config;
  
  // Check rate limit
  const checkRateLimit = async () => {
    try {
      // Try Redis first, fall back to memory
      const result = await checkRateLimitRedis(key, windowMs, max);
      
      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });
      
      if (!result.allowed) {
        throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`);
      }
      
      return result;
    } catch (error) {
      if (error instanceof RateLimitError) {
        throw error;
      }
      
      // Fall back to memory store
      const result = checkRateLimitMemory(key, windowMs, max);
      
      res.set({
        'X-RateLimit-Limit': max.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });
      
      if (!result.allowed) {
        throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`);
      }
      
      return result;
    }
  };
  
  checkRateLimit()
    .then(() => {
      // Store original end function
      const originalEnd = res.end;
      
      // Override end function to check if request was successful
      res.end = function(chunk?: any, encoding?: any) {
        if (skipSuccessfulRequests && res.statusCode < 400) {
          // Don't count successful requests
          return originalEnd.call(this, chunk, encoding);
        }
        
        return originalEnd.call(this, chunk, encoding);
      };
      
      next();
    })
    .catch((error) => {
      next(error);
    });
}

// Rate limiter for specific endpoints
export function createRateLimiter(config: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = config.keyGenerator ? config.keyGenerator(req) : getClientId(req);
    const rateLimitKey = `${key}:${req.path}`;
    
    const checkRateLimit = async () => {
      try {
        const result = await checkRateLimitRedis(rateLimitKey, config.windowMs, config.max);
        
        res.set({
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        });
        
        if (!result.allowed) {
          throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`);
        }
        
        return result;
      } catch (error) {
        if (error instanceof RateLimitError) {
          throw error;
        }
        
        const result = checkRateLimitMemory(rateLimitKey, config.windowMs, config.max);
        
        res.set({
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
        });
        
        if (!result.allowed) {
          throw new RateLimitError(`Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`);
        }
        
        return result;
      }
    };
    
    checkRateLimit()
      .then(() => {
        if (config.skipSuccessfulRequests) {
          const originalEnd = res.end;
          res.end = function(chunk?: any, encoding?: any) {
            if (res.statusCode < 400) {
              return originalEnd.call(this, chunk, encoding);
            }
            return originalEnd.call(this, chunk, encoding);
          };
        }
        next();
      })
      .catch((error) => {
        next(error);
      });
  };
}

// Cleanup expired entries from memory store
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Export rate limiter
export default rateLimiter;