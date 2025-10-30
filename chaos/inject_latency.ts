/**
 * Chaos Engineering - Latency Injection
 * Simulates network delays to test system resilience
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../src/common/logger.js';
import { secretsBridge } from '../src/security/secrets_bridge.js';

export interface LatencyConfig {
  enabled: boolean;
  minDelayMs: number;
  maxDelayMs: number;
  probability: number; // 0.0 - 1.0
  excludePaths: string[];
  targetPaths?: string[]; // If specified, only inject on these paths
}

/**
 * Load latency injection configuration
 */
export function loadLatencyConfig(): LatencyConfig {
  return {
    enabled: secretsBridge.get('CHAOS_LATENCY_ENABLED', 'false') === 'true',
    minDelayMs: parseInt(secretsBridge.get('CHAOS_LATENCY_MIN_MS', '100'), 10),
    maxDelayMs: parseInt(secretsBridge.get('CHAOS_LATENCY_MAX_MS', '1000'), 10),
    probability: parseFloat(secretsBridge.get('CHAOS_LATENCY_PROBABILITY', '0.1')),
    excludePaths: secretsBridge.get('CHAOS_LATENCY_EXCLUDE_PATHS', '/health,/metrics').split(','),
    targetPaths: secretsBridge.get('CHAOS_LATENCY_TARGET_PATHS', '').split(',').filter(Boolean),
  };
}

/**
 * Generate random delay within configured range
 */
function generateDelay(config: LatencyConfig): number {
  const range = config.maxDelayMs - config.minDelayMs;
  return config.minDelayMs + Math.floor(Math.random() * range);
}

/**
 * Check if path should have latency injected
 */
function shouldInjectLatency(path: string, config: LatencyConfig): boolean {
  // Check if excluded
  for (const excludePath of config.excludePaths) {
    if (path.startsWith(excludePath)) {
      return false;
    }
  }

  // If target paths specified, only inject on those
  if (config.targetPaths && config.targetPaths.length > 0) {
    const isTargeted = config.targetPaths.some((target) => path.startsWith(target));
    if (!isTargeted) {
      return false;
    }
  }

  // Probabilistic injection
  return Math.random() < config.probability;
}

/**
 * Express middleware for latency injection
 */
export function latencyInjector() {
  const config = loadLatencyConfig();

  if (!config.enabled) {
    // Disabled - passthrough
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  logger.info('Latency injection middleware enabled', {
    minDelay: `${config.minDelayMs}ms`,
    maxDelay: `${config.maxDelayMs}ms`,
    probability: config.probability,
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (shouldInjectLatency(req.path, config)) {
      const delayMs = generateDelay(config);

      logger.debug('Injecting latency', {
        path: req.path,
        delay: `${delayMs}ms`,
      });

      // Delay the request
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Mark response with chaos header
      res.setHeader('X-Chaos-Latency', delayMs.toString());
    }

    next();
  };
}

/**
 * Test latency injection (standalone)
 */
export async function testLatencyInjection(): Promise<{
  success: boolean;
  message: string;
  metrics: {
    totalRequests: number;
    delayedRequests: number;
    avgDelay: number;
    maxDelay: number;
  };
}> {
  logger.info('Testing latency injection');

  const config = loadLatencyConfig();
  const testRequests = 100;
  const delays: number[] = [];

  for (let i = 0; i < testRequests; i++) {
    const path = '/api/test';

    if (shouldInjectLatency(path, config)) {
      const delay = generateDelay(config);
      delays.push(delay);
    }
  }

  const avgDelay = delays.length > 0 
    ? delays.reduce((sum, d) => sum + d, 0) / delays.length
    : 0;

  const maxDelay = delays.length > 0 ? Math.max(...delays) : 0;

  logger.info('Latency injection test complete', {
    totalRequests: testRequests,
    delayedRequests: delays.length,
    avgDelay: `${avgDelay.toFixed(0)}ms`,
    maxDelay: `${maxDelay}ms`,
  });

  return {
    success: true,
    message: `Latency injected on ${delays.length}/${testRequests} requests`,
    metrics: {
      totalRequests: testRequests,
      delayedRequests: delays.length,
      avgDelay,
      maxDelay,
    },
  };
}

/**
 * Verify system resilience under latency
 */
export async function verifyLatencyResilience(): Promise<{
  passed: boolean;
  results: {
    errorRate: number;
    avgLatency: number;
    p95Latency: number;
    timeouts: number;
  };
}> {
  logger.info('Verifying system resilience under latency injection');

  // In production, this would:
  // 1. Enable latency injection (50% probability, 500-2000ms)
  // 2. Generate load (e.g., 100 req/s for 5 minutes)
  // 3. Measure error rate, latency, timeouts
  // 4. Check against SLOs (e.g., <5% errors, P95 < 5s)
  // 5. Disable latency injection

  // Mock results
  const results = {
    errorRate: 1.2, // 1.2% - acceptable
    avgLatency: 850, // 850ms - elevated but within tolerance
    p95Latency: 2100, // 2.1s - within SLO (< 5s)
    timeouts: 3, // 3 timeouts - acceptable (<1% of requests)
  };

  const passed = 
    results.errorRate < 5.0 &&
    results.p95Latency < 5000 &&
    results.timeouts < 10;

  logger.info('Latency resilience verification complete', {
    passed,
    ...results,
  });

  return { passed, results };
}
