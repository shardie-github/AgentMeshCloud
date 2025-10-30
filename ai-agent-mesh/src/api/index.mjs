#!/usr/bin/env node

/**
 * AI-Agent Mesh API Gateway
 * 
 * Unified GraphQL + REST API gateway for external integrations.
 * Routes requests to registry, policy, telemetry services.
 * 
 * @version 1.0.0
 * @module api
 */

import express from 'express';
import cors from 'cors';
import { createYoga } from 'graphql-yoga';
import { createSchema } from 'graphql-yoga';

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================================
// SERVICE PROXIES
// ============================================================================

const SERVICES = {
  registry: process.env.REGISTRY_URL || 'http://localhost:3001',
  telemetry: process.env.TELEMETRY_URL || 'http://localhost:3002',
  policy: process.env.POLICY_URL || 'http://localhost:3003'
};

async function proxyRequest(service, path, options = {}) {
  try {
    const url = `${SERVICES[service]}${path}`;
    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(`Proxy error [${service}]:`, error.message);
    throw new Error(`Service ${service} unavailable`);
  }
}

// ============================================================================
// GRAPHQL SCHEMA
// ============================================================================

const typeDefs = `
  type Query {
    agents(status: String, vendor: String, type: String): AgentList!
    agent(id: ID!): Agent
    policies: PolicyList!
    policy(id: ID!): Policy
    complianceReport(agentId: ID!): ComplianceReport!
    telemetryDashboard: TelemetryDashboard!
    auditLogs(agentId: ID, userId: String, startDate: String, endDate: String): AuditLogList!
  }
  
  type Mutation {
    registerAgent(input: AgentInput!): Agent!
    updateAgent(id: ID!, input: AgentUpdateInput!): Agent!
    suspendAgent(id: ID!, reason: String!): Agent!
    attachPolicy(agentId: ID!, policyId: ID!, enforcement: String): Agent!
  }
  
  type Agent {
    id: ID!
    name: String!
    type: String!
    vendor: String!
    model: String!
    status: String!
    compliance_tier: String
    policies: [PolicyRef!]
    metadata: AgentMetadata
  }
  
  type AgentList {
    count: Int!
    agents: [Agent!]!
  }
  
  input AgentInput {
    id: ID
    name: String!
    type: String!
    vendor: String!
    model: String!
    status: String
    compliance_tier: String
  }
  
  input AgentUpdateInput {
    name: String
    status: String
    compliance_tier: String
  }
  
  type Policy {
    id: ID!
    name: String!
    version: String!
    type: String!
    enabled: Boolean!
  }
  
  type PolicyList {
    count: Int!
    policies: [Policy!]!
  }
  
  type PolicyRef {
    policy_id: String!
    version: String!
    enforcement: String!
  }
  
  type ComplianceReport {
    agent_id: ID!
    agent_name: String!
    compliance_tier: String!
    policies_attached: Int!
    status: String!
    recommendations: [String!]!
  }
  
  type TelemetryDashboard {
    timestamp: String!
    agents: DashboardAgents!
    requests: DashboardRequests!
    logs: DashboardLogs!
    performance: DashboardPerformance!
  }
  
  type DashboardAgents {
    total: Int!
  }
  
  type DashboardRequests {
    total: Int!
    success: Int!
    error: Int!
  }
  
  type DashboardLogs {
    total: Int!
  }
  
  type DashboardPerformance {
    avg_latency_ms: Float!
    p95_latency_ms: Float!
    p99_latency_ms: Float!
  }
  
  type AuditLogList {
    count: Int!
    logs: [AuditLog!]!
  }
  
  type AuditLog {
    log_id: ID!
    timestamp: String!
    agent_id: String
    user_id: String
  }
  
  type AgentMetadata {
    created_at: String
    updated_at: String
    tags: [String!]
  }
`;

const resolvers = {
  Query: {
    agents: async (_, args) => {
      const queryParams = new URLSearchParams(args).toString();
      return await proxyRequest('registry', `/api/v1/agents?${queryParams}`);
    },
    
    agent: async (_, { id }) => {
      return await proxyRequest('registry', `/api/v1/agents/${id}`);
    },
    
    policies: async () => {
      return await proxyRequest('policy', '/api/v1/policies');
    },
    
    policy: async (_, { id }) => {
      return await proxyRequest('policy', `/api/v1/policies/${id}`);
    },
    
    complianceReport: async (_, { agentId }) => {
      return await proxyRequest('registry', `/api/v1/agents/${agentId}/compliance-report`);
    },
    
    telemetryDashboard: async () => {
      return await proxyRequest('telemetry', '/api/v1/dashboard');
    },
    
    auditLogs: async (_, args) => {
      const queryParams = new URLSearchParams(args).toString();
      return await proxyRequest('policy', `/api/v1/audit-logs?${queryParams}`);
    }
  },
  
  Mutation: {
    registerAgent: async (_, { input }) => {
      return await proxyRequest('registry', '/api/v1/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
    },
    
    updateAgent: async (_, { id, input }) => {
      return await proxyRequest('registry', `/api/v1/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
    },
    
    suspendAgent: async (_, { id, reason }) => {
      return await proxyRequest('registry', `/api/v1/agents/${id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
    },
    
    attachPolicy: async (_, { agentId, policyId, enforcement }) => {
      return await proxyRequest('registry', `/api/v1/agents/${agentId}/policies/${policyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enforcement: enforcement || 'blocking' })
      });
    }
  }
};

// Create GraphQL server
const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers
  }),
  graphqlEndpoint: '/graphql',
  landingPage: true
});

// ============================================================================
// REST API ROUTES (Proxied)
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: SERVICES
  });
});

// Proxy REST endpoints
app.use('/api/v1/agents', async (req, res) => {
  try {
    const result = await proxyRequest('registry', req.path, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/v1/policies', async (req, res) => {
  try {
    const result = await proxyRequest('policy', req.path, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/v1/telemetry', async (req, res) => {
  try {
    const result = await proxyRequest('telemetry', req.path, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mount GraphQL
app.use('/graphql', yoga);

// ============================================================================
// STARTUP
// ============================================================================

const PORT = process.env.API_PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║   AI-Agent Mesh API Gateway v1.0.0             ║`);
  console.log(`║   Port: ${PORT}                                    ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
  console.log(`🌐 GraphQL: http://localhost:${PORT}/graphql`);
  console.log(`🔌 REST API: http://localhost:${PORT}/api/v1`);
  console.log(`💚 Health: http://localhost:${PORT}/health\n`);
});

export { app };
