/**
 * Simulation API routes for AgentMesh Cloud Digital Twin
 * Handles simulation operations
 */

import express from 'express';
import { logger } from '@/utils/logger';

const router = express.Router();

// GET /api/v1/simulation/status
// Get simulation status
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: 'Simulation service is running'
  });
});

export default router;