/**
 * Multi-Region Failover Smoke Test
 * 
 * Validates:
 * - Region health detection
 * - Automatic failover to backup regions
 * - Circuit breaker functionality
 * - Performance within SLA (p95 ≤ 700ms, error rate ≤ 1.5%)
 */

import { RegionRouter } from '../infra/region_router';
import { ReadReplicaPool } from '../infra/read_replica.pool';
import axios from 'axios';

interface TestResult {
  test_name: string;
  passed: boolean;
  duration_ms: number;
  error?: string;
  details?: any;
}

interface SmokeTestReport {
  timestamp: string;
  total_tests: number;
  passed: number;
  failed: number;
  duration_ms: number;
  sla_compliance: {
    latency_p95: number;
    latency_target: number;
    error_rate: number;
    error_target: number;
    passed: boolean;
  };
  results: TestResult[];
}

class FailoverSmokeTest {
  private router: RegionRouter;
  private replicaPool: ReadReplicaPool;
  private results: TestResult[] = [];
  private latencies: number[] = [];
  private errors: number = 0;
  private total_requests: number = 0;

  constructor() {
    this.router = new RegionRouter();
    this.replicaPool = new ReadReplicaPool();
  }

  async runAllTests(): Promise<SmokeTestReport> {
    const startTime = Date.now();

    console.log('🚀 Starting Multi-Region Failover Smoke Tests...\n');

    // Run tests
    await this.testRegionDiscovery();
    await this.testHealthChecks();
    await this.testGeoRouting();
    await this.testLatencyBasedRouting();
    await this.testCircuitBreaker();
    await this.testReadReplicaPool();
    await this.testReadWriteSplit();
    await this.testFailoverScenario();
    await this.testPerformanceSLA();

    const duration = Date.now() - startTime;

    // Calculate SLA metrics
    const latencyP95 = this.calculatePercentile(this.latencies, 95);
    const errorRate = this.total_requests > 0 
      ? (this.errors / this.total_requests) 
      : 0;

    const slaCompliance = {
      latency_p95: latencyP95,
      latency_target: 700,
      error_rate: errorRate,
      error_target: 0.015,
      passed: latencyP95 <= 700 && errorRate <= 0.015
    };

    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    const report: SmokeTestReport = {
      timestamp: new Date().toISOString(),
      total_tests: this.results.length,
      passed,
      failed,
      duration_ms: duration,
      sla_compliance: slaCompliance,
      results: this.results
    };

    // Print summary
    this.printReport(report);

    // Cleanup
    this.router.stopHealthChecks();
    this.replicaPool.stopHealthChecks();

    return report;
  }

  private async testRegionDiscovery(): Promise<void> {
    const testName = 'Region Discovery';
    const startTime = Date.now();

    try {
      const regions = this.router.getActiveRegions();
      
      if (regions.length === 0) {
        throw new Error('No active regions found');
      }

      console.log(`✅ ${testName}: Found ${regions.length} active regions`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime,
        details: { region_count: regions.length }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testHealthChecks(): Promise<void> {
    const testName = 'Health Check Status';
    const startTime = Date.now();

    try {
      // Wait for initial health checks
      await this.sleep(2000);

      const healthStatus = this.router.getRegionHealthStatus();
      const healthyCount = Array.from(healthStatus.values())
        .filter(h => h.healthy).length;

      if (healthyCount === 0) {
        throw new Error('No healthy regions detected');
      }

      console.log(`✅ ${testName}: ${healthyCount} healthy regions`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime,
        details: { healthy_regions: healthyCount }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testGeoRouting(): Promise<void> {
    const testName = 'Geographic Routing';
    const startTime = Date.now();

    try {
      // Test US routing
      const usRegion = await this.router.getOptimalRegion('US');
      if (!usRegion || !usRegion.id.includes('us')) {
        throw new Error('US routing failed');
      }

      // Test EU routing
      const euRegion = await this.router.getOptimalRegion('GB');
      if (!euRegion || !euRegion.id.includes('eu')) {
        throw new Error('EU routing failed');
      }

      // Test APAC routing
      const apacRegion = await this.router.getOptimalRegion('SG');
      if (!apacRegion || !apacRegion.id.includes('ap')) {
        throw new Error('APAC routing failed');
      }

      console.log(`✅ ${testName}: All geo routing tests passed`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime,
        details: {
          us_region: usRegion.id,
          eu_region: euRegion.id,
          apac_region: apacRegion.id
        }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testLatencyBasedRouting(): Promise<void> {
    const testName = 'Latency-Based Routing';
    const startTime = Date.now();

    try {
      const region = await this.router.getOptimalRegion();
      
      if (!region) {
        throw new Error('Failed to get optimal region');
      }

      const health = this.router.getRegionHealthStatus().get(region.id);
      
      if (!health) {
        throw new Error('Health status not available');
      }

      console.log(`✅ ${testName}: Selected ${region.id} (latency: ${health.latency_p95}ms)`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime,
        details: {
          selected_region: region.id,
          latency_p95: health.latency_p95
        }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testCircuitBreaker(): Promise<void> {
    const testName = 'Circuit Breaker';
    const startTime = Date.now();

    try {
      const regions = this.router.getActiveRegions();
      if (regions.length === 0) {
        throw new Error('No regions available');
      }

      const testRegion = regions[0];

      // Simulate failures to open circuit
      for (let i = 0; i < 6; i++) {
        this.router.recordFailure(testRegion.id);
      }

      const breakerStatus = this.router.getCircuitBreakerStatus().get(testRegion.id);
      
      if (!breakerStatus || breakerStatus.state !== 'open') {
        throw new Error('Circuit did not open after failures');
      }

      // Wait for timeout and record success to close circuit
      await this.sleep(1000);
      
      for (let i = 0; i < 4; i++) {
        this.router.recordSuccess(testRegion.id);
      }

      console.log(`✅ ${testName}: Circuit breaker working correctly`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime,
        details: {
          region: testRegion.id,
          final_state: breakerStatus.state
        }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testReadReplicaPool(): Promise<void> {
    const testName = 'Read Replica Pool';
    const startTime = Date.now();

    try {
      const region = 'us-east-1';
      const replica = await this.replicaPool.getReadReplica(region);
      
      if (!replica) {
        throw new Error('Failed to get read replica');
      }

      // Release connection
      this.replicaPool.releaseConnection('us-east-1-replica-1', true);

      const stats = this.replicaPool.getStatistics();
      
      console.log(`✅ ${testName}: Successfully obtained replica connection`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime,
        details: {
          region,
          replica_count: stats.size
        }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testReadWriteSplit(): Promise<void> {
    const testName = 'Read/Write Split Detection';
    const startTime = Date.now();

    try {
      const readOps = [
        'SELECT * FROM agents',
        'GET /api/v1/trust',
        'GET /api/v1/agents'
      ];

      const writeOps = [
        'INSERT INTO agents VALUES',
        'POST /api/v1/agents',
        'DELETE /api/v1/agents/123'
      ];

      // Verify read operations are detected
      for (const op of readOps) {
        if (!this.replicaPool.isReadOnlyOperation(op)) {
          throw new Error(`Failed to detect read operation: ${op}`);
        }
      }

      // Verify write operations are detected
      for (const op of writeOps) {
        if (!this.replicaPool.isWriteOperation(op)) {
          throw new Error(`Failed to detect write operation: ${op}`);
        }
      }

      console.log(`✅ ${testName}: All operations correctly classified`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testFailoverScenario(): Promise<void> {
    const testName = 'Failover Scenario Simulation';
    const startTime = Date.now();

    try {
      // Get initial optimal region
      const initialRegion = await this.router.getOptimalRegion('US');
      if (!initialRegion) {
        throw new Error('No initial region available');
      }

      // Simulate primary region failure
      for (let i = 0; i < 6; i++) {
        this.router.recordFailure(initialRegion.id);
      }

      // Get new optimal region (should failover)
      const failoverRegion = await this.router.getOptimalRegion('US');
      
      if (!failoverRegion) {
        throw new Error('Failover failed - no backup region available');
      }

      if (failoverRegion.id === initialRegion.id) {
        throw new Error('Failover did not route to different region');
      }

      console.log(`✅ ${testName}: Failover from ${initialRegion.id} to ${failoverRegion.id}`);
      
      this.results.push({
        test_name: testName,
        passed: true,
        duration_ms: Date.now() - startTime,
        details: {
          initial_region: initialRegion.id,
          failover_region: failoverRegion.id
        }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private async testPerformanceSLA(): Promise<void> {
    const testName = 'Performance SLA Compliance';
    const startTime = Date.now();

    try {
      // Simulate 100 requests to measure performance
      const requestCount = 100;
      const errors: number[] = [];

      for (let i = 0; i < requestCount; i++) {
        const reqStart = Date.now();
        try {
          const region = await this.router.getOptimalRegion();
          if (!region) {
            errors.push(i);
            this.errors++;
          }
          const latency = Date.now() - reqStart;
          this.latencies.push(latency);
          this.total_requests++;
        } catch (err) {
          errors.push(i);
          this.errors++;
          this.total_requests++;
        }
      }

      const p95 = this.calculatePercentile(this.latencies, 95);
      const errorRate = errors.length / requestCount;

      const passed = p95 <= 700 && errorRate <= 0.015;

      if (passed) {
        console.log(`✅ ${testName}: p95=${p95.toFixed(0)}ms, errors=${(errorRate * 100).toFixed(2)}%`);
      } else {
        console.log(`⚠️  ${testName}: p95=${p95.toFixed(0)}ms (target: ≤700ms), errors=${(errorRate * 100).toFixed(2)}% (target: ≤1.5%)`);
      }
      
      this.results.push({
        test_name: testName,
        passed,
        duration_ms: Date.now() - startTime,
        details: {
          latency_p95: p95,
          error_rate: errorRate,
          total_requests: requestCount
        }
      });
    } catch (error: any) {
      console.error(`❌ ${testName}: ${error.message}`);
      this.results.push({
        test_name: testName,
        passed: false,
        duration_ms: Date.now() - startTime,
        error: error.message
      });
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printReport(report: SmokeTestReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('FAILOVER SMOKE TEST REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Duration: ${report.duration_ms}ms`);
    console.log(`Tests: ${report.passed}/${report.total_tests} passed`);
    console.log('\nSLA Compliance:');
    console.log(`  Latency p95: ${report.sla_compliance.latency_p95.toFixed(0)}ms (target: ≤${report.sla_compliance.latency_target}ms)`);
    console.log(`  Error Rate: ${(report.sla_compliance.error_rate * 100).toFixed(2)}% (target: ≤${(report.sla_compliance.error_target * 100).toFixed(2)}%)`);
    console.log(`  Status: ${report.sla_compliance.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('\nTest Results:');
    
    for (const result of report.results) {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.test_name} (${result.duration_ms}ms)`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
    
    console.log('='.repeat(80));
    
    if (report.failed > 0 || !report.sla_compliance.passed) {
      console.log('\n❌ SMOKE TESTS FAILED\n');
      process.exit(1);
    } else {
      console.log('\n✅ ALL SMOKE TESTS PASSED\n');
    }
  }
}

// Run tests if executed directly
if (require.main === module) {
  const test = new FailoverSmokeTest();
  test.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { FailoverSmokeTest };
