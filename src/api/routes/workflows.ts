import { Router } from 'express';
import { Workflow } from '../../context-bus/context_bus.js';

export const workflowsRouter = Router();

workflowsRouter.get('/', async (req, res) => {
  try {
    const { agentDiscovery } = req.app.locals;
    const workflows: Workflow[] = await agentDiscovery.discoverWorkflows();

    res.json({
      total: workflows.length,
      workflows: workflows.map((workflow: Workflow) => ({
        id: workflow.id,
        name: workflow.name,
        source: workflow.source,
        trigger: workflow.trigger,
        status: workflow.status,
        last_run_at: workflow.last_run_at,
        created_at: workflow.created_at,
      })),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

workflowsRouter.get('/:id', async (req, res) => {
  try {
    const { contextBus } = req.app.locals;
    const workflow = await contextBus.getWorkflowById(req.params.id);

    if (!workflow) {
      res.status(404).json({ error: 'Workflow not found' });
      return;
    }

    const events = await contextBus.getEventsByWorkflow(workflow.id, 10);

    res.json({
      ...workflow,
      recent_events: events,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

workflowsRouter.get('/:id/events', async (req, res) => {
  try {
    const { contextBus } = req.app.locals;
    const limit = parseInt(req.query.limit as string, 10) || 100;
    
    const events = await contextBus.getEventsByWorkflow(req.params.id, limit);

    res.json({
      workflow_id: req.params.id,
      total: events.length,
      events,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
