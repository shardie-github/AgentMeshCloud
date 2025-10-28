/**
 * Feature Flags Service
 * 
 * Provides server-resolved feature flags and kill switches stored in Supabase config_flags
 * with RLS. Client gets read-only snapshot for performance.
 */

import { createClient } from '@supabase/supabase-js';

export interface FeatureFlag {
  key: string;
  value: any;
  enabled: boolean;
  environment: string;
  description?: string;
  updatedAt: string;
}

export interface FeatureFlagsSnapshot {
  flags: Record<string, FeatureFlag>;
  timestamp: string;
  ttl: number; // Time to live in seconds
}

export class FeatureFlagsService {
  private supabase: any;
  private snapshot: FeatureFlagsSnapshot | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    private ttlSeconds: number = 300 // 5 minutes default TTL
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get a feature flag value with fallback
   */
  async getFlag(key: string, fallback: any = null): Promise<any> {
    const snapshot = await this.getSnapshot();
    const flag = snapshot.flags[key];
    
    if (!flag || !flag.enabled) {
      return fallback;
    }
    
    return flag.value;
  }

  /**
   * Check if a feature is enabled
   */
  async isEnabled(key: string): Promise<boolean> {
    const value = await this.getFlag(key, false);
    return Boolean(value?.enabled ?? value);
  }

  /**
   * Check if maintenance mode is active
   */
  async isMaintenanceMode(): Promise<boolean> {
    return this.isEnabled('maintenance_mode');
  }

  /**
   * Get maintenance mode message
   */
  async getMaintenanceMessage(): Promise<string> {
    const value = await this.getFlag('maintenance_mode', {});
    return value?.message || 'System maintenance in progress. Please try again later.';
  }

  /**
   * Check if a kill switch is active
   */
  async isKillSwitchActive(key: string): Promise<boolean> {
    const value = await this.getFlag(key, { enabled: true });
    return !value?.enabled;
  }

  /**
   * Get kill switch reason
   */
  async getKillSwitchReason(key: string): Promise<string | null> {
    const value = await this.getFlag(key, {});
    return value?.reason || null;
  }

  /**
   * Check if user is in rollout percentage
   */
  async isInRollout(key: string, userId?: string): Promise<boolean> {
    const value = await this.getFlag(key, {});
    const rolloutPercentage = value?.rollout_percentage || 0;
    
    if (rolloutPercentage >= 100) return true;
    if (rolloutPercentage <= 0) return false;
    if (!userId) return false;
    
    // Simple hash-based rollout
    const hash = this.hashString(userId + key);
    return (hash % 100) < rolloutPercentage;
  }

  /**
   * Get current snapshot (with caching)
   */
  async getSnapshot(): Promise<FeatureFlagsSnapshot> {
    // Return cached snapshot if still valid
    if (this.snapshot && this.isSnapshotValid()) {
      return this.snapshot;
    }

    // If refresh is already in progress, wait for it
    if (this.refreshPromise) {
      await this.refreshPromise;
      return this.snapshot!;
    }

    // Start refresh
    this.refreshPromise = this.refreshSnapshot();
    await this.refreshPromise;
    this.refreshPromise = null;

    return this.snapshot!;
  }

  /**
   * Force refresh the snapshot
   */
  async refresh(): Promise<void> {
    this.snapshot = null;
    await this.getSnapshot();
  }

  /**
   * Refresh snapshot from Supabase
   */
  private async refreshSnapshot(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('config_flags')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.error('Failed to fetch feature flags:', error);
        throw error;
      }

      const flags: Record<string, FeatureFlag> = {};
      
      for (const flag of data || []) {
        flags[flag.key] = {
          key: flag.key,
          value: flag.value,
          enabled: flag.enabled,
          environment: flag.environment,
          description: flag.description,
          updatedAt: flag.updated_at,
        };
      }

      this.snapshot = {
        flags,
        timestamp: new Date().toISOString(),
        ttl: this.ttlSeconds,
      };

    } catch (error) {
      console.error('Failed to refresh feature flags snapshot:', error);
      // Return stale snapshot if available
      if (this.snapshot) {
        console.warn('Using stale feature flags snapshot');
        return;
      }
      throw error;
    }
  }

  /**
   * Check if current snapshot is still valid
   */
  private isSnapshotValid(): boolean {
    if (!this.snapshot) return false;
    
    const now = new Date();
    const snapshotTime = new Date(this.snapshot.timestamp);
    const ageSeconds = (now.getTime() - snapshotTime.getTime()) / 1000;
    
    return ageSeconds < this.snapshot.ttl;
  }

  /**
   * Simple string hash function for rollout
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Get all flags as a plain object (for client-side use)
   */
  async getAllFlags(): Promise<Record<string, any>> {
    const snapshot = await this.getSnapshot();
    const result: Record<string, any> = {};
    
    for (const [key, flag] of Object.entries(snapshot.flags)) {
      result[key] = flag.value;
    }
    
    return result;
  }
}

// Singleton instance
let featureFlagsService: FeatureFlagsService | null = null;

export function getFeatureFlagsService(): FeatureFlagsService {
  if (!featureFlagsService) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    
    featureFlagsService = new FeatureFlagsService(supabaseUrl, supabaseKey);
  }
  
  return featureFlagsService;
}

// Server-side service with service role key
export function getServerFeatureFlagsService(): FeatureFlagsService {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase service role configuration');
  }
  
  return new FeatureFlagsService(supabaseUrl, supabaseKey);
}
