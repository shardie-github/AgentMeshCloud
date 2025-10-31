/**
 * Usage Metering System
 * 
 * Tracks billable events and quotas:
 * - Events/day
 * - AI-Ops actions
 * - API calls
 * - Storage usage
 * - Agent count
 * 
 * Features:
 * - Real-time quota enforcement
 * - Usage aggregation for billing
 * - Overage detection and alerting
 * - Time-series usage analytics
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

interface PlanQuotas {
  events_per_day: number;
  ai_ops_actions_per_month: number;
  api_calls_per_month: number;
  agents: number;
  storage_gb: number;
  users: number;
  retention_days: number;
}

interface PlanConfig {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  quotas: PlanQuotas;
  features: string[];
}

interface UsageRecord {
  tenant_id: string;
  metric_type: 'events' | 'ai_ops_actions' | 'api_calls' | 'storage' | 'agents' | 'users';
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface QuotaStatus {
  metric_type: string;
  used: number;
  limit: number;
  percentage: number;
  exceeded: boolean;
  remaining: number;
}

interface TenantUsage {
  tenant_id: string;
  plan_id: string;
  period_start: Date;
  period_end: Date;
  quotas: QuotaStatus[];
  overage_charges: number;
  total_cost: number;
}

export class UsageMetering {
  private supabase: SupabaseClient;
  private plans: Map<string, PlanConfig> = new Map();

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    this.loadPlans();
  }

  private loadPlans(): void {
    try {
      const plansPath = join(process.cwd(), 'billing', 'plans.yaml');
      const plansFile = readFileSync(plansPath, 'utf8');
      const config: any = yaml.load(plansFile);

      if (config.plans) {
        for (const plan of config.plans) {
          this.plans.set(plan.id, plan);
        }
      }

      console.log(`Loaded ${this.plans.size} billing plans`);
    } catch (error) {
      console.error('Failed to load billing plans:', error);
    }
  }

  /**
   * Record a usage event
   */
  async recordUsage(record: UsageRecord): Promise<void> {
    try {
      // Insert usage record
      const { error } = await this.supabase
        .from('usage_records')
        .insert({
          tenant_id: record.tenant_id,
          metric_type: record.metric_type,
          quantity: record.quantity,
          timestamp: record.timestamp.toISOString(),
          metadata: record.metadata || {}
        });

      if (error) {
        console.error('Failed to record usage:', error);
        throw error;
      }

      // Check quota and enforce if necessary
      await this.checkAndEnforceQuota(record.tenant_id, record.metric_type);

    } catch (error) {
      console.error('Error recording usage:', error);
      throw error;
    }
  }

  /**
   * Record event ingestion
   */
  async recordEvent(tenantId: string, eventCount: number = 1): Promise<void> {
    await this.recordUsage({
      tenant_id: tenantId,
      metric_type: 'events',
      quantity: eventCount,
      timestamp: new Date()
    });
  }

  /**
   * Record AI-Ops action
   */
  async recordAIAction(
    tenantId: string,
    actionType: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.recordUsage({
      tenant_id: tenantId,
      metric_type: 'ai_ops_actions',
      quantity: 1,
      timestamp: new Date(),
      metadata: { action_type: actionType, ...metadata }
    });
  }

  /**
   * Record API call
   */
  async recordAPICall(
    tenantId: string,
    endpoint: string,
    method: string
  ): Promise<void> {
    await this.recordUsage({
      tenant_id: tenantId,
      metric_type: 'api_calls',
      quantity: 1,
      timestamp: new Date(),
      metadata: { endpoint, method }
    });
  }

  /**
   * Update storage usage
   */
  async updateStorageUsage(tenantId: string, sizeGB: number): Promise<void> {
    // Get current storage usage
    const { data, error } = await this.supabase
      .from('tenant_storage')
      .select('size_gb')
      .eq('tenant_id', tenantId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // Upsert new storage size
    await this.supabase
      .from('tenant_storage')
      .upsert({
        tenant_id: tenantId,
        size_gb: sizeGB,
        updated_at: new Date().toISOString()
      });

    // Record as usage metric
    await this.recordUsage({
      tenant_id: tenantId,
      metric_type: 'storage',
      quantity: sizeGB,
      timestamp: new Date()
    });
  }

  /**
   * Check quota status for a tenant and metric
   */
  async checkQuota(
    tenantId: string,
    metricType: string
  ): Promise<QuotaStatus> {
    // Get tenant's plan
    const { data: tenant, error: tenantError } = await this.supabase
      .from('tenants')
      .select('plan_id, billing_period_start')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const plan = this.plans.get(tenant.plan_id);
    if (!plan) {
      throw new Error(`Plan not found: ${tenant.plan_id}`);
    }

    // Calculate period boundaries
    const periodStart = new Date(tenant.billing_period_start);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Get quota limit
    let limit = 0;
    switch (metricType) {
      case 'events':
        // Daily events - calculate for current day
        const dayStart = new Date();
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date();
        dayEnd.setHours(23, 59, 59, 999);
        limit = plan.quotas.events_per_day;
        break;
      case 'ai_ops_actions':
        limit = plan.quotas.ai_ops_actions_per_month;
        break;
      case 'api_calls':
        limit = plan.quotas.api_calls_per_month;
        break;
      case 'storage':
        limit = plan.quotas.storage_gb;
        break;
      case 'agents':
        limit = plan.quotas.agents;
        break;
      case 'users':
        limit = plan.quotas.users;
        break;
      default:
        throw new Error(`Unknown metric type: ${metricType}`);
    }

    // Get current usage
    const { data: usageData, error: usageError } = await this.supabase
      .from('usage_records')
      .select('quantity')
      .eq('tenant_id', tenantId)
      .eq('metric_type', metricType)
      .gte('timestamp', periodStart.toISOString())
      .lte('timestamp', periodEnd.toISOString());

    if (usageError) {
      throw usageError;
    }

    const used = usageData.reduce((sum, record) => sum + record.quantity, 0);
    const percentage = (used / limit) * 100;
    const exceeded = used > limit;
    const remaining = Math.max(0, limit - used);

    return {
      metric_type: metricType,
      used,
      limit,
      percentage,
      exceeded,
      remaining
    };
  }

  /**
   * Check and enforce quota limits
   */
  private async checkAndEnforceQuota(
    tenantId: string,
    metricType: string
  ): Promise<void> {
    const status = await this.checkQuota(tenantId, metricType);

    if (status.exceeded) {
      // Log quota exceeded event
      console.warn(
        `Quota exceeded for tenant ${tenantId}: ${metricType} ` +
        `(${status.used}/${status.limit})`
      );

      // Update tenant status
      await this.supabase
        .from('tenants')
        .update({ quota_exceeded: true, quota_exceeded_at: new Date().toISOString() })
        .eq('id', tenantId);

      // Send alert (integrate with alert manager)
      // TODO: Implement alert notification
    }

    // Warn at 80% usage
    if (status.percentage >= 80 && !status.exceeded) {
      console.warn(
        `Quota warning for tenant ${tenantId}: ${metricType} ` +
        `at ${status.percentage.toFixed(1)}%`
      );
      
      // Send warning notification
      // TODO: Implement warning notification
    }
  }

  /**
   * Get comprehensive usage report for a tenant
   */
  async getTenantUsage(tenantId: string): Promise<TenantUsage> {
    // Get tenant and plan info
    const { data: tenant, error: tenantError } = await this.supabase
      .from('tenants')
      .select('plan_id, billing_period_start')
      .eq('id', tenantId)
      .single();

    if (tenantError) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    const plan = this.plans.get(tenant.plan_id);
    if (!plan) {
      throw new Error(`Plan not found: ${tenant.plan_id}`);
    }

    // Calculate period
    const periodStart = new Date(tenant.billing_period_start);
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Check all quotas
    const quotaChecks = [
      'events',
      'ai_ops_actions',
      'api_calls',
      'storage',
      'agents',
      'users'
    ];

    const quotas: QuotaStatus[] = [];
    for (const metric of quotaChecks) {
      try {
        const status = await this.checkQuota(tenantId, metric);
        quotas.push(status);
      } catch (error) {
        console.error(`Failed to check quota for ${metric}:`, error);
      }
    }

    // Calculate overage charges
    let overageCharges = 0;
    for (const quota of quotas) {
      if (quota.exceeded) {
        const overage = quota.used - quota.limit;
        // Apply overage pricing (example: $0.10 per event, $1 per AI action, etc.)
        switch (quota.metric_type) {
          case 'events':
            overageCharges += overage * 0.0001; // $0.10 per 1000 events
            break;
          case 'ai_ops_actions':
            overageCharges += overage * 1.0;
            break;
          case 'api_calls':
            overageCharges += overage * 0.00001; // $0.10 per 10000 calls
            break;
          case 'storage':
            overageCharges += overage * 0.50; // $0.50 per GB
            break;
        }
      }
    }

    const baseCost = plan.price_monthly;
    const totalCost = baseCost + overageCharges;

    return {
      tenant_id: tenantId,
      plan_id: tenant.plan_id,
      period_start: periodStart,
      period_end: periodEnd,
      quotas,
      overage_charges: overageCharges,
      total_cost: totalCost
    };
  }

  /**
   * Get usage time series for analytics
   */
  async getUsageTimeSeries(
    tenantId: string,
    metricType: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week' = 'day'
  ): Promise<Array<{ timestamp: Date; value: number }>> {
    const { data, error } = await this.supabase
      .from('usage_records')
      .select('timestamp, quantity')
      .eq('tenant_id', tenantId)
      .eq('metric_type', metricType)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      throw error;
    }

    // Aggregate by granularity
    const series = new Map<string, number>();
    
    for (const record of data) {
      const timestamp = new Date(record.timestamp);
      let key: string;

      switch (granularity) {
        case 'hour':
          key = timestamp.toISOString().substring(0, 13);
          break;
        case 'day':
          key = timestamp.toISOString().substring(0, 10);
          break;
        case 'week':
          const weekStart = new Date(timestamp);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().substring(0, 10);
          break;
      }

      series.set(key, (series.get(key) || 0) + record.quantity);
    }

    // Convert to array
    return Array.from(series.entries()).map(([timestamp, value]) => ({
      timestamp: new Date(timestamp),
      value
    }));
  }

  /**
   * Enforce quota - check if operation is allowed
   */
  async enforceQuota(tenantId: string, metricType: string): Promise<boolean> {
    const status = await this.checkQuota(tenantId, metricType);
    
    if (status.exceeded) {
      console.warn(
        `Quota enforcement: blocking ${metricType} for tenant ${tenantId}`
      );
      return false;
    }

    return true;
  }

  /**
   * Get plan configuration
   */
  getPlan(planId: string): PlanConfig | undefined {
    return this.plans.get(planId);
  }

  /**
   * List all plans
   */
  getAllPlans(): PlanConfig[] {
    return Array.from(this.plans.values());
  }
}

// Singleton instance
let meteringInstance: UsageMetering | null = null;

export function getUsageMetering(): UsageMetering {
  if (!meteringInstance) {
    meteringInstance = new UsageMetering();
  }
  return meteringInstance;
}

// Export types
export type { UsageRecord, QuotaStatus, TenantUsage, PlanConfig, PlanQuotas };
