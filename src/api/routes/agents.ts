import { Router } from 'express';
import { Agent } from '../../context-bus/context_bus.js';

export const agentsRouter = Router();

agentsRouter.get('/', async (req, res) => {
  try {
    const { agentDiscovery } = req.app.locals;
    const agents: Agent[] = await agentDiscovery.discoverAgents();

    res.json({
      total: agents.length,
      agents: agents.map((agent: Agent) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        owner: agent.owner,
        access_tier: agent.access_tier,
        trust_level: agent.trust_level,
        created_at: agent.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

agentsRouter.get('/:id', async (req, res) => {
  try {
    const { contextBus, agentDiscovery } = req.app.locals;
    const agent = await contextBus.getAgentById(req.params.id);

    if (!agent) {
      res.status(404).json({ error: 'Agent not found' });
      return;
    }

    const health = await agentDiscovery.getAgentHealth(agent.id);

    res.json({
      ...agent,
      health,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

agentsRouter.get('/:id/telemetry', async (req, res) => {
  try {
    const { contextBus } = req.app.locals;
    const limit = parseInt(req.query.limit as string, 10) || 100;
    
    const telemetry = await contextBus.getTelemetryByAgent(req.params.id, limit);

    res.json({
      agent_id: req.params.id,
      total: telemetry.length,
      telemetry,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
