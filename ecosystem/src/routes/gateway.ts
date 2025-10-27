/**
 * Federated Gateway API routes for AgentMesh Cloud Ecosystem
 * Handles third-party agent integration
 */

import express from 'express';
import { logger } from '@/utils/logger';
import { FederatedAgent, TenantToken, FederatedRequest, AgentFilters, TokenConfig } from '@agentmesh/shared';

const router = express.Router();

// Middleware to get federated gateway service
const getGatewayService = (req: any, res: any, next: any) => {
  const gatewayService = req.app.get('gatewayService');
  if (!gatewayService) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Federated gateway service not available'
    });
  }
  req.gatewayService = gatewayService;
  next();
};

// POST /api/v1/gateway/agents
// Register a new federated agent
router.post('/agents', getGatewayService, async (req, res) => {
  try {
    const agentData = req.body;
    
    // Validate required fields
    if (!agentData.name || !agentData.description || !agentData.provider) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Name, description, and provider are required'
      });
    }

    const agent = await req.gatewayService.registerAgent(agentData);
    
    logger.info('Registered federated agent', {
      agentId: agent.id,
      name: agent.name,
      provider: agent.provider.name
    });

    res.status(201).json(agent);
  } catch (error) {
    logger.error('Failed to register federated agent:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register federated agent',
      details: error.message
    });
  }
});

// GET /api/v1/gateway/agents
// List federated agents
router.get('/agents', getGatewayService, async (req, res) => {
  try {
    const filters: AgentFilters = {
      status: req.query.status?.split(','),
      capabilities: req.query.capabilities?.split(','),
      providers: req.query.providers?.split(','),
      verified: req.query.verified === 'true',
      certified: req.query.certified === 'true',
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
    };

    const agents = await req.gatewayService.listAgents(filters);
    
    res.json({
      agents,
      total: agents.length,
      filters
    });
  } catch (error) {
    logger.error('Failed to list federated agents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list federated agents',
      details: error.message
    });
  }
});

// GET /api/v1/gateway/agents/:id
// Get a specific federated agent
router.get('/agents/:id', getGatewayService, async (req, res) => {
  try {
    const { id } = req.params;
    const agent = await req.gatewayService.getAgent(id);
    
    if (!agent) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Agent ${id} not found`
      });
    }

    res.json(agent);
  } catch (error) {
    logger.error(`Failed to get federated agent ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get federated agent',
      details: error.message
    });
  }
});

// PUT /api/v1/gateway/agents/:id
// Update a federated agent
router.put('/agents/:id', getGatewayService, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const agent = await req.gatewayService.updateAgent(id, updates);
    
    logger.info('Updated federated agent', {
      agentId: id,
      name: agent.name
    });

    res.json(agent);
  } catch (error) {
    logger.error(`Failed to update federated agent ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update federated agent',
      details: error.message
    });
  }
});

// DELETE /api/v1/gateway/agents/:id
// Delete a federated agent
router.delete('/agents/:id', getGatewayService, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.gatewayService.deleteAgent(id);
    
    logger.info('Deleted federated agent', { agentId: id });

    res.json({
      message: 'Agent deleted successfully',
      agentId: id
    });
  } catch (error) {
    logger.error(`Failed to delete federated agent ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete federated agent',
      details: error.message
    });
  }
});

// POST /api/v1/gateway/tokens
// Create a tenant token
router.post('/tokens', getGatewayService, async (req, res) => {
  try {
    const { tenantId, agentId, scopes, permissions, expiresIn, metadata } = req.body;
    
    if (!tenantId || !agentId || !scopes || !permissions) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'TenantId, agentId, scopes, and permissions are required'
      });
    }

    const tokenConfig: TokenConfig = {
      scopes,
      permissions,
      expiresIn: expiresIn || 3600, // 1 hour default
      metadata: metadata || {}
    };

    const token = await req.gatewayService.createTenantToken(tenantId, agentId, tokenConfig);
    
    logger.info('Created tenant token', {
      tokenId: token.id,
      tenantId,
      agentId,
      expiresAt: token.expiresAt
    });

    res.status(201).json(token);
  } catch (error) {
    logger.error('Failed to create tenant token:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create tenant token',
      details: error.message
    });
  }
});

// GET /api/v1/gateway/tokens/:token
// Validate a tenant token
router.get('/tokens/:token', getGatewayService, async (req, res) => {
  try {
    const { token } = req.params;
    
    const tenantToken = await req.gatewayService.validateToken(token);
    
    if (!tenantToken) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Token not found or expired'
      });
    }

    res.json(tenantToken);
  } catch (error) {
    logger.error(`Failed to validate token ${req.params.token}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to validate token',
      details: error.message
    });
  }
});

// DELETE /api/v1/gateway/tokens/:tokenId
// Revoke a tenant token
router.delete('/tokens/:tokenId', getGatewayService, async (req, res) => {
  try {
    const { tokenId } = req.params;
    
    await req.gatewayService.revokeToken(tokenId);
    
    logger.info('Revoked tenant token', { tokenId });

    res.json({
      message: 'Token revoked successfully',
      tokenId
    });
  } catch (error) {
    logger.error(`Failed to revoke token ${req.params.tokenId}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke token',
      details: error.message
    });
  }
});

// POST /api/v1/gateway/requests
// Make a federated request
router.post('/requests', getGatewayService, async (req, res) => {
  try {
    const {
      agentId,
      endpoint,
      method = 'POST',
      headers = {},
      body,
      query = {},
      timeout,
      retries,
      priority = 'normal',
      metadata = {}
    } = req.body;

    if (!agentId || !endpoint) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'AgentId and endpoint are required'
      });
    }

    const request: FederatedRequest = {
      id: generateId(),
      tenantId: req.tenantId || 'default',
      agentId,
      endpoint,
      method,
      headers: {
        'content-type': 'application/json',
        'authorization': req.headers.authorization || '',
        ...headers
      },
      body,
      query,
      timeout,
      retries,
      priority,
      metadata: {
        userId: req.user?.id,
        sessionId: req.sessionId,
        ...metadata
      },
      createdAt: new Date()
    };

    const response = await req.gatewayService.makeRequest(request);

    logger.info('Federated request completed', {
      requestId: request.id,
      agentId: request.agentId,
      statusCode: response.statusCode,
      latency: response.latency
    });

    res.json(response);
  } catch (error) {
    logger.error('Failed to make federated request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to make federated request',
      details: error.message
    });
  }
});

// GET /api/v1/gateway/statistics
// Get gateway statistics
router.get('/statistics', getGatewayService, async (req, res) => {
  try {
    const statistics = await req.gatewayService.getGatewayStatistics();
    res.json(statistics);
  } catch (error) {
    logger.error('Failed to get gateway statistics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get gateway statistics',
      details: error.message
    });
  }
});

// GET /api/v1/gateway/health
// Get gateway health status
router.get('/health', getGatewayService, async (req, res) => {
  try {
    const health = await req.gatewayService.getGatewayHealth();
    res.json(health);
  } catch (error) {
    logger.error('Failed to get gateway health:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get gateway health',
      details: error.message
    });
  }
});

// GET /api/v1/gateway/status
// Get gateway status
router.get('/status', (req, res) => {
  res.json({
    status: 'active',
    timestamp: new Date().toISOString(),
    message: 'Federated Gateway is running'
  });
});

// Utility function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export default router;