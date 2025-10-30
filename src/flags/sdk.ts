/**
 * Feature Flags SDK - Client Library
 * Easy-to-use interface for checking feature flags
 */

import { getFlag, getFlagForContext } from './flags_service.js';

export class FlagsSDK {
  private tenantId?: string;
  private userId?: string;

  constructor(context?: { tenantId?: string; userId?: string }) {
    this.tenantId = context?.tenantId;
    this.userId = context?.userId;
  }

  /**
   * Check if flag is enabled
   */
  isEnabled(flagKey: string): boolean {
    if (this.tenantId || this.userId) {
      return getFlagForContext(flagKey, {
        tenantId: this.tenantId,
        userId: this.userId,
      });
    }

    return getFlag(flagKey);
  }

  /**
   * Get flag value with default
   */
  get(flagKey: string, defaultValue: boolean = false): boolean {
    try {
      return this.isEnabled(flagKey);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Execute code if flag enabled
   */
  when(flagKey: string, fn: () => void): void {
    if (this.isEnabled(flagKey)) {
      fn();
    }
  }

  /**
   * Execute code based on flag state
   */
  ifEnabled(flagKey: string, onEnabled: () => void, onDisabled?: () => void): void {
    if (this.isEnabled(flagKey)) {
      onEnabled();
    } else if (onDisabled) {
      onDisabled();
    }
  }
}

/**
 * Global instance (without context)
 */
export const flags = new FlagsSDK();

/**
 * Create SDK instance with context
 */
export function createFlagsClient(context: {
  tenantId?: string;
  userId?: string;
}): FlagsSDK {
  return new FlagsSDK(context);
}
