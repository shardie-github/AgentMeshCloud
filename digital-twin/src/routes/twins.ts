/**
 * Digital Twin API routes for AgentMesh Cloud
 * Handles digital twin management and operations
 */

import express from 'express';
import { logger } from '@/utils/logger';
import { DigitalTwin, TwinFilters } from '@agentmesh/shared';

const router = express.Router();

// Middleware to get digital twin service
const getTwinService = (req: any, res: any, next: any) => {
  const twinService = req.app.get('digitalTwinService');
  if (!twinService) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Digital twin service not available'
    });
  }
  req.twinService = twinService;
  next();
};

// POST /api/v1/twins
// Create a new digital twin
router.post('/', getTwinService, async (req, res) => {
  try {
    const {
      name,
      description,
      version = '1.0.0',
      configuration
    } = req.body;

    if (!name || !description || !configuration) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, description, and configuration are required'
      });
    }

    const twin = await req.twinService.createTwin({
      name,
      description,
      version,
      configuration,
      status: 'inactive'
    });

    logger.info('Created digital twin', {
      twinId: twin.id,
      name: twin.name,
      version: twin.version
    });

    res.status(201).json(twin);
  } catch (error) {
    logger.error('Failed to create digital twin:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create digital twin',
      details: error.message
    });
  }
});

// GET /api/v1/twins
// List digital twins
router.get('/', getTwinService, async (req, res) => {
  try {
    const filters: TwinFilters = {
      status: req.query.status?.split(','),
      tags: req.query.tags?.split(','),
      createdAfter: req.query.createdAfter ? new Date(req.query.createdAfter as string) : undefined,
      createdBefore: req.query.createdBefore ? new Date(req.query.createdBefore as string) : undefined,
      search: req.query.search as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
    };

    const twins = await req.twinService.listTwins(filters);
    
    res.json({
      twins,
      total: twins.length,
      filters
    });
  } catch (error) {
    logger.error('Failed to list digital twins:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list digital twins',
      details: error.message
    });
  }
});

// GET /api/v1/twins/:id
// Get a specific digital twin
router.get('/:id', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    const twin = await req.twinService.getTwin(id);
    
    if (!twin) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Twin ${id} not found`
      });
    }

    res.json(twin);
  } catch (error) {
    logger.error(`Failed to get digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get digital twin',
      details: error.message
    });
  }
});

// PUT /api/v1/twins/:id
// Update a digital twin
router.put('/:id', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const twin = await req.twinService.updateTwin(id, updates);
    
    logger.info('Updated digital twin', {
      twinId: id,
      name: twin.name
    });

    res.json(twin);
  } catch (error) {
    logger.error(`Failed to update digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update digital twin',
      details: error.message
    });
  }
});

// DELETE /api/v1/twins/:id
// Delete a digital twin
router.delete('/:id', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.twinService.deleteTwin(id);
    
    logger.info('Deleted digital twin', { twinId: id });

    res.json({
      message: 'Digital twin deleted successfully',
      twinId: id
    });
  } catch (error) {
    logger.error(`Failed to delete digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete digital twin',
      details: error.message
    });
  }
});

// POST /api/v1/twins/:id/start
// Start a digital twin
router.post('/:id/start', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.twinService.startTwin(id);
    
    logger.info('Started digital twin', { twinId: id });

    res.json({
      message: 'Digital twin started successfully',
      twinId: id
    });
  } catch (error) {
    logger.error(`Failed to start digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to start digital twin',
      details: error.message
    });
  }
});

// POST /api/v1/twins/:id/stop
// Stop a digital twin
router.post('/:id/stop', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.twinService.stopTwin(id);
    
    logger.info('Stopped digital twin', { twinId: id });

    res.json({
      message: 'Digital twin stopped successfully',
      twinId: id
    });
  } catch (error) {
    logger.error(`Failed to stop digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to stop digital twin',
      details: error.message
    });
  }
});

// POST /api/v1/twins/:id/pause
// Pause a digital twin
router.post('/:id/pause', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.twinService.pauseTwin(id);
    
    logger.info('Paused digital twin', { twinId: id });

    res.json({
      message: 'Digital twin paused successfully',
      twinId: id
    });
  } catch (error) {
    logger.error(`Failed to pause digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to pause digital twin',
      details: error.message
    });
  }
});

// POST /api/v1/twins/:id/resume
// Resume a digital twin
router.post('/:id/resume', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.twinService.resumeTwin(id);
    
    logger.info('Resumed digital twin', { twinId: id });

    res.json({
      message: 'Digital twin resumed successfully',
      twinId: id
    });
  } catch (error) {
    logger.error(`Failed to resume digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resume digital twin',
      details: error.message
    });
  }
});

// POST /api/v1/twins/:id/sync
// Sync a digital twin
router.post('/:id/sync', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.twinService.syncTwin(id);
    
    logger.info('Synced digital twin', { twinId: id });

    res.json({
      message: 'Digital twin synced successfully',
      twinId: id
    });
  } catch (error) {
    logger.error(`Failed to sync digital twin ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to sync digital twin',
      details: error.message
    });
  }
});

// GET /api/v1/twins/:id/metrics
// Get digital twin metrics
router.get('/:id/metrics', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    const metrics = await req.twinService.getTwinMetrics(id);
    
    res.json(metrics);
  } catch (error) {
    logger.error(`Failed to get twin metrics ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get twin metrics',
      details: error.message
    });
  }
});

// GET /api/v1/twins/:id/health
// Get digital twin health
router.get('/:id/health', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    const health = await req.twinService.getTwinHealth(id);
    
    res.json(health);
  } catch (error) {
    logger.error(`Failed to get twin health ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get twin health',
      details: error.message
    });
  }
});

// GET /api/v1/twins/:id/state
// Get digital twin state
router.get('/:id/state', getTwinService, async (req, res) => {
  try {
    const { id } = req.params;
    
    const state = await req.twinService.getTwinState(id);
    
    res.json(state);
  } catch (error) {
    logger.error(`Failed to get twin state ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get twin state',
      details: error.message
    });
  }
});

export default router;