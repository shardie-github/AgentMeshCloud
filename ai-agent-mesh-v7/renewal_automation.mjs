#!/usr/bin/env node

/**
 * Renewal Automation Engine
 * Automated contract renewal pipeline with predictive analytics
 * 
 * Features:
 * - 30/7-day renewal alerts
 * - Usage-based upsell recommendations
 * - Churn risk prediction
 * - Automated quote generation
 * - CRM integration for renewal opportunities
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

// ==============================================================================
// CONFIGURATION
// ==============================================================================

const CONFIG = {
  alertThresholds: {
    earlyWarning: 30, // days before renewal
    urgent: 7,
    critical: 1,
  },
  upsellThresholds: {
    agentUsage: 0.85, // 85% of tier limit triggers upsell recommendation
    overageFrequency: 3, // 3 months of overages triggers tier upgrade
  },
  churnRiskFactors: {
    lowUsageThreshold: 0.30, // <30% usage signals churn risk
    supportTicketThreshold: 10, // >10 tickets/month signals dissatisfaction
    loginInactivity: 14, // days without login
  },
  integrations: {
    crmWebhook: process.env.CRM_WEBHOOK_URL,
    emailService: process.env.EMAIL_SERVICE_URL,
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
  },
};

// ==============================================================================
// DATA MODELS
// ==============================================================================

class Contract {
  constructor(data) {
    this.id = data.id;
    this.customerId = data.customerId;
    this.customerName = data.customerName;
    this.tier = data.tier; // Starter, Professional, Enterprise
    this.startDate = new Date(data.startDate);
    this.endDate = new Date(data.endDate);
    this.annualValue = data.annualValue;
    this.monthlyValue = data.monthlyValue;
    this.autoRenew = data.autoRenew || false;
    this.status = data.status || 'active'; // active, expired, renewed, cancelled
    this.usage = data.usage || {};
    this.contactEmail = data.contactEmail;
    this.accountManager = data.accountManager;
  }

  getDaysUntilRenewal() {
    const now = new Date();
    const diff = this.endDate - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  isRenewalPending() {
    const days = this.getDaysUntilRenewal();
    return days <= CONFIG.alertThresholds.earlyWarning && days > 0;
  }

  getRenewalUrgency() {
    const days = this.getDaysUntilRenewal();
    if (days <= CONFIG.alertThresholds.critical) return 'critical';
    if (days <= CONFIG.alertThresholds.urgent) return 'urgent';
    if (days <= CONFIG.alertThresholds.earlyWarning) return 'early_warning';
    return 'none';
  }
}

// ==============================================================================
// RENEWAL ANALYZER
// ==============================================================================

class RenewalAnalyzer {
  constructor() {
    this.tierLimits = {
      Starter: { maxAgents: 50, includedAgentHours: 10000 },
      Professional: { maxAgents: 500, includedAgentHours: 50000 },
      Enterprise: { maxAgents: Infinity, includedAgentHours: 250000 },
    };
  }

  /**
   * Analyze contract and generate renewal recommendation
   */
  analyzeContract(contract) {
    const daysUntilRenewal = contract.getDaysUntilRenewal();
    const urgency = contract.getRenewalUrgency();
    const churnRisk = this.calculateChurnRisk(contract);
    const upsellOpportunity = this.identifyUpsellOpportunity(contract);
    const renewalProbability = this.predictRenewalProbability(contract, churnRisk);

    return {
      contractId: contract.id,
      customerId: contract.customerId,
      customerName: contract.customerName,
      currentTier: contract.tier,
      annualValue: contract.annualValue,
      daysUntilRenewal,
      urgency,
      churnRisk,
      renewalProbability,
      upsellOpportunity,
      recommendedActions: this.generateRecommendedActions(
        contract,
        churnRisk,
        upsellOpportunity
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate churn risk score (0-100)
   */
  calculateChurnRisk(contract) {
    let riskScore = 0;
    const factors = [];

    // Usage-based risk
    const tierLimit = this.tierLimits[contract.tier];
    const usagePercent = contract.usage.agentCount / tierLimit.maxAgents;

    if (usagePercent < CONFIG.churnRiskFactors.lowUsageThreshold) {
      riskScore += 30;
      factors.push({
        factor: 'low_usage',
        impact: 30,
        detail: `Only ${(usagePercent * 100).toFixed(1)}% agent utilization`,
      });
    }

    // Support ticket volume
    if (contract.usage.supportTicketsPerMonth > CONFIG.churnRiskFactors.supportTicketThreshold) {
      riskScore += 25;
      factors.push({
        factor: 'high_support_volume',
        impact: 25,
        detail: `${contract.usage.supportTicketsPerMonth} tickets/month (threshold: ${CONFIG.churnRiskFactors.supportTicketThreshold})`,
      });
    }

    // Login inactivity
    if (contract.usage.daysSinceLastLogin > CONFIG.churnRiskFactors.loginInactivity) {
      riskScore += 20;
      factors.push({
        factor: 'login_inactivity',
        impact: 20,
        detail: `No login for ${contract.usage.daysSinceLastLogin} days`,
      });
    }

    // Trust Score performance
    if (contract.usage.avgTrustScore < 85) {
      riskScore += 15;
      factors.push({
        factor: 'low_trust_score',
        impact: 15,
        detail: `Avg Trust Score: ${contract.usage.avgTrustScore} (target: 95)`,
      });
    }

    // SLA breaches
    if (contract.usage.slaBreaches > 2) {
      riskScore += 10;
      factors.push({
        factor: 'sla_breaches',
        impact: 10,
        detail: `${contract.usage.slaBreaches} SLA breaches in last quarter`,
      });
    }

    return {
      score: Math.min(100, riskScore),
      category: this.categorizeRisk(riskScore),
      factors,
    };
  }

  categorizeRisk(score) {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Identify upsell opportunities
   */
  identifyUpsellOpportunity(contract) {
    const opportunities = [];
    const tierLimit = this.tierLimits[contract.tier];

    // Agent count approaching limit
    const agentUsagePercent = contract.usage.agentCount / tierLimit.maxAgents;
    if (agentUsagePercent >= CONFIG.upsellThresholds.agentUsage) {
      opportunities.push({
        type: 'tier_upgrade',
        reason: 'agent_limit',
        currentTier: contract.tier,
        recommendedTier: this.getNextTier(contract.tier),
        impact: `Agent count at ${(agentUsagePercent * 100).toFixed(1)}% of limit`,
        estimatedARRIncrease: this.calculateTierUpgradeValue(contract),
      });
    }

    // Frequent overages
    if (contract.usage.overageMonths >= CONFIG.upsellThresholds.overageFrequency) {
      opportunities.push({
        type: 'tier_upgrade',
        reason: 'frequent_overages',
        currentTier: contract.tier,
        recommendedTier: this.getNextTier(contract.tier),
        impact: `Overages in ${contract.usage.overageMonths} of last 12 months`,
        estimatedARRIncrease: this.calculateTierUpgradeValue(contract),
      });
    }

    // Add-on opportunities
    if (!contract.usage.hasCarbonAnalytics && contract.usage.computeHours > 5000) {
      opportunities.push({
        type: 'add_on',
        product: 'Advanced Carbon Analytics',
        reason: 'high_compute_usage',
        impact: 'ESG reporting + 15% additional carbon reduction',
        monthlyPrice: 1500,
        estimatedARRIncrease: 18000,
      });
    }

    if (!contract.usage.hasPartnerEnablement && contract.usage.partnerCount > 0) {
      opportunities.push({
        type: 'add_on',
        product: 'Partner Enablement Package',
        reason: 'active_partner_ecosystem',
        impact: `${contract.usage.partnerCount} partners need access`,
        monthlyPrice: 2000,
        estimatedARRIncrease: 24000,
      });
    }

    if (contract.tier === 'Professional' && contract.usage.dataRetentionDays < 365) {
      opportunities.push({
        type: 'add_on',
        product: 'Extended Data Retention',
        reason: 'compliance_requirement',
        impact: 'Extend to 2-year retention for audit compliance',
        monthlyPrice: 500,
        estimatedARRIncrease: 6000,
      });
    }

    return {
      hasOpportunities: opportunities.length > 0,
      count: opportunities.length,
      totalARRIncrease: opportunities.reduce((sum, opp) => sum + opp.estimatedARRIncrease, 0),
      opportunities,
    };
  }

  getNextTier(currentTier) {
    const tierProgression = ['Starter', 'Professional', 'Enterprise'];
    const currentIndex = tierProgression.indexOf(currentTier);
    return tierProgression[currentIndex + 1] || 'Enterprise';
  }

  calculateTierUpgradeValue(contract) {
    const tierPricing = {
      Starter: 30000,
      Professional: 90000,
      Enterprise: 300000,
    };

    const currentValue = tierPricing[contract.tier];
    const nextTier = this.getNextTier(contract.tier);
    const nextValue = tierPricing[nextTier];

    return nextValue - currentValue;
  }

  /**
   * Predict renewal probability using multiple signals
   */
  predictRenewalProbability(contract, churnRisk) {
    let baseProbability = 0.75; // 75% baseline renewal rate

    // Adjust for churn risk
    if (churnRisk.category === 'high') {
      baseProbability -= 0.35;
    } else if (churnRisk.category === 'medium') {
      baseProbability -= 0.15;
    }

    // Adjust for usage patterns (high usage = higher renewal probability)
    const tierLimit = this.tierLimits[contract.tier];
    const usagePercent = contract.usage.agentCount / tierLimit.maxAgents;
    if (usagePercent > 0.70) {
      baseProbability += 0.15;
    }

    // Adjust for NPS score
    if (contract.usage.npsScore >= 70) {
      baseProbability += 0.10;
    } else if (contract.usage.npsScore < 30) {
      baseProbability -= 0.20;
    }

    // Adjust for account manager engagement
    if (contract.usage.lastTouchpointDays < 30) {
      baseProbability += 0.05;
    } else if (contract.usage.lastTouchpointDays > 90) {
      baseProbability -= 0.10;
    }

    return {
      probability: Math.max(0, Math.min(1, baseProbability)),
      probabilityPercent: `${(Math.max(0, Math.min(1, baseProbability)) * 100).toFixed(1)}%`,
      confidence: this.calculateConfidence(contract),
    };
  }

  calculateConfidence(contract) {
    // Confidence based on data completeness
    let dataPoints = 0;
    let totalPossible = 10;

    if (contract.usage.agentCount !== undefined) dataPoints++;
    if (contract.usage.supportTicketsPerMonth !== undefined) dataPoints++;
    if (contract.usage.daysSinceLastLogin !== undefined) dataPoints++;
    if (contract.usage.avgTrustScore !== undefined) dataPoints++;
    if (contract.usage.npsScore !== undefined) dataPoints++;
    if (contract.usage.slaBreaches !== undefined) dataPoints++;
    if (contract.usage.overageMonths !== undefined) dataPoints++;
    if (contract.usage.lastTouchpointDays !== undefined) dataPoints++;
    if (contract.usage.computeHours !== undefined) dataPoints++;
    if (contract.usage.partnerCount !== undefined) dataPoints++;

    const confidencePercent = (dataPoints / totalPossible) * 100;
    if (confidencePercent >= 80) return 'high';
    if (confidencePercent >= 50) return 'medium';
    return 'low';
  }

  /**
   * Generate recommended actions for account team
   */
  generateRecommendedActions(contract, churnRisk, upsellOpportunity) {
    const actions = [];
    const daysUntilRenewal = contract.getDaysUntilRenewal();

    // Renewal-specific actions
    if (daysUntilRenewal <= CONFIG.alertThresholds.critical) {
      actions.push({
        priority: 'critical',
        action: 'immediate_outreach',
        description: 'Call customer immediately - renewal in <48 hours',
        owner: contract.accountManager,
        deadline: 'today',
      });
    } else if (daysUntilRenewal <= CONFIG.alertThresholds.urgent) {
      actions.push({
        priority: 'high',
        action: 'schedule_renewal_call',
        description: 'Schedule renewal discussion within 2 business days',
        owner: contract.accountManager,
        deadline: '2 days',
      });
    } else if (daysUntilRenewal <= CONFIG.alertThresholds.earlyWarning) {
      actions.push({
        priority: 'medium',
        action: 'send_renewal_reminder',
        description: 'Send renewal reminder email with usage summary',
        owner: contract.accountManager,
        deadline: '7 days',
      });
    }

    // Churn risk mitigation
    if (churnRisk.category === 'high') {
      actions.push({
        priority: 'critical',
        action: 'executive_escalation',
        description: 'Escalate to VP Customer Success - high churn risk',
        owner: 'CS Leadership',
        deadline: 'today',
      });

      actions.push({
        priority: 'high',
        action: 'qbr_scheduling',
        description: 'Schedule emergency QBR to address usage concerns',
        owner: contract.accountManager,
        deadline: '3 days',
      });
    } else if (churnRisk.category === 'medium') {
      actions.push({
        priority: 'medium',
        action: 'health_check',
        description: 'Conduct customer health check call',
        owner: contract.accountManager,
        deadline: '7 days',
      });
    }

    // Upsell actions
    if (upsellOpportunity.hasOpportunities) {
      actions.push({
        priority: 'medium',
        action: 'prepare_upsell_proposal',
        description: `Prepare proposal for ${upsellOpportunity.count} upsell opportunities (+$${upsellOpportunity.totalARRIncrease.toLocaleString()} ARR)`,
        owner: contract.accountManager,
        deadline: '5 days',
      });
    }

    // Usage optimization actions
    if (contract.usage.avgTrustScore < 90) {
      actions.push({
        priority: 'medium',
        action: 'optimization_workshop',
        description: 'Offer Trust Score optimization workshop',
        owner: 'Customer Success',
        deadline: '14 days',
      });
    }

    return actions;
  }
}

// ==============================================================================
// RENEWAL AUTOMATION ENGINE
// ==============================================================================

class RenewalAutomationEngine {
  constructor() {
    this.analyzer = new RenewalAnalyzer();
  }

  /**
   * Process all contracts and trigger renewal workflows
   */
  async processRenewals(contracts) {
    const results = {
      processed: 0,
      renewalsPending: 0,
      highChurnRisk: 0,
      upsellOpportunities: 0,
      totalPotentialARR: 0,
      alerts: [],
    };

    for (const contractData of contracts) {
      const contract = new Contract(contractData);

      if (!contract.isRenewalPending()) continue;

      const analysis = this.analyzer.analyzeContract(contract);
      results.processed++;
      results.renewalsPending++;

      if (analysis.churnRisk.category === 'high') {
        results.highChurnRisk++;
      }

      if (analysis.upsellOpportunity.hasOpportunities) {
        results.upsellOpportunities++;
        results.totalPotentialARR += analysis.upsellOpportunity.totalARRIncrease;
      }

      // Trigger alerts and workflows
      await this.triggerAlerts(contract, analysis);
      await this.createCRMTask(contract, analysis);
      await this.sendRenewalEmail(contract, analysis);

      results.alerts.push(analysis);
    }

    return results;
  }

  /**
   * Trigger alerts to Slack/email based on urgency
   */
  async triggerAlerts(contract, analysis) {
    if (analysis.urgency === 'none') return;

    const message = this.formatSlackMessage(contract, analysis);

    if (CONFIG.integrations.slackWebhook) {
      // In production, would actually send to Slack
      console.log(`[SLACK ALERT] ${analysis.urgency.toUpperCase()}: ${contract.customerName}`);
    }

    return message;
  }

  formatSlackMessage(contract, analysis) {
    const emoji = {
      critical: '🚨',
      urgent: '⚠️',
      early_warning: '📅',
    }[analysis.urgency];

    return {
      text: `${emoji} Renewal Alert: ${contract.customerName}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} Renewal Alert: ${contract.customerName}`,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*Days Until Renewal:*\n${analysis.daysUntilRenewal}` },
            { type: 'mrkdwn', text: `*Annual Value:*\n$${contract.annualValue.toLocaleString()}` },
            { type: 'mrkdwn', text: `*Churn Risk:*\n${analysis.churnRisk.category.toUpperCase()} (${analysis.churnRisk.score})` },
            { type: 'mrkdwn', text: `*Renewal Probability:*\n${analysis.renewalProbability.probabilityPercent}` },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Recommended Actions:*\n${analysis.recommendedActions.slice(0, 3).map((a) => `• ${a.description}`).join('\n')}`,
          },
        },
      ],
    };
  }

  /**
   * Create CRM tasks for account team
   */
  async createCRMTask(contract, analysis) {
    const task = {
      subject: `Renewal: ${contract.customerName} (${analysis.daysUntilRenewal} days)`,
      type: 'renewal',
      priority: analysis.urgency,
      customerId: contract.customerId,
      contractId: contract.id,
      owner: contract.accountManager,
      dueDate: new Date(Date.now() + analysis.daysUntilRenewal * 24 * 60 * 60 * 1000).toISOString(),
      details: {
        annualValue: contract.annualValue,
        churnRisk: analysis.churnRisk,
        renewalProbability: analysis.renewalProbability,
        upsellOpportunities: analysis.upsellOpportunity.opportunities,
        recommendedActions: analysis.recommendedActions,
      },
    };

    if (CONFIG.integrations.crmWebhook) {
      // In production, would POST to CRM webhook
      console.log(`[CRM TASK] Created renewal task for ${contract.customerName}`);
    }

    return task;
  }

  /**
   * Send renewal email to customer
   */
  async sendRenewalEmail(contract, analysis) {
    const template = analysis.urgency === 'critical' ? 'urgent_renewal' : 'standard_renewal';

    const email = {
      to: contract.contactEmail,
      from: 'renewals@mesh-os.ai',
      subject: `Your Mesh OS Subscription Renewal - ${analysis.daysUntilRenewal} Days`,
      template,
      data: {
        customerName: contract.customerName,
        daysUntilRenewal: analysis.daysUntilRenewal,
        currentTier: contract.tier,
        annualValue: contract.annualValue,
        usageSummary: this.generateUsageSummary(contract),
        upsellOpportunities: analysis.upsellOpportunity.opportunities,
        accountManager: contract.accountManager,
      },
    };

    if (CONFIG.integrations.emailService) {
      // In production, would send via email service
      console.log(`[EMAIL] Sent renewal email to ${contract.contactEmail}`);
    }

    return email;
  }

  generateUsageSummary(contract) {
    return {
      agentCount: contract.usage.agentCount,
      avgTrustScore: contract.usage.avgTrustScore,
      incidentsResolved: contract.usage.incidentsResolved || 0,
      costSavings: contract.usage.costSavings || 0,
      carbonOffset: contract.usage.carbonOffset || 0,
    };
  }

  /**
   * Generate renewal forecast report
   */
  generateForecastReport(results) {
    return {
      summary: {
        totalRenewalsTracked: results.processed,
        renewalsPending: results.renewalsPending,
        highChurnRiskCount: results.highChurnRisk,
        upsellOpportunityCount: results.upsellOpportunities,
        potentialARRIncrease: results.totalPotentialARR,
      },
      byUrgency: {
        critical: results.alerts.filter((a) => a.urgency === 'critical').length,
        urgent: results.alerts.filter((a) => a.urgency === 'urgent').length,
        early_warning: results.alerts.filter((a) => a.urgency === 'early_warning').length,
      },
      byChurnRisk: {
        high: results.alerts.filter((a) => a.churnRisk.category === 'high').length,
        medium: results.alerts.filter((a) => a.churnRisk.category === 'medium').length,
        low: results.alerts.filter((a) => a.churnRisk.category === 'low').length,
      },
      topRisks: results.alerts
        .filter((a) => a.churnRisk.category === 'high')
        .sort((a, b) => b.annualValue - a.annualValue)
        .slice(0, 10),
      topUpsells: results.alerts
        .filter((a) => a.upsellOpportunity.hasOpportunities)
        .sort((a, b) => b.upsellOpportunity.totalARRIncrease - a.upsellOpportunity.totalARRIncrease)
        .slice(0, 10),
    };
  }
}

// ==============================================================================
// CLI INTERFACE
// ==============================================================================

async function main() {
  console.log('🔄 Starting Renewal Automation Engine...\n');

  // Sample contract data (in production, would fetch from database)
  const sampleContracts = [
    {
      id: 'CNT-001',
      customerId: 'CUST-123',
      customerName: 'Acme Financial Services',
      tier: 'Professional',
      startDate: '2024-01-15',
      endDate: '2025-11-10', // 11 days from now
      annualValue: 90000,
      monthlyValue: 7500,
      autoRenew: false,
      contactEmail: 'cto@acme-fin.com',
      accountManager: 'sarah.jones@mesh-os.ai',
      usage: {
        agentCount: 425,
        supportTicketsPerMonth: 8,
        daysSinceLastLogin: 3,
        avgTrustScore: 93.2,
        npsScore: 75,
        slaBreaches: 1,
        overageMonths: 4,
        lastTouchpointDays: 22,
        computeHours: 48000,
        partnerCount: 0,
        hasCarbonAnalytics: false,
        hasPartnerEnablement: false,
        dataRetentionDays: 90,
        incidentsResolved: 285,
        costSavings: 42000,
        carbonOffset: 8.2,
      },
    },
    {
      id: 'CNT-002',
      customerId: 'CUST-456',
      customerName: 'TechCorp SaaS',
      tier: 'Enterprise',
      startDate: '2023-06-01',
      endDate: '2025-11-25', // 26 days from now
      annualValue: 300000,
      monthlyValue: 25000,
      autoRenew: true,
      contactEmail: 'vp-eng@techcorp.io',
      accountManager: 'mike.chen@mesh-os.ai',
      usage: {
        agentCount: 1200,
        supportTicketsPerMonth: 15,
        daysSinceLastLogin: 1,
        avgTrustScore: 82.5,
        npsScore: 45,
        slaBreaches: 4,
        overageMonths: 0,
        lastTouchpointDays: 62,
        computeHours: 180000,
        partnerCount: 5,
        hasCarbonAnalytics: true,
        hasPartnerEnablement: false,
        dataRetentionDays: 365,
        incidentsResolved: 892,
        costSavings: 180000,
        carbonOffset: 32.4,
      },
    },
  ];

  const engine = new RenewalAutomationEngine();
  const results = await engine.processRenewals(sampleContracts);

  console.log('📊 Renewal Processing Results:\n');
  console.log(`   Contracts Processed: ${results.processed}`);
  console.log(`   Renewals Pending: ${results.renewalsPending}`);
  console.log(`   High Churn Risk: ${results.highChurnRisk}`);
  console.log(`   Upsell Opportunities: ${results.upsellOpportunities}`);
  console.log(`   Potential ARR Increase: $${results.totalPotentialARR.toLocaleString()}\n`);

  const forecast = engine.generateForecastReport(results);
  console.log('📈 Renewal Forecast Summary:\n');
  console.log(JSON.stringify(forecast, null, 2));

  console.log('\n✅ Renewal automation complete.\n');
}

// ==============================================================================
// EXPORT FOR MODULE USAGE
// ==============================================================================

export { Contract, RenewalAnalyzer, RenewalAutomationEngine };

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
