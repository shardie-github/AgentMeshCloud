#!/usr/bin/env node

/**
 * SLA Dashboard
 * Displays uptime, latency, MTTR, and SLA violations with real-time monitoring
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse } from 'yaml';

class SLADashboard {
  constructor() {
    this.regionMap = null;
    this.metrics = new Map();
    this.incidents = [];
    this.slaTargets = {
      starter: { uptime: 99.0, latencyP95: 1000, latencyP99: 2000 },
      professional: { uptime: 99.9, latencyP95: 500, latencyP99: 1000 },
      enterprise: { uptime: 99.99, latencyP95: 200, latencyP99: 500 }
    };
  }

  /**
   * Initialize SLA dashboard
   */
  async initialize() {
    console.log('📊 Initializing SLA Dashboard...');
    
    try {
      const regionMapContent = readFileSync('./region_map.yaml', 'utf8');
      this.regionMap = parse(regionMapContent);
      
      // Initialize metrics for each region
      for (const regionId of Object.keys(this.regionMap.regions)) {
        this.metrics.set(regionId, {
          uptime: {
            current: 99.99,
            monthly: 99.95,
            quarterly: 99.97,
            yearly: 99.96
          },
          latency: {
            p50: 0,
            p95: 0,
            p99: 0,
            max: 0
          },
          errorRate: 0,
          requestsPerSecond: 0,
          incidentCount: 0,
          mttr: 0,  // Mean Time To Resolution
          mttd: 0,  // Mean Time To Detection
          lastIncident: null,
          slaViolations: []
        });
      }
      
      console.log('✅ SLA Dashboard initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize:', error.message);
      return false;
    }
  }

  /**
   * Collect metrics from regions
   */
  async collectMetrics() {
    console.log('\n📡 Collecting SLA metrics...');
    
    for (const [regionId, regionConfig] of Object.entries(this.regionMap.regions)) {
      if (regionConfig.status !== 'active') continue;
      
      // Simulate metric collection (in production, fetch from Prometheus/CloudWatch)
      const metrics = this.metrics.get(regionId);
      
      // Update latency metrics
      metrics.latency = {
        p50: regionConfig.latency.p50 + Math.random() * 10 - 5,
        p95: regionConfig.latency.p95 + Math.random() * 20 - 10,
        p99: regionConfig.latency.p99 + Math.random() * 30 - 15,
        max: regionConfig.latency.p99 * 1.5 + Math.random() * 50
      };
      
      // Update error rate (simulate 99.9%+ success rate)
      metrics.errorRate = Math.random() * 0.1;  // 0-0.1%
      
      // Update request rate
      metrics.requestsPerSecond = Math.floor(
        regionConfig.capacity.maxAgents * 0.1 + Math.random() * 100
      );
      
      // Calculate uptime
      const downtimeMinutes = Math.random() * 5;  // 0-5 minutes downtime
      const monthMinutes = 30 * 24 * 60;
      metrics.uptime.monthly = ((monthMinutes - downtimeMinutes) / monthMinutes) * 100;
      metrics.uptime.current = metrics.uptime.monthly;
      
      // Check for SLA violations
      await this.checkSLAViolations(regionId, metrics);
    }
    
    console.log('✅ Metrics collected');
  }

  /**
   * Check for SLA violations
   */
  async checkSLAViolations(regionId, metrics) {
    const violations = [];
    
    // Check uptime SLA for each tier
    for (const [tier, targets] of Object.entries(this.slaTargets)) {
      if (metrics.uptime.monthly < targets.uptime) {
        violations.push({
          tier,
          type: 'uptime',
          target: targets.uptime,
          actual: metrics.uptime.monthly,
          severity: 'critical',
          timestamp: new Date().toISOString()
        });
      }
      
      // Check latency SLA
      if (metrics.latency.p95 > targets.latencyP95) {
        violations.push({
          tier,
          type: 'latency_p95',
          target: targets.latencyP95,
          actual: metrics.latency.p95,
          severity: 'warning',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (violations.length > 0) {
      console.warn(`⚠️  SLA violations detected in ${regionId}:`);
      violations.forEach(v => {
        console.warn(`   ${v.tier} ${v.type}: ${v.actual.toFixed(2)} (target: ${v.target})`);
      });
      
      metrics.slaViolations.push(...violations);
    }
  }

  /**
   * Record incident
   */
  recordIncident(incident) {
    const {
      regionId,
      title,
      severity,
      detectedAt,
      resolvedAt = null,
      rootCause = null,
      affectedCustomers = 0
    } = incident;
    
    const duration = resolvedAt 
      ? (new Date(resolvedAt) - new Date(detectedAt)) / 1000
      : null;
    
    const incidentRecord = {
      id: `INC-${Date.now()}`,
      regionId,
      title,
      severity,
      detectedAt,
      resolvedAt,
      duration,
      rootCause,
      affectedCustomers,
      status: resolvedAt ? 'resolved' : 'active'
    };
    
    this.incidents.push(incidentRecord);
    
    const metrics = this.metrics.get(regionId);
    if (metrics) {
      metrics.incidentCount++;
      metrics.lastIncident = incidentRecord;
      
      // Update MTTR if resolved
      if (duration) {
        const resolvedIncidents = this.incidents.filter(
          i => i.regionId === regionId && i.status === 'resolved'
        );
        metrics.mttr = resolvedIncidents.reduce((sum, i) => sum + i.duration, 0) / resolvedIncidents.length;
      }
    }
    
    return incidentRecord;
  }

  /**
   * Generate SLA report
   */
  generateReport(period = 'monthly') {
    console.log(`\n📈 Generating ${period} SLA report...\n`);
    
    const report = {
      period,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRegions: this.metrics.size,
        healthyRegions: 0,
        avgUptime: 0,
        avgLatencyP95: 0,
        totalIncidents: this.incidents.length,
        slaViolations: 0,
        mttr: 0
      },
      regions: {},
      incidents: this.incidents.slice(-20),  // Last 20 incidents
      recommendations: []
    };
    
    let totalUptime = 0;
    let totalLatency = 0;
    let totalViolations = 0;
    let totalMttr = 0;
    let regionCount = 0;
    
    for (const [regionId, regionConfig] of Object.entries(this.regionMap.regions)) {
      const metrics = this.metrics.get(regionId);
      if (!metrics) continue;
      
      regionCount++;
      totalUptime += metrics.uptime.monthly;
      totalLatency += metrics.latency.p95;
      totalViolations += metrics.slaViolations.length;
      totalMttr += metrics.mttr;
      
      // Determine health status
      let health = 'healthy';
      if (metrics.uptime.monthly < 99.9) {
        health = 'degraded';
      }
      if (metrics.uptime.monthly < 99.0) {
        health = 'critical';
      }
      if (health === 'healthy') {
        report.summary.healthyRegions++;
      }
      
      report.regions[regionId] = {
        name: regionConfig.name,
        health,
        uptime: {
          current: metrics.uptime.current.toFixed(3) + '%',
          monthly: metrics.uptime.monthly.toFixed(3) + '%',
          target: {
            professional: this.slaTargets.professional.uptime + '%',
            enterprise: this.slaTargets.enterprise.uptime + '%'
          }
        },
        latency: {
          p50: Math.round(metrics.latency.p50) + 'ms',
          p95: Math.round(metrics.latency.p95) + 'ms',
          p99: Math.round(metrics.latency.p99) + 'ms'
        },
        errorRate: metrics.errorRate.toFixed(3) + '%',
        requestsPerSecond: metrics.requestsPerSecond,
        incidents: metrics.incidentCount,
        mttr: this.formatDuration(metrics.mttr),
        slaViolations: metrics.slaViolations.length,
        lastIncident: metrics.lastIncident?.title || 'None'
      };
      
      // Add recommendations
      if (metrics.uptime.monthly < 99.9) {
        report.recommendations.push({
          region: regionId,
          priority: 'high',
          recommendation: 'Uptime below professional SLA target. Review infrastructure stability and implement additional monitoring.'
        });
      }
      
      if (metrics.latency.p95 > 500) {
        report.recommendations.push({
          region: regionId,
          priority: 'medium',
          recommendation: 'P95 latency above target. Consider scaling resources or optimizing application performance.'
        });
      }
      
      if (metrics.mttr > 300) {  // 5 minutes
        report.recommendations.push({
          region: regionId,
          priority: 'medium',
          recommendation: 'MTTR exceeds 5 minutes. Improve incident detection and response procedures.'
        });
      }
    }
    
    // Calculate averages
    report.summary.avgUptime = (totalUptime / regionCount).toFixed(3) + '%';
    report.summary.avgLatencyP95 = Math.round(totalLatency / regionCount) + 'ms';
    report.summary.slaViolations = totalViolations;
    report.summary.mttr = this.formatDuration(totalMttr / regionCount);
    
    // Display summary
    console.log('📊 SLA Report Summary:');
    console.log(`   Period: ${period}`);
    console.log(`   Total Regions: ${report.summary.totalRegions}`);
    console.log(`   Healthy Regions: ${report.summary.healthyRegions}`);
    console.log(`   Avg Uptime: ${report.summary.avgUptime}`);
    console.log(`   Avg P95 Latency: ${report.summary.avgLatencyP95}`);
    console.log(`   Total Incidents: ${report.summary.totalIncidents}`);
    console.log(`   SLA Violations: ${report.summary.slaViolations}`);
    console.log(`   MTTR: ${report.summary.mttr}`);
    
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations: ${report.recommendations.length}`);
      report.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   [${rec.priority}] ${rec.region}: ${rec.recommendation}`);
      });
    }
    
    return report;
  }

  /**
   * Display real-time dashboard
   */
  displayDashboard() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MESH OS - SLA DASHBOARD');
    console.log('='.repeat(80) + '\n');
    
    console.log('Global SLA Targets:');
    console.log(`  Professional: ${this.slaTargets.professional.uptime}% uptime, ${this.slaTargets.professional.latencyP95}ms P95`);
    console.log(`  Enterprise:   ${this.slaTargets.enterprise.uptime}% uptime, ${this.slaTargets.enterprise.latencyP95}ms P95\n`);
    
    console.log('Region Status:');
    console.log('-'.repeat(80));
    
    for (const [regionId, regionConfig] of Object.entries(this.regionMap.regions)) {
      const metrics = this.metrics.get(regionId);
      if (!metrics) continue;
      
      const uptimeStatus = metrics.uptime.monthly >= this.slaTargets.enterprise.uptime 
        ? '✅' 
        : metrics.uptime.monthly >= this.slaTargets.professional.uptime 
        ? '⚠️' 
        : '❌';
      
      const latencyStatus = metrics.latency.p95 <= this.slaTargets.enterprise.latencyP95 
        ? '✅' 
        : metrics.latency.p95 <= this.slaTargets.professional.latencyP95 
        ? '⚠️' 
        : '❌';
      
      console.log(`\n${regionId} (${regionConfig.name})`);
      console.log(`  Status: ${regionConfig.status === 'active' ? '🟢 Active' : '🔴 Inactive'}`);
      console.log(`  Uptime: ${uptimeStatus} ${metrics.uptime.monthly.toFixed(3)}%`);
      console.log(`  Latency P95: ${latencyStatus} ${Math.round(metrics.latency.p95)}ms`);
      console.log(`  Error Rate: ${metrics.errorRate.toFixed(3)}%`);
      console.log(`  RPS: ${metrics.requestsPerSecond}`);
      console.log(`  Incidents: ${metrics.incidentCount} (MTTR: ${this.formatDuration(metrics.mttr)})`);
      
      if (metrics.slaViolations.length > 0) {
        console.log(`  ⚠️  SLA Violations: ${metrics.slaViolations.length}`);
      }
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Format duration in seconds to human readable
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0s';
    
    if (seconds < 60) {
      return Math.round(seconds) + 's';
    } else if (seconds < 3600) {
      return Math.round(seconds / 60) + 'm';
    } else {
      return Math.round(seconds / 3600) + 'h';
    }
  }

  /**
   * Save report to file
   */
  saveReport(report) {
    const filename = `./sla_report_${report.period}_${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n✅ SLA report saved to ${filename}`);
  }
}

// Main execution
async function main() {
  const dashboard = new SLADashboard();
  
  if (!await dashboard.initialize()) {
    process.exit(1);
  }
  
  // Collect metrics
  await dashboard.collectMetrics();
  
  // Record some sample incidents
  dashboard.recordIncident({
    regionId: 'us-east-1',
    title: 'Database connection pool exhausted',
    severity: 'high',
    detectedAt: new Date(Date.now() - 600000).toISOString(),  // 10 minutes ago
    resolvedAt: new Date(Date.now() - 300000).toISOString(),  // 5 minutes ago
    rootCause: 'Connection pool misconfiguration',
    affectedCustomers: 15
  });
  
  dashboard.recordIncident({
    regionId: 'eu-west-1',
    title: 'API Gateway timeout spike',
    severity: 'medium',
    detectedAt: new Date(Date.now() - 1800000).toISOString(),  // 30 minutes ago
    resolvedAt: new Date(Date.now() - 1200000).toISOString(),  // 20 minutes ago
    rootCause: 'Downstream service latency',
    affectedCustomers: 8
  });
  
  // Display dashboard
  dashboard.displayDashboard();
  
  // Generate and save report
  const report = dashboard.generateReport('monthly');
  dashboard.saveReport(report);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default SLADashboard;
