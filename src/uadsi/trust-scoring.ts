/**
 * Trust Scoring Engine - UADSI Core
 * Computes Trust Score (TS), Risk Avoided (RA$), and other KPIs
 */

import { createLogger } from '@/common/logger';
import { TrustScore, TrustKPIs, Agent } from '@/common/types';
import { agentRegistry } from '@/registry';

const logger = createLogger('uadsi-trust-scoring');

export interface TrustFactors {
  reliability: number; // 0-1
  policy_adherence: number; // 0-1
  context_freshness: number; // 0-1
  risk_exposure: number; // 0-1
}

export interface RiskMetrics {
  incident_count: number;
  severity_weighted_incidents: number;
  expected_loss_baseline: number;
  realized_loss: number;
}

/**
 * Trust Scoring Engine
 * Calculates trust metrics and KPIs
 */
export class TrustScoringEngine {
  private trustScores: Map<string, TrustScore>;
  private riskMetrics: Map<string, RiskMetrics>;
  private trustWeights: {
    reliability: number;
    policy_adherence: number;
    context_freshness: number;
    risk_exposure: number;
  };

  constructor() {
    this.trustScores = new Map();
    this.riskMetrics = new Map();
    this.trustWeights = {
      reliability: 0.35,
      policy_adherence: 0.30,
      context_freshness: 0.20,
      risk_exposure: 0.15,
    };
  }

  /**
   * Compute trust score for an agent
   */
  async computeTrustScore(agentId: string): Promise<TrustScore> {
    logger.debug('Computing trust score', { agent_id: agentId });

    const agent = await agentRegistry.getById(agentId);
    const factors = await this.computeTrustFactors(agent);

    // Trust Score formula: weighted average adjusted by risk
    const baseScore = 
      (factors.reliability * this.trustWeights.reliability) +
      (factors.policy_adherence * this.trustWeights.policy_adherence) +
      (factors.context_freshness * this.trustWeights.context_freshness);

    // Apply risk penalty
    const riskPenalty = factors.risk_exposure * 0.3; // Max 30% penalty
    const finalScore = Math.max(0, Math.min(100, (baseScore - riskPenalty) * 100));

    const trustScore: TrustScore = {
      agent_id: agentId,
      score: Math.round(finalScore * 10) / 10,
      reliability: Math.round(factors.reliability * 100),
      policy_adherence: Math.round(factors.policy_adherence * 100),
      context_freshness: Math.round(factors.context_freshness * 100),
      risk_exposure: Math.round(factors.risk_exposure * 100),
      computed_at: new Date(),
    };

    this.trustScores.set(agentId, trustScore);
    logger.info('Trust score computed', { agent_id: agentId, score: trustScore.score });

    return trustScore;
  }

  /**
   * Compute trust factors for an agent
   */
  private async computeTrustFactors(agent: Agent): Promise<TrustFactors> {
    // Reliability: based on error rate, uptime, response times
    const reliability = await this.computeReliability(agent);

    // Policy adherence: based on policy violations
    const policy_adherence = await this.computePolicyAdherence(agent);

    // Context freshness: based on data staleness
    const context_freshness = await this.computeContextFreshness(agent);

    // Risk exposure: based on compliance tier, vulnerabilities
    const risk_exposure = this.computeRiskExposure(agent);

    return {
      reliability,
      policy_adherence,
      context_freshness,
      risk_exposure,
    };
  }

  /**
   * Compute reliability factor
   */
  private async computeReliability(agent: Agent): Promise<number> {
    // In production, query telemetry for:
    // - Error rate
    // - Uptime %
    // - Average response time
    // - Circuit breaker trips

    // Mock implementation
    const baseReliability = 0.95;
    const errorRate = (agent.metadata.error_count as number || 0) / 
                      (agent.metadata.request_count as number || 1);
    
    return Math.max(0, Math.min(1, baseReliability - (errorRate * 10)));
  }

  /**
   * Compute policy adherence factor
   */
  private async computePolicyAdherence(agent: Agent): Promise<number> {
    // In production, query policy violation logs
    const violationCount = agent.metadata.policy_violations as number || 0;
    const totalPolicies = agent.policies.length || 1;

    const adherenceRate = 1 - (violationCount / (totalPolicies * 100)); // Assume 100 checks
    return Math.max(0, Math.min(1, adherenceRate));
  }

  /**
   * Compute context freshness factor
   */
  private async computeContextFreshness(agent: Agent): Promise<number> {
    // In production, check staleness of context sources
    const contextSources = agent.context_sources || [];
    
    if (contextSources.length === 0) return 0.5;

    // Mock: assume contexts are reasonably fresh
    const avgFreshness = 0.85;
    return avgFreshness;
  }

  /**
   * Compute risk exposure factor
   */
  private computeRiskExposure(agent: Agent): number {
    // Risk based on compliance tier
    const tierRisk: Record<string, number> = {
      none: 1.0,
      standard: 0.6,
      high: 0.3,
      critical: 0.1,
    };

    const complianceRisk = tierRisk[agent.compliance_tier] || 0.5;

    // Additional risk factors
    const statusRisk = agent.status === 'quarantined' ? 0.5 : 0;

    return Math.min(1, complianceRisk + statusRisk);
  }

  /**
   * Compute Risk Avoided (RA$)
   */
  async computeRiskAvoided(agentId: string): Promise<number> {
    const metrics = this.riskMetrics.get(agentId) || {
      incident_count: 0,
      severity_weighted_incidents: 0,
      expected_loss_baseline: 100000, // $100k baseline
      realized_loss: 0,
    };

    // RA$ = Expected Loss Baseline - Realized Loss
    const riskAvoided = metrics.expected_loss_baseline - metrics.realized_loss;

    logger.debug('Risk avoided computed', { agent_id: agentId, ra_usd: riskAvoided });

    return Math.max(0, riskAvoided);
  }

  /**
   * Compute Trust KPIs for period
   */
  async computeTrustKPIs(periodStart: Date, periodEnd: Date): Promise<TrustKPIs> {
    logger.info('Computing Trust KPIs', { period_start: periodStart, period_end: periodEnd });

    // Get all active agents
    const { agents } = await agentRegistry.query({ limit: 1000 });

    // Compute average trust score
    const trustScores = await Promise.all(
      agents.map(a => this.computeTrustScore(a.id))
    );
    const avgTrustScore = trustScores.reduce((sum, ts) => sum + ts.score, 0) / trustScores.length;

    // Compute total risk avoided
    const riskAvoidedAmounts = await Promise.all(
      agents.map(a => this.computeRiskAvoided(a.id))
    );
    const totalRiskAvoided = riskAvoidedAmounts.reduce((sum, ra) => sum + ra, 0);

    // Mock other metrics - in production, query from telemetry
    const syncFreshnessPercent = 92.5;
    const driftRatePercent = 3.2;
    const complianceSlaPercent = 98.7;
    const selfResolutionRatio = 0.85;
    
    // ROI = RA$ / Platform Cost
    const platformCost = 50000; // Mock $50k/month platform cost
    const roi = totalRiskAvoided / platformCost;

    const kpis: TrustKPIs = {
      trust_score: Math.round(avgTrustScore * 10) / 10,
      risk_avoided_usd: Math.round(totalRiskAvoided),
      sync_freshness_percent: syncFreshnessPercent,
      drift_rate_percent: driftRatePercent,
      compliance_sla_percent: complianceSlaPercent,
      self_resolution_ratio: selfResolutionRatio,
      roi: Math.round(roi * 100) / 100,
      period_start: periodStart,
      period_end: periodEnd,
      computed_at: new Date(),
    };

    logger.info('Trust KPIs computed', kpis);

    return kpis;
  }

  /**
   * Get trust score for agent
   */
  getTrustScore(agentId: string): TrustScore | undefined {
    return this.trustScores.get(agentId);
  }

  /**
   * Record incident for risk calculation
   */
  recordIncident(agentId: string, severity: 'low' | 'medium' | 'high' | 'critical', lossUsd: number): void {
    const metrics = this.riskMetrics.get(agentId) || {
      incident_count: 0,
      severity_weighted_incidents: 0,
      expected_loss_baseline: 100000,
      realized_loss: 0,
    };

    const severityWeights = { low: 1, medium: 3, high: 7, critical: 10 };
    
    metrics.incident_count++;
    metrics.severity_weighted_incidents += severityWeights[severity];
    metrics.realized_loss += lossUsd;

    this.riskMetrics.set(agentId, metrics);

    logger.warn('Incident recorded', {
      agent_id: agentId,
      severity,
      loss_usd: lossUsd,
      total_loss: metrics.realized_loss,
    });
  }

  /**
   * Get all trust scores
   */
  getAllTrustScores(): TrustScore[] {
    return Array.from(this.trustScores.values());
  }
}

/**
 * Singleton instance
 */
export const trustScoringEngine = new TrustScoringEngine();
