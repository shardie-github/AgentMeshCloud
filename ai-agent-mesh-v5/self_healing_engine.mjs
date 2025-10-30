#!/usr/bin/env node
/**
 * Autonomous Mesh OS - Self-Healing Engine
 * 
 * Automated detection and remediation system that:
 * - Monitors agent health and performance
 * - Detects stalled or unresponsive agents
 * - Compares telemetry against baseline patterns
 * - Auto-restarts or quarantines problematic nodes
 * - Generates healing reports and alerts
 * 
 * @module self_healing_engine
 */

import { EventEmitter } from 'events';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import YAML from 'yaml';

class SelfHealingEngine extends EventEmitter {
  constructor(driftPolicyPath = './drift_policy.yaml') {
    super();
    this.driftPolicyPath = driftPolicyPath;
    this.policy = null;
    this.baselines = new Map();
    this.incidents = [];
    this.healingActions = [];
    this.quarantinedAgents = new Set();
    this.startTime = Date.now();
  }

  /**
   * Initialize the self-healing engine
   */
  async initialize() {
    console.log('[Self-Healing] Initializing engine...');
    
    try {
      const policyData = await readFile(this.driftPolicyPath, 'utf-8');
      this.policy = YAML.parse(policyData);
      console.log('[Self-Healing] Drift policy loaded');
      
      // Load baselines if available
      await this.loadBaselines();
      
      console.log('[Self-Healing] ✓ Engine initialized');
      this.emit('engine:ready');
    } catch (error) {
      console.error('[Self-Healing] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load baseline metrics from storage
   */
  async loadBaselines() {
    const baselinePath = './baselines.json';
    if (existsSync(baselinePath)) {
      try {
        const data = await readFile(baselinePath, 'utf-8');
        const baselines = JSON.parse(data);
        for (const [key, value] of Object.entries(baselines)) {
          this.baselines.set(key, value);
        }
        console.log(`[Self-Healing] Loaded ${this.baselines.size} baselines`);
      } catch (error) {
        console.warn('[Self-Healing] Failed to load baselines:', error.message);
      }
    }
  }

  /**
   * Save baselines to storage
   */
  async saveBaselines() {
    try {
      const baselines = Object.fromEntries(this.baselines);
      await writeFile('./baselines.json', JSON.stringify(baselines, null, 2));
    } catch (error) {
      console.error('[Self-Healing] Failed to save baselines:', error);
    }
  }

  /**
   * Analyze agent health and detect issues
   */
  analyzeAgent(agent, telemetry) {
    const analysis = {
      agentId: agent.id,
      timestamp: Date.now(),
      issues: [],
      severity: 'normal',
      recommendedActions: []
    };

    // Check for stalled agents
    if (this.isAgentStalled(agent, telemetry)) {
      analysis.issues.push({
        type: 'stalled',
        description: 'Agent is not processing jobs',
        detected: Date.now()
      });
      analysis.recommendedActions.push('restart');
      analysis.severity = 'high';
    }

    // Check for unresponsive agents
    if (this.isAgentUnresponsive(agent, telemetry)) {
      analysis.issues.push({
        type: 'unresponsive',
        description: 'Agent not sending heartbeats',
        detected: Date.now()
      });
      analysis.recommendedActions.push('quarantine');
      analysis.severity = 'critical';
    }

    // Check for performance degradation
    const perfIssues = this.detectPerformanceDegradation(agent, telemetry);
    if (perfIssues.length > 0) {
      analysis.issues.push(...perfIssues);
      analysis.recommendedActions.push('investigate');
      if (analysis.severity === 'normal') {
        analysis.severity = 'medium';
      }
    }

    // Check for drift from baseline
    const driftIssues = this.detectDrift(agent, telemetry);
    if (driftIssues.length > 0) {
      analysis.issues.push(...driftIssues);
      analysis.recommendedActions.push('recalibrate');
      if (analysis.severity === 'normal') {
        analysis.severity = 'medium';
      }
    }

    // Check resource violations
    const resourceIssues = this.detectResourceViolations(agent);
    if (resourceIssues.length > 0) {
      analysis.issues.push(...resourceIssues);
      analysis.recommendedActions.push('scale_down');
      analysis.severity = 'high';
    }

    return analysis;
  }

  /**
   * Detect if agent is stalled
   */
  isAgentStalled(agent, telemetry) {
    const threshold = this.policy?.detection?.stalledThreshold || 300000; // 5 minutes
    
    // Agent has jobs assigned but no progress in threshold time
    if (agent.jobs && agent.jobs.length > 0) {
      const lastActivity = agent.lastActivity || agent.lastHeartbeat || 0;
      return (Date.now() - lastActivity) > threshold;
    }
    
    return false;
  }

  /**
   * Detect if agent is unresponsive
   */
  isAgentUnresponsive(agent, telemetry) {
    const threshold = this.policy?.detection?.unresponsiveThreshold || 120000; // 2 minutes
    const lastHeartbeat = agent.lastHeartbeat || 0;
    return (Date.now() - lastHeartbeat) > threshold;
  }

  /**
   * Detect performance degradation
   */
  detectPerformanceDegradation(agent, telemetry) {
    const issues = [];
    const thresholds = this.policy?.thresholds?.performance || {};

    // Check latency
    if (thresholds.latency && agent.metrics?.avgLatency > thresholds.latency) {
      issues.push({
        type: 'high_latency',
        description: `Average latency ${agent.metrics.avgLatency}ms exceeds threshold ${thresholds.latency}ms`,
        detected: Date.now(),
        value: agent.metrics.avgLatency,
        threshold: thresholds.latency
      });
    }

    // Check success rate
    if (thresholds.successRate && agent.metrics?.successRate < thresholds.successRate) {
      issues.push({
        type: 'low_success_rate',
        description: `Success rate ${agent.metrics.successRate}% below threshold ${thresholds.successRate}%`,
        detected: Date.now(),
        value: agent.metrics.successRate,
        threshold: thresholds.successRate
      });
    }

    // Check error rate
    if (thresholds.errorRate && agent.metrics?.errorRate > thresholds.errorRate) {
      issues.push({
        type: 'high_error_rate',
        description: `Error rate ${agent.metrics.errorRate}% exceeds threshold ${thresholds.errorRate}%`,
        detected: Date.now(),
        value: agent.metrics.errorRate,
        threshold: thresholds.errorRate
      });
    }

    return issues;
  }

  /**
   * Detect drift from baseline
   */
  detectDrift(agent, telemetry) {
    const issues = [];
    const baseline = this.baselines.get(agent.id);
    
    if (!baseline) {
      // No baseline yet, create one
      this.updateBaseline(agent, telemetry);
      return issues;
    }

    const driftThresholds = this.policy?.drift || {};

    // Compare current metrics to baseline
    if (agent.metrics) {
      // Latency drift
      if (baseline.avgLatency && agent.metrics.avgLatency) {
        const drift = ((agent.metrics.avgLatency - baseline.avgLatency) / baseline.avgLatency) * 100;
        const threshold = driftThresholds.latencyPercent || 50;
        
        if (Math.abs(drift) > threshold) {
          issues.push({
            type: 'latency_drift',
            description: `Latency drifted ${drift.toFixed(1)}% from baseline`,
            detected: Date.now(),
            baseline: baseline.avgLatency,
            current: agent.metrics.avgLatency,
            drift: drift
          });
        }
      }

      // Success rate drift
      if (baseline.successRate && agent.metrics.successRate) {
        const drift = baseline.successRate - agent.metrics.successRate;
        const threshold = driftThresholds.successRateAbsolute || 10;
        
        if (drift > threshold) {
          issues.push({
            type: 'success_rate_drift',
            description: `Success rate dropped ${drift.toFixed(1)}% from baseline`,
            detected: Date.now(),
            baseline: baseline.successRate,
            current: agent.metrics.successRate,
            drift: drift
          });
        }
      }
    }

    return issues;
  }

  /**
   * Detect resource violations
   */
  detectResourceViolations(agent) {
    const issues = [];
    const thresholds = this.policy?.thresholds?.resources || {};

    if (agent.resources) {
      // CPU violation
      if (thresholds.cpu && agent.resources.cpuUsage > thresholds.cpu) {
        issues.push({
          type: 'cpu_violation',
          description: `CPU usage ${agent.resources.cpuUsage}% exceeds threshold ${thresholds.cpu}%`,
          detected: Date.now(),
          value: agent.resources.cpuUsage,
          threshold: thresholds.cpu
        });
      }

      // Memory violation
      if (thresholds.memory && agent.resources.memoryUsage > thresholds.memory) {
        issues.push({
          type: 'memory_violation',
          description: `Memory usage ${agent.resources.memoryUsage}% exceeds threshold ${thresholds.memory}%`,
          detected: Date.now(),
          value: agent.resources.memoryUsage,
          threshold: thresholds.memory
        });
      }

      // Disk violation
      if (thresholds.disk && agent.resources.diskUsage > thresholds.disk) {
        issues.push({
          type: 'disk_violation',
          description: `Disk usage ${agent.resources.diskUsage}% exceeds threshold ${thresholds.disk}%`,
          detected: Date.now(),
          value: agent.resources.diskUsage,
          threshold: thresholds.disk
        });
      }
    }

    return issues;
  }

  /**
   * Update baseline for an agent
   */
  updateBaseline(agent, telemetry) {
    const baseline = {
      agentId: agent.id,
      timestamp: Date.now(),
      avgLatency: agent.metrics?.avgLatency || 0,
      successRate: agent.metrics?.successRate || 100,
      errorRate: agent.metrics?.errorRate || 0,
      cpuUsage: agent.resources?.cpuUsage || 0,
      memoryUsage: agent.resources?.memoryUsage || 0
    };

    this.baselines.set(agent.id, baseline);
  }

  /**
   * Execute healing action
   */
  async executeHealing(analysis) {
    console.log(`[Self-Healing] Executing healing for agent ${analysis.agentId}`);
    
    const action = {
      agentId: analysis.agentId,
      timestamp: Date.now(),
      actions: [],
      results: []
    };

    for (const recommendedAction of analysis.recommendedActions) {
      try {
        let result;
        
        switch (recommendedAction) {
          case 'restart':
            result = await this.restartAgent(analysis.agentId);
            break;
          case 'quarantine':
            result = await this.quarantineAgent(analysis.agentId);
            break;
          case 'investigate':
            result = await this.investigateAgent(analysis.agentId);
            break;
          case 'recalibrate':
            result = await this.recalibrateAgent(analysis.agentId);
            break;
          case 'scale_down':
            result = await this.scaleDownAgent(analysis.agentId);
            break;
          default:
            result = { action: recommendedAction, status: 'unknown', message: 'Unknown action' };
        }
        
        action.actions.push(recommendedAction);
        action.results.push(result);
        
        console.log(`[Self-Healing] ✓ Action '${recommendedAction}' completed for agent ${analysis.agentId}`);
      } catch (error) {
        console.error(`[Self-Healing] ✗ Action '${recommendedAction}' failed:`, error);
        action.results.push({ 
          action: recommendedAction, 
          status: 'failed', 
          error: error.message 
        });
      }
    }

    this.healingActions.push(action);
    this.emit('healing:executed', action);
    
    return action;
  }

  /**
   * Restart an agent
   */
  async restartAgent(agentId) {
    console.log(`[Self-Healing] Restarting agent ${agentId}...`);
    
    // Simulate restart process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.emit('agent:restarted', { agentId, timestamp: Date.now() });
    
    return {
      action: 'restart',
      status: 'success',
      message: `Agent ${agentId} restarted successfully`,
      timestamp: Date.now()
    };
  }

  /**
   * Quarantine an agent
   */
  async quarantineAgent(agentId) {
    console.log(`[Self-Healing] Quarantining agent ${agentId}...`);
    
    this.quarantinedAgents.add(agentId);
    
    // Set quarantine expiry
    const duration = this.policy?.remediation?.quarantine?.duration || 900000; // 15 minutes
    setTimeout(() => {
      this.releaseQuarantine(agentId);
    }, duration);
    
    this.emit('agent:quarantined', { agentId, timestamp: Date.now(), duration });
    
    return {
      action: 'quarantine',
      status: 'success',
      message: `Agent ${agentId} quarantined for ${duration}ms`,
      timestamp: Date.now(),
      duration: duration
    };
  }

  /**
   * Release agent from quarantine
   */
  releaseQuarantine(agentId) {
    if (this.quarantinedAgents.has(agentId)) {
      this.quarantinedAgents.delete(agentId);
      console.log(`[Self-Healing] Agent ${agentId} released from quarantine`);
      this.emit('agent:released', { agentId, timestamp: Date.now() });
    }
  }

  /**
   * Investigate agent issues
   */
  async investigateAgent(agentId) {
    console.log(`[Self-Healing] Investigating agent ${agentId}...`);
    
    // Simulate investigation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const findings = {
      agentId: agentId,
      timestamp: Date.now(),
      logs: 'Sample log entries...',
      metrics: 'Performance metrics snapshot...',
      recommendations: ['Monitor for 10 minutes', 'Check network connectivity']
    };
    
    this.emit('agent:investigated', findings);
    
    return {
      action: 'investigate',
      status: 'success',
      message: `Investigation completed for agent ${agentId}`,
      findings: findings,
      timestamp: Date.now()
    };
  }

  /**
   * Recalibrate agent baseline
   */
  async recalibrateAgent(agentId) {
    console.log(`[Self-Healing] Recalibrating agent ${agentId}...`);
    
    // Remove old baseline to force new baseline creation
    this.baselines.delete(agentId);
    await this.saveBaselines();
    
    this.emit('agent:recalibrated', { agentId, timestamp: Date.now() });
    
    return {
      action: 'recalibrate',
      status: 'success',
      message: `Agent ${agentId} baseline reset`,
      timestamp: Date.now()
    };
  }

  /**
   * Scale down agent resources
   */
  async scaleDownAgent(agentId) {
    console.log(`[Self-Healing] Scaling down agent ${agentId}...`);
    
    // Simulate resource adjustment
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.emit('agent:scaled_down', { agentId, timestamp: Date.now() });
    
    return {
      action: 'scale_down',
      status: 'success',
      message: `Agent ${agentId} resources adjusted`,
      timestamp: Date.now()
    };
  }

  /**
   * Process healing cycle for all agents
   */
  async processHealingCycle(agents, telemetry) {
    console.log(`[Self-Healing] Starting healing cycle for ${agents.length} agents...`);
    
    const cycle = {
      timestamp: Date.now(),
      totalAgents: agents.length,
      analyzedAgents: 0,
      issuesDetected: 0,
      actionsExecuted: 0,
      results: []
    };

    for (const agent of agents) {
      try {
        const analysis = this.analyzeAgent(agent, telemetry);
        cycle.analyzedAgents++;

        if (analysis.issues.length > 0) {
          cycle.issuesDetected += analysis.issues.length;
          
          // Record incident
          this.incidents.push({
            agentId: agent.id,
            timestamp: Date.now(),
            analysis: analysis
          });

          // Execute healing if enabled
          if (this.policy?.remediation?.autoHeal) {
            const healingResult = await this.executeHealing(analysis);
            cycle.actionsExecuted += healingResult.actions.length;
            cycle.results.push(healingResult);
          }
        }
      } catch (error) {
        console.error(`[Self-Healing] Error processing agent ${agent.id}:`, error);
      }
    }

    console.log(`[Self-Healing] Cycle complete: ${cycle.issuesDetected} issues, ${cycle.actionsExecuted} actions`);
    
    this.emit('healing:cycle_complete', cycle);
    
    return cycle;
  }

  /**
   * Generate healing report
   */
  async generateReport() {
    const report = {
      generated: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      summary: {
        totalIncidents: this.incidents.length,
        totalHealingActions: this.healingActions.length,
        quarantinedAgents: this.quarantinedAgents.size
      },
      recentIncidents: this.incidents.slice(-20).map(incident => ({
        agentId: incident.agentId,
        timestamp: new Date(incident.timestamp).toISOString(),
        severity: incident.analysis.severity,
        issueCount: incident.analysis.issues.length,
        issues: incident.analysis.issues.map(i => i.type)
      })),
      recentActions: this.healingActions.slice(-20).map(action => ({
        agentId: action.agentId,
        timestamp: new Date(action.timestamp).toISOString(),
        actions: action.actions,
        successRate: action.results.filter(r => r.status === 'success').length / action.results.length * 100
      })),
      quarantinedAgents: Array.from(this.quarantinedAgents),
      statistics: this.calculateStatistics()
    };

    // Write report to file
    const markdown = this.formatReportAsMarkdown(report);
    await writeFile('./healing_report.md', markdown);
    
    console.log('[Self-Healing] Report generated: healing_report.md');
    
    return report;
  }

  /**
   * Calculate statistics
   */
  calculateStatistics() {
    const stats = {
      incidentsByType: {},
      actionsByType: {},
      averageResolutionTime: 0,
      autoHealSuccessRate: 0
    };

    // Count incidents by type
    for (const incident of this.incidents) {
      for (const issue of incident.analysis.issues) {
        stats.incidentsByType[issue.type] = (stats.incidentsByType[issue.type] || 0) + 1;
      }
    }

    // Count actions by type
    for (const action of this.healingActions) {
      for (const actionType of action.actions) {
        stats.actionsByType[actionType] = (stats.actionsByType[actionType] || 0) + 1;
      }
    }

    // Calculate success rate
    const totalResults = this.healingActions.reduce((sum, a) => sum + a.results.length, 0);
    const successfulResults = this.healingActions.reduce(
      (sum, a) => sum + a.results.filter(r => r.status === 'success').length, 0
    );
    stats.autoHealSuccessRate = totalResults > 0 ? (successfulResults / totalResults * 100).toFixed(2) : 0;

    return stats;
  }

  /**
   * Format report as Markdown
   */
  formatReportAsMarkdown(report) {
    return `# Self-Healing Engine Report

**Generated:** ${report.generated}  
**Engine Uptime:** ${Math.floor(report.uptime / 1000 / 60)} minutes

## Summary

- **Total Incidents:** ${report.summary.totalIncidents}
- **Total Healing Actions:** ${report.summary.totalHealingActions}
- **Currently Quarantined:** ${report.summary.quarantinedAgents} agents
- **Auto-Heal Success Rate:** ${report.statistics.autoHealSuccessRate}%

## Recent Incidents

${report.recentIncidents.length > 0 ? report.recentIncidents.map(inc => 
  `- **${inc.timestamp}** - Agent \`${inc.agentId}\` - Severity: \`${inc.severity}\` - Issues: ${inc.issues.join(', ')}`
).join('\n') : '*No recent incidents*'}

## Recent Healing Actions

${report.recentActions.length > 0 ? report.recentActions.map(action => 
  `- **${action.timestamp}** - Agent \`${action.agentId}\` - Actions: ${action.actions.join(', ')} - Success: ${action.successRate.toFixed(1)}%`
).join('\n') : '*No recent actions*'}

## Quarantined Agents

${report.quarantinedAgents.length > 0 ? report.quarantinedAgents.map(id => `- \`${id}\``).join('\n') : '*None*'}

## Statistics

### Incidents by Type
${Object.entries(report.statistics.incidentsByType).map(([type, count]) => `- **${type}:** ${count}`).join('\n') || '*No data*'}

### Actions by Type
${Object.entries(report.statistics.actionsByType).map(([type, count]) => `- **${type}:** ${count}`).join('\n') || '*No data*'}

---

*Report generated by Autonomous Mesh OS Self-Healing Engine*
`;
  }
}

export default SelfHealingEngine;
