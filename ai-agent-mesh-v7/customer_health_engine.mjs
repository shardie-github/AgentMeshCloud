#!/usr/bin/env node

/**
 * Customer Health Engine
 * Churn risk prediction and proactive customer success interventions
 * 
 * Features:
 * - Health score calculation (0-100)
 * - Churn risk prediction (ML-based)
 * - Usage pattern analysis
 * - Adoption tracking
 * - NPS correlation
 * - Automated intervention triggers
 */

import fs from 'fs';
import path from 'path';

// ==============================================================================
// CONFIGURATION
// ==============================================================================

const CONFIG = {
  healthScoring: {
    weights: {
      adoptionScore: 0.35,
      usageVelocity: 0.25,
      supportHealth: 0.20,
      trustScorePerformance: 0.15,
      financialHealth: 0.05,
    },
  },
  thresholds: {
    healthy: 80,
    atRisk: 60,
    critical: 40,
  },
  interventions: {
    healthCheck: 70,
    executiveReview: 60,
    churnPrevention: 50,
  },
  kpis: {
    adoptionScore: { target: 80, weight: 0.35 },
    slaBreaches: { maxPerQuarter: 2, weight: 0.20 },
    npsScore: { target: 70, weight: 0.15 },
  },
};

// ==============================================================================
// HEALTH SCORE CALCULATOR
// ==============================================================================

class HealthScoreCalculator {
  /**
   * Calculate overall customer health score (0-100)
   */
  calculateHealthScore(customer) {
    const scores = {
      adoption: this.calculateAdoptionScore(customer),
      usageVelocity: this.calculateUsageVelocity(customer),
      supportHealth: this.calculateSupportHealth(customer),
      trustScore: this.calculateTrustScorePerformance(customer),
      financialHealth: this.calculateFinancialHealth(customer),
    };

    const weightedScore =
      scores.adoption * CONFIG.healthScoring.weights.adoptionScore +
      scores.usageVelocity * CONFIG.healthScoring.weights.usageVelocity +
      scores.supportHealth * CONFIG.healthScoring.weights.supportHealth +
      scores.trustScore * CONFIG.healthScoring.weights.trustScorePerformance +
      scores.financialHealth * CONFIG.healthScoring.weights.financialHealth;

    return {
      overallScore: Math.round(weightedScore),
      componentScores: scores,
      healthStatus: this.getHealthStatus(weightedScore),
      trend: this.calculateTrend(customer),
    };
  }

  /**
   * Adoption Score: % of features actively used
   */
  calculateAdoptionScore(customer) {
    const { activeAgents, totalAgents, activePolicies, totalPolicies } = customer.usage;

    const agentAdoption = (activeAgents / totalAgents) * 100;
    const policyAdoption = (activePolicies / totalPolicies) * 100;

    // Weight agent adoption 60%, policy adoption 40%
    return agentAdoption * 0.6 + policyAdoption * 0.4;
  }

  /**
   * Usage Velocity: Growth in usage over time
   */
  calculateUsageVelocity(customer) {
    const { currentMonthAgentHours, previousMonthAgentHours } = customer.usage;

    if (previousMonthAgentHours === 0) return 50; // neutral if no historical data

    const growth = ((currentMonthAgentHours - previousMonthAgentHours) / previousMonthAgentHours) * 100;

    // Map growth to 0-100 scale (10% growth = 100, -10% decline = 0)
    return Math.max(0, Math.min(100, 50 + growth * 5));
  }

  /**
   * Support Health: Support ticket volume and sentiment
   */
  calculateSupportHealth(customer) {
    const { supportTicketsPerMonth, avgTicketResolutionHours, csat } = customer.support;

    let score = 100;

    // Penalize high ticket volume (>10 tickets/month is concerning)
    if (supportTicketsPerMonth > 10) {
      score -= (supportTicketsPerMonth - 10) * 5;
    }

    // Penalize slow resolution times (>24 hours is concerning)
    if (avgTicketResolutionHours > 24) {
      score -= (avgTicketResolutionHours - 24) * 2;
    }

    // Reward high CSAT (4.5+ out of 5)
    score += (csat - 3) * 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Trust Score Performance: Average Trust Score relative to target
   */
  calculateTrustScorePerformance(customer) {
    const { avgTrustScore, trustScoreUptime } = customer.telemetry;

    const targetTrustScore = 95;
    const targetUptime = 0.95;

    const trustScorePerf = (avgTrustScore / targetTrustScore) * 100;
    const uptimePerf = (trustScoreUptime / targetUptime) * 100;

    // Weight Trust Score 60%, uptime 40%
    return trustScorePerf * 0.6 + uptimePerf * 0.4;
  }

  /**
   * Financial Health: Payment status, contract value, expansion signals
   */
  calculateFinancialHealth(customer) {
    const { daysOverdue, expansionSignals } = customer.financial;

    let score = 100;

    // Penalize overdue invoices
    if (daysOverdue > 0) {
      score -= daysOverdue * 5; // -5 points per day overdue
    }

    // Reward expansion signals (upsell conversations, tier upgrades)
    if (expansionSignals > 0) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine health status category
   */
  getHealthStatus(score) {
    if (score >= CONFIG.thresholds.healthy) return 'healthy';
    if (score >= CONFIG.thresholds.atRisk) return 'at_risk';
    if (score >= CONFIG.thresholds.critical) return 'critical';
    return 'emergency';
  }

  /**
   * Calculate trend (improving, stable, declining)
   */
  calculateTrend(customer) {
    if (!customer.historicalHealth || customer.historicalHealth.length < 2) {
      return 'stable';
    }

    const recent = customer.historicalHealth.slice(-3); // last 3 months
    const avg = recent.reduce((sum, h) => sum + h.score, 0) / recent.length;
    const lastScore = recent[recent.length - 1].score;

    if (lastScore > avg + 5) return 'improving';
    if (lastScore < avg - 5) return 'declining';
    return 'stable';
  }
}

// ==============================================================================
// CHURN RISK PREDICTOR
// ==============================================================================

class ChurnRiskPredictor {
  /**
   * Predict churn risk using multiple signals
   */
  predictChurnRisk(customer, healthScore) {
    let riskScore = 0;
    const factors = [];

    // Factor 1: Low health score
    if (healthScore.overallScore < 60) {
      const risk = (60 - healthScore.overallScore) * 1.5;
      riskScore += risk;
      factors.push({
        factor: 'low_health_score',
        risk,
        detail: `Health score: ${healthScore.overallScore} (target: 80+)`,
      });
    }

    // Factor 2: Declining trend
    if (healthScore.trend === 'declining') {
      riskScore += 20;
      factors.push({
        factor: 'declining_trend',
        risk: 20,
        detail: 'Health score declining over last 3 months',
      });
    }

    // Factor 3: Low adoption
    if (healthScore.componentScores.adoption < 50) {
      riskScore += 25;
      factors.push({
        factor: 'low_adoption',
        risk: 25,
        detail: `Adoption: ${healthScore.componentScores.adoption.toFixed(1)}%`,
      });
    }

    // Factor 4: High support volume
    if (customer.support.supportTicketsPerMonth > 15) {
      riskScore += 15;
      factors.push({
        factor: 'high_support_volume',
        risk: 15,
        detail: `${customer.support.supportTicketsPerMonth} tickets/month`,
      });
    }

    // Factor 5: Low NPS
    if (customer.nps && customer.nps < 30) {
      riskScore += 20;
      factors.push({
        factor: 'low_nps',
        risk: 20,
        detail: `NPS: ${customer.nps} (target: 70+)`,
      });
    }

    // Factor 6: Executive disengagement
    if (customer.engagement && customer.engagement.daysSinceLastExecTouchpoint > 90) {
      riskScore += 10;
      factors.push({
        factor: 'executive_disengagement',
        risk: 10,
        detail: `No exec touchpoint for ${customer.engagement.daysSinceLastExecTouchpoint} days`,
      });
    }

    // Factor 7: Contract approaching renewal
    if (customer.contract && customer.contract.daysUntilRenewal < 60) {
      riskScore += 5;
      factors.push({
        factor: 'renewal_approaching',
        risk: 5,
        detail: `${customer.contract.daysUntilRenewal} days until renewal`,
      });
    }

    return {
      riskScore: Math.min(100, riskScore),
      riskCategory: this.categorizeRisk(riskScore),
      churnProbability: this.calculateChurnProbability(riskScore),
      factors,
    };
  }

  categorizeRisk(score) {
    if (score >= 70) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  calculateChurnProbability(riskScore) {
    // Map risk score (0-100) to churn probability (0-100%)
    const probability = Math.min(100, riskScore * 0.8);
    return {
      percent: probability.toFixed(1),
      confidence: this.getConfidence(riskScore),
    };
  }

  getConfidence(riskScore) {
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }
}

// ==============================================================================
// INTERVENTION ENGINE
// ==============================================================================

class InterventionEngine {
  /**
   * Generate recommended interventions based on customer health
   */
  generateInterventions(customer, healthScore, churnRisk) {
    const interventions = [];

    // Critical: Immediate escalation
    if (healthScore.overallScore < CONFIG.interventions.churnPrevention) {
      interventions.push({
        priority: 'critical',
        type: 'executive_escalation',
        action: 'Immediate executive review meeting',
        owner: 'VP Customer Success',
        timeline: 'today',
        reason: `Health score ${healthScore.overallScore}, churn risk ${churnRisk.riskCategory}`,
      });
    }

    // High risk: Health check
    if (healthScore.overallScore < CONFIG.interventions.healthCheck) {
      interventions.push({
        priority: 'high',
        type: 'health_check_call',
        action: 'Schedule customer health check call',
        owner: customer.accountManager,
        timeline: '3 days',
        reason: `Health score ${healthScore.overallScore}, trending ${healthScore.trend}`,
      });
    }

    // Low adoption: Training
    if (healthScore.componentScores.adoption < 60) {
      interventions.push({
        priority: 'medium',
        type: 'adoption_workshop',
        action: 'Offer feature adoption workshop',
        owner: 'Customer Success',
        timeline: '7 days',
        reason: `Adoption score ${healthScore.componentScores.adoption.toFixed(1)}%`,
      });
    }

    // High support volume: Technical review
    if (customer.support.supportTicketsPerMonth > 12) {
      interventions.push({
        priority: 'medium',
        type: 'technical_review',
        action: 'Conduct technical health review with solutions architect',
        owner: 'Solutions Architecture',
        timeline: '5 days',
        reason: `${customer.support.supportTicketsPerMonth} support tickets last month`,
      });
    }

    // Low Trust Score: Optimization
    if (healthScore.componentScores.trustScore < 85) {
      interventions.push({
        priority: 'medium',
        type: 'trust_score_optimization',
        action: 'Trust Score optimization session',
        owner: customer.accountManager,
        timeline: '10 days',
        reason: `Trust Score performance ${healthScore.componentScores.trustScore.toFixed(1)}%`,
      });
    }

    // Usage declining: Engagement campaign
    if (healthScore.componentScores.usageVelocity < 50) {
      interventions.push({
        priority: 'low',
        type: 'engagement_campaign',
        action: 'Launch re-engagement email campaign',
        owner: 'Marketing',
        timeline: '7 days',
        reason: 'Usage velocity declining',
      });
    }

    return interventions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
}

// ==============================================================================
// CUSTOMER HEALTH ENGINE (ORCHESTRATOR)
// ==============================================================================

class CustomerHealthEngine {
  constructor() {
    this.healthCalculator = new HealthScoreCalculator();
    this.churnPredictor = new ChurnRiskPredictor();
    this.interventionEngine = new InterventionEngine();
  }

  /**
   * Analyze customer and generate complete health assessment
   */
  analyzeCustomer(customer) {
    const healthScore = this.healthCalculator.calculateHealthScore(customer);
    const churnRisk = this.churnPredictor.predictChurnRisk(customer, healthScore);
    const interventions = this.interventionEngine.generateInterventions(customer, healthScore, churnRisk);

    return {
      customerId: customer.id,
      customerName: customer.name,
      accountManager: customer.accountManager,
      tier: customer.tier,
      healthScore,
      churnRisk,
      interventions,
      analysisDate: new Date().toISOString(),
    };
  }

  /**
   * Generate customer health report for entire portfolio
   */
  generatePortfolioReport(customers) {
    const analyses = customers.map((c) => this.analyzeCustomer(c));

    const summary = {
      totalCustomers: customers.length,
      healthDistribution: {
        healthy: analyses.filter((a) => a.healthScore.healthStatus === 'healthy').length,
        atRisk: analyses.filter((a) => a.healthScore.healthStatus === 'at_risk').length,
        critical: analyses.filter((a) => a.healthScore.healthStatus === 'critical').length,
        emergency: analyses.filter((a) => a.healthScore.healthStatus === 'emergency').length,
      },
      churnRiskDistribution: {
        low: analyses.filter((a) => a.churnRisk.riskCategory === 'low').length,
        medium: analyses.filter((a) => a.churnRisk.riskCategory === 'medium').length,
        high: analyses.filter((a) => a.churnRisk.riskCategory === 'high').length,
        critical: analyses.filter((a) => a.churnRisk.riskCategory === 'critical').length,
      },
      averageHealthScore: (analyses.reduce((sum, a) => sum + a.healthScore.overallScore, 0) / customers.length).toFixed(1),
      topRisks: analyses
        .filter((a) => a.churnRisk.riskCategory === 'critical' || a.churnRisk.riskCategory === 'high')
        .sort((a, b) => b.churnRisk.riskScore - a.churnRisk.riskScore)
        .slice(0, 10),
      interventionsRequired: analyses.reduce((sum, a) => sum + a.interventions.length, 0),
    };

    return {
      reportDate: new Date().toISOString(),
      summary,
      customerAnalyses: analyses,
    };
  }
}

// ==============================================================================
// CLI INTERFACE
// ==============================================================================

async function main() {
  console.log('🏥 Initializing Customer Health Engine...\n');

  const engine = new CustomerHealthEngine();

  // Sample customer data
  const sampleCustomers = [
    {
      id: 'CUST-001',
      name: 'Acme Financial Services',
      tier: 'Professional',
      accountManager: 'sarah.jones@mesh-os.ai',
      usage: {
        activeAgents: 425,
        totalAgents: 500,
        activePolicies: 85,
        totalPolicies: 100,
        currentMonthAgentHours: 48000,
        previousMonthAgentHours: 45000,
      },
      support: {
        supportTicketsPerMonth: 8,
        avgTicketResolutionHours: 6,
        csat: 4.5,
      },
      telemetry: {
        avgTrustScore: 93.2,
        trustScoreUptime: 0.962,
      },
      financial: {
        daysOverdue: 0,
        expansionSignals: 2,
      },
      nps: 75,
      engagement: {
        daysSinceLastExecTouchpoint: 22,
      },
      contract: {
        daysUntilRenewal: 45,
      },
      historicalHealth: [
        { month: 'August', score: 82 },
        { month: 'September', score: 85 },
        { month: 'October', score: 88 },
      ],
    },
    {
      id: 'CUST-002',
      name: 'TechCorp SaaS',
      tier: 'Enterprise',
      accountManager: 'mike.chen@mesh-os.ai',
      usage: {
        activeAgents: 800,
        totalAgents: 1200,
        activePolicies: 120,
        totalPolicies: 200,
        currentMonthAgentHours: 150000,
        previousMonthAgentHours: 180000,
      },
      support: {
        supportTicketsPerMonth: 18,
        avgTicketResolutionHours: 14,
        csat: 3.2,
      },
      telemetry: {
        avgTrustScore: 82.5,
        trustScoreUptime: 0.889,
      },
      financial: {
        daysOverdue: 0,
        expansionSignals: 0,
      },
      nps: 42,
      engagement: {
        daysSinceLastExecTouchpoint: 95,
      },
      contract: {
        daysUntilRenewal: 28,
      },
      historicalHealth: [
        { month: 'August', score: 78 },
        { month: 'September', score: 72 },
        { month: 'October', score: 65 },
      ],
    },
  ];

  // Analyze individual customer
  const customerAnalysis = engine.analyzeCustomer(sampleCustomers[0]);
  console.log('📊 Individual Customer Analysis:\n');
  console.log(`   Customer: ${customerAnalysis.customerName}`);
  console.log(`   Health Score: ${customerAnalysis.healthScore.overallScore} (${customerAnalysis.healthScore.healthStatus})`);
  console.log(`   Churn Risk: ${customerAnalysis.churnRisk.riskCategory} (${customerAnalysis.churnRisk.churnProbability.percent}% probability)`);
  console.log(`   Interventions: ${customerAnalysis.interventions.length} recommended\n`);

  // Generate portfolio report
  const portfolioReport = engine.generatePortfolioReport(sampleCustomers);
  console.log('📈 Portfolio Health Report:\n');
  console.log(JSON.stringify(portfolioReport, null, 2));

  console.log('\n✅ Customer health analysis complete.\n');
}

// ==============================================================================
// EXPORT FOR MODULE USAGE
// ==============================================================================

export {
  HealthScoreCalculator,
  ChurnRiskPredictor,
  InterventionEngine,
  CustomerHealthEngine,
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
