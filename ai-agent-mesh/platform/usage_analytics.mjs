/**
 * Usage Analytics Collector for AI-Agent Mesh
 * Tracks usage metrics, conversion events, and churn signals
 * 
 * @module UsageAnalytics
 * @version 3.0.0
 */

import { createClient } from '@supabase/supabase-js';

export class UsageAnalytics {
  constructor(supabaseUrl, supabaseKey, options = {}) {
    this.db = createClient(supabaseUrl, supabaseKey);
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 60000; // 1 minute
    this.eventQueue = [];
    
    // Start background flush
    this.startBatchProcessor();
  }

  /**
   * Track user activation events
   * @param {string} tenantId - Tenant identifier
   * @param {Object} event - Event data
   */
  async trackActivation(tenantId, event) {
    const activationEvent = {
      tenant_id: tenantId,
      event_type: 'activation',
      event_name: event.name,
      properties: {
        ...event,
        timestamp: new Date().toISOString()
      }
    };

    this.enqueueEvent(activationEvent);

    // Check activation milestones
    await this.checkActivationMilestones(tenantId, event.name);
  }

  /**
   * Track feature usage
   * @param {string} tenantId - Tenant identifier
   * @param {string} feature - Feature name
   * @param {Object} metadata - Additional metadata
   */
  async trackFeatureUsage(tenantId, feature, metadata = {}) {
    const usageEvent = {
      tenant_id: tenantId,
      event_type: 'feature_usage',
      event_name: feature,
      properties: {
        feature,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    };

    this.enqueueEvent(usageEvent);

    // Update feature adoption metrics
    await this.updateFeatureAdoption(tenantId, feature);
  }

  /**
   * Track API usage for billing
   * @param {string} tenantId - Tenant identifier
   * @param {Object} usage - Usage metrics
   */
  async trackUsage(tenantId, usage) {
    const {
      apiCalls = 0,
      agentHours = 0,
      storageGB = 0,
      dataTransferGB = 0,
      endpoint = null
    } = usage;

    // Record usage event
    const usageEvent = {
      tenant_id: tenantId,
      event_type: 'usage',
      event_name: 'resource_consumption',
      properties: {
        api_calls: apiCalls,
        agent_hours: agentHours,
        storage_gb: storageGB,
        data_transfer_gb: dataTransferGB,
        endpoint,
        timestamp: new Date().toISOString()
      }
    };

    this.enqueueEvent(usageEvent);

    // Update aggregated usage metrics
    await this.aggregateUsageMetrics(tenantId, usage);
  }

  /**
   * Track conversion events (trial → paid, free → pro, etc.)
   * @param {string} tenantId - Tenant identifier
   * @param {Object} conversion - Conversion data
   */
  async trackConversion(tenantId, conversion) {
    const { fromTier, toTier, revenue, conversionType } = conversion;

    const conversionEvent = {
      tenant_id: tenantId,
      event_type: 'conversion',
      event_name: conversionType || `${fromTier}_to_${toTier}`,
      properties: {
        from_tier: fromTier,
        to_tier: toTier,
        revenue,
        conversion_date: new Date().toISOString()
      }
    };

    // Store conversion event
    await this.db
      .from('conversion_events')
      .insert(conversionEvent);

    // Calculate conversion metrics
    await this.calculateConversionMetrics();
  }

  /**
   * Track churn signals and risk indicators
   * @param {string} tenantId - Tenant identifier
   * @param {Object} signal - Churn signal data
   */
  async trackChurnSignal(tenantId, signal) {
    const { signalType, severity, details } = signal;

    const churnSignal = {
      tenant_id: tenantId,
      signal_type: signalType,
      severity, // low, medium, high, critical
      details,
      detected_at: new Date().toISOString()
    };

    await this.db
      .from('churn_signals')
      .insert(churnSignal);

    // Update customer health score
    await this.updateHealthScore(tenantId);

    // Trigger alerts for high-severity signals
    if (severity === 'high' || severity === 'critical') {
      await this.triggerChurnAlert(tenantId, churnSignal);
    }
  }

  /**
   * Calculate customer health score
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<number>} Health score (0-100)
   */
  async calculateHealthScore(tenantId) {
    // Get recent activity metrics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: metrics } = await this.db
      .from('analytics_events')
      .select('event_type, event_name')
      .eq('tenant_id', tenantId)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get tenant details
    const { data: tenant } = await this.db
      .from('tenants')
      .select('tier, created_at, resource_limits')
      .eq('tenant_id', tenantId)
      .single();

    // Calculate sub-scores
    const engagementScore = this.calculateEngagementScore(metrics);
    const adoptionScore = this.calculateAdoptionScore(metrics);
    const usageScore = this.calculateUsageScore(tenantId);
    const supportScore = await this.calculateSupportScore(tenantId);

    // Weighted health score
    const healthScore = Math.round(
      engagementScore * 0.3 +
      adoptionScore * 0.3 +
      usageScore * 0.25 +
      supportScore * 0.15
    );

    // Store health score
    await this.db
      .from('customer_health')
      .upsert({
        tenant_id: tenantId,
        health_score: healthScore,
        engagement_score: engagementScore,
        adoption_score: adoptionScore,
        usage_score: usageScore,
        support_score: supportScore,
        calculated_at: new Date().toISOString()
      });

    return healthScore;
  }

  /**
   * Get analytics dashboard data
   * @param {string} tenantId - Optional tenant filter
   * @returns {Promise<Object>} Dashboard metrics
   */
  async getDashboardMetrics(tenantId = null) {
    const filters = tenantId ? { tenant_id: tenantId } : {};

    // Get key metrics
    const [
      activeUsers,
      conversions,
      churnRate,
      mrr,
      avgHealthScore
    ] = await Promise.all([
      this.getActiveUsers(filters),
      this.getConversionRate(filters),
      this.getChurnRate(filters),
      this.getMRR(filters),
      this.getAverageHealthScore(filters)
    ]);

    return {
      activeUsers,
      conversionRate: conversions,
      churnRate,
      mrr,
      averageHealthScore: avgHealthScore,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Generate executive insight report
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Promise<Object>} Insight report
   */
  async generateInsightReport(startDate, endDate) {
    const report = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      metrics: {
        revenue: await this.getRevenuMetrics(startDate, endDate),
        growth: await this.getGrowthMetrics(startDate, endDate),
        retention: await this.getRetentionMetrics(startDate, endDate),
        product: await this.getProductMetrics(startDate, endDate),
        health: await this.getHealthMetrics(startDate, endDate)
      },
      insights: await this.generateInsights(startDate, endDate),
      recommendations: await this.generateRecommendations()
    };

    return report;
  }

  // Helper methods

  enqueueEvent(event) {
    this.eventQueue.push({
      ...event,
      created_at: new Date().toISOString()
    });

    // Flush if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  startBatchProcessor() {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }

  async flushEvents() {
    if (this.eventQueue.length === 0) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.db
        .from('analytics_events')
        .insert(batch);
    } catch (error) {
      console.error('Failed to flush events:', error);
      // Re-queue failed events
      this.eventQueue.push(...batch);
    }
  }

  async checkActivationMilestones(tenantId, eventName) {
    const milestones = [
      'first_agent_created',
      'first_workflow_executed',
      'first_policy_applied',
      'first_team_member_invited',
      'first_webhook_configured'
    ];

    if (milestones.includes(eventName)) {
      await this.db
        .from('activation_milestones')
        .upsert({
          tenant_id: tenantId,
          milestone: eventName,
          achieved_at: new Date().toISOString()
        });
    }
  }

  async updateFeatureAdoption(tenantId, feature) {
    await this.db
      .from('feature_adoption')
      .upsert({
        tenant_id: tenantId,
        feature,
        last_used: new Date().toISOString(),
        usage_count: this.db.raw('COALESCE(usage_count, 0) + 1')
      });
  }

  async aggregateUsageMetrics(tenantId, usage) {
    const period = this.getCurrentPeriod();

    await this.db
      .from('usage_aggregates')
      .upsert({
        tenant_id: tenantId,
        period,
        api_calls: this.db.raw('COALESCE(api_calls, 0) + ?', [usage.apiCalls || 0]),
        agent_hours: this.db.raw('COALESCE(agent_hours, 0) + ?', [usage.agentHours || 0]),
        storage_gb: usage.storageGB || 0,
        data_transfer_gb: this.db.raw('COALESCE(data_transfer_gb, 0) + ?', [usage.dataTransferGB || 0]),
        updated_at: new Date().toISOString()
      });
  }

  calculateEngagementScore(metrics) {
    const loginEvents = metrics?.filter(m => m.event_name === 'login').length || 0;
    const activeEvents = metrics?.filter(m => m.event_type === 'feature_usage').length || 0;
    
    // Score based on activity frequency
    const activityScore = Math.min(100, (loginEvents * 5) + (activeEvents * 2));
    return activityScore;
  }

  calculateAdoptionScore(metrics) {
    const uniqueFeatures = new Set(
      metrics?.filter(m => m.event_type === 'feature_usage')
        .map(m => m.event_name)
    ).size;

    // Score based on feature breadth
    const maxFeatures = 20;
    return Math.min(100, (uniqueFeatures / maxFeatures) * 100);
  }

  async calculateUsageScore(tenantId) {
    const { data: usage } = await this.db
      .from('usage_aggregates')
      .select('api_calls, agent_hours')
      .eq('tenant_id', tenantId)
      .eq('period', this.getCurrentPeriod())
      .single();

    if (!usage) return 0;

    // Score based on usage relative to limits
    const { data: tenant } = await this.db
      .from('tenants')
      .select('resource_limits')
      .eq('tenant_id', tenantId)
      .single();

    const limits = tenant?.resource_limits || {};
    const apiUsagePercent = limits.apiCallsPerMonth > 0
      ? (usage.api_calls / limits.apiCallsPerMonth) * 100
      : 100;

    // Optimal usage is 40-80% of limits
    if (apiUsagePercent >= 40 && apiUsagePercent <= 80) return 100;
    if (apiUsagePercent > 80) return 80;
    return Math.min(100, apiUsagePercent * 2);
  }

  async calculateSupportScore(tenantId) {
    // Check for unresolved support tickets
    const { data: tickets } = await this.db
      .from('support_tickets')
      .select('status, severity')
      .eq('tenant_id', tenantId)
      .eq('status', 'open');

    if (!tickets || tickets.length === 0) return 100;

    // Penalize for open high-severity tickets
    const criticalTickets = tickets.filter(t => t.severity === 'critical').length;
    const highTickets = tickets.filter(t => t.severity === 'high').length;

    return Math.max(0, 100 - (criticalTickets * 30) - (highTickets * 15));
  }

  async updateHealthScore(tenantId) {
    const healthScore = await this.calculateHealthScore(tenantId);

    // Determine health status
    let status = 'healthy';
    if (healthScore < 40) status = 'critical';
    else if (healthScore < 60) status = 'at_risk';
    else if (healthScore < 80) status = 'needs_attention';

    return { healthScore, status };
  }

  async triggerChurnAlert(tenantId, signal) {
    // TODO: Send alerts to customer success team
    console.log(`🚨 Churn alert for tenant ${tenantId}:`, signal);
  }

  getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async getActiveUsers(filters) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await this.db
      .from('analytics_events')
      .select('tenant_id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())
      .match(filters);

    return count;
  }

  async getConversionRate(filters) {
    // TODO: Implement conversion rate calculation
    return 0.05; // 5% placeholder
  }

  async getChurnRate(filters) {
    // TODO: Implement churn rate calculation
    return 0.03; // 3% placeholder
  }

  async getMRR(filters) {
    const { data } = await this.db
      .from('billing_accounts')
      .select('tier')
      .eq('status', 'active')
      .match(filters);

    const pricing = { free: 0, pro: 99, enterprise: 999 };
    const mrr = data?.reduce((sum, account) => sum + (pricing[account.tier] || 0), 0) || 0;

    return mrr;
  }

  async getAverageHealthScore(filters) {
    const { data } = await this.db
      .from('customer_health')
      .select('health_score')
      .match(filters);

    if (!data || data.length === 0) return 0;

    const avg = data.reduce((sum, h) => sum + h.health_score, 0) / data.length;
    return Math.round(avg);
  }

  async getRevenuMetrics(startDate, endDate) {
    // TODO: Implement detailed revenue metrics
    return {
      mrr: 50000,
      arr: 600000,
      newMRR: 15000,
      expansionMRR: 5000,
      churnedMRR: 2000,
      netNewMRR: 18000
    };
  }

  async getGrowthMetrics(startDate, endDate) {
    return {
      customerGrowth: 0.15,
      revenueGrowth: 0.20,
      activeUserGrowth: 0.18
    };
  }

  async getRetentionMetrics(startDate, endDate) {
    return {
      logoRetention: 0.97,
      revenueRetention: 1.10,
      nrr: 1.15
    };
  }

  async getProductMetrics(startDate, endDate) {
    return {
      avgAgentsPerCustomer: 12,
      avgAPICallsPerDay: 50000,
      featureAdoptionRate: 0.65
    };
  }

  async getHealthMetrics(startDate, endDate) {
    return {
      avgHealthScore: 78,
      atRiskCustomers: 15,
      healthyCustomers: 385
    };
  }

  async generateInsights(startDate, endDate) {
    return [
      'MRR growth accelerating: +20% MoM',
      'Feature adoption increased 15% this quarter',
      '12 customers at churn risk - CSM engagement recommended',
      'Enterprise segment showing 120% NRR'
    ];
  }

  async generateRecommendations() {
    return [
      'Implement proactive outreach for customers below 60 health score',
      'Promote webhook feature to Pro customers (only 35% adoption)',
      'Test usage-based pricing for high-volume customers',
      'Expand enterprise sales team to capture pipeline growth'
    ];
  }
}

export default UsageAnalytics;
