/**
 * Canary Router - Traffic-Shaped Deployment
 * Routes percentage of traffic to canary version for safe rollouts
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../src/common/logger.js';
import { secretsBridge } from '../src/security/secrets_bridge.js';

export interface CanaryConfig {
  enabled: boolean;
  percentage: number; // 0-100
  strategy: 'percentage' | 'header' | 'user-id' | 'tenant-id';
  headerKey?: string; // For header strategy
  whitelist?: string[]; // Specific IDs to route to canary
  blacklist?: string[]; // Specific IDs to exclude from canary
}

export interface CanaryVersion {
  name: string;
  endpoint: string; // Canary service endpoint
  healthcheck: string;
  kpis: CanaryKPIs;
}

export interface CanaryKPIs {
  errorRate: number; // Current error rate
  p95Latency: number; // 95th percentile latency (ms)
  requestCount: number;
  lastCheck: Date;
}

/**
 * Load canary configuration
 */
export function loadCanaryConfig(): CanaryConfig {
  const enabled = secretsBridge.get('CANARY_ENABLED', 'false') === 'true';
  const percentage = parseInt(secretsBridge.get('CANARY_PERCENTAGE', '0'), 10);
  const strategy = secretsBridge.get('CANARY_STRATEGY', 'percentage') as CanaryConfig['strategy'];

  return {
    enabled,
    percentage: Math.max(0, Math.min(100, percentage)),
    strategy,
    headerKey: secretsBridge.get('CANARY_HEADER_KEY', 'X-Canary-Route'),
    whitelist: secretsBridge.get('CANARY_WHITELIST', '').split(',').filter(Boolean),
    blacklist: secretsBridge.get('CANARY_BLACKLIST', '').split(',').filter(Boolean),
  };
}

/**
 * Determine if request should go to canary
 */
export function shouldRouteToCanary(
  req: Request,
  config: CanaryConfig
): boolean {
  if (!config.enabled || config.percentage === 0) {
    return false;
  }

  // Strategy: Header-based override
  if (config.strategy === 'header' && config.headerKey) {
    const headerValue = req.headers[config.headerKey.toLowerCase()];
    if (headerValue === 'true' || headerValue === '1') {
      logger.debug('Routing to canary via header', { header: config.headerKey });
      return true;
    }
    if (headerValue === 'false' || headerValue === '0') {
      return false;
    }
  }

  // Strategy: User ID whitelist/blacklist
  if (config.strategy === 'user-id') {
    const userId = (req as any).user?.sub;
    if (userId) {
      if (config.blacklist?.includes(userId)) {
        return false;
      }
      if (config.whitelist?.includes(userId)) {
        logger.debug('Routing to canary via user whitelist', { userId });
        return true;
      }
    }
  }

  // Strategy: Tenant ID routing
  if (config.strategy === 'tenant-id') {
    const tenantId = (req as any).tenantId;
    if (tenantId) {
      if (config.blacklist?.includes(tenantId)) {
        return false;
      }
      if (config.whitelist?.includes(tenantId)) {
        logger.debug('Routing to canary via tenant whitelist', { tenantId });
        return true;
      }
    }
  }

  // Strategy: Percentage-based (deterministic hash)
  const routingKey = getRoutingKey(req);
  const hash = hashString(routingKey);
  const bucket = hash % 100;

  const shouldRoute = bucket < config.percentage;

  if (shouldRoute) {
    logger.debug('Routing to canary via percentage', {
      routingKey: routingKey.substring(0, 16),
      bucket,
      percentage: config.percentage,
    });
  }

  return shouldRoute;
}

/**
 * Get routing key for deterministic hashing
 */
function getRoutingKey(req: Request): string {
  // Try user ID first (sticky per user)
  const userId = (req as any).user?.sub;
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to session ID
  const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
  if (sessionId) {
    return `session:${sessionId}`;
  }

  // Last resort: IP address (less sticky due to NAT)
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Simple string hash (non-cryptographic)
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Express middleware for canary routing
 */
export function canaryRouter(canaryEndpoint: string) {
  const config = loadCanaryConfig();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = Date.now();

    try {
      if (shouldRouteToCanary(req, config)) {
        // Mark request as canary
        (req as any).canaryRoute = true;
        res.setHeader('X-Canary-Version', 'canary');

        logger.info('Request routed to canary', {
          method: req.method,
          path: req.path,
          routingKey: getRoutingKey(req).substring(0, 16),
        });

        // In production, proxy to canary endpoint
        // For now, just pass through with marker
        next();
      } else {
        (req as any).canaryRoute = false;
        res.setHeader('X-Canary-Version', 'stable');
        next();
      }
    } catch (err) {
      logger.error('Canary routing error', { error: err });
      // Fail safe: route to stable
      (req as any).canaryRoute = false;
      next();
    } finally {
      const duration = Date.now() - startTime;
      logger.debug('Canary routing decision', {
        decision: (req as any).canaryRoute ? 'canary' : 'stable',
        duration,
      });
    }
  };
}

/**
 * Check canary health and KPIs
 */
export async function checkCanaryHealth(
  canary: CanaryVersion
): Promise<{ healthy: boolean; reason?: string }> {
  try {
    // In production, make HTTP request to healthcheck endpoint
    // const response = await fetch(canary.healthcheck);
    // if (!response.ok) return { healthy: false, reason: 'Healthcheck failed' };

    // Check KPI thresholds
    const thresholds = {
      maxErrorRate: parseFloat(secretsBridge.get('CANARY_MAX_ERROR_RATE', '5')), // 5%
      maxP95Latency: parseInt(secretsBridge.get('CANARY_MAX_P95_LATENCY', '1000'), 10), // 1s
      minRequestCount: parseInt(secretsBridge.get('CANARY_MIN_REQUESTS', '100'), 10),
    };

    if (canary.kpis.requestCount < thresholds.minRequestCount) {
      return { healthy: true, reason: 'Insufficient data for KPI evaluation' };
    }

    if (canary.kpis.errorRate > thresholds.maxErrorRate) {
      return {
        healthy: false,
        reason: `Error rate ${canary.kpis.errorRate.toFixed(2)}% exceeds threshold ${thresholds.maxErrorRate}%`,
      };
    }

    if (canary.kpis.p95Latency > thresholds.maxP95Latency) {
      return {
        healthy: false,
        reason: `P95 latency ${canary.kpis.p95Latency}ms exceeds threshold ${thresholds.maxP95Latency}ms`,
      };
    }

    return { healthy: true };
  } catch (err) {
    logger.error('Canary health check failed', { error: err });
    return { healthy: false, reason: 'Health check error' };
  }
}

/**
 * Gradually ramp up canary traffic
 */
export async function rampUpCanary(
  currentPercentage: number,
  step: number = 10,
  maxPercentage: number = 100
): Promise<number> {
  const newPercentage = Math.min(currentPercentage + step, maxPercentage);

  logger.info('Ramping up canary traffic', {
    from: currentPercentage,
    to: newPercentage,
    step,
  });

  // Update environment variable (in production, update config store)
  process.env.CANARY_PERCENTAGE = newPercentage.toString();

  return newPercentage;
}

/**
 * Abort canary and route all traffic to stable
 */
export async function abortCanary(reason: string): Promise<void> {
  logger.error('Aborting canary deployment', { reason });

  // Set percentage to 0
  process.env.CANARY_ENABLED = 'false';
  process.env.CANARY_PERCENTAGE = '0';

  // Trigger alert
  // await alerting.sendAlert('canary-abort', { reason });

  logger.info('Canary deployment aborted, all traffic routed to stable');
}

/**
 * Promote canary to stable (100% traffic)
 */
export async function promoteCanary(): Promise<void> {
  logger.info('Promoting canary to stable (100% traffic)');

  process.env.CANARY_PERCENTAGE = '100';

  // After observing stable performance, swap stable<->canary
  // Then set percentage back to 0 (new stable is old canary)

  logger.info('Canary promoted successfully');
}
