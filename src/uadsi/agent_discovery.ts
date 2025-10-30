import { ContextBus, Agent, Workflow } from '../context-bus/context_bus.js';
import { RegistryService } from '../registry/registry.service.js';

export interface DiscoveryResult {
  agents: Agent[];
  workflows: Workflow[];
  summary: {
    total_agents: number;
    total_workflows: number;
    agents_by_type: Record<string, number>;
    workflows_by_source: Record<string, number>;
  };
}

export class AgentDiscovery {
  private contextBus: ContextBus;
  private registry: RegistryService;

  constructor(contextBus: ContextBus, registry: RegistryService) {
    this.contextBus = contextBus;
    this.registry = registry;
  }

  async discover(): Promise<DiscoveryResult> {
    // Sync MCP agents from registry
    await this.registry.syncMCPAgents();

    // Get all agents and workflows
    const agents = await this.contextBus.getAgents();
    const workflows = await this.contextBus.getWorkflows();

    // Compute summary statistics
    const agents_by_type: Record<string, number> = {};
    for (const agent of agents) {
      agents_by_type[agent.type] = (agents_by_type[agent.type] || 0) + 1;
    }

    const workflows_by_source: Record<string, number> = {};
    for (const workflow of workflows) {
      workflows_by_source[workflow.source] = (workflows_by_source[workflow.source] || 0) + 1;
    }

    return {
      agents,
      workflows,
      summary: {
        total_agents: agents.length,
        total_workflows: workflows.length,
        agents_by_type,
        workflows_by_source,
      },
    };
  }

  async discoverAgents(): Promise<Agent[]> {
    return await this.contextBus.getAgents();
  }

  async discoverWorkflows(): Promise<Workflow[]> {
    return await this.contextBus.getWorkflows();
  }

  async getAgentHealth(agentId: string) {
    const telemetry = await this.contextBus.getTelemetryByAgent(agentId, 100);
    
    if (telemetry.length === 0) {
      return {
        agent_id: agentId,
        health_score: 0,
        status: 'unknown',
        metrics: {
          avg_latency_ms: 0,
          total_errors: 0,
          total_policy_violations: 0,
          success_rate: 0,
        },
      };
    }

    const totalLatency = telemetry.reduce((sum, t) => sum + (t.latency_ms || 0), 0);
    const avgLatency = totalLatency / telemetry.length;
    const totalErrors = telemetry.reduce((sum, t) => sum + t.errors, 0);
    const totalViolations = telemetry.reduce((sum, t) => sum + t.policy_violations, 0);
    const totalSuccess = telemetry.reduce((sum, t) => sum + t.success_count, 0);
    const totalAttempts = totalSuccess + totalErrors;
    const successRate = totalAttempts > 0 ? totalSuccess / totalAttempts : 0;

    // Simple health score calculation
    let healthScore = 1.0;
    healthScore *= successRate; // Success rate impact
    healthScore *= Math.max(0, 1 - (totalErrors / 100)); // Errors impact
    healthScore *= Math.max(0, 1 - (totalViolations / 50)); // Violations impact
    healthScore *= avgLatency < 1000 ? 1.0 : Math.max(0.5, 1000 / avgLatency); // Latency impact

    let status = 'healthy';
    if (healthScore < 0.5) status = 'critical';
    else if (healthScore < 0.75) status = 'degraded';

    return {
      agent_id: agentId,
      health_score: Math.round(healthScore * 1000) / 1000,
      status,
      metrics: {
        avg_latency_ms: Math.round(avgLatency),
        total_errors: totalErrors,
        total_policy_violations: totalViolations,
        success_rate: Math.round(successRate * 1000) / 1000,
      },
    };
  }
}
