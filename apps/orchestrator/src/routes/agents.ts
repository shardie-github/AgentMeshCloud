/**
 * Agent routes for AgentMesh Cloud Orchestrator
 */

import { Router } from 'express';
import { AgentController } from '@/controllers/AgentController';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const agentController = new AgentController(null as any);

// Agent CRUD operations
router.get('/', asyncHandler(agentController.getAllAgents.bind(agentController)));
router.post('/', asyncHandler(agentController.createAgent.bind(agentController)));
router.get('/:id', asyncHandler(agentController.getAgentById.bind(agentController)));
router.put('/:id', asyncHandler(agentController.updateAgent.bind(agentController)));
router.delete('/:id', asyncHandler(agentController.deleteAgent.bind(agentController)));

// Agent lifecycle operations
router.post('/:id/start', asyncHandler(agentController.startAgent.bind(agentController)));
router.post('/:id/stop', asyncHandler(agentController.stopAgent.bind(agentController)));

export default router;