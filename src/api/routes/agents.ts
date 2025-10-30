/**
 * Agents API Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { agentRegistry } from '@/registry';
import { AgentStatus, AgentType } from '@/common/types';
import { ValidationError } from '@/common/errors';
import { withSpan } from '@/telemetry/tracer';

export const agentRouter = Router();

/**
 * GET /api/v1/agents
 * List all agents
 */
agentRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('list_agents', async () => {
      const { agents, total } = await agentRegistry.query({
        status: req.query.status as AgentStatus,
        type: req.query.type as AgentType,
        vendor: req.query.vendor as string,
        compliance_tier: req.query.compliance_tier as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      });

      res.json({
        success: true,
        data: {
          agents,
          total,
          count: agents.length,
        },
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/agents
 * Register new agent
 */
agentRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('register_agent', async () => {
      if (!req.body.name || !req.body.type || !req.body.vendor || !req.body.model) {
        throw new ValidationError('Missing required fields: name, type, vendor, model');
      }

      const agent = await agentRegistry.register(req.body);

      res.status(201).json({
        success: true,
        data: agent,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/agents/:id
 * Get agent by ID
 */
agentRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('get_agent', async () => {
      const agent = await agentRegistry.getById(req.params.id);

      res.json({
        success: true,
        data: agent,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/v1/agents/:id
 * Update agent
 */
agentRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('update_agent', async () => {
      const agent = await agentRegistry.update(req.params.id, req.body);

      res.json({
        success: true,
        data: agent,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/agents/:id
 * Delete agent
 */
agentRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('delete_agent', async () => {
      await agentRegistry.delete(req.params.id);

      res.status(204).send();
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/agents/:id/suspend
 * Suspend agent
 */
agentRouter.post('/:id/suspend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('suspend_agent', async () => {
      const reason = req.body.reason || 'No reason provided';
      const agent = await agentRegistry.suspend(req.params.id, reason);

      res.json({
        success: true,
        data: agent,
      });
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/agents/stats
 * Get agent statistics
 */
agentRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await withSpan('get_agent_stats', async () => {
      const stats = await agentRegistry.getStats();

      res.json({
        success: true,
        data: stats,
      });
    });
  } catch (error) {
    next(error);
  }
});
