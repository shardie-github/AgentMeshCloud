#!/usr/bin/env node
/**
 * Autonomous Mesh OS - Cost Optimizer
 * 
 * Analyzes and optimizes cloud costs and resource utilization:
 * - Cloud billing analysis
 * - Model usage tracking and optimization
 * - Idle resource detection
 * - Cost anomaly detection
 * - Green compute recommendations
 * - Monthly savings reports
 * 
 * @module cost_optimizer
 */

import { EventEmitter } from 'events';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import YAML from 'yaml';

class CostOptimizer extends EventEmitter {
  constructor(rulesPath = './optimizer_rules.yaml') {
    super();
    this.rulesPath = rulesPath;
    this.rules = null;
    this.costData = [];
    this.recommendations = [];
    this.anomalies = [];
    this.startTime = Date.now();
  }

  /**
   * Initialize the cost optimizer
   */
  async initialize() {
    console.log('[Cost Optimizer] Initializing...');
    
    try {
      const rulesData = await readFile(this.rulesPath, 'utf-8');
      this.rules = YAML.parse(rulesData);
      
      // Load historical cost data if available
      await this.loadCostData();
      
      console.log('[Cost Optimizer] ✓ Initialized');
      this.emit('optimizer:ready');
    } catch (error) {
      console.error('[Cost Optimizer] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load historical cost data
   */
  async loadCostData() {
    const dataPath = './cost_data.json';
    if (existsSync(dataPath)) {
      try {
        const data = await readFile(dataPath, 'utf-8');
        this.costData = JSON.parse(data);
        console.log(`[Cost Optimizer] Loaded ${this.costData.length} historical cost entries`);
      } catch (error) {
        console.warn('[Cost Optimizer] Failed to load cost data:', error.message);
      }
    }
  }

  /**
   * Save cost data
   */
  async saveCostData() {
    try {
      await writeFile('./cost_data.json', JSON.stringify(this.costData, null, 2));
    } catch (error) {
      console.error('[Cost Optimizer] Failed to save cost data:', error);
    }
  }

  /**
   * Analyze cloud billing
   */
  async analyzeCloudBilling(billingData) {
    console.log('[Cost Optimizer] Analyzing cloud billing...');
    
    const analysis = {
      timestamp: Date.now(),
      period: billingData.period || 'current_month',
      totalCost: 0,
      breakdown: {
        compute: 0,
        storage: 0,
        network: 0,
        models: 0,
        other: 0
      },
      trends: {},
      insights: []
    };

    // Calculate total cost and breakdown
    if (billingData.items) {
      for (const item of billingData.items) {
        analysis.totalCost += item.cost || 0;
        
        const category = this.categorizeLineItem(item);
        analysis.breakdown[category] = (analysis.breakdown[category] || 0) + item.cost;
      }
    }

    // Compare with budget
    const budget = this.rules?.budgets?.monthly || 10000;
    const budgetUsage = (analysis.totalCost / budget) * 100;
    
    if (budgetUsage > 90) {
      analysis.insights.push({
        type: 'budget_exceeded',
        severity: 'critical',
        message: `Budget usage at ${budgetUsage.toFixed(1)}% ($${analysis.totalCost}/$${budget})`,
        recommendation: 'Review and optimize high-cost resources immediately'
      });
    } else if (budgetUsage > 75) {
      analysis.insights.push({
        type: 'budget_warning',
        severity: 'high',
        message: `Budget usage at ${budgetUsage.toFixed(1)}%`,
        recommendation: 'Monitor spending closely and consider optimization'
      });
    }

    // Analyze trends
    analysis.trends = this.analyzeCostTrends();

    // Store analysis
    this.costData.push(analysis);
    await this.saveCostData();

    return analysis;
  }

  /**
   * Categorize billing line item
   */
  categorizeLineItem(item) {
    const description = (item.description || '').toLowerCase();
    
    if (description.includes('compute') || description.includes('cpu') || description.includes('instance')) {
      return 'compute';
    } else if (description.includes('storage') || description.includes('disk') || description.includes('s3')) {
      return 'storage';
    } else if (description.includes('network') || description.includes('bandwidth') || description.includes('transfer')) {
      return 'network';
    } else if (description.includes('model') || description.includes('ai') || description.includes('ml') || description.includes('gpt')) {
      return 'models';
    } else {
      return 'other';
    }
  }

  /**
   * Analyze cost trends
   */
  analyzeCostTrends() {
    if (this.costData.length < 2) {
      return { trend: 'insufficient_data', change: 0 };
    }

    const recent = this.costData.slice(-7); // Last 7 entries
    const avgRecent = recent.reduce((sum, entry) => sum + entry.totalCost, 0) / recent.length;
    
    const older = this.costData.slice(-14, -7); // Previous 7 entries
    const avgOlder = older.length > 0 
      ? older.reduce((sum, entry) => sum + entry.totalCost, 0) / older.length
      : avgRecent;

    const change = avgOlder > 0 ? ((avgRecent - avgOlder) / avgOlder) * 100 : 0;

    return {
      trend: change > 10 ? 'increasing' : change < -10 ? 'decreasing' : 'stable',
      change: change.toFixed(2),
      avgRecent: avgRecent.toFixed(2),
      avgOlder: avgOlder.toFixed(2)
    };
  }

  /**
   * Analyze model usage
   */
  async analyzeModelUsage(agents) {
    console.log('[Cost Optimizer] Analyzing model usage...');
    
    const usage = {
      timestamp: Date.now(),
      models: {},
      totalRequests: 0,
      totalCost: 0,
      insights: []
    };

    for (const agent of agents) {
      if (agent.modelUsage) {
        const modelName = agent.modelUsage.model || 'unknown';
        
        if (!usage.models[modelName]) {
          usage.models[modelName] = {
            requests: 0,
            tokens: 0,
            cost: 0,
            agents: []
          };
        }

        usage.models[modelName].requests += agent.modelUsage.requests || 0;
        usage.models[modelName].tokens += agent.modelUsage.tokens || 0;
        usage.models[modelName].cost += agent.modelUsage.cost || 0;
        usage.models[modelName].agents.push(agent.id);

        usage.totalRequests += agent.modelUsage.requests || 0;
        usage.totalCost += agent.modelUsage.cost || 0;
      }
    }

    // Generate insights
    const sortedModels = Object.entries(usage.models)
      .sort(([, a], [, b]) => b.cost - a.cost);

    if (sortedModels.length > 0) {
      const [topModel, topUsage] = sortedModels[0];
      const topModelPercent = (topUsage.cost / usage.totalCost) * 100;

      if (topModelPercent > 60) {
        usage.insights.push({
          type: 'model_concentration',
          severity: 'medium',
          message: `${topModel} accounts for ${topModelPercent.toFixed(1)}% of model costs`,
          recommendation: 'Consider diversifying model usage or negotiating volume discounts'
        });
      }
    }

    // Check for expensive models with low usage
    for (const [modelName, modelData] of Object.entries(usage.models)) {
      const costPerRequest = modelData.requests > 0 ? modelData.cost / modelData.requests : 0;
      const avgCostPerRequest = usage.totalCost / usage.totalRequests;

      if (costPerRequest > avgCostPerRequest * 2 && modelData.requests < usage.totalRequests * 0.1) {
        usage.insights.push({
          type: 'expensive_low_usage',
          severity: 'medium',
          message: `Model ${modelName} has high cost per request ($${costPerRequest.toFixed(4)}) but low usage`,
          recommendation: 'Consider switching to a more cost-effective model or optimizing usage'
        });
      }
    }

    return usage;
  }

  /**
   * Detect idle resources
   */
  async detectIdleResources(agents, telemetry) {
    console.log('[Cost Optimizer] Detecting idle resources...');
    
    const idleThreshold = this.rules?.idleDetection?.thresholdMinutes || 60;
    const idleThresholdMs = idleThreshold * 60 * 1000;
    const currentTime = Date.now();

    const idleResources = [];

    for (const agent of agents) {
      const lastActivity = agent.lastActivity || agent.lastHeartbeat || 0;
      const idleTime = currentTime - lastActivity;

      if (idleTime > idleThresholdMs) {
        const estimatedMonthlyCost = this.estimateAgentCost(agent);
        
        idleResources.push({
          agentId: agent.id,
          type: agent.type,
          idleTime: Math.floor(idleTime / 1000 / 60), // minutes
          estimatedMonthlyCost: estimatedMonthlyCost,
          resources: agent.resources,
          recommendation: estimatedMonthlyCost > 100 ? 'terminate' : 'scale_down'
        });
      }
    }

    const totalSavings = idleResources.reduce((sum, r) => sum + r.estimatedMonthlyCost, 0);

    console.log(`[Cost Optimizer] Found ${idleResources.length} idle resources (potential savings: $${totalSavings.toFixed(2)}/month)`);

    return {
      timestamp: Date.now(),
      count: idleResources.length,
      resources: idleResources,
      potentialMonthlySavings: totalSavings
    };
  }

  /**
   * Estimate agent cost
   */
  estimateAgentCost(agent) {
    const cpuCostPerCore = this.rules?.pricing?.cpuPerCoreHour || 0.05;
    const memoryCostPerGB = this.rules?.pricing?.memoryPerGBHour || 0.01;
    const storageCostPerGB = this.rules?.pricing?.storagePerGBMonth || 0.10;

    const cpu = agent.resources?.cpu || 0;
    const memory = (agent.resources?.memory || 0) / 1024; // Convert MB to GB
    const storage = (agent.resources?.storage || 0) / 1024; // Convert MB to GB

    const hourlyCost = (cpu * cpuCostPerCore) + (memory * memoryCostPerGB);
    const monthlyCost = (hourlyCost * 24 * 30) + (storage * storageCostPerGB);

    return monthlyCost;
  }

  /**
   * Detect cost anomalies
   */
  detectAnomalies() {
    console.log('[Cost Optimizer] Detecting cost anomalies...');
    
    if (this.costData.length < 7) {
      return { anomalies: [], message: 'Insufficient data for anomaly detection' };
    }

    const recent = this.costData.slice(-30); // Last 30 entries
    const costs = recent.map(entry => entry.totalCost);
    
    const mean = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    const variance = costs.reduce((sum, cost) => sum + Math.pow(cost - mean, 2), 0) / costs.length;
    const stdDev = Math.sqrt(variance);

    const anomalyThreshold = this.rules?.anomalyDetection?.stdDevThreshold || 2;
    const latestCost = costs[costs.length - 1];

    const anomalies = [];

    if (Math.abs(latestCost - mean) > (stdDev * anomalyThreshold)) {
      anomalies.push({
        timestamp: Date.now(),
        type: 'cost_spike',
        severity: 'high',
        current: latestCost,
        expected: mean,
        deviation: ((latestCost - mean) / mean * 100).toFixed(2) + '%',
        message: `Cost anomaly detected: $${latestCost.toFixed(2)} vs expected $${mean.toFixed(2)}`,
        recommendation: 'Investigate recent resource additions or usage spikes'
      });
    }

    // Check for sustained cost increases
    const recentTrend = costs.slice(-7);
    const isIncreasing = recentTrend.every((cost, i) => 
      i === 0 || cost >= recentTrend[i - 1] * 0.95
    );

    if (isIncreasing && recentTrend[recentTrend.length - 1] > recentTrend[0] * 1.3) {
      anomalies.push({
        timestamp: Date.now(),
        type: 'sustained_increase',
        severity: 'medium',
        increase: ((recentTrend[recentTrend.length - 1] / recentTrend[0] - 1) * 100).toFixed(2) + '%',
        message: 'Sustained cost increase detected over the past week',
        recommendation: 'Review resource scaling policies and usage patterns'
      });
    }

    this.anomalies.push(...anomalies);

    return { anomalies, statistics: { mean, stdDev, latest: latestCost } };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(agents, billingAnalysis, modelUsage, idleResources) {
    console.log('[Cost Optimizer] Generating recommendations...');
    
    const recommendations = [];
    let potentialSavings = 0;

    // Idle resource recommendations
    if (idleResources.count > 0) {
      recommendations.push({
        category: 'idle_resources',
        priority: 'high',
        impact: idleResources.potentialMonthlySavings,
        title: `Terminate or scale down ${idleResources.count} idle resources`,
        description: `Found ${idleResources.count} agents that have been idle for more than ${this.rules?.idleDetection?.thresholdMinutes || 60} minutes`,
        actions: idleResources.resources.map(r => ({
          action: r.recommendation,
          agentId: r.agentId,
          savings: r.estimatedMonthlyCost
        }))
      });
      potentialSavings += idleResources.potentialMonthlySavings;
    }

    // Right-sizing recommendations
    const oversizedAgents = agents.filter(a => 
      a.resources?.cpuUsage < 30 && a.resources?.memoryUsage < 40
    );

    if (oversizedAgents.length > 0) {
      const rightSizingSavings = oversizedAgents.reduce((sum, agent) => 
        sum + (this.estimateAgentCost(agent) * 0.3), 0
      );

      recommendations.push({
        category: 'right_sizing',
        priority: 'medium',
        impact: rightSizingSavings,
        title: `Right-size ${oversizedAgents.length} over-provisioned agents`,
        description: 'These agents consistently use less than 30% CPU and 40% memory',
        actions: oversizedAgents.map(agent => ({
          action: 'resize',
          agentId: agent.id,
          currentResources: agent.resources,
          recommendedResources: {
            cpu: Math.max(1, Math.ceil(agent.resources.cpu * 0.5)),
            memory: Math.max(1024, Math.ceil(agent.resources.memory * 0.6))
          },
          estimatedSavings: this.estimateAgentCost(agent) * 0.3
        }))
      });
      potentialSavings += rightSizingSavings;
    }

    // Reserved instance recommendations
    const stableAgents = agents.filter(a => a.uptime > 86400000 * 30); // Running > 30 days
    if (stableAgents.length >= 3) {
      const riSavings = stableAgents.reduce((sum, agent) => 
        sum + (this.estimateAgentCost(agent) * 0.4), 0
      );

      recommendations.push({
        category: 'reserved_instances',
        priority: 'medium',
        impact: riSavings,
        title: `Purchase reserved instances for ${stableAgents.length} stable agents`,
        description: 'These agents have been running consistently for over 30 days',
        actions: [{
          action: 'purchase_reserved_instances',
          count: stableAgents.length,
          estimatedAnnualSavings: riSavings * 12 * 0.4 // 40% savings on RIs
        }]
      });
    }

    // Green compute recommendations
    const greenThreshold = this.rules?.greenCompute?.carbonIntensityThreshold || 100;
    recommendations.push({
      category: 'green_compute',
      priority: 'low',
      impact: 0,
      title: 'Optimize for green compute',
      description: 'Consider scheduling non-urgent workloads during low carbon intensity periods',
      actions: [{
        action: 'implement_carbon_aware_scheduling',
        benefit: 'Reduce carbon footprint by 20-30%',
        implementation: 'Use carbon-aware scheduling based on grid intensity forecasts'
      }]
    });

    this.recommendations = recommendations;

    return {
      recommendations,
      totalPotentialSavings: potentialSavings,
      totalPotentialAnnualSavings: potentialSavings * 12
    };
  }

  /**
   * Generate monthly savings report
   */
  async generateMonthlySavingsReport(agents) {
    console.log('[Cost Optimizer] Generating monthly savings report...');
    
    const billingAnalysis = await this.analyzeCloudBilling({
      period: 'current_month',
      items: this.generateMockBillingItems(agents)
    });

    const modelUsage = await this.analyzeModelUsage(agents);
    const idleResources = await this.detectIdleResources(agents, {});
    const anomalies = this.detectAnomalies();
    const recommendations = this.generateRecommendations(agents, billingAnalysis, modelUsage, idleResources);

    const report = {
      generated: new Date().toISOString(),
      period: 'current_month',
      summary: {
        totalCost: billingAnalysis.totalCost,
        budgetUsage: (billingAnalysis.totalCost / (this.rules?.budgets?.monthly || 10000) * 100).toFixed(2) + '%',
        potentialMonthlySavings: recommendations.totalPotentialSavings,
        potentialAnnualSavings: recommendations.totalPotentialAnnualSavings
      },
      billing: billingAnalysis,
      modelUsage: modelUsage,
      idleResources: idleResources,
      anomalies: anomalies,
      recommendations: recommendations.recommendations
    };

    // Write report to file
    await writeFile('./cost_optimization_report.json', JSON.stringify(report, null, 2));
    
    // Generate Markdown report
    const markdown = this.formatReportAsMarkdown(report);
    await writeFile('./cost_optimization_report.md', markdown);

    console.log('[Cost Optimizer] ✓ Report generated');
    this.emit('report:generated', report);

    return report;
  }

  /**
   * Generate mock billing items for demonstration
   */
  generateMockBillingItems(agents) {
    const items = [];
    
    for (const agent of agents) {
      const hourlyCost = this.estimateAgentCost(agent) / 30 / 24;
      items.push({
        description: `Compute instance - ${agent.type} (${agent.id})`,
        cost: hourlyCost * 24 * 30, // Monthly cost
        quantity: 1,
        unit: 'instance'
      });

      if (agent.modelUsage) {
        items.push({
          description: `AI Model usage - ${agent.modelUsage.model}`,
          cost: agent.modelUsage.cost || Math.random() * 100,
          quantity: agent.modelUsage.requests || 1000,
          unit: 'request'
        });
      }
    }

    return items;
  }

  /**
   * Format report as Markdown
   */
  formatReportAsMarkdown(report) {
    return `# Cost Optimization Report

**Generated:** ${report.generated}  
**Period:** ${report.period}

## Executive Summary

- **Total Cost:** $${report.summary.totalCost.toFixed(2)}
- **Budget Usage:** ${report.summary.budgetUsage}
- **Potential Monthly Savings:** $${report.summary.potentialMonthlySavings.toFixed(2)}
- **Potential Annual Savings:** $${report.summary.potentialAnnualSavings.toFixed(2)}

## Cost Breakdown

| Category | Amount | Percentage |
|----------|--------|------------|
| Compute | $${report.billing.breakdown.compute.toFixed(2)} | ${(report.billing.breakdown.compute / report.billing.totalCost * 100).toFixed(1)}% |
| Storage | $${report.billing.breakdown.storage.toFixed(2)} | ${(report.billing.breakdown.storage / report.billing.totalCost * 100).toFixed(1)}% |
| Network | $${report.billing.breakdown.network.toFixed(2)} | ${(report.billing.breakdown.network / report.billing.totalCost * 100).toFixed(1)}% |
| Models | $${report.billing.breakdown.models.toFixed(2)} | ${(report.billing.breakdown.models / report.billing.totalCost * 100).toFixed(1)}% |
| Other | $${report.billing.breakdown.other.toFixed(2)} | ${(report.billing.breakdown.other / report.billing.totalCost * 100).toFixed(1)}% |

## Cost Trends

- **Trend:** ${report.billing.trends.trend}
- **Change:** ${report.billing.trends.change}%
- **Recent Average:** $${report.billing.trends.avgRecent}
- **Previous Average:** $${report.billing.trends.avgOlder}

## Model Usage

- **Total Requests:** ${report.modelUsage.totalRequests.toLocaleString()}
- **Total Model Cost:** $${report.modelUsage.totalCost.toFixed(2)}

### Top Models by Cost

${Object.entries(report.modelUsage.models)
  .sort(([, a], [, b]) => b.cost - a.cost)
  .slice(0, 5)
  .map(([model, data], i) => 
    `${i + 1}. **${model}** - $${data.cost.toFixed(2)} (${data.requests.toLocaleString()} requests, ${data.agents.length} agents)`
  ).join('\n') || '*No model usage data*'}

## Idle Resources

- **Count:** ${report.idleResources.count}
- **Potential Savings:** $${report.idleResources.potentialMonthlySavings.toFixed(2)}/month

${report.idleResources.resources.length > 0 ? 
  report.idleResources.resources.map(r => 
    `- \`${r.agentId}\` (${r.type}) - Idle for ${r.idleTime} minutes - Recommendation: **${r.recommendation}** (Save $${r.estimatedMonthlyCost.toFixed(2)}/month)`
  ).join('\n') : '*No idle resources detected*'}

## Cost Anomalies

${report.anomalies.anomalies.length > 0 ?
  report.anomalies.anomalies.map(a => 
    `- **${a.type}** (${a.severity}) - ${a.message}\n  *Recommendation: ${a.recommendation}*`
  ).join('\n\n') : '*No anomalies detected*'}

## Optimization Recommendations

${report.recommendations.map((rec, i) => `
### ${i + 1}. ${rec.title}

**Priority:** ${rec.priority}  
**Potential Impact:** $${rec.impact.toFixed(2)}/month  
**Category:** ${rec.category}

${rec.description}

**Actions:**
${rec.actions.map(action => `- ${JSON.stringify(action, null, 2)}`).join('\n')}
`).join('\n')}

---

*Report generated by Autonomous Mesh OS Cost Optimizer*
`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new CostOptimizer();
  
  await optimizer.initialize();
  
  // Mock agents for testing
  const mockAgents = [
    {
      id: 'agent-01',
      type: 'analytics',
      resources: { cpu: 4, memory: 8192, storage: 100, cpuUsage: 75, memoryUsage: 60 },
      lastActivity: Date.now() - 30000,
      uptime: 86400000 * 45,
      modelUsage: { model: 'gpt-4', requests: 15000, tokens: 2000000, cost: 250 }
    },
    {
      id: 'agent-02',
      type: 'governance',
      resources: { cpu: 2, memory: 4096, storage: 50, cpuUsage: 25, memoryUsage: 30 },
      lastActivity: Date.now() - 7200000, // 2 hours ago
      uptime: 86400000 * 35,
      modelUsage: { model: 'gpt-3.5-turbo', requests: 8000, tokens: 800000, cost: 40 }
    },
    {
      id: 'agent-03',
      type: 'federation',
      resources: { cpu: 4, memory: 8192, storage: 200, cpuUsage: 85, memoryUsage: 75 },
      lastActivity: Date.now() - 5000,
      uptime: 86400000 * 60,
      modelUsage: { model: 'claude-3-opus', requests: 5000, tokens: 1500000, cost: 300 }
    }
  ];

  const report = await optimizer.generateMonthlySavingsReport(mockAgents);
  console.log('\n=== Cost Optimization Report ===');
  console.log(`Total Cost: $${report.summary.totalCost.toFixed(2)}`);
  console.log(`Potential Savings: $${report.summary.potentialMonthlySavings.toFixed(2)}/month`);
  console.log(`Recommendations: ${report.recommendations.length}`);
}

export default CostOptimizer;
