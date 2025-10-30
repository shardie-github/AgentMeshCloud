#!/usr/bin/env node
/**
 * UADSI REST API Server
 * Express-based REST API with authentication and rate limiting
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import AgentDiscovery from './uadsi_core/agent_discovery.mjs';
import SyncAnalyzer from './uadsi_core/sync_analyzer.mjs';
import TrustScoring from './uadsi_core/trust_scoring.mjs';
import ReportEngine from './uadsi_core/report_engine.mjs';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/v1/', limiter);

// Authentication middleware
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'uadsi_secret_key');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Initialize UADSI modules
let agentDiscovery, syncAnalyzer, trustScoring, reportEngine;

async function initializeModules() {
  agentDiscovery = new AgentDiscovery();
  syncAnalyzer = new SyncAnalyzer();
  trustScoring = new TrustScoring();
  reportEngine = new ReportEngine();
  
  await Promise.all([
    agentDiscovery.initialize(),
    syncAnalyzer.initialize(),
    trustScoring.initialize(),
    reportEngine.initialize()
  ]);
  
  console.log('✅ All UADSI modules initialized');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes

// ===== AGENTS =====

app.get('/v1/agents', authenticate, async (req, res) => {
  try {
    const { health_status, agent_type, limit = 100, offset = 0 } = req.query;
    
    const filters = {};
    if (health_status) filters.health_status = health_status;
    if (agent_type) filters.agent_type = agent_type;
    
    const agents = await agentDiscovery.getAgents(filters);
    const paginatedAgents = agents.slice(offset, offset + parseInt(limit));
    
    res.json({
      data: paginatedAgents,
      total: agents.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/agents/:agent_id', authenticate, async (req, res) => {
  try {
    const { agent_id } = req.params;
    const agents = await agentDiscovery.getAgents({});
    const agent = agents.find(a => a.agent_id === agent_id);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/agents/:agent_id/trust', authenticate, async (req, res) => {
  try {
    const { agent_id } = req.params;
    const trustScore = await trustScoring.getTrustScore(agent_id, 'agent');
    
    if (!trustScore) {
      return res.status(404).json({ error: 'Trust score not found' });
    }
    
    res.json(trustScore);
  } catch (error) {
    console.error('Error fetching trust score:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ===== WORKFLOWS =====

app.get('/v1/workflows', authenticate, async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    
    const workflows = await agentDiscovery.getWorkflows(filters);
    const paginatedWorkflows = workflows.slice(offset, offset + parseInt(limit));
    
    res.json({
      data: paginatedWorkflows,
      total: workflows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/workflows/:workflow_id', authenticate, async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const workflows = await agentDiscovery.getWorkflows({});
    const workflow = workflows.find(w => w.workflow_id === workflow_id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/workflows/:workflow_id/conformance', authenticate, async (req, res) => {
  try {
    const { workflow_id } = req.params;
    const metrics = await syncAnalyzer.getWorkflowMetrics(workflow_id);
    
    if (!metrics) {
      return res.status(404).json({ error: 'Conformance metrics not found' });
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching conformance:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ===== TRUST =====

app.get('/v1/trust', authenticate, async (req, res) => {
  try {
    const metrics = await trustScoring.getGlobalMetrics();
    res.json({
      ...metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching global trust:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/trust/trend', authenticate, async (req, res) => {
  try {
    const { timeRange = 7 } = req.query;
    const trend = await reportEngine.generateTrustTrendReport(parseInt(timeRange));
    res.json(trend);
  } catch (error) {
    console.error('Error fetching trust trend:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ===== SYNCHRONIZATION =====

app.get('/v1/synchronization/status', authenticate, async (req, res) => {
  try {
    const freshness = await syncAnalyzer.getFreshnessStats();
    const incidents = await syncAnalyzer.getActiveDriftIncidents();
    
    const bySeverity = {};
    for (const incident of incidents) {
      bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
    }
    
    res.json({
      freshness_pct: freshness.avgFreshness || 0,
      active_drift_incidents: incidents.length,
      by_severity: bySeverity,
      critical_incidents: bySeverity.critical || 0,
      high_incidents: bySeverity.high || 0
    });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/synchronization/drift', authenticate, async (req, res) => {
  try {
    const { severity } = req.query;
    let incidents = await syncAnalyzer.getActiveDriftIncidents();
    
    if (severity) {
      incidents = incidents.filter(i => i.severity === severity);
    }
    
    res.json({
      data: incidents,
      total: incidents.length
    });
  } catch (error) {
    console.error('Error fetching drift incidents:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ===== REPORTS =====

app.get('/v1/reports/dashboard', authenticate, async (req, res) => {
  try {
    const dashboard = await reportEngine.generateExecutiveDashboard();
    res.json(dashboard);
  } catch (error) {
    console.error('Error generating dashboard:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.post('/v1/reports/dashboard/export', authenticate, async (req, res) => {
  try {
    const { format = 'json', includeCharts = true } = req.body;
    
    const dashboard = await reportEngine.generateExecutiveDashboard();
    let exportPath;
    
    if (format === 'json') {
      exportPath = await reportEngine.exportJSON(dashboard);
    } else if (format === 'csv') {
      exportPath = await reportEngine.exportCSV(dashboard);
    } else {
      return res.status(400).json({ error: 'Invalid format. Supported: json, csv, pdf' });
    }
    
    // In production, upload to S3/CDN and return signed URL
    const downloadUrl = `/downloads/${exportPath.split('/').pop()}`;
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    
    res.json({
      downloadUrl,
      expiresAt
    });
  } catch (error) {
    console.error('Error exporting dashboard:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/reports/roi', authenticate, async (req, res) => {
  try {
    const roi = await reportEngine.generateROIReport();
    res.json(roi);
  } catch (error) {
    console.error('Error generating ROI report:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

app.get('/v1/reports/compliance', authenticate, async (req, res) => {
  try {
    const compliance = await reportEngine.generateComplianceReport();
    res.json(compliance);
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// ===== COMPLIANCE =====

app.get('/v1/compliance/violations', authenticate, async (req, res) => {
  try {
    // This would query the policy_violations table
    // For now, return mock structure
    res.json({
      data: [],
      total: 0
    });
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
async function start() {
  try {
    await initializeModules();
    
    app.listen(PORT, () => {
      console.log(`🚀 UADSI API Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 API Base: http://localhost:${PORT}/v1`);
    });
  } catch (error) {
    console.error('❌ Failed to start UADSI API:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  await Promise.all([
    agentDiscovery?.shutdown(),
    syncAnalyzer?.shutdown(),
    trustScoring?.shutdown(),
    reportEngine?.shutdown()
  ]);
  
  process.exit(0);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export default app;
