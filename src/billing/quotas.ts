/**
 * Quota Management - Multi-tenant Resource Limits
 * Enforces usage quotas per tenant based on subscription plan
 */

import { logger } from '@/common/logger.js';

export interface Quota {
  resource: QuotaResource;
  limit: number; // -1 = unlimited
  period: QuotaPeriod;
  current: number;
  resetAt: Date;
}

export type QuotaResource =
  | 'workflows'
  | 'workflow_executions'
  | 'reports'
  | 'api_requests'
  | 'storage_mb'
  | 'seats';

export type QuotaPeriod = 'hour' | 'day' | 'month' | 'lifetime';

export interface Plan {
  id: string;
  name: string;
  quotas: Record<QuotaResource, { limit: number; period: QuotaPeriod }>;
}

// Subscription plans with quotas
export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    quotas: {
      workflows: { limit: 5, period: 'lifetime' },
      workflow_executions: { limit: 100, period: 'month' },
      reports: { limit: 10, period: 'month' },
      api_requests: { limit: 1000, period: 'day' },
      storage_mb: { limit: 100, period: 'lifetime' },
      seats: { limit: 1, period: 'lifetime' },
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    quotas: {
      workflows: { limit: 25, period: 'lifetime' },
      workflow_executions: { limit: 1000, period: 'month' },
      reports: { limit: 100, period: 'month' },
      api_requests: { limit: 10000, period: 'day' },
      storage_mb: { limit: 1000, period: 'lifetime' },
      seats: { limit: 5, period: 'lifetime' },
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    quotas: {
      workflows: { limit: 100, period: 'lifetime' },
      workflow_executions: { limit: 10000, period: 'month' },
      reports: { limit: 1000, period: 'month' },
      api_requests: { limit: 100000, period: 'day' },
      storage_mb: { limit: 10000, period: 'lifetime' },
      seats: { limit: 25, period: 'lifetime' },
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    quotas: {
      workflows: { limit: -1, period: 'lifetime' }, // Unlimited
      workflow_executions: { limit: -1, period: 'month' },
      reports: { limit: -1, period: 'month' },
      api_requests: { limit: -1, period: 'day' },
      storage_mb: { limit: -1, period: 'lifetime' },
      seats: { limit: -1, period: 'lifetime' },
    },
  },
};

/**
 * Get tenant's current quotas
 */
export async function getTenantQuotas(tenantId: string): Promise<Quota[]> {
  // In production: query database for tenant's plan and usage
  const plan = await getTenantPlan(tenantId);

  const quotas: Quota[] = [];

  for (const [resource, config] of Object.entries(plan.quotas)) {
    const current = await getCurrentUsage(tenantId, resource as QuotaResource);
    const resetAt = calculateResetTime(config.period);

    quotas.push({
      resource: resource as QuotaResource,
      limit: config.limit,
      period: config.period,
      current,
      resetAt,
    });
  }

  return quotas;
}

/**
 * Check if tenant has quota available
 */
export async function checkQuota(
  tenantId: string,
  resource: QuotaResource,
  requestedAmount: number = 1
): Promise<{ allowed: boolean; reason?: string; retryAfter?: Date }> {
  const quotas = await getTenantQuotas(tenantId);
  const quota = quotas.find((q) => q.resource === resource);

  if (!quota) {
    logger.error('Quota not found for resource', { tenantId, resource });
    return { allowed: false, reason: 'Quota not configured' };
  }

  // Unlimited
  if (quota.limit === -1) {
    return { allowed: true };
  }

  // Check if quota exceeded
  if (quota.current + requestedAmount > quota.limit) {
    logger.warn('Quota exceeded', {
      tenantId,
      resource,
      current: quota.current,
      limit: quota.limit,
      requested: requestedAmount,
    });

    return {
      allowed: false,
      reason: `${resource} quota exceeded (${quota.current}/${quota.limit})`,
      retryAfter: quota.resetAt,
    };
  }

  return { allowed: true };
}

/**
 * Increment quota usage
 */
export async function incrementQuota(
  tenantId: string,
  resource: QuotaResource,
  amount: number = 1
): Promise<void> {
  // In production: atomic increment in database
  logger.debug('Incrementing quota', { tenantId, resource, amount });

  // Mock: await db.query('UPDATE tenant_quotas SET current = current + $1 WHERE tenant_id = $2 AND resource = $3', [amount, tenantId, resource]);
}

/**
 * Reset quota (called periodically by cron)
 */
export async function resetQuotas(period: QuotaPeriod): Promise<number> {
  logger.info('Resetting quotas', { period });

  // In production: reset all quotas with matching period
  // Mock: const result = await db.query('UPDATE tenant_quotas SET current = 0 WHERE period = $1 AND reset_at <= NOW()', [period]);

  const resetCount = 0; // Mock
  logger.info('Quotas reset', { period, count: resetCount });

  return resetCount;
}

/**
 * Get tenant's plan
 */
async function getTenantPlan(tenantId: string): Promise<Plan> {
  // In production: query database
  // Mock: const result = await db.query('SELECT plan_id FROM tenants WHERE id = $1', [tenantId]);

  // Default to free plan
  return PLANS.free!;
}

/**
 * Get current usage for resource
 */
async function getCurrentUsage(
  tenantId: string,
  resource: QuotaResource
): Promise<number> {
  // In production: query from usage tracking table
  // Mock: const result = await db.query('SELECT current FROM tenant_quotas WHERE tenant_id = $1 AND resource = $2', [tenantId, resource]);

  return 0; // Mock
}

/**
 * Calculate reset time based on period
 */
function calculateResetTime(period: QuotaPeriod): Date {
  const now = new Date();

  switch (period) {
    case 'hour':
      now.setHours(now.getHours() + 1, 0, 0, 0);
      return now;

    case 'day':
      now.setDate(now.getDate() + 1);
      now.setHours(0, 0, 0, 0);
      return now;

    case 'month':
      now.setMonth(now.getMonth() + 1, 1);
      now.setHours(0, 0, 0, 0);
      return now;

    case 'lifetime':
      return new Date('2099-12-31'); // Far future (never resets)

    default:
      return now;
  }
}

/**
 * Express middleware to enforce quotas
 */
export function requireQuota(resource: QuotaResource, amount: number = 1) {
  return async (req: any, res: any, next: any): Promise<void> => {
    const tenantId = req.tenantId || req.user?.tenant_id;

    if (!tenantId) {
      res.status(401).json({ error: 'Tenant ID required' });
      return;
    }

    const check = await checkQuota(tenantId, resource, amount);

    if (!check.allowed) {
      res.status(429).json({
        error: 'Quota Exceeded',
        message: check.reason,
        retryAfter: check.retryAfter?.toISOString(),
      });
      return;
    }

    // Increment usage on successful request
    res.on('finish', () => {
      if (res.statusCode < 400) {
        incrementQuota(tenantId, resource, amount).catch((err) => {
          logger.error('Failed to increment quota', { error: err });
        });
      }
    });

    next();
  };
}
