#!/usr/bin/env node
/**
 * UADSI Trust Scoring Module
 * Computes Trust Score (TS), Risk Avoided (RA$), Compliance SLA
 * Multi-dimensional trust calculation with monetary impact
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';

export class TrustScoring extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      scoringInterval: config.scoringInterval || 120000, // 2 min
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_KEY,
      // Cost parameters for risk calculation
      incidentCostBase: config.incidentCostBase || 10000, // $10k base
      downtime CostPerHour: config.downtimeCostPerHour || 50000, // $50k/hr
      complianceViolationCost: config.complianceViolationCost || 100000, // $100k
      ...config
    };
    
    this.db = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    this.trustScores = new Map();
    this.scoringTimer = null;
  }

  /**
   * Initialize trust scoring engine
   */
  async initialize() {
    console.log('🎯 Initializing UADSI Trust Scoring...');
    
    await this.ensureSchema();
    await this.calculateScores();
    
    this.scoringTimer = setInterval(
      () => this.calculateScores(), 
      this.config.scoringInterval
    );
    
    this.emit('initialized');
    console.log('✅ Trust Scoring initialized');
  }

  /**
   * Ensure database schema for trust metrics
   */
  async ensureSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS uadsi_trust_scores (
        score_id TEXT PRIMARY KEY,
        agent_id TEXT,
        workflow_id TEXT,
        entity_type TEXT NOT NULL,
        trust_score DECIMAL(5,2) NOT NULL,
        reliability_score DECIMAL(5,2),
        compliance_score DECIMAL(5,2),
        performance_score DECIMAL(5,2),
        security_score DECIMAL(5,2),
        risk_avoided_usd DECIMAL(12,2),
        incidents_prevented INTEGER,
        compliance_sla_pct DECIMAL(5,2),
        calculated_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB
      );

      CREATE TABLE IF NOT EXISTS uadsi_risk_metrics (
        metric_id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        risk_category TEXT NOT NULL,
        probability DECIMAL(5,4),
        impact_usd DECIMAL(12,2),
        mitigation_status TEXT,
        detected_at TIMESTAMPTZ DEFAULT NOW(),
        metadata JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_trust_agent ON uadsi_trust_scores(agent_id, calculated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_trust_workflow ON uadsi_trust_scores(workflow_id, calculated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_risk_entity ON uadsi_risk_metrics(entity_id, detected_at DESC);
    `;

    try {
      await this.db.rpc('exec_sql', { sql: schema });
    } catch (error) {
      console.log('Schema check:', error.message);
    }
  }

  /**
   * Calculate trust scores for all entities
   */
  async calculateScores() {
    console.log('🎯 Calculating trust scores...');
    
    try {
      // Calculate agent trust scores
      const agentScores = await this.calculateAgentScores();
      
      // Calculate workflow trust scores
      const workflowScores = await this.calculateWorkflowScores();
      
      // Calculate global trust metrics
      const globalMetrics = this.calculateGlobalMetrics(
        agentScores, 
        workflowScores
      );

      this.emit('scores:updated', {
        agentCount: agentScores.length,
        workflowCount: workflowScores.length,
        globalTrustScore: globalMetrics.trustScore,
        totalRiskAvoided: globalMetrics.riskAvoidedUSD,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Calculated ${agentScores.length + workflowScores.length} trust scores`);
      
      return { agentScores, workflowScores, globalMetrics };
    } catch (error) {
      console.error('❌ Scoring error:', error);
      this.emit('scoring:error', error);
      throw error;
    }
  }

  /**
   * Calculate trust scores for all agents
   */
  async calculateAgentScores() {
    const { data: agents } = await this.db
      .from('uadsi_agents')
      .select('*');
    
    const scores = [];
    
    for (const agent of agents || []) {
      const score = await this.calculateAgentTrustScore(agent);
      scores.push(score);
      
      await this.persistTrustScore(score);
      this.trustScores.set(agent.agent_id, score);
      
      // Update agent record with latest score
      await this.db
        .from('uadsi_agents')
        .update({ trust_score: score.trust_score })
        .eq('agent_id', agent.agent_id);
    }
    
    return scores;
  }

  /**
   * Calculate trust score for a single agent
   */
  async calculateAgentTrustScore(agent) {
    // Multi-dimensional scoring
    const reliability = await this.calculateReliability(agent);
    const compliance = await this.calculateCompliance(agent);
    const performance = await this.calculatePerformance(agent);
    const security = await this.calculateSecurity(agent);
    
    // Weighted trust score
    const trustScore = (
      reliability * 0.35 +
      compliance * 0.30 +
      performance * 0.20 +
      security * 0.15
    );

    // Calculate risk metrics
    const riskMetrics = await this.calculateRiskMetrics(agent, 'agent');
    
    return {
      score_id: `score_${agent.agent_id}_${Date.now()}`,
      agent_id: agent.agent_id,
      workflow_id: null,
      entity_type: 'agent',
      trust_score: Math.round(trustScore * 100) / 100,
      reliability_score: Math.round(reliability * 100) / 100,
      compliance_score: Math.round(compliance * 100) / 100,
      performance_score: Math.round(performance * 100) / 100,
      security_score: Math.round(security * 100) / 100,
      risk_avoided_usd: riskMetrics.riskAvoidedUSD,
      incidents_prevented: riskMetrics.incidentsPrevented,
      compliance_sla_pct: Math.round(compliance * 100) / 100,
      metadata: {
        agent_name: agent.agent_name,
        agent_type: agent.agent_type,
        risk_breakdown: riskMetrics.breakdown
      }
    };
  }

  /**
   * Calculate reliability score (uptime, success rate, consistency)
   */
  async calculateReliability(agent) {
    // Get recent execution history
    const { data: executions } = await this.db
      .from('workflow_executions')
      .select('status, duration_ms')
      .contains('agent_ids', [agent.agent_id])
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!executions || executions.length === 0) {
      return agent.health_status === 'healthy' ? 85 : 50;
    }

    const successCount = executions.filter(e => e.status === 'success').length;
    const successRate = (successCount / executions.length) * 100;
    
    // Factor in health status
    const healthBonus = agent.health_status === 'healthy' ? 10 : 0;
    
    return Math.min(100, successRate + healthBonus);
  }

  /**
   * Calculate compliance score (policy adherence, audit status)
   */
  async calculateCompliance(agent) {
    // Get policy violations
    const { data: violations } = await this.db
      .from('policy_violations')
      .select('severity')
      .eq('agent_id', agent.agent_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (!violations) return 90; // Default high compliance
    
    // Deduct points for violations
    let score = 100;
    for (const violation of violations) {
      if (violation.severity === 'critical') score -= 20;
      else if (violation.severity === 'high') score -= 10;
      else if (violation.severity === 'medium') score -= 5;
      else score -= 2;
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate performance score (latency, throughput, efficiency)
   */
  async calculatePerformance(agent) {
    const { data: executions } = await this.db
      .from('workflow_executions')
      .select('duration_ms')
      .contains('agent_ids', [agent.agent_id])
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (!executions || executions.length === 0) return 80;
    
    const durations = executions
      .map(e => e.duration_ms)
      .filter(d => d != null);
    
    if (durations.length === 0) return 80;
    
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    // Score based on performance (faster = better)
    // Assume 1000ms is optimal, scale from there
    if (avgDuration < 1000) return 100;
    if (avgDuration < 5000) return 90;
    if (avgDuration < 10000) return 75;
    if (avgDuration < 30000) return 60;
    return 50;
  }

  /**
   * Calculate security score (vulnerabilities, access control)
   */
  async calculateSecurity(agent) {
    // Check for security incidents
    const { data: incidents } = await this.db
      .from('security_events')
      .select('severity')
      .eq('agent_id', agent.agent_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (!incidents) return 95; // Default high security
    
    let score = 100;
    for (const incident of incidents) {
      if (incident.severity === 'critical') score -= 30;
      else if (incident.severity === 'high') score -= 15;
      else if (incident.severity === 'medium') score -= 7;
      else score -= 3;
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate workflow trust scores
   */
  async calculateWorkflowScores() {
    const { data: workflows } = await this.db
      .from('uadsi_workflows')
      .select('*');
    
    const scores = [];
    
    for (const workflow of workflows || []) {
      const score = await this.calculateWorkflowTrustScore(workflow);
      scores.push(score);
      
      await this.persistTrustScore(score);
    }
    
    return scores;
  }

  /**
   * Calculate trust score for a workflow
   */
  async calculateWorkflowTrustScore(workflow) {
    // Aggregate agent scores
    const agentScores = await Promise.all(
      (workflow.agent_ids || []).map(id => 
        this.trustScores.get(id) || { trust_score: 80 }
      )
    );
    
    const avgAgentTrust = agentScores.length > 0
      ? agentScores.reduce((sum, s) => sum + s.trust_score, 0) / agentScores.length
      : 80;
    
    // Factor in workflow-specific metrics
    const successRate = workflow.success_rate || 85;
    const syncPenalty = workflow.status === 'drifted' ? -10 : 0;
    
    const trustScore = (avgAgentTrust * 0.6 + successRate * 0.4) + syncPenalty;
    
    const riskMetrics = await this.calculateRiskMetrics(workflow, 'workflow');
    
    return {
      score_id: `score_${workflow.workflow_id}_${Date.now()}`,
      agent_id: null,
      workflow_id: workflow.workflow_id,
      entity_type: 'workflow',
      trust_score: Math.round(Math.max(0, Math.min(100, trustScore)) * 100) / 100,
      reliability_score: successRate,
      compliance_score: 90, // Placeholder
      performance_score: 85, // Placeholder
      security_score: 90, // Placeholder
      risk_avoided_usd: riskMetrics.riskAvoidedUSD,
      incidents_prevented: riskMetrics.incidentsPrevented,
      compliance_sla_pct: 95,
      metadata: {
        workflow_name: workflow.workflow_name,
        agent_count: workflow.agent_ids?.length || 0
      }
    };
  }

  /**
   * Calculate risk metrics and monetary impact
   */
  async calculateRiskMetrics(entity, entityType) {
    const entityId = entityType === 'agent' ? entity.agent_id : entity.workflow_id;
    
    // Get historical incidents
    const { data: incidents } = await this.db
      .from('incident_log')
      .select('severity, cost_impact')
      .eq(`${entityType}_id`, entityId)
      .gte('created_at', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString());
    
    // Calculate incidents prevented (based on trust score)
    const trustScore = entityType === 'agent' 
      ? await this.calculateAgentTrustScore(entity).then(s => s.trust_score)
      : 85;
    
    // Higher trust = more incidents prevented
    const incidentsPrevented = Math.round((trustScore / 100) * 10);
    
    // Calculate risk avoided in USD
    const riskAvoidedUSD = this.calculateRiskAvoidedUSD(
      incidentsPrevented,
      incidents || []
    );
    
    const breakdown = {
      incidentPrevention: riskAvoidedUSD * 0.5,
      downtimeAvoided: riskAvoidedUSD * 0.3,
      complianceProtection: riskAvoidedUSD * 0.2
    };
    
    return {
      riskAvoidedUSD: Math.round(riskAvoidedUSD * 100) / 100,
      incidentsPrevented,
      breakdown
    };
  }

  /**
   * Calculate risk avoided in USD
   */
  calculateRiskAvoidedUSD(incidentsPrevented, historicalIncidents) {
    // Base calculation
    let riskAvoided = incidentsPrevented * this.config.incidentCostBase;
    
    // Factor in historical costs if available
    if (historicalIncidents.length > 0) {
      const avgHistoricalCost = historicalIncidents
        .map(i => i.cost_impact || this.config.incidentCostBase)
        .reduce((a, b) => a + b, 0) / historicalIncidents.length;
      
      riskAvoided = incidentsPrevented * avgHistoricalCost;
    }
    
    return riskAvoided;
  }

  /**
   * Calculate global trust metrics
   */
  calculateGlobalMetrics(agentScores, workflowScores) {
    const allScores = [...agentScores, ...workflowScores];
    
    if (allScores.length === 0) {
      return {
        trustScore: 0,
        riskAvoidedUSD: 0,
        complianceSLA: 0,
        entityCount: 0
      };
    }

    const avgTrust = allScores.reduce((sum, s) => sum + s.trust_score, 0) / allScores.length;
    const totalRiskAvoided = allScores.reduce((sum, s) => sum + s.risk_avoided_usd, 0);
    const avgCompliance = allScores.reduce((sum, s) => sum + s.compliance_sla_pct, 0) / allScores.length;
    
    return {
      trustScore: Math.round(avgTrust * 100) / 100,
      riskAvoidedUSD: Math.round(totalRiskAvoided * 100) / 100,
      complianceSLA: Math.round(avgCompliance * 100) / 100,
      entityCount: allScores.length
    };
  }

  /**
   * Persist trust score to database
   */
  async persistTrustScore(score) {
    const { error } = await this.db
      .from('uadsi_trust_scores')
      .insert(score);
    
    if (error) {
      console.error('Failed to persist trust score:', error);
    }
  }

  /**
   * Get trust score for an entity
   */
  async getTrustScore(entityId, entityType) {
    const column = entityType === 'agent' ? 'agent_id' : 'workflow_id';
    
    const { data, error } = await this.db
      .from('uadsi_trust_scores')
      .select('*')
      .eq(column, entityId)
      .order('calculated_at', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return data?.[0] || null;
  }

  /**
   * Get global trust metrics
   */
  async getGlobalMetrics() {
    const { data: latest } = await this.db
      .from('uadsi_trust_scores')
      .select('*')
      .order('calculated_at', { ascending: false })
      .limit(100);
    
    if (!latest || latest.length === 0) {
      return {
        trustScore: 0,
        riskAvoidedUSD: 0,
        complianceSLA: 0,
        entityCount: 0
      };
    }

    const avgTrust = latest.reduce((sum, s) => sum + Number(s.trust_score), 0) / latest.length;
    const totalRiskAvoided = latest.reduce((sum, s) => sum + Number(s.risk_avoided_usd), 0);
    const avgCompliance = latest.reduce((sum, s) => sum + Number(s.compliance_sla_pct), 0) / latest.length;
    
    return {
      trustScore: Math.round(avgTrust * 100) / 100,
      riskAvoidedUSD: Math.round(totalRiskAvoided * 100) / 100,
      complianceSLA: Math.round(avgCompliance * 100) / 100,
      entityCount: latest.length
    };
  }

  /**
   * Shutdown trust scoring
   */
  async shutdown() {
    if (this.scoringTimer) {
      clearInterval(this.scoringTimer);
      this.scoringTimer = null;
    }
    
    this.emit('shutdown');
    console.log('🛑 Trust Scoring shutdown');
  }
}

export default TrustScoring;
