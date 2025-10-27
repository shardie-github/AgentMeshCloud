/**
 * Federated Gateway Service for AgentMesh Cloud Ecosystem
 * Handles third-party agent integration with tenant-scoped tokens
 */

import { logger } from '@/utils/logger';
import { config } from '@/config';
import { createClient } from '@supabase/supabase-js';
import {
  FederatedAgent,
  TenantToken,
  FederatedRequest,
  FederatedResponse,
  GatewayStatus,
  GatewayStatistics,
  GatewayHealth,
  AgentFilters,
  TokenConfig,
  FederatedGatewayService,
  AgentStatus,
  HealthStatus,
  RequestPriority,
  ResponseUsage,
  ResponseMetadata
} from '@agentmesh/shared';

export class FederatedGatewayService implements FederatedGatewayService {
  private supabase: any;
  private isInitialized = false;
  private agents: Map<string, FederatedAgent> = new Map();
  private tokens: Map<string, TenantToken> = new Map();
  private statistics: GatewayStatistics;
  private health: GatewayHealth;

  constructor() {
    this.statistics = this.getInitialStatistics();
    this.health = this.getInitialHealth();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.info('Initializing Federated Gateway Service...');
      
      // Initialize Supabase client
      this.supabase = createClient(
        config.supabase.url,
        config.supabase.serviceKey
      );

      // Initialize gateway components
      await this.initializeGateway();
      
      // Create database tables if they don't exist
      await this.createTables();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Start statistics collection
      this.startStatisticsCollection();
      
      this.isInitialized = true;
      logger.info('Federated Gateway Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Federated Gateway Service:', error);
      throw error;
    }
  }

  private async initializeGateway(): Promise<void> {
    // Initialize gateway components
    logger.info('Gateway components initialized');
  }

  private async createTables(): Promise<void> {
    try {
      // Create federated_agents table
      const { error: agentsError } = await this.supabase.rpc('create_federated_agents_table');
      if (agentsError) {
        logger.warn('Federated agents table creation failed:', agentsError);
      }

      // Create tenant_tokens table
      const { error: tokensError } = await this.supabase.rpc('create_tenant_tokens_table');
      if (tokensError) {
        logger.warn('Tenant tokens table creation failed:', tokensError);
      }

      // Create federated_requests table
      const { error: requestsError } = await this.supabase.rpc('create_federated_requests_table');
      if (requestsError) {
        logger.warn('Federated requests table creation failed:', requestsError);
      }

      logger.info('Federated gateway tables created/verified');
    } catch (error) {
      logger.error('Failed to create federated gateway tables:', error);
      throw error;
    }
  }

  private getInitialStatistics(): GatewayStatistics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      averageCost: 0,
      totalCost: 0,
      activeAgents: 0,
      activeTenants: 0,
      cacheHitRate: 0,
      errorRate: 0,
      lastUpdated: new Date()
    };
  }

  private getInitialHealth(): GatewayHealth {
    return {
      status: 'healthy',
      uptime: 100,
      responseTime: 0,
      errorRate: 0,
      lastChecked: new Date(),
      components: []
    };
  }

  async registerAgent(agent: Omit<FederatedAgent, 'id' | 'createdAt' | 'updatedAt'>): Promise<FederatedAgent> {
    try {
      const id = this.generateId();
      const now = new Date();
      
      const federatedAgent: FederatedAgent = {
        ...agent,
        id,
        createdAt: now,
        updatedAt: now
      };

      // Store in memory
      this.agents.set(id, federatedAgent);

      // Store in database
      await this.storeAgentInDatabase(federatedAgent);

      // Update statistics
      this.statistics.activeAgents = this.agents.size;
      this.statistics.lastUpdated = new Date();

      logger.info('Registered federated agent', {
        agentId: id,
        name: agent.name,
        provider: agent.provider.name
      });

      return federatedAgent;
    } catch (error) {
      logger.error('Failed to register federated agent:', error);
      throw error;
    }
  }

  async getAgent(id: string): Promise<FederatedAgent | null> {
    try {
      // Check memory first
      let agent = this.agents.get(id);
      if (agent) {
        return agent;
      }

      // Load from database
      agent = await this.loadAgentFromDatabase(id);
      if (agent) {
        this.agents.set(id, agent);
      }

      return agent;
    } catch (error) {
      logger.error(`Failed to get federated agent ${id}:`, error);
      throw error;
    }
  }

  async updateAgent(id: string, updates: Partial<FederatedAgent>): Promise<FederatedAgent> {
    try {
      const existingAgent = await this.getAgent(id);
      if (!existingAgent) {
        throw new Error(`Agent ${id} not found`);
      }

      const updatedAgent: FederatedAgent = {
        ...existingAgent,
        ...updates,
        id,
        updatedAt: new Date()
      };

      // Update in memory
      this.agents.set(id, updatedAgent);

      // Update in database
      await this.updateAgentInDatabase(updatedAgent);

      logger.info('Updated federated agent', {
        agentId: id,
        name: updatedAgent.name
      });

      return updatedAgent;
    } catch (error) {
      logger.error(`Failed to update federated agent ${id}:`, error);
      throw error;
    }
  }

  async deleteAgent(id: string): Promise<void> {
    try {
      // Remove from memory
      this.agents.delete(id);

      // Remove from database
      await this.deleteAgentFromDatabase(id);

      // Update statistics
      this.statistics.activeAgents = this.agents.size;
      this.statistics.lastUpdated = new Date();

      logger.info('Deleted federated agent', { agentId: id });
    } catch (error) {
      logger.error(`Failed to delete federated agent ${id}:`, error);
      throw error;
    }
  }

  async listAgents(filters?: AgentFilters): Promise<FederatedAgent[]> {
    try {
      let agents = Array.from(this.agents.values());

      if (filters) {
        agents = this.applyAgentFilters(agents, filters);
      }

      return agents;
    } catch (error) {
      logger.error('Failed to list federated agents:', error);
      throw error;
    }
  }

  private applyAgentFilters(agents: FederatedAgent[], filters: AgentFilters): FederatedAgent[] {
    return agents.filter(agent => {
      if (filters.status && !filters.status.includes(agent.status)) {
        return false;
      }

      if (filters.capabilities) {
        const agentCapabilities = agent.capabilities.map(c => c.type);
        if (!filters.capabilities.some(cap => agentCapabilities.includes(cap))) {
          return false;
        }
      }

      if (filters.providers && !filters.providers.includes(agent.provider.id)) {
        return false;
      }

      if (filters.verified && !agent.provider.verified) {
        return false;
      }

      if (filters.certified && !agent.provider.certified) {
        return false;
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        const searchableText = [
          agent.name,
          agent.description,
          agent.provider.name,
          ...agent.capabilities.map(c => c.name),
          ...agent.metadata.tags
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }

  async createTenantToken(tenantId: string, agentId: string, config: TokenConfig): Promise<TenantToken> {
    try {
      const id = this.generateId();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + config.expiresIn * 1000);
      
      const token: TenantToken = {
        id,
        tenantId,
        agentId,
        token: this.generateToken(),
        scopes: config.scopes,
        permissions: config.permissions,
        expiresAt,
        createdAt: now,
        usage: {
          requests: 0,
          tokens: 0,
          cost: 0,
          lastReset: now,
          limits: {
            requestsPerMinute: 100,
            requestsPerHour: 1000,
            requestsPerDay: 10000,
            tokensPerMinute: 10000,
            tokensPerHour: 100000,
            tokensPerDay: 1000000,
            costPerDay: 100,
            costPerMonth: 1000
          }
        },
        metadata: config.metadata
      };

      // Store in memory
      this.tokens.set(id, token);

      // Store in database
      await this.storeTokenInDatabase(token);

      logger.info('Created tenant token', {
        tokenId: id,
        tenantId,
        agentId,
        expiresAt
      });

      return token;
    } catch (error) {
      logger.error('Failed to create tenant token:', error);
      throw error;
    }
  }

  async validateToken(token: string): Promise<TenantToken | null> {
    try {
      // Check memory first
      for (const tenantToken of this.tokens.values()) {
        if (tenantToken.token === token) {
          // Check expiration
          if (tenantToken.expiresAt < new Date()) {
            logger.warn('Token expired', { tokenId: tenantToken.id });
            return null;
          }

          // Update last used
          tenantToken.lastUsedAt = new Date();
          await this.updateTokenInDatabase(tenantToken);

          return tenantToken;
        }
      }

      // Load from database
      const tenantToken = await this.loadTokenFromDatabase(token);
      if (tenantToken) {
        this.tokens.set(tenantToken.id, tenantToken);
        return tenantToken;
      }

      return null;
    } catch (error) {
      logger.error('Failed to validate token:', error);
      throw error;
    }
  }

  async revokeToken(tokenId: string): Promise<void> {
    try {
      // Remove from memory
      this.tokens.delete(tokenId);

      // Remove from database
      await this.deleteTokenFromDatabase(tokenId);

      logger.info('Revoked tenant token', { tokenId });
    } catch (error) {
      logger.error(`Failed to revoke token ${tokenId}:`, error);
      throw error;
    }
  }

  async makeRequest(request: FederatedRequest): Promise<FederatedResponse> {
    const startTime = Date.now();
    
    try {
      // Validate token
      const token = await this.validateToken(request.headers['authorization']?.replace('Bearer ', '') || '');
      if (!token) {
        throw new Error('Invalid or expired token');
      }

      // Get agent
      const agent = await this.getAgent(request.agentId);
      if (!agent) {
        throw new Error(`Agent ${request.agentId} not found`);
      }

      // Check rate limits
      await this.checkRateLimits(token, request);

      // Find appropriate endpoint
      const endpoint = agent.endpoints.find(ep => ep.name === request.endpoint);
      if (!endpoint) {
        throw new Error(`Endpoint ${request.endpoint} not found`);
      }

      // Make the actual request
      const response = await this.executeRequest(agent, endpoint, request);

      // Update usage statistics
      await this.updateUsageStatistics(token, response);

      // Update gateway statistics
      this.updateGatewayStatistics(response, Date.now() - startTime);

      logger.info('Federated request completed', {
        requestId: request.id,
        agentId: request.agentId,
        statusCode: response.statusCode,
        latency: response.latency
      });

      return response;
    } catch (error) {
      logger.error(`Failed to make federated request ${request.id}:`, error);
      
      // Update error statistics
      this.statistics.failedRequests++;
      this.statistics.errorRate = this.statistics.failedRequests / this.statistics.totalRequests;
      this.statistics.lastUpdated = new Date();

      throw error;
    }
  }

  private async checkRateLimits(token: TenantToken, request: FederatedRequest): Promise<void> {
    const now = new Date();
    const usage = token.usage;
    const limits = usage.limits;

    // Check per-minute limits
    if (usage.requests >= limits.requestsPerMinute) {
      throw new Error('Rate limit exceeded: requests per minute');
    }

    // Check per-hour limits
    if (usage.requests >= limits.requestsPerHour) {
      throw new Error('Rate limit exceeded: requests per hour');
    }

    // Check per-day limits
    if (usage.requests >= limits.requestsPerDay) {
      throw new Error('Rate limit exceeded: requests per day');
    }

    // Check cost limits
    if (usage.cost >= limits.costPerDay) {
      throw new Error('Rate limit exceeded: daily cost limit');
    }
  }

  private async executeRequest(agent: FederatedAgent, endpoint: any, request: FederatedRequest): Promise<FederatedResponse> {
    // Simulate request execution
    const startTime = Date.now();
    
    try {
      // In a real implementation, this would make an actual HTTP request
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 500));
      
      const latency = Date.now() - startTime;
      const cost = this.calculateCost(agent, request);
      
      const response: FederatedResponse = {
        id: this.generateId(),
        requestId: request.id,
        statusCode: 200,
        headers: {
          'content-type': 'application/json',
          'x-agent-version': agent.version,
          'x-provider': agent.provider.name
        },
        body: {
          success: true,
          result: `Response from ${agent.name}`,
          data: request.body
        },
        latency,
        cost,
        usage: {
          tokens: Math.floor(Math.random() * 1000),
          requests: 1,
          cost,
          duration: latency
        },
        metadata: {
          agentVersion: agent.version,
          providerName: agent.provider.name,
          region: 'us-east-1',
          cacheHit: false,
          retryCount: 0
        },
        timestamp: new Date()
      };

      return response;
    } catch (error) {
      throw new Error(`Request execution failed: ${error.message}`);
    }
  }

  private calculateCost(agent: FederatedAgent, request: FederatedRequest): number {
    // Simple cost calculation based on agent pricing
    const baseCost = 0.01;
    const tokenCost = 0.0001;
    const estimatedTokens = JSON.stringify(request.body).length / 4;
    
    return baseCost + (estimatedTokens * tokenCost);
  }

  private async updateUsageStatistics(token: TenantToken, response: FederatedResponse): Promise<void> {
    token.usage.requests++;
    token.usage.tokens += response.usage.tokens;
    token.usage.cost += response.usage.cost;
    token.lastUsedAt = new Date();

    // Update in database
    await this.updateTokenInDatabase(token);
  }

  private updateGatewayStatistics(response: FederatedResponse, latency: number): void {
    this.statistics.totalRequests++;
    this.statistics.successfulRequests++;
    this.statistics.averageLatency = (this.statistics.averageLatency * (this.statistics.totalRequests - 1) + latency) / this.statistics.totalRequests;
    this.statistics.averageCost = (this.statistics.averageCost * (this.statistics.totalRequests - 1) + response.cost) / this.statistics.totalRequests;
    this.statistics.totalCost += response.cost;
    this.statistics.lastUpdated = new Date();
  }

  async getGatewayStatus(): Promise<GatewayStatus> {
    return this.health.status;
  }

  async getGatewayStatistics(): Promise<GatewayStatistics> {
    return { ...this.statistics };
  }

  async getGatewayHealth(): Promise<GatewayHealth> {
    return { ...this.health };
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      await this.checkGatewayHealth();
    }, 30000); // Check every 30 seconds
  }

  private startStatisticsCollection(): void {
    setInterval(() => {
      this.collectStatistics();
    }, 60000); // Collect every minute
  }

  private async checkGatewayHealth(): Promise<void> {
    try {
      // Check agent health
      let healthyAgents = 0;
      let totalResponseTime = 0;
      let errorCount = 0;

      for (const agent of this.agents.values()) {
        try {
          const startTime = Date.now();
          // Simulate health check
          await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
          const responseTime = Date.now() - startTime;
          
          totalResponseTime += responseTime;
          healthyAgents++;
        } catch (error) {
          errorCount++;
        }
      }

      const averageResponseTime = healthyAgents > 0 ? totalResponseTime / healthyAgents : 0;
      const errorRate = this.agents.size > 0 ? errorCount / this.agents.size : 0;

      this.health.responseTime = averageResponseTime;
      this.health.errorRate = errorRate;
      this.health.lastChecked = new Date();

      if (errorRate > 0.5) {
        this.health.status = 'unhealthy';
      } else if (errorRate > 0.1) {
        this.health.status = 'degraded';
      } else {
        this.health.status = 'healthy';
      }

    } catch (error) {
      logger.error('Health check failed:', error);
      this.health.status = 'unhealthy';
    }
  }

  private collectStatistics(): void {
    // Update active agents count
    this.statistics.activeAgents = this.agents.size;
    
    // Update active tenants count
    const uniqueTenants = new Set(Array.from(this.tokens.values()).map(t => t.tenantId));
    this.statistics.activeTenants = uniqueTenants.size;
    
    this.statistics.lastUpdated = new Date();
  }

  // Database helper methods
  private async storeAgentInDatabase(agent: FederatedAgent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('federated_agents')
        .insert({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          version: agent.version,
          provider: agent.provider,
          capabilities: agent.capabilities,
          endpoints: agent.endpoints,
          authentication: agent.authentication,
          pricing: agent.pricing,
          status: agent.status,
          health: agent.health,
          metadata: agent.metadata,
          created_at: agent.createdAt,
          updated_at: agent.updatedAt,
          last_seen_at: agent.lastSeenAt
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to store agent in database:', error);
      throw error;
    }
  }

  private async loadAgentFromDatabase(id: string): Promise<FederatedAgent | null> {
    try {
      const { data, error } = await this.supabase
        .from('federated_agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        version: data.version,
        provider: data.provider,
        capabilities: data.capabilities,
        endpoints: data.endpoints,
        authentication: data.authentication,
        pricing: data.pricing,
        status: data.status,
        health: data.health,
        metadata: data.metadata,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        lastSeenAt: data.last_seen_at ? new Date(data.last_seen_at) : undefined
      };
    } catch (error) {
      logger.error(`Failed to load agent ${id} from database:`, error);
      throw error;
    }
  }

  private async updateAgentInDatabase(agent: FederatedAgent): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('federated_agents')
        .update({
          name: agent.name,
          description: agent.description,
          version: agent.version,
          provider: agent.provider,
          capabilities: agent.capabilities,
          endpoints: agent.endpoints,
          authentication: agent.authentication,
          pricing: agent.pricing,
          status: agent.status,
          health: agent.health,
          metadata: agent.metadata,
          updated_at: agent.updatedAt,
          last_seen_at: agent.lastSeenAt
        })
        .eq('id', agent.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to update agent ${agent.id} in database:`, error);
      throw error;
    }
  }

  private async deleteAgentFromDatabase(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('federated_agents')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to delete agent ${id} from database:`, error);
      throw error;
    }
  }

  private async storeTokenInDatabase(token: TenantToken): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tenant_tokens')
        .insert({
          id: token.id,
          tenant_id: token.tenantId,
          agent_id: token.agentId,
          token: token.token,
          scopes: token.scopes,
          permissions: token.permissions,
          expires_at: token.expiresAt,
          created_at: token.createdAt,
          last_used_at: token.lastUsedAt,
          usage: token.usage,
          metadata: token.metadata
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Failed to store token in database:', error);
      throw error;
    }
  }

  private async loadTokenFromDatabase(token: string): Promise<TenantToken | null> {
    try {
      const { data, error } = await this.supabase
        .from('tenant_tokens')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return {
        id: data.id,
        tenantId: data.tenant_id,
        agentId: data.agent_id,
        token: data.token,
        scopes: data.scopes,
        permissions: data.permissions,
        expiresAt: new Date(data.expires_at),
        createdAt: new Date(data.created_at),
        lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
        usage: data.usage,
        metadata: data.metadata
      };
    } catch (error) {
      logger.error('Failed to load token from database:', error);
      throw error;
    }
  }

  private async updateTokenInDatabase(token: TenantToken): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tenant_tokens')
        .update({
          scopes: token.scopes,
          permissions: token.permissions,
          last_used_at: token.lastUsedAt,
          usage: token.usage,
          metadata: token.metadata
        })
        .eq('id', token.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to update token ${token.id} in database:`, error);
      throw error;
    }
  }

  private async deleteTokenFromDatabase(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tenant_tokens')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error(`Failed to delete token ${id} from database:`, error);
      throw error;
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateToken(): string {
    return Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64');
  }

  async cleanup(): Promise<void> {
    this.agents.clear();
    this.tokens.clear();
    this.isInitialized = false;
    logger.info('Federated Gateway Service cleaned up');
  }
}