import { ContextBus } from '../context-bus/context_bus.js';
import { SyncAnalyzer } from './sync_analyzer.js';

export interface TrustScoreComponents {
  agent_uptime_score: number;
  policy_adherence_score: number;
  sync_freshness_score: number;
  risk_exposure_score: number;
}

export interface TrustMetrics {
  trust_score: number;
  risk_avoided_usd: number;
  components: TrustScoreComponents;
  confidence: number;
}

export class TrustScoring {
  private contextBus: ContextBus;
  private syncAnalyzer: SyncAnalyzer;
  private baselineCost: number;

  constructor(
    contextBus: ContextBus,
    syncAnalyzer: SyncAnalyzer,
    baselineCostUsd = 10000
  ) {
    this.contextBus = contextBus;
    this.syncAnalyzer = syncAnalyzer;
    this.baselineCost = baselineCostUsd;
  }

  async computeTrustScore(): Promise<TrustMetrics> {
    // Get all agents
    const agents = await this.contextBus.getAgents();

    if (agents.length === 0) {
      return {
        trust_score: 0,
        risk_avoided_usd: 0,
        components: {
          agent_uptime_score: 0,
          policy_adherence_score: 0,
          sync_freshness_score: 0,
          risk_exposure_score: 0,
        },
        confidence: 0,
      };
    }

    // Compute agent uptime score
    const uptimeScores = await Promise.all(
      agents.map(async (agent) => {
        const telemetry = await this.contextBus.getTelemetryByAgent(agent.id, 100);
        
        if (telemetry.length === 0) return 0.5; // Default for no data

        const totalSuccess = telemetry.reduce((sum, t) => sum + t.success_count, 0);
        const totalErrors = telemetry.reduce((sum, t) => sum + t.errors, 0);
        const total = totalSuccess + totalErrors;

        return total > 0 ? totalSuccess / total : 0.5;
      })
    );

    const agentUptimeScore =
      uptimeScores.reduce((sum, score) => sum + score, 0) / uptimeScores.length;

    // Compute policy adherence score
    const policyScores = await Promise.all(
      agents.map(async (agent) => {
        const telemetry = await this.contextBus.getTelemetryByAgent(agent.id, 100);
        
        if (telemetry.length === 0) return 1.0; // Perfect score if no violations yet

        const totalViolations = telemetry.reduce((sum, t) => sum + t.policy_violations, 0);
        const totalEvents = telemetry.length;

        // Less than 5% violation rate is good
        const violationRate = totalViolations / totalEvents;
        return Math.max(0, 1 - violationRate * 20); // 5% violation = 0 score
      })
    );

    const policyAdherenceScore =
      policyScores.reduce((sum, score) => sum + score, 0) / policyScores.length;

    // Get sync freshness from analyzer
    const syncFreshness = await this.syncAnalyzer.getSyncFreshness();
    const syncFreshnessScore = syncFreshness / 100;

    // Risk exposure based on trust levels
    const avgTrustLevel =
      agents.reduce((sum, a) => sum + a.trust_level, 0) / agents.length;
    const riskExposureScore = avgTrustLevel;

    // Compute weighted trust score
    const trustScore =
      (agentUptimeScore * 0.3 +
        policyAdherenceScore * 0.3 +
        syncFreshnessScore * 0.25 +
        riskExposureScore * 0.15);

    // Compute risk avoided (simplified formula)
    // RA$ = baseline_cost × (trust_score - baseline_trust) × num_agents
    const baselineTrust = parseFloat(process.env.TRUST_SCORE_BASELINE || '0.85');
    const trustDelta = Math.max(0, trustScore - baselineTrust);
    const riskAvoidedUsd = this.baselineCost * trustDelta * agents.length;

    // Confidence based on data availability
    const totalTelemetryPoints = await Promise.all(
      agents.map(async (a) => {
        const t = await this.contextBus.getTelemetryByAgent(a.id, 100);
        return t.length;
      })
    );
    const avgTelemetryPoints =
      totalTelemetryPoints.reduce((sum, n) => sum + n, 0) / agents.length;
    const confidence = Math.min(1.0, avgTelemetryPoints / 50); // 50 points = 100% confidence

    return {
      trust_score: Math.round(trustScore * 10000) / 10000,
      risk_avoided_usd: Math.round(riskAvoidedUsd * 100) / 100,
      components: {
        agent_uptime_score: Math.round(agentUptimeScore * 1000) / 1000,
        policy_adherence_score: Math.round(policyAdherenceScore * 1000) / 1000,
        sync_freshness_score: Math.round(syncFreshnessScore * 1000) / 1000,
        risk_exposure_score: Math.round(riskExposureScore * 1000) / 1000,
      },
      confidence: Math.round(confidence * 1000) / 1000,
    };
  }

  async updateAgentTrustLevels(): Promise<void> {
    const agents = await this.contextBus.getAgents();

    for (const agent of agents) {
      const telemetry = await this.contextBus.getTelemetryByAgent(agent.id, 100);

      if (telemetry.length === 0) continue;

      const totalSuccess = telemetry.reduce((sum, t) => sum + t.success_count, 0);
      const totalErrors = telemetry.reduce((sum, t) => sum + t.errors, 0);
      const totalViolations = telemetry.reduce((sum, t) => sum + t.policy_violations, 0);
      const total = totalSuccess + totalErrors;

      if (total === 0) continue;

      const successRate = totalSuccess / total;
      const violationRate = totalViolations / telemetry.length;

      // Compute new trust level
      let newTrust = successRate * 0.6 + (1 - violationRate) * 0.4;
      newTrust = Math.max(0, Math.min(1, newTrust)); // Clamp to [0, 1]

      await this.contextBus.updateAgentTrustLevel(agent.id, newTrust);
    }
  }
}
