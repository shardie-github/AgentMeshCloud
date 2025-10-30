/**
 * Secrets Bridge - Centralized secrets management
 * Supports Supabase KMS, environment variables, and future secret stores
 * All secrets MUST be loaded through this bridge (enforced by lint rule)
 */

import { config } from 'dotenv';
import { logger } from '@/common/logger.js';

config(); // Load .env file

export interface SecretsProvider {
  name: string;
  get(key: string): Promise<string | undefined>;
  set?(key: string, value: string): Promise<void>;
  delete?(key: string): Promise<void>;
}

/**
 * Environment variable provider (fallback)
 */
class EnvProvider implements SecretsProvider {
  name = 'env';

  async get(key: string): Promise<string | undefined> {
    return process.env[key];
  }
}

/**
 * Supabase KMS provider (production)
 */
class SupabaseKMSProvider implements SecretsProvider {
  name = 'supabase-kms';
  private cache = new Map<string, { value: string; expiry: number }>();
  private readonly cacheTTL = 300_000; // 5 minutes

  async get(key: string): Promise<string | undefined> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    try {
      // In production, fetch from Supabase Vault:
      // const { data } = await supabase.rpc('get_secret', { secret_name: key })
      
      // For now, fallback to env
      const value = process.env[key];
      
      if (value) {
        this.cache.set(key, {
          value,
          expiry: Date.now() + this.cacheTTL,
        });
      }

      return value;
    } catch (err) {
      logger.error('Failed to fetch secret from Supabase KMS', { key, error: err });
      return undefined;
    }
  }

  async set(key: string, value: string): Promise<void> {
    // In production: await supabase.rpc('set_secret', { secret_name: key, secret_value: value })
    logger.warn('Supabase KMS set not implemented, using env fallback');
    process.env[key] = value;
  }

  async delete(key: string): Promise<void> {
    // In production: await supabase.rpc('delete_secret', { secret_name: key })
    this.cache.delete(key);
    delete process.env[key];
  }
}

/**
 * Secrets Bridge - main interface
 */
class SecretsBridge {
  private providers: SecretsProvider[] = [];
  private accessLog = new Map<string, number>();

  constructor() {
    // Initialize providers in priority order
    const useSupabaseKMS = process.env.SECRETS_PROVIDER === 'supabase-kms';
    
    if (useSupabaseKMS) {
      this.providers.push(new SupabaseKMSProvider());
      logger.info('Secrets bridge initialized with Supabase KMS');
    }

    // Always include env as fallback
    this.providers.push(new EnvProvider());

    if (!useSupabaseKMS) {
      logger.warn('Secrets bridge using ENV fallback (not recommended for production)');
    }
  }

  /**
   * Get secret value (synchronous - loads from cache)
   */
  get(key: string, defaultValue?: string): string {
    // Track access for audit
    this.accessLog.set(key, (this.accessLog.get(key) || 0) + 1);

    // Try each provider in order
    for (const provider of this.providers) {
      const value = process.env[key]; // Sync access for now
      if (value !== undefined) {
        return value;
      }
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    logger.error('Secret not found and no default provided', { key });
    throw new Error(`Secret not found: ${key}`);
  }

  /**
   * Get secret value (asynchronous - fresh fetch)
   */
  async getAsync(key: string, defaultValue?: string): Promise<string> {
    this.accessLog.set(key, (this.accessLog.get(key) || 0) + 1);

    for (const provider of this.providers) {
      const value = await provider.get(key);
      if (value !== undefined) {
        return value;
      }
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`Secret not found: ${key}`);
  }

  /**
   * Set secret value
   */
  async set(key: string, value: string): Promise<void> {
    const provider = this.providers.find((p) => p.set);
    if (!provider?.set) {
      throw new Error('No writable secret provider available');
    }

    await provider.set(key, value);
    logger.info('Secret updated', { key, provider: provider.name });
  }

  /**
   * Delete secret
   */
  async delete(key: string): Promise<void> {
    const provider = this.providers.find((p) => p.delete);
    if (!provider?.delete) {
      throw new Error('No deletable secret provider available');
    }

    await provider.delete(key);
    logger.info('Secret deleted', { key, provider: provider.name });
  }

  /**
   * Check if secret exists
   */
  has(key: string): boolean {
    try {
      this.get(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get access statistics for audit
   */
  getAccessStats(): Record<string, number> {
    return Object.fromEntries(this.accessLog);
  }

  /**
   * Get required secrets with validation
   */
  getRequired(keys: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    const missing: string[] = [];

    for (const key of keys) {
      try {
        result[key] = this.get(key);
      } catch {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required secrets: ${missing.join(', ')}. Check .env.example`
      );
    }

    return result;
  }
}

// Export singleton instance
export const secretsBridge = new SecretsBridge();
