/**
 * Multi-Region Router
 * 
 * Provides intelligent routing to optimal regions based on:
 * - Geographic location
 * - Latency measurements
 * - Health status
 * - Data residency requirements
 * 
 * Features:
 * - Automatic failover with circuit breaker
 * - Health-gated routing
 * - Latency-based optimization
 * - Edge cache integration
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import axios from 'axios';

interface RegionConfig {
  id: string;
  name: string;
  provider: string;
  priority: number;
  status: 'active' | 'inactive' | 'maintenance';
  supabase: {
    project_ref: string;
    url: string;
    anon_key: string;
    service_role_key: string;
  };
  vercel: {
    deployment_url: string;
    region_hint: string;
  };
  capabilities: string[];
  latency_target_p95: number;
  data_residency: string;
}

interface GeoRoutingRule {
  source_country: string[];
  target_region: string;
  fallback_region: string;
}

interface FailoverConfig {
  health_check: {
    enabled: boolean;
    interval_seconds: number;
    timeout_seconds: number;
    unhealthy_threshold: number;
    healthy_threshold: number;
    endpoints: Array<{ path: string; expected_status: number }>;
  };
  circuit_breaker: {
    enabled: boolean;
    failure_threshold: number;
    success_threshold: number;
    timeout_seconds: number;
    half_open_requests: number;
  };
  automatic_failover: {
    enabled: boolean;
    max_failover_time_seconds: number;
    error_rate_threshold: number;
    latency_p95_threshold: number;
  };
}

interface RegionsYaml {
  regions: RegionConfig[];
  routing: {
    strategy: 'latency-based' | 'geo-based' | 'priority-based';
    geo_routing: GeoRoutingRule[];
    latency_thresholds: {
      warn: number;
      critical: number;
    };
  };
  failover: FailoverConfig;
  edge_cache: any;
  data_residency: any;
}

enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

interface CircuitBreakerStatus {
  state: CircuitState;
  failure_count: number;
  success_count: number;
  last_failure_time: number | null;
  next_attempt_time: number | null;
}

interface RegionHealth {
  region_id: string;
  healthy: boolean;
  consecutive_failures: number;
  consecutive_successes: number;
  last_check_time: number;
  latency_p95: number;
  error_rate: number;
}

export class RegionRouter {
  private config: RegionsYaml;
  private regionHealthMap: Map<string, RegionHealth> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerStatus> = new Map();
  private latencyMeasurements: Map<string, number[]> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(configPath?: string) {
    const path = configPath || join(process.cwd(), 'infra', 'regions.yaml');
    const configFile = readFileSync(path, 'utf8');
    this.config = yaml.load(configFile) as RegionsYaml;

    // Initialize health status for all regions
    this.initializeRegionHealth();

    // Initialize circuit breakers
    this.initializeCircuitBreakers();

    // Start health check loop if enabled
    if (this.config.failover.health_check.enabled) {
      this.startHealthChecks();
    }
  }

  private initializeRegionHealth(): void {
    for (const region of this.config.regions) {
      this.regionHealthMap.set(region.id, {
        region_id: region.id,
        healthy: true,
        consecutive_failures: 0,
        consecutive_successes: 0,
        last_check_time: Date.now(),
        latency_p95: 0,
        error_rate: 0
      });
      this.latencyMeasurements.set(region.id, []);
    }
  }

  private initializeCircuitBreakers(): void {
    for (const region of this.config.regions) {
      this.circuitBreakers.set(region.id, {
        state: CircuitState.CLOSED,
        failure_count: 0,
        success_count: 0,
        last_failure_time: null,
        next_attempt_time: null
      });
    }
  }

  /**
   * Get optimal region for a request based on routing strategy
   */
  public async getOptimalRegion(
    sourceCountry?: string,
    capability?: string,
    dataResidencyRequired?: string
  ): Promise<RegionConfig | null> {
    const strategy = this.config.routing.strategy;

    // Filter regions by status, capability, and data residency
    let candidates = this.config.regions.filter(region => {
      if (region.status !== 'active') return false;
      if (capability && !region.capabilities.includes(capability)) return false;
      if (dataResidencyRequired && region.data_residency !== dataResidencyRequired) return false;
      return true;
    });

    // Filter by circuit breaker status
    candidates = candidates.filter(region => {
      const breaker = this.circuitBreakers.get(region.id);
      return breaker && breaker.state !== CircuitState.OPEN;
    });

    // Filter by health status
    candidates = candidates.filter(region => {
      const health = this.regionHealthMap.get(region.id);
      return health && health.healthy;
    });

    if (candidates.length === 0) {
      console.error('No healthy regions available');
      return null;
    }

    switch (strategy) {
      case 'geo-based':
        return this.getOptimalRegionByGeo(sourceCountry, candidates);
      
      case 'latency-based':
        return this.getOptimalRegionByLatency(candidates);
      
      case 'priority-based':
        return this.getOptimalRegionByPriority(candidates);
      
      default:
        return candidates[0];
    }
  }

  private getOptimalRegionByGeo(
    sourceCountry: string | undefined,
    candidates: RegionConfig[]
  ): RegionConfig | null {
    if (!sourceCountry) {
      return candidates[0];
    }

    // Find matching geo routing rule
    const rule = this.config.routing.geo_routing.find(r =>
      r.source_country.includes(sourceCountry)
    );

    if (rule) {
      // Try target region first
      const target = candidates.find(r => r.id === rule.target_region);
      if (target) return target;

      // Try fallback region
      const fallback = candidates.find(r => r.id === rule.fallback_region);
      if (fallback) return fallback;
    }

    // Default to first candidate
    return candidates[0];
  }

  private getOptimalRegionByLatency(candidates: RegionConfig[]): RegionConfig {
    // Sort by measured latency (lower is better)
    const sorted = [...candidates].sort((a, b) => {
      const latencyA = this.regionHealthMap.get(a.id)?.latency_p95 || Infinity;
      const latencyB = this.regionHealthMap.get(b.id)?.latency_p95 || Infinity;
      return latencyA - latencyB;
    });

    return sorted[0];
  }

  private getOptimalRegionByPriority(candidates: RegionConfig[]): RegionConfig {
    // Sort by priority (lower number = higher priority)
    const sorted = [...candidates].sort((a, b) => a.priority - b.priority);
    return sorted[0];
  }

  /**
   * Perform health check on a region
   */
  private async checkRegionHealth(region: RegionConfig): Promise<void> {
    const healthConfig = this.config.failover.health_check;
    const health = this.regionHealthMap.get(region.id)!;
    const breaker = this.circuitBreakers.get(region.id)!;

    // Check if circuit is open
    if (breaker.state === CircuitState.OPEN) {
      const now = Date.now();
      if (breaker.next_attempt_time && now < breaker.next_attempt_time) {
        return; // Circuit still open
      }
      // Try half-open state
      breaker.state = CircuitState.HALF_OPEN;
      breaker.success_count = 0;
    }

    let allHealthy = true;
    const latencyMeasurements: number[] = [];

    for (const endpoint of healthConfig.endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(
          `${region.vercel.deployment_url}${endpoint.path}`,
          { timeout: healthConfig.timeout_seconds * 1000 }
        );
        const latency = Date.now() - startTime;
        latencyMeasurements.push(latency);

        if (response.status !== endpoint.expected_status) {
          allHealthy = false;
          break;
        }
      } catch (error) {
        allHealthy = false;
        break;
      }
    }

    // Update latency measurements
    if (latencyMeasurements.length > 0) {
      const measurements = this.latencyMeasurements.get(region.id) || [];
      measurements.push(...latencyMeasurements);
      // Keep last 100 measurements
      if (measurements.length > 100) {
        measurements.splice(0, measurements.length - 100);
      }
      this.latencyMeasurements.set(region.id, measurements);

      // Calculate p95
      const sorted = [...measurements].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      health.latency_p95 = sorted[p95Index] || 0;
    }

    // Update health status
    health.last_check_time = Date.now();

    if (allHealthy) {
      health.consecutive_successes++;
      health.consecutive_failures = 0;
      breaker.success_count++;
      breaker.failure_count = 0;

      // Close circuit if threshold reached
      if (breaker.state === CircuitState.HALF_OPEN &&
          breaker.success_count >= this.config.failover.circuit_breaker.success_threshold) {
        breaker.state = CircuitState.CLOSED;
        console.log(`Circuit breaker closed for region ${region.id}`);
      }

      // Mark as healthy if threshold reached
      if (health.consecutive_successes >= healthConfig.healthy_threshold) {
        health.healthy = true;
      }
    } else {
      health.consecutive_failures++;
      health.consecutive_successes = 0;
      breaker.failure_count++;
      breaker.success_count = 0;
      breaker.last_failure_time = Date.now();

      // Open circuit if threshold reached
      if (breaker.state !== CircuitState.OPEN &&
          breaker.failure_count >= this.config.failover.circuit_breaker.failure_threshold) {
        breaker.state = CircuitState.OPEN;
        breaker.next_attempt_time = Date.now() +
          (this.config.failover.circuit_breaker.timeout_seconds * 1000);
        console.error(`Circuit breaker opened for region ${region.id}`);
      }

      // Mark as unhealthy if threshold reached
      if (health.consecutive_failures >= healthConfig.unhealthy_threshold) {
        health.healthy = false;
        console.error(`Region ${region.id} marked unhealthy`);
      }
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const interval = this.config.failover.health_check.interval_seconds * 1000;

    this.healthCheckInterval = setInterval(async () => {
      for (const region of this.config.regions) {
        if (region.status === 'active') {
          await this.checkRegionHealth(region).catch(err => {
            console.error(`Health check failed for ${region.id}:`, err);
          });
        }
      }
    }, interval);

    console.log(`Health checks started (interval: ${interval}ms)`);
  }

  /**
   * Stop health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Health checks stopped');
    }
  }

  /**
   * Get current health status of all regions
   */
  public getRegionHealthStatus(): Map<string, RegionHealth> {
    return new Map(this.regionHealthMap);
  }

  /**
   * Get circuit breaker status for all regions
   */
  public getCircuitBreakerStatus(): Map<string, CircuitBreakerStatus> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Record a successful request for circuit breaker tracking
   */
  public recordSuccess(regionId: string): void {
    const breaker = this.circuitBreakers.get(regionId);
    if (breaker) {
      breaker.success_count++;
      breaker.failure_count = 0;

      if (breaker.state === CircuitState.HALF_OPEN &&
          breaker.success_count >= this.config.failover.circuit_breaker.success_threshold) {
        breaker.state = CircuitState.CLOSED;
        console.log(`Circuit breaker closed for region ${regionId}`);
      }
    }
  }

  /**
   * Record a failed request for circuit breaker tracking
   */
  public recordFailure(regionId: string): void {
    const breaker = this.circuitBreakers.get(regionId);
    if (!breaker) return;

    breaker.failure_count++;
    breaker.success_count = 0;
    breaker.last_failure_time = Date.now();

    if (breaker.state !== CircuitState.OPEN &&
        breaker.failure_count >= this.config.failover.circuit_breaker.failure_threshold) {
      breaker.state = CircuitState.OPEN;
      breaker.next_attempt_time = Date.now() +
        (this.config.failover.circuit_breaker.timeout_seconds * 1000);
      console.error(`Circuit breaker opened for region ${regionId}`);
    }
  }

  /**
   * Get all active regions
   */
  public getActiveRegions(): RegionConfig[] {
    return this.config.regions.filter(r => r.status === 'active');
  }

  /**
   * Get region by ID
   */
  public getRegionById(regionId: string): RegionConfig | undefined {
    return this.config.regions.find(r => r.id === regionId);
  }
}

// Singleton instance
let routerInstance: RegionRouter | null = null;

export function getRegionRouter(): RegionRouter {
  if (!routerInstance) {
    routerInstance = new RegionRouter();
  }
  return routerInstance;
}
