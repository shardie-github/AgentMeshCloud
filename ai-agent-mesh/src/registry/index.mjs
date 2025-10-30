#!/usr/bin/env node

/**
 * AI-Agent Mesh Registry Service
 * 
 * Central registry for agent discovery, registration, and metadata management.
 * MCP-compliant with PostgreSQL + Redis caching.
 * 
 * @version 1.0.0
 * @module registry
 */

import express from 'express';
import crypto from 'crypto';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

// ============================================================================
// IN-MEMORY STORAGE (Replace with PostgreSQL in production)
// ============================================================================

const agents = new Map();
const policies = new Map();
const contextSources = new Map();

// Load initial data from mcp_registry.yaml
function loadRegistryData() {
  try {
    const registryPath = path.join(process.cwd(), 'ai-agent-mesh', 'mcp_registry.yaml');
    const data = yaml.load(fs.readFileSync(registryPath, 'utf8'));
    
    // Load agents
    if (data.agents) {
      data.agents.forEach(agent => {
        agents.set(agent.id, agent);
      });
      console.log(`✓ Loaded ${agents.size} agents from registry`);
    }
    
    // Load policies
    if (data.policies) {
      data.policies.forEach(policy => {
        policies.set(policy.id, policy);
      });
      console.log(`✓ Loaded ${policies.size} policies from registry`);
    }
    
    // Load context sources
    if (data.context_sources) {
      data.context_sources.forEach(source => {
        contextSources.set(source.id, source);
      });
      console.log(`✓ Loaded ${contextSources.size} context sources from registry`);
    }
    
  } catch (error) {
    console.warn('⚠️  Could not load registry data:', error.message);
  }
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'registry',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      agents: agents.size,
      policies: policies.size,
      context_sources: contextSources.size
    }
  });
});

// List all agents
app.get('/api/v1/agents', (req, res) => {
  const { status, vendor, type, compliance_tier } = req.query;
  
  let filtered = Array.from(agents.values());
  
  if (status) {
    filtered = filtered.filter(a => a.status === status);
  }
  if (vendor) {
    filtered = filtered.filter(a => a.vendor === vendor);
  }
  if (type) {
    filtered = filtered.filter(a => a.type === type);
  }
  if (compliance_tier) {
    filtered = filtered.filter(a => a.compliance_tier === compliance_tier);
  }
  
  res.json({
    count: filtered.length,
    agents: filtered
  });
});

// Get single agent
app.get('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  res.json(agent);
});

// Register new agent
app.post('/api/v1/agents', (req, res) => {
  const agent = {
    id: req.body.id || `agent-${crypto.randomUUID()}`,
    name: req.body.name,
    type: req.body.type,
    vendor: req.body.vendor,
    model: req.body.model,
    status: req.body.status || 'active',
    mcp_config: req.body.mcp_config || {},
    policies: req.body.policies || [],
    context_sources: req.body.context_sources || [],
    owners: req.body.owners || [],
    compliance_tier: req.body.compliance_tier || 'standard',
    observability: req.body.observability || {},
    deployment: req.body.deployment || {},
    metadata: {
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: req.body.tags || []
    }
  };
  
  agents.set(agent.id, agent);
  
  res.status(201).json(agent);
});

// Update agent
app.put('/api/v1/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const updated = {
    ...agent,
    ...req.body,
    id: agent.id, // Preserve ID
    metadata: {
      ...agent.metadata,
      updated_at: new Date().toISOString()
    }
  };
  
  agents.set(agent.id, updated);
  
  res.json(updated);
});

// Suspend agent
app.post('/api/v1/agents/:id/suspend', (req, res) => {
  const agent = agents.get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  agent.status = 'suspended';
  agent.metadata.suspended_at = new Date().toISOString();
  agent.metadata.suspension_reason = req.body.reason || 'Manual suspension';
  agent.metadata.updated_at = new Date().toISOString();
  
  agents.set(agent.id, agent);
  
  res.json(agent);
});

// Attach policy to agent
app.post('/api/v1/agents/:id/policies/:policyId', (req, res) => {
  const agent = agents.get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const policy = policies.get(req.params.policyId);
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  
  const policyRef = {
    policy_id: req.params.policyId,
    version: policy.version,
    enforcement: req.body.enforcement || 'blocking'
  };
  
  agent.policies = agent.policies || [];
  agent.policies.push(policyRef);
  agent.metadata.updated_at = new Date().toISOString();
  
  agents.set(agent.id, agent);
  
  res.json(agent);
});

// List policies
app.get('/api/v1/policies', (req, res) => {
  res.json({
    count: policies.size,
    policies: Array.from(policies.values())
  });
});

// Get single policy
app.get('/api/v1/policies/:id', (req, res) => {
  const policy = policies.get(req.params.id);
  
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  
  res.json(policy);
});

// List context sources
app.get('/api/v1/context-sources', (req, res) => {
  res.json({
    count: contextSources.size,
    context_sources: Array.from(contextSources.values())
  });
});

// Search agents
app.get('/api/v1/search', (req, res) => {
  const query = req.query.q?.toLowerCase();
  
  if (!query) {
    return res.status(400).json({ error: 'Search query required' });
  }
  
  const results = Array.from(agents.values()).filter(agent => {
    return agent.name.toLowerCase().includes(query) ||
           agent.id.toLowerCase().includes(query) ||
           agent.type.toLowerCase().includes(query) ||
           agent.vendor.toLowerCase().includes(query) ||
           (agent.metadata.tags && agent.metadata.tags.some(tag => 
             tag.toLowerCase().includes(query)
           ));
  });
  
  res.json({
    query,
    count: results.length,
    results
  });
});

// Compliance report for agent
app.get('/api/v1/agents/:id/compliance-report', (req, res) => {
  const agent = agents.get(req.params.id);
  
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  const report = {
    agent_id: agent.id,
    agent_name: agent.name,
    compliance_tier: agent.compliance_tier,
    generated_at: new Date().toISOString(),
    policies_attached: agent.policies?.length || 0,
    policies: agent.policies?.map(p => {
      const policy = policies.get(p.policy_id);
      return {
        policy_id: p.policy_id,
        policy_name: policy?.name || 'Unknown',
        version: p.version,
        enforcement: p.enforcement,
        framework: policy?.framework || 'Unknown'
      };
    }) || [],
    compliance_frameworks: [],
    status: 'compliant',
    recommendations: []
  };
  
  // Determine compliance frameworks
  const frameworks = new Set();
  report.policies.forEach(p => {
    if (p.framework) frameworks.add(p.framework);
  });
  report.compliance_frameworks = Array.from(frameworks);
  
  // Recommendations
  if (report.policies_attached === 0) {
    report.status = 'non_compliant';
    report.recommendations.push('No policies attached. Attach governance policies.');
  }
  
  if (agent.compliance_tier === 'critical' && report.policies_attached < 3) {
    report.status = 'partial_compliant';
    report.recommendations.push('Critical tier agents should have comprehensive policies.');
  }
  
  res.json(report);
});

// ============================================================================
// STARTUP
// ============================================================================

const PORT = process.env.REGISTRY_PORT || 3001;

loadRegistryData();

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║   AI-Agent Mesh Registry Service v1.0.0       ║`);
  console.log(`║   Port: ${PORT}                                    ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
  console.log(`📡 Registry API: http://localhost:${PORT}/api/v1`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
});

export { app, agents, policies, contextSources };
