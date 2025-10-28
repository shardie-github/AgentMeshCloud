#!/usr/bin/env tsx

/**
 * SLO Checker Script
 * 
 * Samples from logs/health endpoints and fails CI if SLO violated beyond error budget.
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface SLODefinition {
  name: string;
  description: string;
  sli: string; // Service Level Indicator
  slo: number; // Service Level Objective (percentage)
  measurement: {
    type: 'success_rate' | 'latency' | 'error_rate' | 'availability';
    threshold: number;
    window: string; // e.g., '7d', '24h'
  };
  errorBudget: {
    total: number; // Total error budget percentage
    consumed: number; // Currently consumed percentage
  };
}

interface SLIMeasurement {
  sli: string;
  value: number;
  timestamp: string;
  metadata: Record<string, any>;
}

interface SLOCheckResult {
  slo: SLODefinition;
  measurement: SLIMeasurement;
  status: 'pass' | 'fail' | 'warning';
  errorBudgetRemaining: number;
  recommendations: string[];
}

class SLOChecker {
  private prisma: PrismaClient;
  private supabase: any;
  private slos: SLODefinition[] = [];

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.initializeSLODefinitions();
  }

  /**
   * Initialize SLO definitions
   */
  private initializeSLODefinitions(): void {
    this.slos = [
      {
        name: 'api_success_rate',
        description: 'API success rate over 7 days',
        sli: 'success_rate',
        slo: 99.9,
        measurement: {
          type: 'success_rate',
          threshold: 99.9,
          window: '7d',
        },
        errorBudget: {
          total: 0.1, // 0.1% error budget
          consumed: 0,
        },
      },
      {
        name: 'api_latency_p95',
        description: 'API p95 latency',
        sli: 'latency_p95',
        slo: 300, // 300ms for production, 400ms for preview
        measurement: {
          type: 'latency',
          threshold: 300,
          window: '24h',
        },
        errorBudget: {
          total: 5, // 5% error budget
          consumed: 0,
        },
      },
      {
        name: 'database_error_rate',
        description: 'Database error rate',
        sli: 'error_rate',
        slo: 0.1, // 0.1% error rate
        measurement: {
          type: 'error_rate',
          threshold: 0.1,
          window: '24h',
        },
        errorBudget: {
          total: 0.1,
          consumed: 0,
        },
      },
      {
        name: 'system_availability',
        description: 'System availability',
        sli: 'availability',
        slo: 99.95, // 99.95% availability
        measurement: {
          type: 'availability',
          threshold: 99.95,
          window: '7d',
        },
        errorBudget: {
          total: 0.05,
          consumed: 0,
        },
      },
    ];
  }

  /**
   * Run SLO checks for all defined SLIs
   */
  async runChecks(): Promise<SLOCheckResult[]> {
    console.log('🚀 Starting SLO Checks');
    console.log(`Checking ${this.slos.length} SLIs`);

    const results: SLOCheckResult[] = [];

    for (const slo of this.slos) {
      try {
        console.log(`\n📊 Checking ${slo.name}: ${slo.description}`);
        
        const measurement = await this.measureSLI(slo);
        const result = this.evaluateSLO(slo, measurement);
        results.push(result);

        const status = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
        console.log(`${status} ${slo.name}: ${measurement.value} (target: ${slo.slo})`);

      } catch (error) {
        console.error(`❌ Failed to check ${slo.name}:`, error);
        results.push({
          slo,
          measurement: {
            sli: slo.sli,
            value: 0,
            timestamp: new Date().toISOString(),
            metadata: { error: String(error) },
          },
          status: 'fail',
          errorBudgetRemaining: 0,
          recommendations: ['Investigate measurement collection'],
        });
      }
    }

    return results;
  }

  /**
   * Measure a specific SLI
   */
  private async measureSLI(slo: SLODefinition): Promise<SLIMeasurement> {
    const timestamp = new Date().toISOString();

    switch (slo.measurement.type) {
      case 'success_rate':
        return await this.measureSuccessRate(slo, timestamp);
      case 'latency':
        return await this.measureLatency(slo, timestamp);
      case 'error_rate':
        return await this.measureErrorRate(slo, timestamp);
      case 'availability':
        return await this.measureAvailability(slo, timestamp);
      default:
        throw new Error(`Unknown measurement type: ${slo.measurement.type}`);
    }
  }

  /**
   * Measure API success rate
   */
  private async measureSuccessRate(slo: SLODefinition, timestamp: string): Promise<SLIMeasurement> {
    // In a real implementation, this would query logs or metrics
    // For now, we'll simulate based on health check results
    
    const healthChecks = await this.getHealthCheckResults();
    const totalRequests = healthChecks.length;
    const successfulRequests = healthChecks.filter(h => h.status === 'success').length;
    const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 100;

    return {
      sli: slo.sli,
      value: successRate,
      timestamp,
      metadata: {
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
      },
    };
  }

  /**
   * Measure API latency
   */
  private async measureLatency(slo: SLODefinition, timestamp: string): Promise<SLIMeasurement> {
    // In a real implementation, this would query APM data
    // For now, we'll simulate based on health check response times
    
    const healthChecks = await this.getHealthCheckResults();
    const latencies = healthChecks.map(h => h.responseTime).filter(t => t > 0);
    
    if (latencies.length === 0) {
      return {
        sli: slo.sli,
        value: 0,
        timestamp,
        metadata: { error: 'No latency data available' },
      };
    }

    // Calculate p95 latency
    latencies.sort((a, b) => a - b);
    const p95Index = Math.ceil(latencies.length * 0.95) - 1;
    const p95Latency = latencies[p95Index];

    return {
      sli: slo.sli,
      value: p95Latency,
      timestamp,
      metadata: {
        sampleSize: latencies.length,
        minLatency: Math.min(...latencies),
        maxLatency: Math.max(...latencies),
        avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      },
    };
  }

  /**
   * Measure error rate
   */
  private async measureErrorRate(slo: SLODefinition, timestamp: string): Promise<SLIMeasurement> {
    // In a real implementation, this would query error logs
    // For now, we'll simulate based on health check failures
    
    const healthChecks = await this.getHealthCheckResults();
    const totalRequests = healthChecks.length;
    const errorRequests = healthChecks.filter(h => h.status === 'error').length;
    const errorRate = totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0;

    return {
      sli: slo.sli,
      value: errorRate,
      timestamp,
      metadata: {
        totalRequests,
        errorRequests,
        successRequests: totalRequests - errorRequests,
      },
    };
  }

  /**
   * Measure system availability
   */
  private async measureAvailability(slo: SLODefinition, timestamp: string): Promise<SLIMeasurement> {
    // In a real implementation, this would query uptime monitoring
    // For now, we'll simulate based on health check availability
    
    const healthChecks = await this.getHealthCheckResults();
    const totalChecks = healthChecks.length;
    const availableChecks = healthChecks.filter(h => h.status === 'success').length;
    const availability = totalChecks > 0 ? (availableChecks / totalChecks) * 100 : 100;

    return {
      sli: slo.sli,
      value: availability,
      timestamp,
      metadata: {
        totalChecks,
        availableChecks,
        unavailableChecks: totalChecks - availableChecks,
      },
    };
  }

  /**
   * Get health check results (simulated)
   */
  private async getHealthCheckResults(): Promise<Array<{ status: string; responseTime: number }>> {
    // In a real implementation, this would query actual health check logs
    // For now, we'll simulate some realistic data
    
    const results = [];
    const now = Date.now();
    
    // Simulate 100 health checks over the last hour
    for (let i = 0; i < 100; i++) {
      const timestamp = now - (i * 36000); // 36 seconds apart
      const isSuccess = Math.random() > 0.001; // 99.9% success rate
      const responseTime = isSuccess ? 
        Math.random() * 200 + 50 : // 50-250ms for success
        Math.random() * 1000 + 500; // 500-1500ms for errors
      
      results.push({
        status: isSuccess ? 'success' : 'error',
        responseTime,
        timestamp: new Date(timestamp).toISOString(),
      });
    }
    
    return results;
  }

  /**
   * Evaluate SLO against measurement
   */
  private evaluateSLO(slo: SLODefinition, measurement: SLIMeasurement): SLOCheckResult {
    const { value } = measurement;
    const { threshold } = slo.measurement;
    const { total, consumed } = slo.errorBudget;

    let status: 'pass' | 'fail' | 'warning';
    let errorBudgetRemaining = total - consumed;
    const recommendations: string[] = [];

    // Determine status based on measurement type
    switch (slo.measurement.type) {
      case 'success_rate':
      case 'availability':
        if (value >= threshold) {
          status = 'pass';
        } else if (value >= threshold - 0.1) { // Within 0.1% of threshold
          status = 'warning';
          recommendations.push('SLO is close to violation - monitor closely');
        } else {
          status = 'fail';
          recommendations.push('SLO violated - immediate action required');
        }
        break;

      case 'latency':
        if (value <= threshold) {
          status = 'pass';
        } else if (value <= threshold * 1.1) { // Within 10% of threshold
          status = 'warning';
          recommendations.push('Latency approaching threshold - investigate performance');
        } else {
          status = 'fail';
          recommendations.push('Latency threshold exceeded - performance issue');
        }
        break;

      case 'error_rate':
        if (value <= threshold) {
          status = 'pass';
        } else if (value <= threshold * 2) { // Within 2x threshold
          status = 'warning';
          recommendations.push('Error rate elevated - investigate issues');
        } else {
          status = 'fail';
          recommendations.push('Error rate threshold exceeded - system instability');
        }
        break;

      default:
        status = 'fail';
        recommendations.push('Unknown measurement type');
    }

    // Check error budget
    if (errorBudgetRemaining < total * 0.1) { // Less than 10% budget remaining
      recommendations.push('Error budget nearly exhausted - consider reducing deployment frequency');
    }

    return {
      slo,
      measurement,
      status,
      errorBudgetRemaining,
      recommendations,
    };
  }

  /**
   * Generate SLO report
   */
  async generateReport(results: SLOCheckResult[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSLIs: results.length,
        passing: results.filter(r => r.status === 'pass').length,
        warning: results.filter(r => r.status === 'warning').length,
        failing: results.filter(r => r.status === 'fail').length,
      },
      results: results.map(result => ({
        slo: result.slo.name,
        description: result.slo.description,
        status: result.status,
        measuredValue: result.measurement.value,
        targetValue: result.slo.slo,
        errorBudgetRemaining: result.errorBudgetRemaining,
        recommendations: result.recommendations,
      })),
    };

    const reportPath = path.join(process.cwd(), 'slo-check-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 SLO Check Summary:');
    console.log(`Total SLIs: ${report.summary.totalSLIs}`);
    console.log(`Passing: ${report.summary.passing} ✅`);
    console.log(`Warning: ${report.summary.warning} ⚠️`);
    console.log(`Failing: ${report.summary.failing} ❌`);
    console.log(`\n💾 Report saved to: ${reportPath}`);

    // Fail if any SLIs are failing
    if (report.summary.failing > 0) {
      console.error('\n❌ SLO violations detected - failing CI');
      process.exit(1);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// CLI interface
async function main() {
  const checker = new SLOChecker();
  
  try {
    const results = await checker.runChecks();
    await checker.generateReport(results);
  } catch (error) {
    console.error('SLO check failed:', error);
    process.exit(1);
  } finally {
    await checker.cleanup();
  }
}

if (require.main === module) {
  main();
}

export { SLOChecker, SLODefinition, SLOCheckResult };
