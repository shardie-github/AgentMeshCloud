#!/usr/bin/env node

/**
 * Marketing Automation Flow
 * Funnel tracking, lead intelligence, and conversion optimization
 * 
 * Features:
 * - Multi-touch attribution
 * - Lead scoring & qualification
 * - Conversion funnel analysis
 * - Campaign ROI tracking
 * - CRM integration (HubSpot/Salesforce)
 * - Google Analytics events
 */

import fs from 'fs';
import path from 'path';

// ==============================================================================
// CONFIGURATION
// ==============================================================================

const CONFIG = {
  attribution: {
    model: 'multi_touch', // first_touch, last_touch, linear, time_decay, multi_touch
    lookbackWindow: 90, // days
  },
  leadScoring: {
    demographics: {
      companySize: {
        'enterprise_2000+': 30,
        'midmarket_200-2000': 20,
        'smb_10-200': 10,
      },
      industry: {
        'financial_services': 25,
        'healthcare': 25,
        'saas': 20,
        'ecommerce': 15,
        'other': 10,
      },
      role: {
        'ciso': 30,
        'cto': 25,
        'vp_engineering': 20,
        'director': 15,
        'manager': 10,
      },
    },
    behavior: {
      page_views: {
        pricing: 15,
        case_study: 12,
        documentation: 10,
        blog: 5,
      },
      engagement: {
        demo_request: 40,
        trial_signup: 35,
        whitepaper_download: 20,
        webinar_registration: 15,
        newsletter_signup: 5,
      },
      intent: {
        trust_score_search: 20,
        compliance_automation_search: 18,
        autonomous_healing_search: 15,
        ai_governance_search: 12,
      },
    },
    firmographics: {
      budget_authority: 25,
      decision_maker: 20,
      champion: 15,
    },
  },
  funnelStages: [
    'visitor',
    'marketing_qualified_lead',
    'sales_qualified_lead',
    'opportunity',
    'closed_won',
    'closed_lost',
  ],
  integrations: {
    hubspot: process.env.HUBSPOT_API_KEY,
    salesforce: process.env.SALESFORCE_API_KEY,
    googleAnalytics: process.env.GA_TRACKING_ID,
    segment: process.env.SEGMENT_WRITE_KEY,
  },
};

// ==============================================================================
// LEAD SCORING ENGINE
// ==============================================================================

class LeadScoringEngine {
  constructor() {
    this.minMQLScore = 50;
    this.minSQLScore = 75;
  }

  /**
   * Calculate lead score based on demographics, behavior, and firmographics
   */
  calculateScore(lead) {
    let score = 0;
    const breakdown = {
      demographics: 0,
      behavior: 0,
      firmographics: 0,
    };

    // Demographics scoring
    if (lead.companySize && CONFIG.leadScoring.demographics.companySize[lead.companySize]) {
      breakdown.demographics += CONFIG.leadScoring.demographics.companySize[lead.companySize];
    }

    if (lead.industry && CONFIG.leadScoring.demographics.industry[lead.industry]) {
      breakdown.demographics += CONFIG.leadScoring.demographics.industry[lead.industry];
    }

    if (lead.role && CONFIG.leadScoring.demographics.role[lead.role]) {
      breakdown.demographics += CONFIG.leadScoring.demographics.role[lead.role];
    }

    // Behavior scoring
    if (lead.pageViews) {
      for (const [page, count] of Object.entries(lead.pageViews)) {
        if (CONFIG.leadScoring.behavior.page_views[page]) {
          breakdown.behavior += CONFIG.leadScoring.behavior.page_views[page] * Math.min(count, 3);
        }
      }
    }

    if (lead.engagements) {
      for (const [engagement, count] of Object.entries(lead.engagements)) {
        if (CONFIG.leadScoring.behavior.engagement[engagement]) {
          breakdown.behavior += CONFIG.leadScoring.behavior.engagement[engagement] * count;
        }
      }
    }

    if (lead.intentSignals) {
      for (const [signal, count] of Object.entries(lead.intentSignals)) {
        if (CONFIG.leadScoring.behavior.intent[signal]) {
          breakdown.behavior += CONFIG.leadScoring.behavior.intent[signal] * Math.min(count, 2);
        }
      }
    }

    // Firmographics scoring
    if (lead.budgetAuthority) {
      breakdown.firmographics += CONFIG.leadScoring.firmographics.budget_authority;
    }

    if (lead.isDecisionMaker) {
      breakdown.firmographics += CONFIG.leadScoring.firmographics.decision_maker;
    }

    if (lead.hasChampion) {
      breakdown.firmographics += CONFIG.leadScoring.firmographics.champion;
    }

    score = breakdown.demographics + breakdown.behavior + breakdown.firmographics;

    return {
      totalScore: score,
      breakdown,
      grade: this.getLeadGrade(score),
      qualification: this.getQualificationStatus(score),
    };
  }

  getLeadGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    return 'D';
  }

  getQualificationStatus(score) {
    if (score >= this.minSQLScore) return 'SQL';
    if (score >= this.minMQLScore) return 'MQL';
    return 'Unqualified';
  }
}

// ==============================================================================
// FUNNEL ANALYTICS ENGINE
// ==============================================================================

class FunnelAnalyticsEngine {
  constructor() {
    this.stages = CONFIG.funnelStages;
  }

  /**
   * Calculate funnel conversion rates and drop-off analysis
   */
  analyzeFunnel(data) {
    const analysis = {
      stages: [],
      totalConversionRate: 0,
      dropOffPoints: [],
    };

    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      const count = data[stage] || 0;
      const previousCount = i > 0 ? (data[this.stages[i - 1]] || 0) : count;
      const conversionRate = previousCount > 0 ? (count / previousCount) * 100 : 0;
      const dropOff = previousCount - count;

      analysis.stages.push({
        stage,
        count,
        conversionRate: conversionRate.toFixed(2) + '%',
        dropOff,
        dropOffRate: previousCount > 0 ? ((dropOff / previousCount) * 100).toFixed(2) + '%' : '0%',
      });

      // Identify significant drop-off points (>50% drop)
      if (dropOff / previousCount > 0.5 && i > 0) {
        analysis.dropOffPoints.push({
          from: this.stages[i - 1],
          to: stage,
          dropOffCount: dropOff,
          dropOffPercent: ((dropOff / previousCount) * 100).toFixed(2) + '%',
        });
      }
    }

    // Calculate total conversion rate (visitor → closed_won)
    const visitors = data.visitor || 0;
    const closedWon = data.closed_won || 0;
    analysis.totalConversionRate = visitors > 0 ? ((closedWon / visitors) * 100).toFixed(2) + '%' : '0%';

    return analysis;
  }

  /**
   * Generate funnel optimization recommendations
   */
  generateRecommendations(funnelAnalysis) {
    const recommendations = [];

    // Analyze each stage conversion
    for (let i = 0; i < funnelAnalysis.stages.length - 1; i++) {
      const stage = funnelAnalysis.stages[i];
      const conversionRate = parseFloat(stage.conversionRate);

      if (conversionRate < 30 && stage.stage === 'marketing_qualified_lead') {
        recommendations.push({
          priority: 'high',
          stage: 'Visitor → MQL',
          issue: `Low MQL conversion rate (${stage.conversionRate})`,
          recommendation: 'Improve lead magnet quality, optimize CTAs, enhance value proposition',
        });
      }

      if (conversionRate < 40 && stage.stage === 'sales_qualified_lead') {
        recommendations.push({
          priority: 'high',
          stage: 'MQL → SQL',
          issue: `Low SQL conversion rate (${stage.conversionRate})`,
          recommendation: 'Refine lead scoring criteria, improve SDR qualification process',
        });
      }

      if (conversionRate < 60 && stage.stage === 'opportunity') {
        recommendations.push({
          priority: 'medium',
          stage: 'SQL → Opportunity',
          issue: `Low opportunity conversion rate (${stage.conversionRate})`,
          recommendation: 'Strengthen discovery calls, improve demo-to-opportunity transition',
        });
      }

      if (conversionRate < 35 && stage.stage === 'closed_won') {
        recommendations.push({
          priority: 'critical',
          stage: 'Opportunity → Closed Won',
          issue: `Low close rate (${stage.conversionRate})`,
          recommendation: 'Analyze lost reasons, improve sales enablement, refine pricing/packaging',
        });
      }
    }

    return recommendations;
  }
}

// ==============================================================================
// ATTRIBUTION ENGINE
// ==============================================================================

class AttributionEngine {
  /**
   * Multi-touch attribution model
   * Credits touchpoints based on position and time decay
   */
  calculateAttribution(touchpoints, revenue) {
    if (touchpoints.length === 0) return [];

    const attribution = [];

    // Sort touchpoints by timestamp
    touchpoints.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (CONFIG.attribution.model === 'first_touch') {
      attribution.push({
        ...touchpoints[0],
        credit: revenue,
        creditPercent: 100,
      });
    } else if (CONFIG.attribution.model === 'last_touch') {
      attribution.push({
        ...touchpoints[touchpoints.length - 1],
        credit: revenue,
        creditPercent: 100,
      });
    } else if (CONFIG.attribution.model === 'linear') {
      const creditPerTouch = revenue / touchpoints.length;
      touchpoints.forEach((tp) => {
        attribution.push({
          ...tp,
          credit: creditPerTouch,
          creditPercent: (100 / touchpoints.length).toFixed(2),
        });
      });
    } else if (CONFIG.attribution.model === 'multi_touch') {
      // U-shaped: 40% first, 40% last, 20% distributed to middle
      if (touchpoints.length === 1) {
        attribution.push({ ...touchpoints[0], credit: revenue, creditPercent: 100 });
      } else if (touchpoints.length === 2) {
        attribution.push({ ...touchpoints[0], credit: revenue * 0.5, creditPercent: 50 });
        attribution.push({ ...touchpoints[1], credit: revenue * 0.5, creditPercent: 50 });
      } else {
        const firstCredit = revenue * 0.40;
        const lastCredit = revenue * 0.40;
        const middleCredit = revenue * 0.20;
        const middleTouchpoints = touchpoints.length - 2;
        const creditPerMiddle = middleCredit / middleTouchpoints;

        attribution.push({ ...touchpoints[0], credit: firstCredit, creditPercent: 40 });
        for (let i = 1; i < touchpoints.length - 1; i++) {
          attribution.push({
            ...touchpoints[i],
            credit: creditPerMiddle,
            creditPercent: (20 / middleTouchpoints).toFixed(2),
          });
        }
        attribution.push({
          ...touchpoints[touchpoints.length - 1],
          credit: lastCredit,
          creditPercent: 40,
        });
      }
    }

    return attribution;
  }

  /**
   * Aggregate attribution by channel
   */
  aggregateByChannel(attributions) {
    const byChannel = {};

    attributions.forEach((attr) => {
      const channel = attr.channel || 'direct';
      if (!byChannel[channel]) {
        byChannel[channel] = {
          channel,
          totalCredit: 0,
          touchpoints: 0,
        };
      }

      byChannel[channel].totalCredit += attr.credit;
      byChannel[channel].touchpoints += 1;
    });

    return Object.values(byChannel).sort((a, b) => b.totalCredit - a.totalCredit);
  }
}

// ==============================================================================
// CAMPAIGN ROI TRACKER
// ==============================================================================

class CampaignROITracker {
  /**
   * Calculate ROI for marketing campaigns
   */
  calculateCampaignROI(campaign) {
    const {
      spend,
      leads,
      mqls,
      sqls,
      opportunities,
      closedWon,
      totalRevenue,
    } = campaign;

    const costPerLead = spend / leads;
    const costPerMQL = spend / mqls;
    const costPerSQL = spend / sqls;
    const costPerOpportunity = spend / opportunities;
    const costPerAcquisition = closedWon > 0 ? spend / closedWon : 0;

    const roi = ((totalRevenue - spend) / spend) * 100;

    return {
      campaignName: campaign.name,
      spend,
      leads,
      mqls,
      sqls,
      opportunities,
      closedWon,
      totalRevenue,
      metrics: {
        costPerLead: `$${costPerLead.toFixed(2)}`,
        costPerMQL: `$${costPerMQL.toFixed(2)}`,
        costPerSQL: `$${costPerSQL.toFixed(2)}`,
        costPerOpportunity: `$${costPerOpportunity.toFixed(2)}`,
        costPerAcquisition: `$${costPerAcquisition.toFixed(2)}`,
        roi: `${roi.toFixed(2)}%`,
        roas: (totalRevenue / spend).toFixed(2),
      },
    };
  }
}

// ==============================================================================
// MARKETING AUTOMATION ORCHESTRATOR
// ==============================================================================

class MarketingAutomationOrchestrator {
  constructor() {
    this.leadScoring = new LeadScoringEngine();
    this.funnelAnalytics = new FunnelAnalyticsEngine();
    this.attribution = new AttributionEngine();
    this.campaignROI = new CampaignROITracker();
  }

  /**
   * Process lead and determine next marketing action
   */
  processLead(lead) {
    const score = this.leadScoring.calculateScore(lead);
    const actions = [];

    if (score.qualification === 'SQL') {
      actions.push({
        type: 'crm_update',
        action: 'assign_to_sales',
        urgency: 'high',
        message: `Lead scored ${score.totalScore} - ready for sales`,
      });

      actions.push({
        type: 'email',
        template: 'sql_demo_request',
        delay: 0,
      });

      actions.push({
        type: 'slack_notification',
        channel: '#sales-qualified-leads',
        message: `🎯 New SQL: ${lead.name} (${lead.company}) - Score: ${score.totalScore}`,
      });
    } else if (score.qualification === 'MQL') {
      actions.push({
        type: 'crm_update',
        action: 'assign_to_sdr',
        urgency: 'medium',
        message: `Lead scored ${score.totalScore} - ready for SDR outreach`,
      });

      actions.push({
        type: 'email',
        template: 'mql_nurture_sequence',
        delay: 24, // hours
      });
    } else {
      actions.push({
        type: 'email',
        template: 'nurture_drip_campaign',
        delay: 72, // hours
      });
    }

    return {
      lead,
      score,
      actions,
    };
  }

  /**
   * Generate marketing performance report
   */
  generateReport(data) {
    const funnelAnalysis = this.funnelAnalytics.analyzeFunnel(data.funnelData);
    const recommendations = this.funnelAnalytics.generateRecommendations(funnelAnalysis);

    const campaignPerformance = data.campaigns.map((campaign) =>
      this.campaignROI.calculateCampaignROI(campaign)
    );

    const attributionData = this.attribution.calculateAttribution(
      data.touchpoints,
      data.totalRevenue
    );
    const channelAttribution = this.attribution.aggregateByChannel(attributionData);

    return {
      period: data.period,
      funnelAnalysis,
      recommendations,
      campaignPerformance,
      channelAttribution,
      summary: {
        totalSpend: data.campaigns.reduce((sum, c) => sum + c.spend, 0),
        totalRevenue: data.totalRevenue,
        overallROI: (((data.totalRevenue - data.campaigns.reduce((sum, c) => sum + c.spend, 0)) /
          data.campaigns.reduce((sum, c) => sum + c.spend, 0)) * 100).toFixed(2) + '%',
        topPerformingChannel: channelAttribution[0]?.channel || 'N/A',
      },
    };
  }
}

// ==============================================================================
// CLI INTERFACE
// ==============================================================================

async function main() {
  console.log('🚀 Initializing Marketing Automation Flow...\n');

  const orchestrator = new MarketingAutomationOrchestrator();

  // Sample lead data
  const sampleLead = {
    name: 'Jane Doe',
    email: 'jane.doe@acme-fin.com',
    company: 'Acme Financial Services',
    companySize: 'midmarket_200-2000',
    industry: 'financial_services',
    role: 'ciso',
    budgetAuthority: true,
    isDecisionMaker: true,
    hasChampion: false,
    pageViews: {
      pricing: 3,
      case_study: 2,
      documentation: 1,
    },
    engagements: {
      demo_request: 1,
      whitepaper_download: 1,
    },
    intentSignals: {
      trust_score_search: 2,
      compliance_automation_search: 1,
    },
  };

  // Process lead
  const leadResult = orchestrator.processLead(sampleLead);
  console.log('📊 Lead Processing Result:\n');
  console.log(`   Lead: ${leadResult.lead.name} (${leadResult.lead.company})`);
  console.log(`   Score: ${leadResult.score.totalScore} (${leadResult.score.grade})`);
  console.log(`   Qualification: ${leadResult.score.qualification}`);
  console.log(`   Actions: ${leadResult.actions.length} automated actions triggered\n`);

  // Sample marketing data for report
  const sampleData = {
    period: 'October 2025',
    funnelData: {
      visitor: 25000,
      marketing_qualified_lead: 750,
      sales_qualified_lead: 300,
      opportunity: 180,
      closed_won: 63,
      closed_lost: 117,
    },
    campaigns: [
      {
        name: 'Content Marketing (Inbound)',
        spend: 120000,
        leads: 600,
        mqls: 240,
        sqls: 120,
        opportunities: 72,
        closedWon: 28,
        totalRevenue: 840000,
      },
      {
        name: 'Outbound SDR Campaign',
        spend: 80000,
        leads: 400,
        mqls: 160,
        sqls: 80,
        opportunities: 48,
        closedWon: 18,
        totalRevenue: 540000,
      },
    ],
    touchpoints: [
      { channel: 'organic_search', timestamp: '2025-09-01', campaign: 'Content Marketing' },
      { channel: 'linkedin', timestamp: '2025-09-15', campaign: 'Social Media' },
      { channel: 'email', timestamp: '2025-10-01', campaign: 'Email Nurture' },
      { channel: 'demo', timestamp: '2025-10-15', campaign: 'Sales Demo' },
    ],
    totalRevenue: 1380000,
  };

  // Generate report
  const report = orchestrator.generateReport(sampleData);
  console.log('📈 Marketing Performance Report:\n');
  console.log(JSON.stringify(report, null, 2));

  console.log('\n✅ Marketing automation flow complete.\n');
}

// ==============================================================================
// EXPORT FOR MODULE USAGE
// ==============================================================================

export {
  LeadScoringEngine,
  FunnelAnalyticsEngine,
  AttributionEngine,
  CampaignROITracker,
  MarketingAutomationOrchestrator,
};

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
