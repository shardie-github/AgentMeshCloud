/**
 * Agent Registry - ORCA Core
 * Maintains registry of MCP and non-MCP agents with metadata
 */

import { createLogger } from '@/common/logger';
import {
  Agent,
  AgentStatus,
  AgentType,
  MeshEvent,
  EventType,
  AdapterType,
} from '@/common/types';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  DatabaseError,
} from '@/common/errors';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

const logger = createLogger('agent-registry');

export interface AgentQuery {
  status?: AgentStatus;
  type?: AgentType;
  vendor?: string;
  compliance_tier?: string;
  limit?: number;
  offset?: number;
}

export interface AgentUpdate {
  name?: string;
  status?: AgentStatus;
  compliance_tier?: string;
  policies?: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Agent Registry Service
 * Manages agent lifecycle and metadata
 */
export class AgentRegistry extends EventEmitter {
  private agents: Map<string, Agent>;
  private indexByType: Map<AgentType, Set<string>>;
  private indexByStatus: Map<AgentStatus, Set<string>>;

  constructor() {
    super();
    this.agents = new Map();
    this.indexByType = new Map();
    this.indexByStatus = new Map();
    
    // Initialize indexes
    Object.values(AgentType).forEach(type => {
      this.indexByType.set(type as AgentType, new Set());
    });
    Object.values(AgentStatus).forEach(status => {
      this.indexByStatus.set(status as AgentStatus, new Set());
    });
  }

  /**
   * Register a new agent
   */
  async register(agentData: Partial<Agent>): Promise<Agent> {
    logger.info('Registering new agent', { name: agentData.name });

    // Validation
    if (!agentData.name || !agentData.type || !agentData.vendor || !agentData.model) {
      throw new ValidationError('Missing required fields: name, type, vendor, model');
    }

    // Check for duplicate ID
    if (agentData.id && this.agents.has(agentData.id)) {
      throw new ConflictError(`Agent with id '${agentData.id}' already exists`);
    }

    const now = new Date();
    const agent: Agent = {
      id: agentData.id || `agent-${uuidv4()}`,
      name: agentData.name,
      type: agentData.type,
      vendor: agentData.vendor,
      model: agentData.model,
      status: agentData.status || AgentStatus.ACTIVE,
      compliance_tier: agentData.compliance_tier || 'standard',
      mcp_config: agentData.mcp_config,
      policies: agentData.policies || [],
      context_sources: agentData.context_sources || [],
      owners: agentData.owners || [],
      observability: agentData.observability,
      deployment: agentData.deployment,
      metadata: agentData.metadata || {},
      created_at: now,
      updated_at: now,
    };

    // Store agent
    this.agents.set(agent.id, agent);
    this.updateIndexes(agent);

    // Emit event
    this.emitEvent({
      event_id: uuidv4(),
      event_type: EventType.AGENT_REGISTERED,
      source: {
        adapter: AdapterType.INTERNAL,
        agent_id: agent.id,
      },
      timestamp: now,
      version: '1.0.0',
      data: { agent },
    });

    logger.info('Agent registered successfully', { agent_id: agent.id });
    return agent;
  }

  /**
   * Get agent by ID
   */
  async getById(agentId: string): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new NotFoundError('Agent', agentId);
    }
    return agent;
  }

  /**
   * Query agents with filters
   */
  async query(query: AgentQuery = {}): Promise<{ agents: Agent[]; total: number }> {
    let results = Array.from(this.agents.values());

    // Apply filters
    if (query.status) {
      results = results.filter(a => a.status === query.status);
    }
    if (query.type) {
      results = results.filter(a => a.type === query.type);
    }
    if (query.vendor) {
      results = results.filter(a => a.vendor === query.vendor);
    }
    if (query.compliance_tier) {
      results = results.filter(a => a.compliance_tier === query.compliance_tier);
    }

    const total = results.length;

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    results = results.slice(offset, offset + limit);

    return { agents: results, total };
  }

  /**
   * Update an agent
   */
  async update(agentId: string, update: AgentUpdate): Promise<Agent> {
    const agent = await this.getById(agentId);

    logger.info('Updating agent', { agent_id: agentId, update });

    // Remove from old indexes if status/type changing
    if (update.status && update.status !== agent.status) {
      this.indexByStatus.get(agent.status)?.delete(agentId);
    }

    // Apply updates
    const updated: Agent = {
      ...agent,
      ...(update.name && { name: update.name }),
      ...(update.status && { status: update.status }),
      ...(update.compliance_tier && { compliance_tier: update.compliance_tier }),
      ...(update.policies && { policies: update.policies }),
      ...(update.metadata && { metadata: { ...agent.metadata, ...update.metadata } }),
      updated_at: new Date(),
    };

    this.agents.set(agentId, updated);
    this.updateIndexes(updated);

    // Emit event
    this.emitEvent({
      event_id: uuidv4(),
      event_type: EventType.AGENT_UPDATED,
      source: {
        adapter: AdapterType.INTERNAL,
        agent_id: agentId,
      },
      timestamp: new Date(),
      version: '1.0.0',
      data: { agent: updated, changes: update },
    });

    logger.info('Agent updated successfully', { agent_id: agentId });
    return updated;
  }

  /**
   * Suspend an agent
   */
  async suspend(agentId: string, reason: string): Promise<Agent> {
    logger.warn('Suspending agent', { agent_id: agentId, reason });

    const updated = await this.update(agentId, {
      status: AgentStatus.SUSPENDED,
      metadata: { suspension_reason: reason, suspended_at: new Date().toISOString() },
    });

    this.emitEvent({
      event_id: uuidv4(),
      event_type: EventType.AGENT_SUSPENDED,
      source: {
        adapter: AdapterType.INTERNAL,
        agent_id: agentId,
      },
      timestamp: new Date(),
      version: '1.0.0',
      data: { agent: updated, reason },
    });

    return updated;
  }

  /**
   * Delete an agent
   */
  async delete(agentId: string): Promise<void> {
    const agent = await this.getById(agentId);

    logger.info('Deleting agent', { agent_id: agentId });

    this.agents.delete(agentId);
    this.removeFromIndexes(agent);

    this.emitEvent({
      event_id: uuidv4(),
      event_type: EventType.AGENT_DELETED,
      source: {
        adapter: AdapterType.INTERNAL,
        agent_id: agentId,
      },
      timestamp: new Date(),
      version: '1.0.0',
      data: { agent_id: agentId },
    });

    logger.info('Agent deleted successfully', { agent_id: agentId });
  }

  /**
   * Get agents by status
   */
  async getByStatus(status: AgentStatus): Promise<Agent[]> {
    const ids = this.indexByStatus.get(status) || new Set();
    return Array.from(ids).map(id => this.agents.get(id)!).filter(Boolean);
  }

  /**
   * Get agents by type
   */
  async getByType(type: AgentType): Promise<Agent[]> {
    const ids = this.indexByType.get(type) || new Set();
    return Array.from(ids).map(id => this.agents.get(id)!).filter(Boolean);
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  }> {
    return {
      total: this.agents.size,
      by_status: Object.fromEntries(
        Array.from(this.indexByStatus.entries()).map(([status, ids]) => [status, ids.size])
      ),
      by_type: Object.fromEntries(
        Array.from(this.indexByType.entries()).map(([type, ids]) => [type, ids.size])
      ),
    };
  }

  /**
   * Check if agent exists
   */
  async exists(agentId: string): Promise<boolean> {
    return this.agents.has(agentId);
  }

  /**
   * Load agents from configuration file
   */
  async loadFromConfig(config: { agents: Partial<Agent>[] }): Promise<void> {
    logger.info('Loading agents from configuration', { count: config.agents.length });

    for (const agentData of config.agents) {
      try {
        // Check if agent already exists
        if (agentData.id && this.agents.has(agentData.id)) {
          logger.debug('Agent already exists, skipping', { agent_id: agentData.id });
          continue;
        }

        await this.register(agentData);
      } catch (error) {
        logger.error('Failed to register agent from config', error as Error, {
          agent_name: agentData.name,
        });
      }
    }

    logger.info('Finished loading agents from configuration');
  }

  /**
   * Update indexes for an agent
   */
  private updateIndexes(agent: Agent): void {
    this.indexByType.get(agent.type)?.add(agent.id);
    this.indexByStatus.get(agent.status)?.add(agent.id);
  }

  /**
   * Remove agent from indexes
   */
  private removeFromIndexes(agent: Agent): void {
    this.indexByType.get(agent.type)?.delete(agent.id);
    this.indexByStatus.get(agent.status)?.delete(agent.id);
  }

  /**
   * Emit a mesh event
   */
  private emitEvent(event: MeshEvent): void {
    this.emit('event', event);
  }

  /**
   * Clear all agents (for testing)
   */
  async clear(): Promise<void> {
    this.agents.clear();
    this.indexByType.forEach(set => set.clear());
    this.indexByStatus.forEach(set => set.clear());
    logger.warn('Agent registry cleared');
  }
}

/**
 * Singleton instance
 */
export const agentRegistry = new AgentRegistry();
