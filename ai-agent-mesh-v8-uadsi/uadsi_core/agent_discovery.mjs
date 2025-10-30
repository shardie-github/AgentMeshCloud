#!/usr/bin/env node
/**
 * UADSI Agent Discovery Module
 * Scans MCP + non-MCP workflows across the mesh
 * Identifies agent instances, capabilities, and health status
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';

export class AgentDiscovery extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      scanInterval: config.scanInterval || 30000, // 30s default
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_KEY,
      mcpRegistryPath: config.mcpRegistryPath || '/mcp_registry.yaml',
      ...config
    };
    
    this.db = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    this.agents = new Map();
    this.workflows = new Map();
    this.scanTimer = null;
  }

  /**
   * Initialize discovery service
   */
  async initialize() {
    console.log('🔍 Initializing UADSI Agent Discovery...');
    
    // Ensure database schema exists
    await this.ensureSchema();
    
    // Start periodic scanning
    await this.scan();
    this.scanTimer = setInterval(() => this.scan(), this.config.scanInterval);
    
    this.emit('initialized');
    console.log('✅ Agent Discovery initialized');
  }

  /**
   * Ensure database schema for agent tracking
   */
  async ensureSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS uadsi_agents (
        agent_id TEXT PRIMARY KEY,
        agent_name TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        capabilities JSONB,
        health_status TEXT,
        last_heartbeat TIMESTAMPTZ,
        trust_score DECIMAL(5,2),
        metadata JSONB,
        discovered_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uadsi_workflows (
        workflow_id TEXT PRIMARY KEY,
        workflow_name TEXT NOT NULL,
        agent_ids TEXT[],
        status TEXT,
        execution_count INTEGER DEFAULT 0,
        last_execution TIMESTAMPTZ,
        avg_duration_ms INTEGER,
        success_rate DECIMAL(5,2),
        metadata JSONB,
        discovered_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_agents_health ON uadsi_agents(health_status);
      CREATE INDEX IF NOT EXISTS idx_agents_trust ON uadsi_agents(trust_score);
      CREATE INDEX IF NOT EXISTS idx_workflows_status ON uadsi_workflows(status);
    `;

    try {
      await this.db.rpc('exec_sql', { sql: schema });
    } catch (error) {
      // Schema likely exists, continue
      console.log('Schema check:', error.message);
    }
  }

  /**
   * Scan for agents across all registered sources
   */
  async scan() {
    console.log('🔎 Scanning for agents and workflows...');
    
    try {
      // Scan MCP-registered agents
      const mcpAgents = await this.scanMCPAgents();
      
      // Scan active workflow executions
      const workflows = await this.scanWorkflows();
      
      // Scan service mesh endpoints
      const meshAgents = await this.scanServiceMesh();
      
      // Scan telemetry sources
      const telemetryAgents = await this.scanTelemetry();
      
      // Merge and deduplicate
      const allAgents = [...mcpAgents, ...meshAgents, ...telemetryAgents];
      await this.updateAgentRegistry(allAgents);
      await this.updateWorkflowRegistry(workflows);
      
      this.emit('scan:complete', {
        agentCount: allAgents.length,
        workflowCount: workflows.length,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Discovered ${allAgents.length} agents, ${workflows.length} workflows`);
      
      return { agents: allAgents, workflows };
    } catch (error) {
      console.error('❌ Scan error:', error);
      this.emit('scan:error', error);
      throw error;
    }
  }

  /**
   * Scan MCP registry for registered agents
   */
  async scanMCPAgents() {
    const { data, error } = await this.db
      .from('mcp_agents')
      .select('*');
    
    if (error) {
      console.warn('MCP scan error:', error.message);
      return [];
    }

    return (data || []).map(agent => ({
      agent_id: agent.id,
      agent_name: agent.name,
      agent_type: 'MCP',
      capabilities: agent.capabilities || {},
      health_status: agent.status || 'unknown',
      last_heartbeat: agent.last_heartbeat,
      trust_score: null, // Calculated by trust_scoring module
      metadata: {
        source: 'mcp_registry',
        version: agent.version,
        endpoint: agent.endpoint
      }
    }));
  }

  /**
   * Scan active workflows
   */
  async scanWorkflows() {
    const { data, error } = await this.db
      .from('workflow_executions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    if (error) {
      console.warn('Workflow scan error:', error.message);
      return [];
    }

    // Group by workflow_id and aggregate
    const workflowMap = new Map();
    
    for (const exec of data || []) {
      const wfId = exec.workflow_id;
      if (!workflowMap.has(wfId)) {
        workflowMap.set(wfId, {
          workflow_id: wfId,
          workflow_name: exec.workflow_name,
          agent_ids: new Set(),
          executions: []
        });
      }
      
      const wf = workflowMap.get(wfId);
      if (exec.agent_ids) {
        exec.agent_ids.forEach(id => wf.agent_ids.add(id));
      }
      wf.executions.push(exec);
    }

    return Array.from(workflowMap.values()).map(wf => ({
      workflow_id: wf.workflow_id,
      workflow_name: wf.workflow_name,
      agent_ids: Array.from(wf.agent_ids),
      status: this.calculateWorkflowStatus(wf.executions),
      execution_count: wf.executions.length,
      last_execution: wf.executions[0]?.created_at,
      avg_duration_ms: this.calculateAvgDuration(wf.executions),
      success_rate: this.calculateSuccessRate(wf.executions),
      metadata: {
        source: 'workflow_tracker'
      }
    }));
  }

  /**
   * Scan service mesh for agent endpoints
   */
  async scanServiceMesh() {
    // Discover agents via service discovery / Kubernetes / Docker
    // This would integrate with actual service mesh (Istio, Linkerd, etc.)
    
    const { data, error } = await this.db
      .from('service_registry')
      .select('*')
      .eq('type', 'agent');
    
    if (error) {
      console.warn('Service mesh scan error:', error.message);
      return [];
    }

    return (data || []).map(service => ({
      agent_id: service.service_id,
      agent_name: service.service_name,
      agent_type: 'SERVICE',
      capabilities: service.metadata?.capabilities || {},
      health_status: service.health_status || 'unknown',
      last_heartbeat: service.last_seen,
      trust_score: null,
      metadata: {
        source: 'service_mesh',
        endpoint: service.endpoint,
        namespace: service.namespace
      }
    }));
  }

  /**
   * Scan OpenTelemetry data for agent activity
   */
  async scanTelemetry() {
    // Query telemetry backend for active agents
    const { data, error } = await this.db
      .from('otel_traces')
      .select('service_name, attributes')
      .order('timestamp', { ascending: false })
      .limit(5000);
    
    if (error) {
      console.warn('Telemetry scan error:', error.message);
      return [];
    }

    // Extract unique agents from telemetry
    const agentMap = new Map();
    
    for (const trace of data || []) {
      if (trace.attributes?.agent_id) {
        const agentId = trace.attributes.agent_id;
        if (!agentMap.has(agentId)) {
          agentMap.set(agentId, {
            agent_id: agentId,
            agent_name: trace.service_name,
            agent_type: 'TELEMETRY',
            capabilities: {},
            health_status: 'active',
            last_heartbeat: new Date(),
            trust_score: null,
            metadata: {
              source: 'otel',
              attributes: trace.attributes
            }
          });
        }
      }
    }

    return Array.from(agentMap.values());
  }

  /**
   * Update agent registry in database
   */
  async updateAgentRegistry(agents) {
    for (const agent of agents) {
      this.agents.set(agent.agent_id, agent);
      
      const { error } = await this.db
        .from('uadsi_agents')
        .upsert({
          ...agent,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'agent_id' 
        });
      
      if (error) {
        console.error(`Failed to update agent ${agent.agent_id}:`, error);
      }
    }
  }

  /**
   * Update workflow registry in database
   */
  async updateWorkflowRegistry(workflows) {
    for (const workflow of workflows) {
      this.workflows.set(workflow.workflow_id, workflow);
      
      const { error } = await this.db
        .from('uadsi_workflows')
        .upsert({
          ...workflow,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'workflow_id' 
        });
      
      if (error) {
        console.error(`Failed to update workflow ${workflow.workflow_id}:`, error);
      }
    }
  }

  /**
   * Calculate workflow status based on recent executions
   */
  calculateWorkflowStatus(executions) {
    if (!executions.length) return 'inactive';
    
    const recent = executions.slice(0, 10);
    const failures = recent.filter(e => e.status === 'failed').length;
    
    if (failures > 5) return 'degraded';
    if (failures > 2) return 'warning';
    return 'healthy';
  }

  /**
   * Calculate average execution duration
   */
  calculateAvgDuration(executions) {
    if (!executions.length) return 0;
    
    const durations = executions
      .map(e => e.duration_ms)
      .filter(d => d != null);
    
    if (!durations.length) return 0;
    
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }

  /**
   * Calculate success rate
   */
  calculateSuccessRate(executions) {
    if (!executions.length) return 0;
    
    const successful = executions.filter(e => e.status === 'success').length;
    return (successful / executions.length) * 100;
  }

  /**
   * Get all discovered agents
   */
  async getAgents(filters = {}) {
    let query = this.db.from('uadsi_agents').select('*');
    
    if (filters.health_status) {
      query = query.eq('health_status', filters.health_status);
    }
    
    if (filters.agent_type) {
      query = query.eq('agent_type', filters.agent_type);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Get all discovered workflows
   */
  async getWorkflows(filters = {}) {
    let query = this.db.from('uadsi_workflows').select('*');
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Shutdown discovery service
   */
  async shutdown() {
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
    
    this.emit('shutdown');
    console.log('🛑 Agent Discovery shutdown');
  }
}

export default AgentDiscovery;
