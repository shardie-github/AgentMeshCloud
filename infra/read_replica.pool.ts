/**
 * Read Replica Pool Manager
 * 
 * Manages connection pools to read replicas for optimized read operations.
 * Features:
 * - Load balancing across replicas (round-robin, least-connections, weighted)
 * - Connection pooling with health checks
 * - Automatic read/write splitting
 * - Replica failure detection and routing
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface ReplicaConfig {
  id: string;
  url: string;
  weight: number;
  max_connections: number;
}

interface ReplicaPoolConfig {
  region: string;
  replicas: ReplicaConfig[];
}

interface ReadWriteSplitConfig {
  enabled: boolean;
  read_preference: 'replica' | 'primary' | 'automatic';
  operations: {
    read_only: string[];
    write_required: string[];
  };
}

interface ReplicaConnection {
  client: SupabaseClient;
  active_connections: number;
  last_health_check: number;
  healthy: boolean;
  total_requests: number;
  failed_requests: number;
}

enum LoadBalancingStrategy {
  ROUND_ROBIN = 'round-robin',
  LEAST_CONNECTIONS = 'least-connections',
  WEIGHTED = 'weighted'
}

export class ReadReplicaPool {
  private replicaPools: Map<string, ReplicaPoolConfig> = new Map();
  private connections: Map<string, ReplicaConnection> = new Map();
  private currentRoundRobinIndex: Map<string, number> = new Map();
  private strategy: LoadBalancingStrategy;
  private readWriteSplitConfig: ReadWriteSplitConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(configPath?: string) {
    const path = configPath || join(process.cwd(), 'infra', 'regions.yaml');
    const configFile = readFileSync(path, 'utf8');
    const config: any = yaml.load(configFile);

    // Load replica pools
    if (config.read_replicas?.pools) {
      for (const pool of config.read_replicas.pools) {
        this.replicaPools.set(pool.region, pool);
        this.currentRoundRobinIndex.set(pool.region, 0);
      }
    }

    // Load read/write split configuration
    this.readWriteSplitConfig = config.read_replicas?.read_write_split || {
      enabled: true,
      read_preference: 'replica',
      operations: { read_only: [], write_required: [] }
    };

    // Set load balancing strategy
    const strategyStr = config.read_replicas?.strategy || 'least-connections';
    this.strategy = LoadBalancingStrategy[strategyStr.toUpperCase().replace('-', '_') as keyof typeof LoadBalancingStrategy] 
      || LoadBalancingStrategy.LEAST_CONNECTIONS;

    // Initialize connections
    this.initializeConnections();

    // Start health checks
    this.startHealthChecks();
  }

  private initializeConnections(): void {
    for (const [region, pool] of this.replicaPools.entries()) {
      for (const replica of pool.replicas) {
        const client = createClient(
          replica.url,
          process.env[`SUPABASE_ANON_KEY_${region.toUpperCase().replace(/-/g, '_')}`] || '',
          {
            auth: { persistSession: false }
          }
        );

        this.connections.set(replica.id, {
          client,
          active_connections: 0,
          last_health_check: Date.now(),
          healthy: true,
          total_requests: 0,
          failed_requests: 0
        });
      }
    }
  }

  /**
   * Get a replica connection for read operations
   */
  public async getReadReplica(region: string): Promise<SupabaseClient | null> {
    const pool = this.replicaPools.get(region);
    if (!pool) {
      console.error(`No replica pool found for region: ${region}`);
      return null;
    }

    // Get healthy replicas
    const healthyReplicas = pool.replicas.filter(replica => {
      const conn = this.connections.get(replica.id);
      return conn && conn.healthy;
    });

    if (healthyReplicas.length === 0) {
      console.error(`No healthy replicas available in region: ${region}`);
      return null;
    }

    let selectedReplica: ReplicaConfig;

    switch (this.strategy) {
      case LoadBalancingStrategy.ROUND_ROBIN:
        selectedReplica = this.selectRoundRobin(region, healthyReplicas);
        break;

      case LoadBalancingStrategy.LEAST_CONNECTIONS:
        selectedReplica = this.selectLeastConnections(healthyReplicas);
        break;

      case LoadBalancingStrategy.WEIGHTED:
        selectedReplica = this.selectWeighted(healthyReplicas);
        break;

      default:
        selectedReplica = healthyReplicas[0];
    }

    const connection = this.connections.get(selectedReplica.id);
    if (!connection) return null;

    connection.active_connections++;
    connection.total_requests++;

    return connection.client;
  }

  /**
   * Release a replica connection back to the pool
   */
  public releaseConnection(replicaId: string, success: boolean = true): void {
    const connection = this.connections.get(replicaId);
    if (!connection) return;

    connection.active_connections = Math.max(0, connection.active_connections - 1);

    if (!success) {
      connection.failed_requests++;
      
      // Mark unhealthy if error rate exceeds threshold (>10%)
      const errorRate = connection.failed_requests / connection.total_requests;
      if (errorRate > 0.1 && connection.total_requests > 10) {
        connection.healthy = false;
        console.error(`Replica ${replicaId} marked unhealthy (error rate: ${(errorRate * 100).toFixed(2)}%)`);
      }
    }
  }

  /**
   * Check if an operation is read-only
   */
  public isReadOnlyOperation(operation: string): boolean {
    if (!this.readWriteSplitConfig.enabled) {
      return false;
    }

    const normalized = operation.toUpperCase().trim();
    
    // Check SQL operations
    if (normalized.startsWith('SELECT')) {
      return true;
    }

    // Check REST endpoints
    for (const pattern of this.readWriteSplitConfig.operations.read_only) {
      if (pattern.startsWith('GET ') && operation.startsWith('GET ')) {
        const pathPattern = pattern.substring(4);
        const requestPath = operation.substring(4);
        if (this.matchesPath(requestPath, pathPattern)) {
          return true;
        }
      } else if (pattern === normalized) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if an operation requires write access
   */
  public isWriteOperation(operation: string): boolean {
    if (!this.readWriteSplitConfig.enabled) {
      return false;
    }

    const normalized = operation.toUpperCase().trim();
    
    // Check SQL operations
    if (normalized.startsWith('INSERT') || 
        normalized.startsWith('UPDATE') || 
        normalized.startsWith('DELETE')) {
      return true;
    }

    // Check REST endpoints
    for (const pattern of this.readWriteSplitConfig.operations.write_required) {
      if (this.matchesPath(operation, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchesPath(path: string, pattern: string): boolean {
    // Simple path matching (supports :param placeholders)
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');

    if (patternParts.length !== pathParts.length) {
      return false;
    }

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        continue; // Wildcard match
      }
      if (patternParts[i] !== pathParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Round-robin selection
   */
  private selectRoundRobin(region: string, replicas: ReplicaConfig[]): ReplicaConfig {
    const currentIndex = this.currentRoundRobinIndex.get(region) || 0;
    const selected = replicas[currentIndex % replicas.length];
    this.currentRoundRobinIndex.set(region, (currentIndex + 1) % replicas.length);
    return selected;
  }

  /**
   * Least connections selection
   */
  private selectLeastConnections(replicas: ReplicaConfig[]): ReplicaConfig {
    let minConnections = Infinity;
    let selected = replicas[0];

    for (const replica of replicas) {
      const connection = this.connections.get(replica.id);
      if (connection && connection.active_connections < minConnections) {
        minConnections = connection.active_connections;
        selected = replica;
      }
    }

    return selected;
  }

  /**
   * Weighted selection
   */
  private selectWeighted(replicas: ReplicaConfig[]): ReplicaConfig {
    const totalWeight = replicas.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const replica of replicas) {
      random -= replica.weight;
      if (random <= 0) {
        return replica;
      }
    }

    return replicas[replicas.length - 1];
  }

  /**
   * Perform health check on all replicas
   */
  private async checkReplicaHealth(): Promise<void> {
    for (const [replicaId, connection] of this.connections.entries()) {
      try {
        // Simple health check: query system tables
        const { error } = await connection.client
          .from('_health')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!error) {
          connection.healthy = true;
          connection.last_health_check = Date.now();
          
          // Reset error count if healthy
          if (connection.total_requests > 100) {
            connection.failed_requests = Math.floor(connection.failed_requests * 0.9);
          }
        } else {
          console.warn(`Health check failed for replica ${replicaId}:`, error);
        }
      } catch (err) {
        connection.healthy = false;
        console.error(`Health check error for replica ${replicaId}:`, err);
      }
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkReplicaHealth().catch(err => {
        console.error('Replica health check failed:', err);
      });
    }, 60000); // Check every 60 seconds

    console.log('Replica health checks started');
  }

  /**
   * Stop health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Replica health checks stopped');
    }
  }

  /**
   * Get connection statistics
   */
  public getStatistics(): Map<string, any> {
    const stats = new Map();

    for (const [replicaId, connection] of this.connections.entries()) {
      stats.set(replicaId, {
        healthy: connection.healthy,
        active_connections: connection.active_connections,
        total_requests: connection.total_requests,
        failed_requests: connection.failed_requests,
        error_rate: connection.total_requests > 0 
          ? (connection.failed_requests / connection.total_requests * 100).toFixed(2) + '%'
          : '0%',
        last_health_check: new Date(connection.last_health_check).toISOString()
      });
    }

    return stats;
  }

  /**
   * Get replica by ID
   */
  public getReplicaConnection(replicaId: string): ReplicaConnection | undefined {
    return this.connections.get(replicaId);
  }
}

// Singleton instance
let poolInstance: ReadReplicaPool | null = null;

export function getReadReplicaPool(): ReadReplicaPool {
  if (!poolInstance) {
    poolInstance = new ReadReplicaPool();
  }
  return poolInstance;
}
