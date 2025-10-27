/**
 * Health check routes for AgentMesh Cloud Ecosystem
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
    service: 'agentmesh-ecosystem',
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
      service: 'agentmesh-ecosystem',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      services: {}
    };

    // Check inference router service
    try {
      const inferenceRouter = req.app.get('inferenceRouter');
      if (inferenceRouter) {
        const routerHealth = await inferenceRouter.getHealth();
        health.services.inferenceRouter = {
          status: routerHealth.status,
          providers: routerHealth.providers.length,
          lastChecked: routerHealth.lastChecked
        };
      } else {
        health.services.inferenceRouter = {
          status: 'not_initialized',
          error: 'Service not available'
        };
      }
    } catch (error) {
      health.services.inferenceRouter = {
        status: 'error',
        error: error.message
      };
    }

    // Check gateway service
    try {
      const gatewayService = req.app.get('gatewayService');
      if (gatewayService) {
        health.services.gatewayService = {
          status: 'healthy',
          lastChecked: new Date()
        };
      } else {
        health.services.gatewayService = {
          status: 'not_initialized',
          error: 'Service not available'
        };
      }
    } catch (error) {
      health.services.gatewayService = {
        status: 'error',
        error: error.message
      };
    }

    // Check knowledge graph service
    try {
      const knowledgeService = req.app.get('knowledgeService');
      if (knowledgeService) {
        health.services.knowledgeService = {
          status: 'healthy',
          lastChecked: new Date()
        };
      } else {
        health.services.knowledgeService = {
          status: 'not_initialized',
          error: 'Service not available'
        };
      }
    } catch (error) {
      health.services.knowledgeService = {
        status: 'error',
        error: error.message
      };
    }

    // Check marketplace service
    try {
      const marketplaceService = req.app.get('marketplaceService');
      if (marketplaceService) {
        health.services.marketplaceService = {
          status: 'healthy',
          lastChecked: new Date()
        };
      } else {
        health.services.marketplaceService = {
          status: 'not_initialized',
          error: 'Service not available'
        };
      }
    } catch (error) {
      health.services.marketplaceService = {
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
      service: 'agentmesh-ecosystem',
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