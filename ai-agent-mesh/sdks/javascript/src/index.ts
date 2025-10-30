/**
 * AI-Agent Mesh JavaScript/TypeScript SDK
 * @version 3.0.0
 * @license MIT
 */

import axios, { AxiosInstance } from 'axios';
import EventEmitter from 'eventemitter3';

export interface AgentMeshConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  retryAttempts?: number;
  webhookSecret?: string;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  status: 'active' | 'inactive' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  id: string;
  agentId: string;
  definition: Record<string, any>;
  executionCount: number;
  lastExecuted?: string;
}

export interface Policy {
  id: string;
  name: string;
  framework: string;
  rules: Record<string, any>;
  enforcementMode: 'enforce' | 'monitor';
}

export interface TelemetryEvent {
  id: string;
  agentId: string;
  eventType: string;
  payload: Record<string, any>;
  timestamp: string;
}

/**
 * Main SDK client for AI-Agent Mesh
 */
export class AgentMeshClient extends EventEmitter {
  private api: AxiosInstance;
  private config: AgentMeshConfig;

  constructor(config: AgentMeshConfig) {
    super();
    this.config = {
      baseURL: 'https://api.ai-agent-mesh.com/v3',
      timeout: 30000,
      retryAttempts: 3,
      ...config
    };

    this.api = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'X-SDK-Version': '3.0.0'
      }
    });

    this.setupInterceptors();
  }

  // ============ Agent Management ============

  /**
   * Create a new AI agent
   */
  async createAgent(agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>): Promise<Agent> {
    const { data } = await this.api.post('/agents', agent);
    this.emit('agent:created', data);
    return data;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<Agent> {
    const { data } = await this.api.get(`/agents/${agentId}`);
    return data;
  }

  /**
   * List all agents
   */
  async listAgents(params?: { status?: string; type?: string; limit?: number }): Promise<Agent[]> {
    const { data } = await this.api.get('/agents', { params });
    return data;
  }

  /**
   * Update agent configuration
   */
  async updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent> {
    const { data } = await this.api.patch(`/agents/${agentId}`, updates);
    this.emit('agent:updated', data);
    return data;
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    await this.api.delete(`/agents/${agentId}`);
    this.emit('agent:deleted', { agentId });
  }

  // ============ Workflow Management ============

  /**
   * Create a workflow for an agent
   */
  async createWorkflow(workflow: Omit<Workflow, 'id' | 'executionCount' | 'lastExecuted'>): Promise<Workflow> {
    const { data } = await this.api.post('/workflows', workflow);
    this.emit('workflow:created', data);
    return data;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, input?: Record<string, any>): Promise<any> {
    const { data } = await this.api.post(`/workflows/${workflowId}/execute`, { input });
    this.emit('workflow:executed', data);
    return data;
  }

  /**
   * Get workflow execution history
   */
  async getWorkflowHistory(workflowId: string, limit = 100): Promise<any[]> {
    const { data } = await this.api.get(`/workflows/${workflowId}/history`, { params: { limit } });
    return data;
  }

  // ============ Policy Management ============

  /**
   * Apply a governance policy to an agent
   */
  async applyPolicy(agentId: string, policy: Omit<Policy, 'id'>): Promise<Policy> {
    const { data } = await this.api.post(`/agents/${agentId}/policies`, policy);
    this.emit('policy:applied', data);
    return data;
  }

  /**
   * Get active policies for an agent
   */
  async getPolicies(agentId: string): Promise<Policy[]> {
    const { data } = await this.api.get(`/agents/${agentId}/policies`);
    return data;
  }

  /**
   * Check policy compliance
   */
  async checkCompliance(agentId: string): Promise<any> {
    const { data } = await this.api.post(`/agents/${agentId}/compliance/check`);
    return data;
  }

  // ============ Telemetry & Monitoring ============

  /**
   * Get telemetry events for an agent
   */
  async getTelemetry(agentId: string, params?: { 
    startDate?: string; 
    endDate?: string; 
    eventType?: string 
  }): Promise<TelemetryEvent[]> {
    const { data } = await this.api.get(`/agents/${agentId}/telemetry`, { params });
    return data;
  }

  /**
   * Stream real-time telemetry events
   */
  streamTelemetry(agentId: string, callback: (event: TelemetryEvent) => void): () => void {
    const eventSource = new EventSource(
      `${this.config.baseURL}/agents/${agentId}/telemetry/stream`,
      { 
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` } 
      } as any
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return () => eventSource.close();
  }

  /**
   * Get agent health metrics
   */
  async getHealthMetrics(agentId: string): Promise<any> {
    const { data } = await this.api.get(`/agents/${agentId}/health`);
    return data;
  }

  // ============ Federation & Discovery ============

  /**
   * Discover available agents in the mesh
   */
  async discoverAgents(filters?: { capabilities?: string[]; region?: string }): Promise<Agent[]> {
    const { data } = await this.api.get('/federation/discover', { params: filters });
    return data;
  }

  /**
   * Register agent with federation
   */
  async registerWithFederation(agentId: string, federationConfig: Record<string, any>): Promise<any> {
    const { data } = await this.api.post(`/federation/register/${agentId}`, federationConfig);
    return data;
  }

  // ============ Webhooks ============

  /**
   * Register a webhook for events
   */
  async registerWebhook(webhook: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<any> {
    const { data } = await this.api.post('/webhooks', webhook);
    return data;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }
    
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ============ Account & Usage ============

  /**
   * Get current account usage
   */
  async getUsage(): Promise<any> {
    const { data } = await this.api.get('/account/usage');
    return data;
  }

  /**
   * Get account limits
   */
  async getLimits(): Promise<any> {
    const { data } = await this.api.get('/account/limits');
    return data;
  }

  // ============ Marketplace ============

  /**
   * Browse governance policy marketplace
   */
  async browseMarketplace(params?: { category?: string; framework?: string }): Promise<any[]> {
    const { data } = await this.api.get('/marketplace/policies', { params });
    return data;
  }

  /**
   * Install a policy from marketplace
   */
  async installPolicy(policyId: string, agentId: string): Promise<Policy> {
    const { data } = await this.api.post(`/marketplace/policies/${policyId}/install`, { agentId });
    return data;
  }

  // ============ Private Methods ============

  private setupInterceptors(): void {
    // Retry logic
    this.api.interceptors.response.use(
      response => response,
      async error => {
        const config = error.config;
        
        if (!config || !config.retryCount) {
          config.retryCount = 0;
        }

        if (config.retryCount < this.config.retryAttempts! && this.isRetryableError(error)) {
          config.retryCount++;
          await this.delay(1000 * config.retryCount);
          return this.api(config);
        }

        this.emit('error', error);
        return Promise.reject(error);
      }
    );
  }

  private isRetryableError(error: any): boolean {
    return error.code === 'ECONNABORTED' || 
           (error.response && error.response.status >= 500);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Helper function to initialize the SDK
 */
export function createClient(config: AgentMeshConfig): AgentMeshClient {
  return new AgentMeshClient(config);
}

export default AgentMeshClient;
