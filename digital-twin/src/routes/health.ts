/**
 * Health check routes for AgentMesh Cloud Digital Twin
 * Provides health status and monitoring endpoints
 */

import express from 'express';
import { logger } from '@/utils/logger';

const router = express.Router();

// GET /health
// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'agentmesh-digital-twin',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid
  });
});

// GET /health/detailed
// Detailed health check with service status
router.get('/detailed', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'agentmesh-digital-twin',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      services: {}
    };

    // Check digital twin service
    try {
      const twinService = req.app.get('digitalTwinService');
      if (twinService) {
        health.services.digitalTwinService = {
          status: 'healthy',
          lastChecked: new Date()
        };
      } else {
        health.services.digitalTwinService = {
          status: 'not_initialized',
          error: 'Service not available'
        };
      }
    } catch (error) {
      health.services.digitalTwinService = {
        status: 'error',
        error: error.message
      };
    }

    // Determine overall health status
    const serviceStatuses = Object.values(health.services).map((service: any) => service.status);
    if (serviceStatuses.includes('error')) {
      health.status = 'unhealthy';
    } else if (serviceStatuses.includes('not_initialized')) {
      health.status = 'degraded';
    }

    res.json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'agentmesh-digital-twin',
      error: error.message
    });
  }
});

// GET /health/ready
// Readiness check for Kubernetes
router.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// GET /health/live
// Liveness check for Kubernetes
router.get('/live', (req, res) => {
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;