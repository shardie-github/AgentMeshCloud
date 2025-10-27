/**
 * Agent routes for AgentMesh Cloud Orchestrator
 */

import { Router } from 'express';
import { AgentController } from '@/controllers/AgentController';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();
const agentController = new AgentController();

// Agent CRUD operations
router.get('/', asyncHandler(agentController.listAgents.bind(agentController)));
router.post('/', asyncHandler(agentController.createAgent.bind(agentController)));
router.get('/:id', asyncHandler(agentController.getAgent.bind(agentController)));
router.put('/:id', asyncHandler(agentController.updateAgent.bind(agentController)));
router.delete('/:id', asyncHandler(agentController.deleteAgent.bind(agentController)));

// Agent lifecycle operations
router.post('/:id/register', asyncHandler(agentController.registerAgent.bind(agentController)));
router.post('/:id/heartbeat', asyncHandler(agentController.updateHeartbeat.bind(agentController)));
router.post('/:id/status', asyncHandler(agentController.updateStatus.bind(agentController)));
router.post('/:id/retire', asyncHandler(agentController.retireAgent.bind(agentController)));

// Agent discovery
router.post('/discover', asyncHandler(agentController.discoverAgents.bind(agentController)));

// Agent capabilities
router.get('/:id/capabilities', asyncHandler(agentController.getCapabilities.bind(agentController)));
router.post('/:id/capabilities', asyncHandler(agentController.addCapability.bind(agentController)));
router.put('/:id/capabilities/:capabilityId', asyncHandler(agentController.updateCapability.bind(agentController)));
router.delete('/:id/capabilities/:capabilityId', asyncHandler(agentController.removeCapability.bind(agentController)));

// Agent sessions
router.get('/:id/sessions', asyncHandler(agentController.getSessions.bind(agentController)));
router.post('/:id/sessions', asyncHandler(agentController.createSession.bind(agentController)));
router.delete('/:id/sessions/:sessionId', asyncHandler(agentController.endSession.bind(agentController)));

export default router;