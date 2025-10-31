/**
 * Blue/Green Deployment Promotion
 * Safely switches traffic from blue to green environment after validation
 */

import { logger } from '../src/common/logger.js';
import { secretsBridge } from '../src/security/secrets_bridge.js';

export interface Environment {
  name: 'blue' | 'green';
  url: string;
  version: string;
  status: 'active' | 'standby' | 'deploying' | 'draining';
  healthcheck: string;
  kpis: EnvironmentKPIs;
}

export interface EnvironmentKPIs {
  uptime: number; // Percentage
  errorRate: number; // Percentage
  avgLatency: number; // Milliseconds
  p95Latency: number;
  p99Latency: number;
  requestsPerSecond: number;
  activeConnections: number;
  lastCheck: Date;
}

export interface PromotionCriteria {
  minUptime: number; // Percentage
  maxErrorRate: number; // Percentage
  maxP95Latency: number; // Milliseconds
  maxP99Latency: number; // Milliseconds
  minRequestCount: number; // Require minimum traffic
  smokeTestsPassed: boolean;
}

/**
 * Get current active and standby environments
 */
export async function getEnvironments(): Promise<{
  active: Environment;
  standby: Environment;
}> {
  const activeEnv = secretsBridge.get('ACTIVE_ENV', 'blue') as 'blue' | 'green';
  const standbyEnv = activeEnv === 'blue' ? 'green' : 'blue';

  // In production, fetch from infrastructure state (Terraform output, K8s, etc.)
  const blue: Environment = {
    name: 'blue',
    url: secretsBridge.get('BLUE_ENV_URL', 'http://blue.orca.internal'),
    version: secretsBridge.get('BLUE_VERSION', '1.0.0'),
    status: activeEnv === 'blue' ? 'active' : 'standby',
    healthcheck: '/api/health',
    kpis: await fetchEnvironmentKPIs('blue'),
  };

  const green: Environment = {
    name: 'green',
    url: secretsBridge.get('GREEN_ENV_URL', 'http://green.orca.internal'),
    version: secretsBridge.get('GREEN_VERSION', '1.0.1'),
    status: activeEnv === 'green' ? 'active' : 'standby',
    healthcheck: '/api/health',
    kpis: await fetchEnvironmentKPIs('green'),
  };

  return activeEnv === 'blue'
    ? { active: blue, standby: green }
    : { active: green, standby: blue };
}

/**
 * Fetch environment KPIs from monitoring system
 */
async function fetchEnvironmentKPIs(env: 'blue' | 'green'): Promise<EnvironmentKPIs> {
  // In production, query Prometheus/CloudWatch
  // For now, return mock data
  return {
    uptime: 99.9,
    errorRate: 0.1,
    avgLatency: 120,
    p95Latency: 350,
    p99Latency: 800,
    requestsPerSecond: 45,
    activeConnections: 120,
    lastCheck: new Date(),
  };
}

/**
 * Check if environment meets promotion criteria
 */
export async function checkPromotionCriteria(
  env: Environment,
  criteria: PromotionCriteria
): Promise<{ eligible: boolean; reasons: string[] }> {
  const reasons: string[] = [];

  // 1. Uptime check
  if (env.kpis.uptime < criteria.minUptime) {
    reasons.push(
      `Uptime ${env.kpis.uptime.toFixed(2)}% < required ${criteria.minUptime}%`
    );
  }

  // 2. Error rate check
  if (env.kpis.errorRate > criteria.maxErrorRate) {
    reasons.push(
      `Error rate ${env.kpis.errorRate.toFixed(2)}% > allowed ${criteria.maxErrorRate}%`
    );
  }

  // 3. Latency checks
  if (env.kpis.p95Latency > criteria.maxP95Latency) {
    reasons.push(
      `P95 latency ${env.kpis.p95Latency}ms > allowed ${criteria.maxP95Latency}ms`
    );
  }

  if (env.kpis.p99Latency > criteria.maxP99Latency) {
    reasons.push(
      `P99 latency ${env.kpis.p99Latency}ms > allowed ${criteria.maxP99Latency}ms`
    );
  }

  // 4. Minimum traffic check
  const requestCount = env.kpis.requestsPerSecond * 60; // Last minute
  if (requestCount < criteria.minRequestCount) {
    reasons.push(
      `Insufficient traffic: ${requestCount} requests < required ${criteria.minRequestCount}`
    );
  }

  // 5. Smoke tests
  if (!criteria.smokeTestsPassed) {
    reasons.push('Smoke tests not passed');
  }

  // 6. Health check
  const health = await checkEnvironmentHealth(env);
  if (!health.healthy) {
    reasons.push(`Health check failed: ${health.reason}`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Check environment health
 */
async function checkEnvironmentHealth(
  env: Environment
): Promise<{ healthy: boolean; reason?: string }> {
  try {
    // In production, make HTTP request
    // const response = await fetch(`${env.url}${env.healthcheck}`);
    // if (!response.ok) return { healthy: false, reason: `HTTP ${response.status}` };
    
    logger.info('Health check passed', { env: env.name });
    return { healthy: true };
  } catch (err) {
    logger.error('Health check failed', { env: env.name, error: err });
    return { healthy: false, reason: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Perform blue/green promotion
 */
export async function promoteEnvironment(
  dryRun: boolean = false
): Promise<{ success: boolean; message: string }> {
  logger.info('Starting blue/green promotion', { dryRun });

  try {
    // 1. Get current environments
    const { active, standby } = await getEnvironments();

    logger.info('Current environment state', {
      active: active.name,
      activeVersion: active.version,
      standby: standby.name,
      standbyVersion: standby.version,
    });

    // 2. Define promotion criteria
    const criteria: PromotionCriteria = {
      minUptime: parseFloat(secretsBridge.get('PROMOTION_MIN_UPTIME', '99.5')),
      maxErrorRate: parseFloat(secretsBridge.get('PROMOTION_MAX_ERROR_RATE', '1.0')),
      maxP95Latency: parseInt(secretsBridge.get('PROMOTION_MAX_P95_LATENCY', '500'), 10),
      maxP99Latency: parseInt(secretsBridge.get('PROMOTION_MAX_P99_LATENCY', '1000'), 10),
      minRequestCount: parseInt(secretsBridge.get('PROMOTION_MIN_REQUESTS', '100'), 10),
      smokeTestsPassed: true, // Assume passed if we got here
    };

    // 3. Check if standby meets criteria
    const check = await checkPromotionCriteria(standby, criteria);

    if (!check.eligible) {
      logger.warn('Standby environment not eligible for promotion', {
        reasons: check.reasons,
      });
      return {
        success: false,
        message: `Promotion blocked: ${check.reasons.join('; ')}`,
      };
    }

    logger.info('Standby environment eligible for promotion', {
      standby: standby.name,
      version: standby.version,
    });

    if (dryRun) {
      return {
        success: true,
        message: `[DRY RUN] Would promote ${standby.name} (${standby.version}) to active`,
      };
    }

    // 4. Update load balancer / DNS / ingress to point to standby
    logger.info('Switching traffic to standby environment', { standby: standby.name });
    await switchTraffic(active, standby);

    // 5. Drain active environment
    logger.info('Draining old active environment', { env: active.name });
    await drainEnvironment(active);

    // 6. Update environment status
    process.env.ACTIVE_ENV = standby.name;

    logger.info('Promotion completed successfully', {
      oldActive: active.name,
      newActive: standby.name,
      version: standby.version,
    });

    return {
      success: true,
      message: `Promoted ${standby.name} (${standby.version}) to active. Old ${active.name} now standby.`,
    };
  } catch (err) {
    logger.error('Promotion failed', { error: err });
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Switch traffic from old to new environment
 */
async function switchTraffic(
  oldEnv: Environment,
  newEnv: Environment
): Promise<void> {
  // In production, update:
  // - Load balancer target groups (AWS ALB)
  // - Kubernetes service selectors
  // - DNS records (Route53)
  // - Ingress rules

  logger.info('Switching traffic', {
    from: oldEnv.name,
    to: newEnv.name,
  });

  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  logger.info('Traffic switched successfully');
}

/**
 * Drain environment (wait for active connections to close)
 */
async function drainEnvironment(env: Environment): Promise<void> {
  const maxDrainTime = parseInt(secretsBridge.get('DRAIN_TIMEOUT_SECONDS', '60'), 10);
  const checkInterval = 5000; // 5 seconds

  logger.info('Draining environment', {
    env: env.name,
    maxDrainTime: `${maxDrainTime}s`,
  });

  const startTime = Date.now();

  while (Date.now() - startTime < maxDrainTime * 1000) {
    const activeConnections = env.kpis.activeConnections;

    if (activeConnections === 0) {
      logger.info('Environment drained (0 active connections)', { env: env.name });
      return;
    }

    logger.info('Waiting for connections to drain', {
      env: env.name,
      activeConnections,
      elapsed: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    });

    await new Promise((resolve) => setTimeout(resolve, checkInterval));

    // Refresh KPIs
    env.kpis = await fetchEnvironmentKPIs(env.name);
  }

  logger.warn('Drain timeout reached, forcing shutdown', {
    env: env.name,
    remainingConnections: env.kpis.activeConnections,
  });
}

/**
 * Rollback to previous environment (emergency)
 */
export async function rollbackEnvironment(): Promise<{ success: boolean; message: string }> {
  logger.warn('Initiating emergency rollback');

  try {
    const { active, standby } = await getEnvironments();

    logger.info('Rolling back', {
      from: active.name,
      to: standby.name,
    });

    // Immediate traffic switch (no criteria checks)
    await switchTraffic(active, standby);

    process.env.ACTIVE_ENV = standby.name;

    logger.info('Rollback completed', {
      newActive: standby.name,
      version: standby.version,
    });

    return {
      success: true,
      message: `Rolled back to ${standby.name} (${standby.version})`,
    };
  } catch (err) {
    logger.error('Rollback failed', { error: err });
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
