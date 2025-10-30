#!/usr/bin/env node

/**
 * AI-Agent Mesh Policy Service
 * 
 * REST API wrapper for policy enforcement engine.
 * Exposes policy_enforcer.mjs as HTTP service.
 * 
 * @version 1.0.0
 * @module policy
 */

import express from 'express';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

// Import policy enforcer
let enforcePolicy, getPolicies, getPolicy, getMetrics, getAuditLogs;

try {
  const policyEnforcerPath = path.join(__dirname, '../../policy_enforcer.mjs');
  const module = await import(policyEnforcerPath);
  enforcePolicy = module.enforcePolicy;
  getPolicies = module.getPolicies;
  getPolicy = module.getPolicy;
  getMetrics = module.getMetrics;
  getAuditLogs = module.getAuditLogs;
  console.log('✓ Policy enforcer loaded');
} catch (error) {
  console.error('⚠️  Could not load policy enforcer:', error.message);
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'policy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Evaluate policy for request
app.post('/api/v1/evaluate', async (req, res) => {
  try {
    const { request, context } = req.body;
    
    if (!request) {
      return res.status(400).json({ error: 'Request object required' });
    }
    
    if (!enforcePolicy) {
      return res.status(503).json({ error: 'Policy enforcer not available' });
    }
    
    const evaluation = await enforcePolicy(request, context || {});
    
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ 
      error: 'Policy evaluation failed',
      message: error.message
    });
  }
});

// List all policies
app.get('/api/v1/policies', (req, res) => {
  try {
    if (!getPolicies) {
      return res.status(503).json({ error: 'Policy enforcer not available' });
    }
    
    const policies = getPolicies();
    
    res.json({
      count: policies.length,
      policies
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve policies',
      message: error.message
    });
  }
});

// Get single policy
app.get('/api/v1/policies/:policyId', (req, res) => {
  try {
    if (!getPolicy) {
      return res.status(503).json({ error: 'Policy enforcer not available' });
    }
    
    const policy = getPolicy(req.params.policyId);
    
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(policy);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve policy',
      message: error.message
    });
  }
});

// Get policy metrics
app.get('/api/v1/metrics', (req, res) => {
  try {
    if (!getMetrics) {
      return res.status(503).json({ error: 'Policy enforcer not available' });
    }
    
    const metrics = getMetrics();
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve metrics',
      message: error.message
    });
  }
});

// Get audit logs
app.get('/api/v1/audit-logs', (req, res) => {
  try {
    if (!getAuditLogs) {
      return res.status(503).json({ error: 'Policy enforcer not available' });
    }
    
    const filters = {
      agent_id: req.query.agent_id,
      user_id: req.query.user_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      decision: req.query.decision
    };
    
    const logs = getAuditLogs(filters);
    
    res.json({
      count: logs.length,
      logs: logs.slice(0, parseInt(req.query.limit) || 1000)
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to retrieve audit logs',
      message: error.message
    });
  }
});

// ============================================================================
// STARTUP
// ============================================================================

const PORT = process.env.POLICY_PORT || 3003;

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║   AI-Agent Mesh Policy Service v1.0.0          ║`);
  console.log(`║   Port: ${PORT}                                    ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
  console.log(`🔒 Policy API: http://localhost:${PORT}/api/v1`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
});

export { app };
