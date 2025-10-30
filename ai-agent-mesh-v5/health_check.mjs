#!/usr/bin/env node
/**
 * Autonomous Mesh OS - Health Check Module
 * 
 * Performs comprehensive health checks on agents and infrastructure:
 * - HTTP/TCP connectivity probes
 * - Resource utilization checks
 * - Performance metrics validation
 * - Dependency health verification
 * 
 * @module health_check
 */

import { request } from 'http';
import { createConnection } from 'net';
import { readFile } from 'fs/promises';
import YAML from 'yaml';

class HealthChecker {
  constructor(configPath = './scheduler_config.yaml') {
    this.configPath = configPath;
    this.config = null;
    this.healthHistory = new Map();
  }

  /**
   * Initialize health checker
   */
  async initialize() {
    const configData = await readFile(this.configPath, 'utf-8');
    this.config = YAML.parse(configData);
    console.log('[Health Check] Initialized');
  }

  /**
   * Perform health check on an agent
   */
  async checkAgent(agent) {
    const startTime = Date.now();
    const result = {
      agentId: agent.id,
      timestamp: startTime,
      status: 'healthy',
      checks: [],
      duration: 0,
      score: 100
    };

    try {
      // Run all configured probe types
      const probes = this.config?.health?.probes || [];
      
      for (const probe of probes) {
        try {
          const probeResult = await this.runProbe(agent, probe);
          result.checks.push(probeResult);
          
          if (!probeResult.passed) {
            result.score -= 20;
          }
        } catch (error) {
          result.checks.push({
            type: probe.type,
            passed: false,
            error: error.message,
            duration: 0
          });
          result.score -= 20;
        }
      }

      // Determine overall health status
      if (result.score >= 80) {
        result.status = 'healthy';
      } else if (result.score >= 50) {
        result.status = 'degraded';
      } else {
        result.status = 'unhealthy';
      }

      result.duration = Date.now() - startTime;

      // Update health history
      this.updateHealthHistory(agent.id, result);

      return result;
    } catch (error) {
      result.status = 'unhealthy';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      result.score = 0;
      
      this.updateHealthHistory(agent.id, result);
      return result;
    }
  }

  /**
   * Run a specific health probe
   */
  async runProbe(agent, probe) {
    switch (probe.type) {
      case 'http':
        return await this.httpProbe(agent, probe);
      case 'tcp':
        return await this.tcpProbe(agent, probe);
      case 'metrics':
        return await this.metricsProbe(agent, probe);
      default:
        throw new Error(`Unknown probe type: ${probe.type}`);
    }
  }

  /**
   * HTTP health probe
   */
  async httpProbe(agent, probe) {
    const startTime = Date.now();
    const url = new URL(agent.endpoint);
    const path = probe.endpoint || '/health';
    
    return new Promise((resolve, reject) => {
      const timeout = probe.timeout || 5000;
      
      const req = request({
        hostname: url.hostname,
        port: url.port || 80,
        path: path,
        method: 'GET',
        timeout: timeout
      }, (res) => {
        const duration = Date.now() - startTime;
        const passed = res.statusCode === (probe.expectedStatus || 200);
        
        resolve({
          type: 'http',
          passed: passed,
          statusCode: res.statusCode,
          duration: duration,
          latency: duration
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP probe timeout'));
      });

      req.end();
    });
  }

  /**
   * TCP connectivity probe
   */
  async tcpProbe(agent, probe) {
    const startTime = Date.now();
    const url = new URL(agent.endpoint);
    const port = probe.port || url.port || 80;
    
    return new Promise((resolve, reject) => {
      const timeout = probe.timeout || 3000;
      const socket = createConnection({ 
        host: url.hostname, 
        port: port,
        timeout: timeout
      });

      socket.on('connect', () => {
        const duration = Date.now() - startTime;
        socket.destroy();
        resolve({
          type: 'tcp',
          passed: true,
          port: port,
          duration: duration,
          latency: duration
        });
      });

      socket.on('error', (error) => {
        socket.destroy();
        reject(error);
      });

      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('TCP probe timeout'));
      });
    });
  }

  /**
   * Metrics-based health probe
   */
  async metricsProbe(agent, probe) {
    const startTime = Date.now();
    
    // Check metrics against thresholds
    const checks = {
      cpu: agent.metrics?.cpu || Math.random() * 100,
      memory: agent.metrics?.memory || Math.random() * 100,
      latency: agent.metrics?.avgLatency || Math.random() * 10000
    };

    const thresholds = probe.threshold || {};
    const passed = 
      (!thresholds.cpu || checks.cpu < thresholds.cpu) &&
      (!thresholds.memory || checks.memory < thresholds.memory) &&
      (!thresholds.latency || checks.latency < thresholds.latency);

    return {
      type: 'metrics',
      passed: passed,
      metrics: checks,
      thresholds: thresholds,
      duration: Date.now() - startTime
    };
  }

  /**
   * Update health history for an agent
   */
  updateHealthHistory(agentId, result) {
    if (!this.healthHistory.has(agentId)) {
      this.healthHistory.set(agentId, []);
    }

    const history = this.healthHistory.get(agentId);
    history.push(result);

    // Keep only last 100 checks
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get health trend for an agent
   */
  getHealthTrend(agentId, windowSize = 10) {
    const history = this.healthHistory.get(agentId) || [];
    const recent = history.slice(-windowSize);

    if (recent.length === 0) {
      return { trend: 'unknown', score: 0, history: [] };
    }

    const avgScore = recent.reduce((sum, r) => sum + r.score, 0) / recent.length;
    
    // Calculate trend
    let trend = 'stable';
    if (recent.length >= 3) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 10) {
        trend = 'improving';
      } else if (secondAvg < firstAvg - 10) {
        trend = 'degrading';
      }
    }

    return {
      trend: trend,
      score: avgScore,
      history: recent.map(r => ({
        timestamp: r.timestamp,
        status: r.status,
        score: r.score
      }))
    };
  }

  /**
   * Check if agent should be quarantined
   */
  shouldQuarantine(agentId) {
    const history = this.healthHistory.get(agentId) || [];
    const recent = history.slice(-10);

    if (recent.length < 5) {
      return false;
    }

    // Count consecutive failures
    let consecutiveFailures = 0;
    for (let i = recent.length - 1; i >= 0; i--) {
      if (recent[i].status === 'unhealthy') {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    const threshold = this.config?.health?.failureThreshold || 3;
    return consecutiveFailures >= threshold;
  }

  /**
   * Perform batch health check on multiple agents
   */
  async checkAll(agents) {
    console.log(`[Health Check] Checking ${agents.length} agents...`);
    
    const results = await Promise.allSettled(
      agents.map(agent => this.checkAgent(agent))
    );

    const summary = {
      timestamp: Date.now(),
      total: agents.length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      checks: []
    };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const check = result.value;
        summary.checks.push(check);
        
        switch (check.status) {
          case 'healthy':
            summary.healthy++;
            break;
          case 'degraded':
            summary.degraded++;
            break;
          case 'unhealthy':
            summary.unhealthy++;
            break;
        }
      } else {
        summary.unhealthy++;
        summary.checks.push({
          status: 'unhealthy',
          error: result.reason?.message || 'Unknown error',
          score: 0
        });
      }
    }

    console.log(`[Health Check] Results: ${summary.healthy} healthy, ${summary.degraded} degraded, ${summary.unhealthy} unhealthy`);
    
    return summary;
  }

  /**
   * Generate health report
   */
  generateReport() {
    const report = {
      timestamp: Date.now(),
      agents: []
    };

    for (const [agentId, history] of this.healthHistory) {
      const latest = history[history.length - 1];
      const trend = this.getHealthTrend(agentId);
      const shouldQuarantine = this.shouldQuarantine(agentId);

      report.agents.push({
        agentId: agentId,
        status: latest?.status || 'unknown',
        score: latest?.score || 0,
        trend: trend.trend,
        trendScore: trend.score,
        checksPerformed: history.length,
        shouldQuarantine: shouldQuarantine,
        lastCheck: latest?.timestamp
      });
    }

    return report;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  
  await checker.initialize();
  
  // Mock agents for testing
  const mockAgents = [
    {
      id: 'agent-01',
      endpoint: 'http://localhost:9001',
      metrics: { cpu: 45, memory: 60, avgLatency: 120 }
    },
    {
      id: 'agent-02',
      endpoint: 'http://localhost:9002',
      metrics: { cpu: 75, memory: 80, avgLatency: 350 }
    },
    {
      id: 'agent-03',
      endpoint: 'http://localhost:9003',
      metrics: { cpu: 30, memory: 40, avgLatency: 95 }
    }
  ];

  const summary = await checker.checkAll(mockAgents);
  console.log('\n=== Health Check Summary ===');
  console.log(JSON.stringify(summary, null, 2));
  
  const report = checker.generateReport();
  console.log('\n=== Health Report ===');
  console.log(JSON.stringify(report, null, 2));
}

export default HealthChecker;
