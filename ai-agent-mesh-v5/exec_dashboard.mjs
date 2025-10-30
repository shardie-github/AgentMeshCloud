#!/usr/bin/env node
/**
 * Autonomous Mesh OS - Executive Dashboard
 * 
 * High-level analytics and insights for leadership:
 * - KPI aggregation (cost, compliance, uptime, drift)
 * - Executive summary generation
 * - Trend analysis
 * - ROI calculations
 * - Risk assessment
 * 
 * @module exec_dashboard
 */

import { EventEmitter } from 'events';
import { writeFile } from 'fs/promises';

class ExecutiveDashboard extends EventEmitter {
  constructor() {
    super();
    this.kpis = new Map();
    this.historicalData = [];
    this.startTime = Date.now();
  }

  /**
   * Initialize the executive dashboard
   */
  async initialize() {
    console.log('[Executive Dashboard] Initializing...');
    
    // Define KPIs
    this.defineKPIs();
    
    console.log('[Executive Dashboard] ✓ Initialized');
    this.emit('dashboard:ready');
  }

  /**
   * Define key performance indicators
   */
  defineKPIs() {
    this.kpis.set('mttr', {
      name: 'Mean Time To Recovery',
      category: 'reliability',
      unit: 'minutes',
      target: 15,
      current: 0
    });

    this.kpis.set('slo_adherence', {
      name: 'SLO Adherence',
      category: 'reliability',
      unit: 'percent',
      target: 99.9,
      current: 0
    });

    this.kpis.set('cost_per_agent', {
      name: 'Cost Per Agent',
      category: 'cost',
      unit: 'usd',
      target: 250,
      current: 0
    });

    this.kpis.set('energy_intensity', {
      name: 'Energy Intensity',
      category: 'sustainability',
      unit: 'gCO2/kWh',
      target: 100,
      current: 0
    });

    this.kpis.set('compliance_score', {
      name: 'Compliance Score',
      category: 'compliance',
      unit: 'percent',
      target: 95,
      current: 0
    });

    this.kpis.set('uptime', {
      name: 'System Uptime',
      category: 'reliability',
      unit: 'percent',
      target: 99.95,
      current: 0
    });

    this.kpis.set('cost_savings', {
      name: 'Monthly Cost Savings',
      category: 'cost',
      unit: 'usd',
      target: 1000,
      current: 0
    });

    this.kpis.set('automation_rate', {
      name: 'Automation Success Rate',
      category: 'efficiency',
      unit: 'percent',
      target: 80,
      current: 0
    });
  }

  /**
   * Collect KPI data from various sources
   */
  async collectKPIs(sources) {
    console.log('[Executive Dashboard] Collecting KPIs...');
    
    const snapshot = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      kpis: {}
    };

    // MTTR from self-healing engine
    if (sources.selfHealing?.healingActions) {
      const recoveryTimes = sources.selfHealing.healingActions
        .filter(a => a.results.some(r => r.status === 'success'))
        .map(a => (a.timestamp - (a.startTime || a.timestamp)) / 1000 / 60);
      
      const mttr = recoveryTimes.length > 0
        ? recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length
        : 0;
      
      this.kpis.get('mttr').current = mttr;
      snapshot.kpis.mttr = mttr;
    }

    // SLO Adherence
    if (sources.agents) {
      const totalUptime = sources.agents.reduce((sum, a) => 
        sum + (a.metrics?.uptime || 0), 0
      );
      const slo = sources.agents.length > 0 ? totalUptime / sources.agents.length : 0;
      
      this.kpis.get('slo_adherence').current = slo;
      snapshot.kpis.slo_adherence = slo;
    }

    // Cost per agent
    if (sources.cost?.totalCost && sources.agents?.length) {
      const costPerAgent = sources.cost.totalCost / sources.agents.length;
      this.kpis.get('cost_per_agent').current = costPerAgent;
      snapshot.kpis.cost_per_agent = costPerAgent;
    }

    // Energy intensity (mock data)
    const energyIntensity = 85 + Math.random() * 30;
    this.kpis.get('energy_intensity').current = energyIntensity;
    snapshot.kpis.energy_intensity = energyIntensity;

    // Compliance score
    if (sources.compliance?.summary?.overallScore) {
      const complianceScore = parseFloat(sources.compliance.summary.overallScore);
      this.kpis.get('compliance_score').current = complianceScore;
      snapshot.kpis.compliance_score = complianceScore;
    }

    // Uptime
    if (sources.agents) {
      const healthyCount = sources.agents.filter(a => a.health === 'healthy').length;
      const uptime = sources.agents.length > 0 
        ? (healthyCount / sources.agents.length * 100)
        : 0;
      
      this.kpis.get('uptime').current = uptime;
      snapshot.kpis.uptime = uptime;
    }

    // Cost savings
    if (sources.cost?.potentialSavings) {
      this.kpis.get('cost_savings').current = sources.cost.potentialSavings;
      snapshot.kpis.cost_savings = sources.cost.potentialSavings;
    }

    // Automation rate
    if (sources.selfHealing) {
      const totalActions = sources.selfHealing.healingActions?.length || 0;
      const successfulActions = sources.selfHealing.healingActions?.filter(
        a => a.results.some(r => r.status === 'success')
      ).length || 0;
      
      const automationRate = totalActions > 0 
        ? (successfulActions / totalActions * 100)
        : 0;
      
      this.kpis.get('automation_rate').current = automationRate;
      snapshot.kpis.automation_rate = automationRate;
    }

    this.historicalData.push(snapshot);
    
    // Keep only last 90 days
    const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    this.historicalData = this.historicalData.filter(s => s.timestamp > ninetyDaysAgo);

    console.log('[Executive Dashboard] ✓ KPIs collected');
    return snapshot;
  }

  /**
   * Calculate KPI trends
   */
  calculateTrends() {
    const trends = {};

    for (const [key, kpi] of this.kpis) {
      const recentData = this.historicalData
        .slice(-30)
        .map(s => s.kpis[key])
        .filter(v => v !== undefined);

      if (recentData.length < 2) {
        trends[key] = {
          direction: 'stable',
          change: 0,
          status: 'unknown'
        };
        continue;
      }

      const firstHalf = recentData.slice(0, Math.floor(recentData.length / 2));
      const secondHalf = recentData.slice(Math.floor(recentData.length / 2));

      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      const change = firstAvg !== 0 ? ((secondAvg - firstAvg) / firstAvg * 100) : 0;

      let direction = 'stable';
      if (change > 2) direction = 'improving';
      else if (change < -2) direction = 'declining';

      // Determine if improving is good or bad based on metric
      let status = 'neutral';
      if (kpi.category === 'cost') {
        // Lower is better for costs
        if (direction === 'declining') status = 'positive';
        else if (direction === 'improving') status = 'negative';
      } else {
        // Higher is better for most other metrics
        if (direction === 'improving') status = 'positive';
        else if (direction === 'declining') status = 'negative';
      }

      trends[key] = {
        direction: direction,
        change: change.toFixed(2),
        status: status,
        current: kpi.current,
        target: kpi.target
      };
    }

    return trends;
  }

  /**
   * Calculate ROI
   */
  calculateROI(sources) {
    const roi = {
      investment: 0,
      savings: 0,
      netBenefit: 0,
      roiPercent: 0,
      paybackPeriod: 0
    };

    // Mock investment data (in production, this would come from actual data)
    roi.investment = 50000; // Initial investment in Mesh OS

    // Calculate savings
    if (sources.cost) {
      roi.savings = sources.cost.potentialSavings * 12; // Annual savings
    }

    // Add automation value
    const automationHours = 160; // Hours saved per month
    const hourlyRate = 100; // Cost per hour
    roi.savings += automationHours * hourlyRate * 12;

    // Calculate ROI
    roi.netBenefit = roi.savings - roi.investment;
    roi.roiPercent = roi.investment > 0 
      ? (roi.netBenefit / roi.investment * 100)
      : 0;
    roi.paybackPeriod = roi.savings > 0
      ? (roi.investment / (roi.savings / 12))
      : 0;

    return roi;
  }

  /**
   * Assess risks
   */
  assessRisks(sources) {
    const risks = [];

    // Budget risk
    if (sources.cost?.budgetUsage > 90) {
      risks.push({
        category: 'financial',
        severity: 'high',
        description: 'Budget utilization exceeds 90%',
        impact: 'Cost overruns',
        mitigation: 'Implement immediate cost optimization measures'
      });
    }

    // Compliance risk
    if (sources.compliance?.summary?.overallScore < 90) {
      risks.push({
        category: 'compliance',
        severity: 'high',
        description: 'Compliance score below 90%',
        impact: 'Regulatory violations, potential fines',
        mitigation: 'Address failed compliance controls immediately'
      });
    }

    // Availability risk
    const uptime = this.kpis.get('uptime')?.current || 0;
    if (uptime < 99.5) {
      risks.push({
        category: 'operational',
        severity: 'medium',
        description: 'System uptime below 99.5%',
        impact: 'Service disruptions, customer dissatisfaction',
        mitigation: 'Review and strengthen availability measures'
      });
    }

    // Security risk
    if (sources.compliance?.violations?.length > 5) {
      risks.push({
        category: 'security',
        severity: 'high',
        description: 'Multiple policy violations detected',
        impact: 'Security breaches, data loss',
        mitigation: 'Conduct security audit and remediate violations'
      });
    }

    return risks;
  }

  /**
   * Generate executive summary
   */
  async generateSummary(sources) {
    console.log('[Executive Dashboard] Generating executive summary...');
    
    // Collect latest KPIs
    const kpiSnapshot = await this.collectKPIs(sources);
    
    // Calculate trends
    const trends = this.calculateTrends();
    
    // Calculate ROI
    const roi = this.calculateROI(sources);
    
    // Assess risks
    const risks = this.assessRisks(sources);

    // Build summary
    const summary = {
      generated: new Date().toISOString(),
      period: 'monthly',
      overview: {
        totalAgents: sources.agents?.length || 0,
        activeJobs: sources.jobs?.running || 0,
        systemHealth: this.calculateSystemHealth(sources),
        status: this.determineOverallStatus(sources)
      },
      kpis: Array.from(this.kpis.entries()).map(([key, kpi]) => ({
        key: key,
        name: kpi.name,
        current: kpi.current,
        target: kpi.target,
        unit: kpi.unit,
        status: this.getKPIStatus(kpi),
        trend: trends[key]
      })),
      financial: {
        totalCost: sources.cost?.totalCost || 0,
        budget: sources.cost?.budget || 10000,
        budgetUsage: sources.cost?.budgetUsage || 0,
        potentialSavings: sources.cost?.potentialSavings || 0,
        roi: roi
      },
      operational: {
        uptime: kpiSnapshot.kpis.uptime,
        mttr: kpiSnapshot.kpis.mttr,
        sloAdherence: kpiSnapshot.kpis.slo_adherence,
        automationRate: kpiSnapshot.kpis.automation_rate,
        incidents: sources.selfHealing?.incidents?.length || 0,
        healingActions: sources.selfHealing?.healingActions?.length || 0
      },
      compliance: {
        overallScore: sources.compliance?.summary?.overallScore || 0,
        violations: sources.compliance?.summary?.failed || 0,
        auditsPassed: sources.compliance?.summary?.passed || 0,
        auditsTotal: sources.compliance?.summary?.totalControls || 0
      },
      risks: risks,
      recommendations: this.generateExecutiveRecommendations(sources, risks, trends)
    };

    // Write summary
    await writeFile('./executive_summary.json', JSON.stringify(summary, null, 2));
    
    const markdown = this.formatSummaryAsMarkdown(summary);
    await writeFile('./executive_summary.md', markdown);

    console.log('[Executive Dashboard] ✓ Summary generated');
    this.emit('summary:generated', summary);

    return summary;
  }

  /**
   * Calculate system health score
   */
  calculateSystemHealth(sources) {
    let score = 100;

    // Deduct for unhealthy agents
    const unhealthyAgents = sources.agents?.filter(a => a.health !== 'healthy').length || 0;
    const totalAgents = sources.agents?.length || 1;
    score -= (unhealthyAgents / totalAgents) * 30;

    // Deduct for violations
    const violations = sources.compliance?.summary?.failed || 0;
    score -= Math.min(violations * 5, 20);

    // Deduct for budget overruns
    if (sources.cost?.budgetUsage > 100) {
      score -= 10;
    }

    // Deduct for incidents
    const incidents = sources.selfHealing?.incidents?.length || 0;
    score -= Math.min(incidents * 3, 15);

    return Math.max(0, Math.min(100, score)).toFixed(1);
  }

  /**
   * Determine overall system status
   */
  determineOverallStatus(sources) {
    const health = parseFloat(this.calculateSystemHealth(sources));
    
    if (health >= 90) return 'excellent';
    if (health >= 75) return 'good';
    if (health >= 60) return 'fair';
    if (health >= 40) return 'poor';
    return 'critical';
  }

  /**
   * Get KPI status
   */
  getKPIStatus(kpi) {
    if (kpi.current === 0) return 'unknown';
    
    const ratio = kpi.current / kpi.target;
    
    // For cost metrics, lower is better
    if (kpi.category === 'cost' || kpi.name.includes('Energy')) {
      if (ratio <= 0.8) return 'excellent';
      if (ratio <= 1.0) return 'good';
      if (ratio <= 1.2) return 'warning';
      return 'critical';
    }
    
    // For other metrics, higher is better
    if (ratio >= 1.0) return 'excellent';
    if (ratio >= 0.95) return 'good';
    if (ratio >= 0.9) return 'warning';
    return 'critical';
  }

  /**
   * Generate executive recommendations
   */
  generateExecutiveRecommendations(sources, risks, trends) {
    const recommendations = [];

    // Risk-based recommendations
    for (const risk of risks.filter(r => r.severity === 'high')) {
      recommendations.push({
        priority: 'critical',
        category: risk.category,
        title: risk.description,
        action: risk.mitigation,
        impact: 'immediate'
      });
    }

    // Cost optimization
    if (sources.cost?.potentialSavings > 1000) {
      recommendations.push({
        priority: 'high',
        category: 'financial',
        title: `Realize $${sources.cost.potentialSavings.toFixed(0)}/month in cost savings`,
        action: 'Implement cost optimization recommendations from cost optimizer',
        impact: 'Improve financial efficiency by 15-20%'
      });
    }

    // Automation improvements
    const automationRate = this.kpis.get('automation_rate')?.current || 0;
    if (automationRate < 80) {
      recommendations.push({
        priority: 'medium',
        category: 'efficiency',
        title: 'Increase automation rate',
        action: 'Review and automate manual operational tasks',
        impact: 'Reduce operational overhead by 25%'
      });
    }

    return recommendations;
  }

  /**
   * Format summary as Markdown
   */
  formatSummaryAsMarkdown(summary) {
    return `# Executive Summary - Autonomous Mesh OS

**Generated:** ${summary.generated}  
**Period:** ${summary.period}

## System Overview

- **Total Agents:** ${summary.overview.totalAgents}
- **Active Jobs:** ${summary.overview.activeJobs}
- **System Health:** ${summary.overview.systemHealth}/100
- **Status:** **${summary.overview.status.toUpperCase()}**

## Key Performance Indicators

${summary.kpis.map(kpi => `
### ${kpi.name}
- **Current:** ${kpi.current.toFixed(2)} ${kpi.unit}
- **Target:** ${kpi.target} ${kpi.unit}
- **Status:** ${kpi.status}
- **Trend:** ${kpi.trend.direction} (${kpi.trend.change}%)
`).join('\n')}

## Financial Summary

- **Total Cost:** $${summary.financial.totalCost.toFixed(2)}
- **Budget:** $${summary.financial.budget.toFixed(2)}
- **Budget Usage:** ${summary.financial.budgetUsage}%
- **Potential Savings:** $${summary.financial.potentialSavings.toFixed(2)}/month

### Return on Investment (ROI)

- **Investment:** $${summary.financial.roi.investment.toLocaleString()}
- **Annual Savings:** $${summary.financial.roi.savings.toLocaleString()}
- **Net Benefit:** $${summary.financial.roi.netBenefit.toLocaleString()}
- **ROI:** ${summary.financial.roi.roiPercent.toFixed(1)}%
- **Payback Period:** ${summary.financial.roi.paybackPeriod.toFixed(1)} months

## Operational Excellence

- **Uptime:** ${summary.operational.uptime.toFixed(2)}%
- **MTTR:** ${summary.operational.mttr.toFixed(1)} minutes
- **SLO Adherence:** ${summary.operational.sloAdherence.toFixed(2)}%
- **Automation Rate:** ${summary.operational.automationRate.toFixed(1)}%
- **Incidents:** ${summary.operational.incidents}
- **Self-Healing Actions:** ${summary.operational.healingActions}

## Compliance & Security

- **Overall Score:** ${summary.compliance.overallScore}%
- **Controls Passed:** ${summary.compliance.auditsPassed}/${summary.compliance.auditsTotal}
- **Violations:** ${summary.compliance.violations}

## Risk Assessment

${summary.risks.length > 0 ? summary.risks.map(risk => `
### ${risk.severity.toUpperCase()}: ${risk.description}
- **Category:** ${risk.category}
- **Impact:** ${risk.impact}
- **Mitigation:** ${risk.mitigation}
`).join('\n') : '*No significant risks identified*'}

## Strategic Recommendations

${summary.recommendations.map((rec, i) => `
${i + 1}. **[${rec.priority.toUpperCase()}] ${rec.title}**
   - Category: ${rec.category}
   - Action: ${rec.action}
   - Impact: ${rec.impact}
`).join('\n')}

---

*Generated by Autonomous Mesh OS Executive Dashboard*
`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new ExecutiveDashboard();
  await dashboard.initialize();

  // Mock sources
  const sources = {
    agents: [
      { id: 'agent-01', health: 'healthy', metrics: { uptime: 99.9 } },
      { id: 'agent-02', health: 'healthy', metrics: { uptime: 99.5 } },
      { id: 'agent-03', health: 'degraded', metrics: { uptime: 95.0 } }
    ],
    jobs: { running: 25, completed: 1500, failed: 15 },
    cost: { totalCost: 8500, budget: 10000, budgetUsage: 85, potentialSavings: 1200 },
    compliance: { summary: { overallScore: '96.5', passed: 27, failed: 1, totalControls: 28 } },
    selfHealing: { 
      incidents: [{ id: 1 }, { id: 2 }],
      healingActions: [
        { timestamp: Date.now(), results: [{ status: 'success' }] },
        { timestamp: Date.now(), results: [{ status: 'success' }] }
      ]
    }
  };

  const summary = await dashboard.generateSummary(sources);
  
  console.log('\n=== Executive Summary ===');
  console.log(`System Health: ${summary.overview.systemHealth}/100`);
  console.log(`Status: ${summary.overview.status}`);
  console.log(`ROI: ${summary.financial.roi.roiPercent.toFixed(1)}%`);
}

export default ExecutiveDashboard;
