/**
 * Feature Flags Service - Runtime Configuration
 * Enables/disables features without redeployment
 */

import { logger } from '@/common/logger.js';

export interface Flag {
  key: string;
  enabled: boolean;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  targeting?: {
    tenants?: string[];
    users?: string[];
    percentage?: number;
  };
}

// In-memory cache (use Redis/database in production)
const flagsCache = new Map<string, Flag>();

/**
 * Initialize default flags
 */
export function initializeFlags(): void {
  const defaults: Flag[] = [
    {
      key: 'canary_enabled',
      enabled: false,
      description: 'Enable canary deployment routing',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      tags: ['deployment'],
    },
    {
      key: 'chaos_mode',
      enabled: false,
      description: 'Enable chaos engineering experiments',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      tags: ['testing', 'chaos'],
    },
    {
      key: 'telemetry_sampling',
      enabled: true,
      description: 'Enable telemetry sampling to reduce costs',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      tags: ['telemetry', 'cost'],
    },
    {
      key: 'new_report_engine',
      enabled: false,
      description: 'Use new UADSI report engine (beta)',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      tags: ['feature', 'beta'],
      targeting: {
        percentage: 10, // 10% rollout
      },
    },
    {
      key: 'advanced_analytics',
      enabled: false,
      description: 'Enable advanced analytics dashboard',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
      tags: ['feature'],
    },
  ];

  for (const flag of defaults) {
    flagsCache.set(flag.key, flag);
  }

  logger.info('Feature flags initialized', { count: defaults.length });
}

/**
 * Get flag value
 */
export function getFlag(key: string): boolean {
  const flag = flagsCache.get(key);
  return flag?.enabled ?? false;
}

/**
 * Get flag with context (for targeting)
 */
export function getFlagForContext(
  key: string,
  context: {
    tenantId?: string;
    userId?: string;
  }
): boolean {
  const flag = flagsCache.get(key);
  if (!flag) return false;

  // Check targeting rules
  if (flag.targeting) {
    // Tenant-specific targeting
    if (flag.targeting.tenants && context.tenantId) {
      if (flag.targeting.tenants.includes(context.tenantId)) {
        return true;
      }
    }

    // User-specific targeting
    if (flag.targeting.users && context.userId) {
      if (flag.targeting.users.includes(context.userId)) {
        return true;
      }
    }

    // Percentage-based targeting
    if (flag.targeting.percentage !== undefined) {
      const hash = hashString(context.userId || context.tenantId || '');
      const bucket = hash % 100;
      return bucket < flag.targeting.percentage;
    }
  }

  return flag.enabled;
}

/**
 * Set flag value
 */
export async function setFlag(
  key: string,
  enabled: boolean,
  updatedBy: string
): Promise<void> {
  const flag = flagsCache.get(key);

  if (!flag) {
    throw new Error(`Flag not found: ${key}`);
  }

  flag.enabled = enabled;
  flag.updatedAt = new Date();
  flag.updatedBy = updatedBy;

  flagsCache.set(key, flag);

  // In production: persist to database
  // await db.query('UPDATE flags SET enabled = $1, updated_at = NOW(), updated_by = $2 WHERE key = $3', [enabled, updatedBy, key]);

  logger.info('Flag updated', { key, enabled, updatedBy });
}

/**
 * Create new flag
 */
export async function createFlag(
  key: string,
  description: string,
  createdBy: string,
  tags: string[] = []
): Promise<Flag> {
  if (flagsCache.has(key)) {
    throw new Error(`Flag already exists: ${key}`);
  }

  const flag: Flag = {
    key,
    enabled: false,
    description,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy,
    tags,
  };

  flagsCache.set(key, flag);

  logger.info('Flag created', { key, createdBy });

  return flag;
}

/**
 * List all flags
 */
export function listFlags(tag?: string): Flag[] {
  const flags = Array.from(flagsCache.values());

  if (tag) {
    return flags.filter((f) => f.tags.includes(tag));
  }

  return flags;
}

/**
 * Hash string for consistent bucketing
 */
function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Initialize on module load
initializeFlags();
