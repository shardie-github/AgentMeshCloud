/**
 * Monitoring API routes for AgentMesh Cloud Digital Twin
 * Handles monitoring operations
 */

import express from 'express';
import { logger } from '@/utils/logger';

const router = express.Router();

// GET /api/v1/monitoring/status
// Get monitoring status
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: 'Monitoring service is running'
  });
});

export default router;