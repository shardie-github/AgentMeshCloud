/**
 * Inference Router API routes for AgentMesh Cloud Ecosystem
 * Handles adaptive inference routing and model selection
 */

import express from 'express';
import { logger } from '@/utils/logger';
import { InferenceRequest, InferenceResponse } from '@agentmesh/shared';

const router = express.Router();

// Middleware to get inference router service
const getInferenceRouter = (req: any, res: any, next: any) => {
  const inferenceRouter = req.app.get('inferenceRouter');
  if (!inferenceRouter) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Inference router service not available'
    });
  }
  req.inferenceRouter = inferenceRouter;
  next();
};

// POST /api/v1/inference/route
// Route inference request to optimal provider
router.post('/route', getInferenceRouter, async (req, res) => {
  try {
    const {
      prompt,
      model,
      provider,
      parameters = {},
      context = {},
      priority = 'normal',
      timeout,
      retryPolicy,
      fallbackStrategy
    } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Prompt is required'
      });
    }

    const request: InferenceRequest = {
      id: generateId(),
      prompt,
      model,
      provider,
      parameters,
      context,
      tenantId: req.tenantId || 'default',
      userId: req.user?.id,
      priority,
      timeout,
      retryPolicy,
      fallbackStrategy,
      createdAt: new Date()
    };

    logger.info('Routing inference request', {
      requestId: request.id,
      tenantId: request.tenantId,
      provider: request.provider,
      model: request.model
    });

    const response = await req.inferenceRouter.route(request);

    logger.info('Inference request completed', {
      requestId: request.id,
      responseId: response.id,
      provider: response.provider,
      model: response.model,
      latency: response.latency,
      cost: response.cost
    });

    res.json(response);
  } catch (error) {
    logger.error('Failed to route inference request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to route inference request',
      details: error.message
    });
  }
});

// GET /api/v1/inference/providers
// Get available LLM providers
router.get('/providers', getInferenceRouter, async (req, res) => {
  try {
    const providers = await req.inferenceRouter.getProviders();
    
    // Filter sensitive information
    const publicProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      status: provider.status,
      capabilities: {
        models: provider.capabilities.models.map(model => ({
          id: model.id,
          name: model.name,
          description: model.description,
          contextLength: model.contextLength,
          maxTokens: model.maxTokens,
          capabilities: model.capabilities,
          performance: {
            latency: model.performance.latency,
            quality: model.performance.quality,
            reliability: model.performance.reliability
          }
        })),
        features: provider.capabilities.features,
        maxTokens: provider.capabilities.maxTokens,
        supportedLanguages: provider.capabilities.supportedLanguages,
        supportedFormats: provider.capabilities.supportedFormats,
        streaming: provider.capabilities.streaming,
        functionCalling: provider.capabilities.functionCalling,
        vision: provider.capabilities.vision,
        audio: provider.capabilities.audio,
        codeGeneration: provider.capabilities.codeGeneration,
        reasoning: provider.capabilities.reasoning
      },
      regions: provider.regions,
      health: {
        status: provider.health.status,
        uptime: provider.health.uptime,
        responseTime: provider.health.responseTime,
        errorRate: provider.health.errorRate
      }
    }));

    res.json({
      providers: publicProviders,
      total: publicProviders.length
    });
  } catch (error) {
    logger.error('Failed to get providers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get providers',
      details: error.message
    });
  }
});

// GET /api/v1/inference/providers/:id
// Get specific provider details
router.get('/providers/:id', getInferenceRouter, async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await req.inferenceRouter.getProvider(id);
    
    if (!provider) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Provider ${id} not found`
      });
    }

    // Filter sensitive information
    const publicProvider = {
      id: provider.id,
      name: provider.name,
      type: provider.type,
      status: provider.status,
      capabilities: provider.capabilities,
      regions: provider.regions,
      health: provider.health,
      lastChecked: provider.lastChecked
    };

    res.json(publicProvider);
  } catch (error) {
    logger.error(`Failed to get provider ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get provider',
      details: error.message
    });
  }
});

// GET /api/v1/inference/metrics
// Get router metrics
router.get('/metrics', getInferenceRouter, async (req, res) => {
  try {
    const metrics = await req.inferenceRouter.getMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get metrics',
      details: error.message
    });
  }
});

// GET /api/v1/inference/health
// Get router health status
router.get('/health', getInferenceRouter, async (req, res) => {
  try {
    const health = await req.inferenceRouter.getHealth();
    res.json(health);
  } catch (error) {
    logger.error('Failed to get health status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get health status',
      details: error.message
    });
  }
});

// POST /api/v1/inference/providers
// Add new provider
router.post('/providers', getInferenceRouter, async (req, res) => {
  try {
    const provider = req.body;
    
    // Validate provider data
    if (!provider.id || !provider.name || !provider.type) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Provider id, name, and type are required'
      });
    }

    await req.inferenceRouter.addProvider(provider);
    
    logger.info('Added new provider', {
      providerId: provider.id,
      providerName: provider.name,
      providerType: provider.type
    });

    res.status(201).json({
      message: 'Provider added successfully',
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type
      }
    });
  } catch (error) {
    logger.error('Failed to add provider:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add provider',
      details: error.message
    });
  }
});

// PUT /api/v1/inference/providers/:id
// Update provider
router.put('/providers/:id', getInferenceRouter, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await req.inferenceRouter.updateProvider(id, updates);
    
    logger.info('Updated provider', {
      providerId: id,
      updates: Object.keys(updates)
    });

    res.json({
      message: 'Provider updated successfully',
      providerId: id
    });
  } catch (error) {
    logger.error(`Failed to update provider ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update provider',
      details: error.message
    });
  }
});

// DELETE /api/v1/inference/providers/:id
// Remove provider
router.delete('/providers/:id', getInferenceRouter, async (req, res) => {
  try {
    const { id } = req.params;
    
    await req.inferenceRouter.removeProvider(id);
    
    logger.info('Removed provider', {
      providerId: id
    });

    res.json({
      message: 'Provider removed successfully',
      providerId: id
    });
  } catch (error) {
    logger.error(`Failed to remove provider ${req.params.id}:`, error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to remove provider',
      details: error.message
    });
  }
});

// POST /api/v1/inference/config
// Update router configuration
router.post('/config', getInferenceRouter, async (req, res) => {
  try {
    const config = req.body;
    
    await req.inferenceRouter.updateConfig(config);
    
    logger.info('Updated router configuration', {
      configKeys: Object.keys(config)
    });

    res.json({
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update configuration:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update configuration',
      details: error.message
    });
  }
});

// Utility function to generate IDs
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export default router;