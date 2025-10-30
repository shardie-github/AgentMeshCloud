import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ContextBus, Agent, Workflow } from '../context-bus/context_bus.js';

export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  capabilities?: string[];
  description?: string;
}

export interface MCPRegistry {
  version: string;
  servers: Record<string, MCPServer>;
}

export class RegistryService {
  private contextBus: ContextBus;
  private mcpRegistry: MCPRegistry | null = null;

  constructor(contextBus: ContextBus) {
    this.contextBus = contextBus;
  }

  loadMCPRegistry(): MCPRegistry {
    if (this.mcpRegistry) return this.mcpRegistry;

    const registryPath = 
      process.env.MCP_REGISTRY_PATH || 
      path.join(process.cwd(), 'src', 'registry', 'mcp_registry.schema.yaml');
    
    if (!fs.existsSync(registryPath)) {
      console.warn(`⚠️  MCP registry not found at ${registryPath}, using empty registry`);
      this.mcpRegistry = { version: '1.0.0', servers: {} };
      return this.mcpRegistry;
    }

    const fileContents = fs.readFileSync(registryPath, 'utf8');
    this.mcpRegistry = yaml.load(fileContents) as MCPRegistry;
    return this.mcpRegistry;
  }

  async syncMCPAgents(): Promise<Agent[]> {
    const registry = this.loadMCPRegistry();
    const synced: Agent[] = [];

    for (const [serverName, server] of Object.entries(registry.servers)) {
      // Check if agent already exists
      const existingAgents = await this.contextBus.getAgents();
      const existing = existingAgents.find(a => a.name === serverName && a.type === 'mcp');

      if (!existing) {
        const agent = await this.contextBus.createAgent({
          name: serverName,
          type: 'mcp',
          owner: 'system',
          model: server.command,
          access_tier: 'standard',
          trust_level: 0.75,
          metadata: {
            command: server.command,
            args: server.args || [],
            env: server.env || {},
            capabilities: server.capabilities || [],
            description: server.description,
          },
        });
        synced.push(agent);
      } else {
        synced.push(existing);
      }
    }

    return synced;
  }

  async registerAgent(agent: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent> {
    return await this.contextBus.createAgent(agent);
  }

  async registerWorkflow(workflow: Omit<Workflow, 'id' | 'created_at' | 'updated_at'>): Promise<Workflow> {
    return await this.contextBus.createWorkflow(workflow);
  }

  async getAgents(): Promise<Agent[]> {
    return await this.contextBus.getAgents();
  }

  async getWorkflows(): Promise<Workflow[]> {
    return await this.contextBus.getWorkflows();
  }

  async getAgentById(id: string): Promise<Agent | null> {
    return await this.contextBus.getAgentById(id);
  }

  async getWorkflowById(id: string): Promise<Workflow | null> {
    return await this.contextBus.getWorkflowById(id);
  }

  async updateAgentTrust(id: string, trustLevel: number): Promise<void> {
    await this.contextBus.updateAgentTrustLevel(id, trustLevel);
  }

  async updateWorkflowStatus(id: string, status: string): Promise<void> {
    await this.contextBus.updateWorkflowStatus(id, status);
  }
}
