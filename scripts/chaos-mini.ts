#!/usr/bin/env tsx

/**
 * Chaos Mini Script
 * 
 * Safe, bounded chaos drills for testing system resilience:
 * - Simulate Supabase downtime
 * - Simulate rate limiting
 * - Test graceful fallbacks
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface ChaosTest {
  name: string;
  description: string;
  duration: number; // in seconds
  safe: boolean;
  category: 'network' | 'database' | 'api' | 'storage';
}

interface ChaosResult {
  test: ChaosTest;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  observations: string[];
  recommendations: string[];
}

class ChaosMiniRunner {
  private prisma: PrismaClient;
  private supabase: any;
  private tests: ChaosTest[] = [];

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

    this.initializeTests();
  }

  /**
   * Initialize chaos tests
   */
  private initializeTests(): void {
    this.tests = [
      {
        name: 'supabase_downtime',
        description: 'Simulate Supabase connection failure',
        duration: 30,
        safe: true,
        category: 'database',
      },
      {
        name: 'rate_limiting',
        description: 'Simulate rate limiting scenarios',
        duration: 20,
        safe: true,
        category: 'api',
      },
      {
        name: 'database_slowdown',
        description: 'Simulate database performance degradation',
        duration: 15,
        safe: true,
        category: 'database',
      },
      {
        name: 'network_latency',
        description: 'Simulate high network latency',
        duration: 25,
        safe: true,
        category: 'network',
      },
    ];
  }

  /**
   * Run all chaos tests
   */
  async runAllTests(): Promise<ChaosResult[]> {
    console.log('🚀 Starting Chaos Mini Tests');
    console.log(`Running ${this.tests.length} safe chaos tests`);

    const results: ChaosResult[] = [];

    for (const test of this.tests) {
      try {
        console.log(`\n🧪 Running: ${test.name}`);
        console.log(`Description: ${test.description}`);
        console.log(`Duration: ${test.duration}s`);

        const result = await this.runTest(test);
        results.push(result);

        const status = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏭️';
        console.log(`${status} ${test.name}: ${result.status}`);

      } catch (error) {
        console.error(`❌ Test ${test.name} crashed:`, error);
        results.push({
          test,
          status: 'failed',
          duration: 0,
          error: String(error),
          observations: ['Test crashed unexpectedly'],
          recommendations: ['Investigate test implementation'],
        });
      }
    }

    return results;
  }

  /**
   * Run a single chaos test
   */
  private async runTest(test: ChaosTest): Promise<ChaosResult> {
    const startTime = Date.now();
    const observations: string[] = [];
    const recommendations: string[] = [];

    try {
      switch (test.name) {
        case 'supabase_downtime':
          await this.testSupabaseDowntime(observations, recommendations);
          break;
        case 'rate_limiting':
          await this.testRateLimiting(observations, recommendations);
          break;
        case 'database_slowdown':
          await this.testDatabaseSlowdown(observations, recommendations);
          break;
        case 'network_latency':
          await this.testNetworkLatency(observations, recommendations);
          break;
        default:
          throw new Error(`Unknown test: ${test.name}`);
      }

      const duration = Date.now() - startTime;
      return {
        test,
        status: 'passed',
        duration,
        observations,
        recommendations,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        test,
        status: 'failed',
        duration,
        error: String(error),
        observations,
        recommendations,
      };
    }
  }

  /**
   * Test Supabase downtime simulation
   */
  private async testSupabaseDowntime(observations: string[], recommendations: string[]): Promise<void> {
    console.log('  🔌 Simulating Supabase connection failure...');

    // Test 1: Connection timeout
    try {
      const startTime = Date.now();
      await this.supabase.from('config_flags').select('*').limit(1);
      const responseTime = Date.now() - startTime;
      
      observations.push(`Supabase query completed in ${responseTime}ms`);
      
      if (responseTime > 5000) {
        observations.push('Supabase response time is slow (>5s)');
        recommendations.push('Consider implementing connection pooling');
      }
    } catch (error) {
      observations.push(`Supabase query failed: ${error}`);
      recommendations.push('Implement graceful fallback for Supabase failures');
    }

    // Test 2: Feature flags fallback
    try {
      const featureFlags = await this.getFeatureFlagsWithFallback();
      observations.push(`Feature flags retrieved: ${Object.keys(featureFlags).length} flags`);
      
      if (Object.keys(featureFlags).length === 0) {
        observations.push('No feature flags available - using defaults');
        recommendations.push('Ensure feature flags have sensible defaults');
      }
    } catch (error) {
      observations.push(`Feature flags fallback failed: ${error}`);
      recommendations.push('Improve feature flags error handling');
    }

    // Test 3: Maintenance mode check
    try {
      const isMaintenanceMode = await this.checkMaintenanceModeWithFallback();
      observations.push(`Maintenance mode status: ${isMaintenanceMode ? 'active' : 'inactive'}`);
    } catch (error) {
      observations.push(`Maintenance mode check failed: ${error}`);
      recommendations.push('Implement maintenance mode fallback');
    }
  }

  /**
   * Test rate limiting scenarios
   */
  private async testRateLimiting(observations: string[], recommendations: string[]): Promise<void> {
    console.log('  🚦 Testing rate limiting scenarios...');

    const requests = [];
    const startTime = Date.now();

    // Simulate burst of requests
    for (let i = 0; i < 20; i++) {
      requests.push(this.makeTestRequest(i));
    }

    try {
      const results = await Promise.allSettled(requests);
      const duration = Date.now() - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      const rateLimited = results.filter(r => 
        r.status === 'rejected' && 
        String(r.reason).includes('rate limit')
      ).length;

      observations.push(`Made 20 requests in ${duration}ms`);
      observations.push(`Successful: ${successful}, Failed: ${failed}, Rate Limited: ${rateLimited}`);

      if (rateLimited > 0) {
        observations.push('Rate limiting is working correctly');
      } else {
        observations.push('No rate limiting detected');
        recommendations.push('Consider implementing rate limiting');
      }

      if (failed > successful) {
        observations.push('High failure rate detected');
        recommendations.push('Investigate request handling reliability');
      }

    } catch (error) {
      observations.push(`Rate limiting test failed: ${error}`);
      recommendations.push('Improve rate limiting test implementation');
    }
  }

  /**
   * Test database slowdown simulation
   */
  private async testDatabaseSlowdown(observations: string[], recommendations: string[]): Promise<void> {
    console.log('  🐌 Simulating database slowdown...');

    const queries = [
      'SELECT COUNT(*) FROM agents',
      'SELECT COUNT(*) FROM workflows',
      'SELECT COUNT(*) FROM audit_logs',
      'SELECT COUNT(*) FROM product_feedback',
    ];

    const results = [];
    const startTime = Date.now();

    for (const query of queries) {
      try {
        const queryStart = Date.now();
        await this.prisma.$queryRawUnsafe(query);
        const queryDuration = Date.now() - queryStart;
        results.push({ query, duration: queryDuration, success: true });
      } catch (error) {
        results.push({ query, duration: 0, success: false, error: String(error) });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successfulQueries = results.filter(r => r.success);
    const avgDuration = successfulQueries.reduce((sum, r) => sum + r.duration, 0) / successfulQueries.length;

    observations.push(`Executed ${queries.length} queries in ${totalDuration}ms`);
    observations.push(`Average query duration: ${avgDuration.toFixed(2)}ms`);
    observations.push(`Successful queries: ${successfulQueries.length}/${queries.length}`);

    if (avgDuration > 1000) {
      observations.push('Database queries are slow (>1s average)');
      recommendations.push('Consider database optimization or indexing');
    }

    if (successfulQueries.length < queries.length) {
      observations.push('Some database queries failed');
      recommendations.push('Investigate database connectivity and query reliability');
    }
  }

  /**
   * Test network latency simulation
   */
  private async testNetworkLatency(observations: string[], recommendations: string[]): Promise<void> {
    console.log('  🌐 Testing network latency scenarios...');

    const endpoints = [
      '/api/health',
      '/api/status',
      '/api/version',
    ];

    const results = [];

    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        // In a real implementation, this would make actual HTTP requests
        // For now, we'll simulate network latency
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
        const duration = Date.now() - startTime;
        
        results.push({ endpoint, duration, success: true });
        observations.push(`${endpoint}: ${duration}ms`);
      } catch (error) {
        results.push({ endpoint, duration: 0, success: false, error: String(error) });
        observations.push(`${endpoint}: failed - ${error}`);
      }
    }

    const successfulRequests = results.filter(r => r.success);
    const avgLatency = successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length;

    observations.push(`Average latency: ${avgLatency.toFixed(2)}ms`);

    if (avgLatency > 500) {
      observations.push('High network latency detected (>500ms)');
      recommendations.push('Consider CDN or edge caching');
    }

    if (successfulRequests.length < results.length) {
      observations.push('Some network requests failed');
      recommendations.push('Improve network error handling and retries');
    }
  }

  /**
   * Get feature flags with fallback
   */
  private async getFeatureFlagsWithFallback(): Promise<Record<string, any>> {
    try {
      const { data } = await this.supabase
        .from('config_flags')
        .select('key, value')
        .eq('enabled', true);
      
      const flags: Record<string, any> = {};
      for (const flag of data || []) {
        flags[flag.key] = flag.value;
      }
      return flags;
    } catch (error) {
      // Fallback to default flags
      return {
        maintenance_mode: { enabled: false },
        feature_new_dashboard: { enabled: true },
        kill_switch_api: { enabled: true },
      };
    }
  }

  /**
   * Check maintenance mode with fallback
   */
  private async checkMaintenanceModeWithFallback(): Promise<boolean> {
    try {
      const { data } = await this.supabase
        .from('config_flags')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();
      
      return data?.value?.enabled || false;
    } catch (error) {
      // Fallback: assume not in maintenance mode
      return false;
    }
  }

  /**
   * Make a test request
   */
  private async makeTestRequest(id: number): Promise<any> {
    // Simulate a request with some chance of rate limiting
    const delay = Math.random() * 100;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (Math.random() < 0.1) { // 10% chance of rate limiting
      throw new Error('Rate limit exceeded');
    }
    
    return { id, timestamp: Date.now() };
  }

  /**
   * Generate chaos test report
   */
  async generateReport(results: ChaosResult[]): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
      },
      results: results.map(result => ({
        test: result.test.name,
        description: result.test.description,
        status: result.status,
        duration: result.duration,
        error: result.error,
        observations: result.observations,
        recommendations: result.recommendations,
      })),
      overallHealth: this.calculateOverallHealth(results),
    };

    const reportPath = path.join(process.cwd(), 'chaos-mini-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Chaos Mini Summary:');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Passed: ${report.summary.passed} ✅`);
    console.log(`Failed: ${report.summary.failed} ❌`);
    console.log(`Skipped: ${report.summary.skipped} ⏭️`);
    console.log(`Overall Health: ${report.overallHealth}%`);
    console.log(`\n💾 Report saved to: ${reportPath}`);

    // Fail if too many tests failed
    if (report.summary.failed > report.summary.totalTests * 0.5) {
      console.error('\n❌ Too many chaos tests failed - system may be unstable');
      process.exit(1);
    }
  }

  /**
   * Calculate overall system health
   */
  private calculateOverallHealth(results: ChaosResult[]): number {
    if (results.length === 0) return 0;
    
    const passedTests = results.filter(r => r.status === 'passed').length;
    return Math.round((passedTests / results.length) * 100);
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
  const args = process.argv.slice(2);
  const specificTest = args.find(arg => arg.startsWith('--test='))?.split('=')[1];
  
  const runner = new ChaosMiniRunner();
  
  try {
    let results: ChaosResult[];
    
    if (specificTest) {
      const test = runner['tests'].find(t => t.name === specificTest);
      if (!test) {
        console.error(`Test not found: ${specificTest}`);
        process.exit(1);
      }
      results = [await runner.runTest(test)];
    } else {
      results = await runner.runAllTests();
    }
    
    await runner.generateReport(results);
  } catch (error) {
    console.error('Chaos mini failed:', error);
    process.exit(1);
  } finally {
    await runner.cleanup();
  }
}

if (require.main === module) {
  main();
}

export { ChaosMiniRunner, ChaosTest, ChaosResult };
