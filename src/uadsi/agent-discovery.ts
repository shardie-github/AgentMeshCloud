/**
 * Agent Discovery - UADSI Core
 * Scans MCP servers + integrations, builds inventory
 */

import { createLogger } from '@/common/logger';
import { AgentType, Vendor, AgentStatus } from '@/common/types';
import { agentRegistry } from '@/registry';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('uadsi-discovery');

export interface DiscoverySource {
  type: 'mcp' | 'zapier' | 'make' | 'n8n' | 'airflow' | 'lambda';
  endpoint: string;
  credentials?: {
    apiKey?: string;
    token?: string;
  };
}

export interface DiscoveredAgent {
  external_id: string;
  name: string;
  type: AgentType;
  vendor: Vendor;
  model: string;
  source: string;
  metadata: Record<string, unknown>;
}

/**
 * Agent Discovery Service
 * Discovers agents from various sources
 */
export class AgentDiscovery {
  private sources: DiscoverySource[];
  private discoveredAgents: Map<string, DiscoveredAgent>;
  private scanInterval: NodeJS.Timeout | null;

  constructor() {
    this.sources = [];
    this.discoveredAgents = new Map();
    this.scanInterval = null;
  }

  /**
   * Add a discovery source
   */
  addSource(source: DiscoverySource): void {
    logger.info('Adding discovery source', { type: source.type, endpoint: source.endpoint });
    this.sources.push(source);
  }

  /**
   * Start automatic scanning
   */
  startAutoScan(intervalMs: number = 900000): void { // 15 minutes
    logger.info('Starting automatic discovery scans', { interval_ms: intervalMs });

    this.scanInterval = setInterval(() => {
      this.scanAll().catch(error => {
        logger.error('Auto-scan failed', error as Error);
      });
    }, intervalMs);

    // Run initial scan
    this.scanAll().catch(error => {
      logger.error('Initial scan failed', error as Error);
    });
  }

  /**
   * Stop automatic scanning
   */
  stopAutoScan(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      logger.info('Automatic discovery scans stopped');
    }
  }

  /**
   * Scan all sources
   */
  async scanAll(): Promise<DiscoveredAgent[]> {
    logger.info('Starting discovery scan', { source_count: this.sources.length });

    const discovered: DiscoveredAgent[] = [];

    for (const source of this.sources) {
      try {
        const agents = await this.scanSource(source);
        discovered.push(...agents);
      } catch (error) {
        logger.error('Failed to scan source', error as Error, {
          type: source.type,
          endpoint: source.endpoint,
        });
      }
    }

    logger.info('Discovery scan complete', {
      discovered: discovered.length,
      new: discovered.filter(a => !this.discoveredAgents.has(a.external_id)).length,
    });

    // Update inventory
    for (const agent of discovered) {
      this.discoveredAgents.set(agent.external_id, agent);
      await this.registerOrUpdateAgent(agent);
    }

    return discovered;
  }

  /**
   * Scan a specific source
   */
  private async scanSource(source: DiscoverySource): Promise<DiscoveredAgent[]> {
    logger.debug('Scanning source', { type: source.type });

    switch (source.type) {
      case 'mcp':
        return this.scanMCPServer(source);
      case 'zapier':
        return this.scanZapier(source);
      case 'make':
        return this.scanMake(source);
      case 'n8n':
        return this.scanN8n(source);
      case 'airflow':
        return this.scanAirflow(source);
      case 'lambda':
        return this.scanLambda(source);
      default:
        logger.warn('Unknown source type', { type: source.type });
        return [];
    }
  }

  /**
   * Scan MCP server
   */
  private async scanMCPServer(source: DiscoverySource): Promise<DiscoveredAgent[]> {
    logger.debug('Scanning MCP server', { endpoint: source.endpoint });

    // In production, this would make actual API calls to MCP server
    // For now, returning mock data
    return [
      {
        external_id: `mcp-${uuidv4()}`,
        name: 'Discovered MCP Agent',
        type: AgentType.SERVICE,
        vendor: Vendor.CUSTOM,
        model: 'mcp-compatible',
        source: source.endpoint,
        metadata: {
          discovered_at: new Date().toISOString(),
          discovery_method: 'mcp_server_scan',
        },
      },
    ];
  }

  /**
   * Scan Zapier workflows
   */
  private async scanZapier(source: DiscoverySource): Promise<DiscoveredAgent[]> {
    logger.debug('Scanning Zapier', { endpoint: source.endpoint });

    // Mock implementation - would call Zapier API
    return [];
  }

  /**
   * Scan Make (Integromat) scenarios
   */
  private async scanMake(source: DiscoverySource): Promise<DiscoveredAgent[]> {
    logger.debug('Scanning Make', { endpoint: source.endpoint });

    // Mock implementation - would call Make API
    return [];
  }

  /**
   * Scan n8n workflows
   */
  private async scanN8n(source: DiscoverySource): Promise<DiscoveredAgent[]> {
    logger.debug('Scanning n8n', { endpoint: source.endpoint });

    // Mock implementation - would call n8n API
    return [];
  }

  /**
   * Scan Airflow DAGs
   */
  private async scanAirflow(source: DiscoverySource): Promise<DiscoveredAgent[]> {
    logger.debug('Scanning Airflow', { endpoint: source.endpoint });

    // Mock implementation - would call Airflow API
    return [];
  }

  /**
   * Scan AWS Lambda functions
   */
  private async scanLambda(source: DiscoverySource): Promise<DiscoveredAgent[]> {
    logger.debug('Scanning Lambda', { endpoint: source.endpoint });

    // Mock implementation - would call AWS Lambda API
    return [];
  }

  /**
   * Register or update agent in registry
   */
  private async registerOrUpdateAgent(discovered: DiscoveredAgent): Promise<void> {
    try {
      const existingAgents = await agentRegistry.query({
        limit: 1000,
      });

      const existing = existingAgents.agents.find(
        a => a.metadata.external_id === discovered.external_id
      );

      if (existing) {
        logger.debug('Agent already registered, updating', { agent_id: existing.id });
        await agentRegistry.update(existing.id, {
          metadata: {
            ...existing.metadata,
            last_discovered: new Date().toISOString(),
          },
        });
      } else {
        logger.info('Registering newly discovered agent', { name: discovered.name });
        await agentRegistry.register({
          name: discovered.name,
          type: discovered.type,
          vendor: discovered.vendor,
          model: discovered.model,
          status: AgentStatus.QUARANTINED, // New discoveries go to quarantine for review
          metadata: {
            external_id: discovered.external_id,
            source: discovered.source,
            discovered_at: new Date().toISOString(),
            discovery_method: 'auto_discovery',
            ...discovered.metadata,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to register/update agent', error as Error, {
        agent_name: discovered.name,
      });
    }
  }

  /**
   * Get discovery statistics
   */
  getStats(): {
    total_discovered: number;
    by_source: Record<string, number>;
    quarantined: number;
  } {
    const bySource: Record<string, number> = {};

    for (const agent of this.discoveredAgents.values()) {
      const sourceType = agent.source.split(':')[0];
      bySource[sourceType] = (bySource[sourceType] || 0) + 1;
    }

    return {
      total_discovered: this.discoveredAgents.size,
      by_source: bySource,
      quarantined: Array.from(this.discoveredAgents.values()).filter(
        a => a.metadata.status === 'quarantined'
      ).length,
    };
  }

  /**
   * Get all discovered agents
   */
  getDiscoveredAgents(): DiscoveredAgent[] {
    return Array.from(this.discoveredAgents.values());
  }
}

/**
 * Singleton instance
 */
export const agentDiscovery = new AgentDiscovery();
