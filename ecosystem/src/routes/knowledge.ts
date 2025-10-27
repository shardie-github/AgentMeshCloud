/**
 * Knowledge Graph API routes for AgentMesh Cloud Ecosystem
 * Handles knowledge graph operations
 */

import express from 'express';
import { logger } from '@/utils/logger';
import { KnowledgeQuery, KnowledgeNode, Relationship } from '@agentmesh/shared';

const router = express.Router();

// Middleware to get knowledge graph service
const getKnowledgeService = (req: any, res: any, next: any) => {
  const knowledgeService = req.app.get('knowledgeService');
  if (!knowledgeService) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Knowledge graph service not available'
    });
  }
  req.knowledgeService = knowledgeService;
  next();
};

// POST /api/v1/knowledge/nodes
// Create a new knowledge node
router.post('/nodes', getKnowledgeService, async (req, res) => {
  try {
    const {
      type,
      content,
      metadata = {},
      tags = [],
      confidence = 0.8,
      source = 'api'
    } = req.body;

    if (!type || !content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Type and content are required'
      });
    }

    const node = await req.knowledgeService.createNode({
      type,
      content,
      metadata,
      tags,
      confidence,
      source,
      tenantId: req.tenantId || 'default',
      userId: req.user?.id
    });

    logger.info('Created knowledge node', {
      nodeId: node.id,
      type: node.type,
      tenantId: node.tenantId
    });

    res.status(201).json(node);
  } catch (error) {
    logger.error('Failed to create knowledge node:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create knowledge node',
      details: error.message
    });
  }
});

// GET /api/v1/knowledge/nodes/:id
// Get a specific knowledge node
router.get('/nodes/:id', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    const node = await req.knowledgeService.getNode(id);
    
    if (!node) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Node ${id} not found`
      });
    }

    res.json(node);
  } catch (error) {
    logger.error(`Failed to get knowledge node ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get knowledge node',
      details: error.message
    });
  }
});

// PUT /api/v1/knowledge/nodes/:id
// Update a knowledge node
router.put('/nodes/:id', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const node = await req.knowledgeService.updateNode(id, updates);
    
    logger.info('Updated knowledge node', {
      nodeId: id,
      version: node.version
    });

    res.json(node);
  } catch (error) {
    logger.error(`Failed to update knowledge node ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update knowledge node',
      details: error.message
    });
  }
});

// DELETE /api/v1/knowledge/nodes/:id
// Delete a knowledge node
router.delete('/nodes/:id', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.knowledgeService.deleteNode(id);
    
    logger.info('Deleted knowledge node', { nodeId: id });

    res.json({
      message: 'Node deleted successfully',
      nodeId: id
    });
  } catch (error) {
    logger.error(`Failed to delete knowledge node ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete knowledge node',
      details: error.message
    });
  }
});

// POST /api/v1/knowledge/search
// Search knowledge graph
router.post('/search', getKnowledgeService, async (req, res) => {
  try {
    const {
      text,
      type = 'semantic',
      filters = {},
      options = {},
      context = {}
    } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Search text is required'
      });
    }

    const query: KnowledgeQuery = {
      id: generateId(),
      text,
      type,
      filters,
      options,
      context,
      tenantId: req.tenantId || 'default',
      userId: req.user?.id,
      createdAt: new Date()
    };

    const results = await req.knowledgeService.search(query);

    logger.info('Knowledge search completed', {
      queryId: query.id,
      queryType: query.type,
      resultCount: results.results.length,
      took: results.took
    });

    res.json(results);
  } catch (error) {
    logger.error('Knowledge search failed:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Knowledge search failed',
      details: error.message
    });
  }
});

// POST /api/v1/knowledge/relationships
// Create a knowledge relationship
router.post('/relationships', getKnowledgeService, async (req, res) => {
  try {
    const {
      type,
      sourceId,
      targetId,
      weight = 1.0,
      direction = 'directed',
      metadata = {}
    } = req.body;

    if (!type || !sourceId || !targetId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Type, sourceId, and targetId are required'
      });
    }

    const relationship = await req.knowledgeService.createRelationship({
      type,
      sourceId,
      targetId,
      weight,
      direction,
      metadata
    });

    logger.info('Created knowledge relationship', {
      relationshipId: relationship.id,
      type: relationship.type,
      sourceId: relationship.sourceId,
      targetId: relationship.targetId
    });

    res.status(201).json(relationship);
  } catch (error) {
    logger.error('Failed to create knowledge relationship:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create knowledge relationship',
      details: error.message
    });
  }
});

// GET /api/v1/knowledge/relationships/:id
// Get a specific knowledge relationship
router.get('/relationships/:id', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    const relationship = await req.knowledgeService.getRelationship(id);
    
    if (!relationship) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Relationship ${id} not found`
      });
    }

    res.json(relationship);
  } catch (error) {
    logger.error(`Failed to get knowledge relationship ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get knowledge relationship',
      details: error.message
    });
  }
});

// PUT /api/v1/knowledge/relationships/:id
// Update a knowledge relationship
router.put('/relationships/:id', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const relationship = await req.knowledgeService.updateRelationship(id, updates);
    
    logger.info('Updated knowledge relationship', {
      relationshipId: id,
      type: relationship.type
    });

    res.json(relationship);
  } catch (error) {
    logger.error(`Failed to update knowledge relationship ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update knowledge relationship',
      details: error.message
    });
  }
});

// DELETE /api/v1/knowledge/relationships/:id
// Delete a knowledge relationship
router.delete('/relationships/:id', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.knowledgeService.deleteRelationship(id);
    
    logger.info('Deleted knowledge relationship', { relationshipId: id });

    res.json({
      message: 'Relationship deleted successfully',
      relationshipId: id
    });
  } catch (error) {
    logger.error(`Failed to delete knowledge relationship ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete knowledge relationship',
      details: error.message
    });
  }
});

// GET /api/v1/knowledge/nodes/:id/neighbors
// Get neighbors of a knowledge node
router.get('/nodes/:id/neighbors', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    const { maxDepth = 1 } = req.query;
    
    const neighbors = await req.knowledgeService.getNodeNeighbors(
      id, 
      parseInt(maxDepth as string, 10)
    );

    res.json({
      nodeId: id,
      neighbors,
      count: neighbors.length
    });
  } catch (error) {
    logger.error(`Failed to get neighbors for node ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get node neighbors',
      details: error.message
    });
  }
});

// GET /api/v1/knowledge/path/:sourceId/:targetId
// Get shortest path between two nodes
router.get('/path/:sourceId/:targetId', getKnowledgeService, async (req, res) => {
  try {
    const { sourceId, targetId } = req.params;
    
    const path = await req.knowledgeService.getShortestPath(sourceId, targetId);

    res.json({
      sourceId,
      targetId,
      path,
      found: path.length > 0,
      length: path.length
    });
  } catch (error) {
    logger.error(`Failed to find path from ${req.params.sourceId} to ${req.params.targetId}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to find path',
      details: error.message
    });
  }
});

// GET /api/v1/knowledge/nodes/:id/recommendations
// Get recommendations for a knowledge node
router.get('/nodes/:id/recommendations', getKnowledgeService, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;
    
    const recommendations = await req.knowledgeService.getRecommendations(
      id, 
      parseInt(limit as string, 10)
    );

    res.json({
      nodeId: id,
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error(`Failed to get recommendations for node ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get recommendations',
      details: error.message
    });
  }
});

// GET /api/v1/knowledge/statistics
// Get knowledge graph statistics
router.get('/statistics', getKnowledgeService, async (req, res) => {
  try {
    const statistics = await req.knowledgeService.getGraphStatistics();
    res.json(statistics);
  } catch (error) {
    logger.error('Failed to get knowledge graph statistics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get statistics',
      details: error.message
    });
  }
});

// GET /api/v1/knowledge/status
// Get knowledge graph status
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: 'Knowledge Graph is running'
  });
});

// Utility function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export default router;