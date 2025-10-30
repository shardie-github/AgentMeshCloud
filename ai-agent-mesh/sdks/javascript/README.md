# AI-Agent Mesh JavaScript SDK

Official JavaScript/TypeScript SDK for the AI-Agent Mesh platform.

[![npm version](https://badge.fury.io/js/%40ai-agent-mesh%2Fsdk.svg)](https://www.npmjs.com/package/@ai-agent-mesh/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Installation

```bash
npm install @ai-agent-mesh/sdk
# or
yarn add @ai-agent-mesh/sdk
# or
pnpm add @ai-agent-mesh/sdk
```

## Quick Start

```typescript
import { createClient } from '@ai-agent-mesh/sdk';

const client = createClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.ai-agent-mesh.com/v3' // optional
});

// Create an agent
const agent = await client.createAgent({
  name: 'My AI Agent',
  type: 'conversational',
  config: {
    model: 'gpt-4',
    temperature: 0.7
  },
  status: 'active'
});

// Create and execute a workflow
const workflow = await client.createWorkflow({
  agentId: agent.id,
  definition: {
    steps: [
      { action: 'process', params: { input: 'data' } }
    ]
  }
});

const result = await client.executeWorkflow(workflow.id);
console.log('Workflow result:', result);
```

## Features

### Agent Management

```typescript
// Create an agent
const agent = await client.createAgent({
  name: 'Customer Support Agent',
  type: 'support',
  config: { /* ... */ },
  status: 'active'
});

// List all agents
const agents = await client.listAgents({ 
  status: 'active',
  limit: 50 
});

// Update agent
await client.updateAgent(agent.id, {
  config: { temperature: 0.8 }
});

// Delete agent
await client.deleteAgent(agent.id);
```

### Workflow Orchestration

```typescript
// Create a workflow
const workflow = await client.createWorkflow({
  agentId: 'agent_123',
  definition: {
    trigger: 'webhook',
    steps: [
      { action: 'validate', params: { schema: 'input-schema' } },
      { action: 'process', params: { model: 'gpt-4' } },
      { action: 'notify', params: { channel: 'slack' } }
    ]
  }
});

// Execute workflow
const result = await client.executeWorkflow(workflow.id, {
  input: { message: 'Hello world' }
});

// Get execution history
const history = await client.getWorkflowHistory(workflow.id);
```

### Governance & Compliance

```typescript
// Apply a policy
await client.applyPolicy(agent.id, {
  name: 'GDPR Compliance',
  framework: 'GDPR',
  rules: {
    dataRetention: '90days',
    piiHandling: 'strict',
    rightToBeForgotten: true
  },
  enforcementMode: 'enforce'
});

// Check compliance
const compliance = await client.checkCompliance(agent.id);
console.log('Compliance status:', compliance);
```

### Real-time Telemetry

```typescript
// Get historical telemetry
const events = await client.getTelemetry(agent.id, {
  startDate: '2025-10-01',
  endDate: '2025-10-30',
  eventType: 'execution'
});

// Stream real-time telemetry
const stopStreaming = client.streamTelemetry(agent.id, (event) => {
  console.log('New event:', event);
});

// Stop streaming when done
stopStreaming();
```

### Event Handling

```typescript
// Listen to SDK events
client.on('agent:created', (agent) => {
  console.log('Agent created:', agent.id);
});

client.on('workflow:executed', (result) => {
  console.log('Workflow executed:', result);
});

client.on('error', (error) => {
  console.error('SDK error:', error);
});
```

### Webhooks

```typescript
// Register a webhook
const webhook = await client.registerWebhook({
  url: 'https://your-app.com/webhooks',
  events: ['agent.created', 'workflow.completed', 'policy.violated'],
  secret: 'your-webhook-secret'
});

// Verify webhook signatures in your endpoint
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-mesh-signature'];
  const isValid = client.verifyWebhookSignature(
    JSON.stringify(req.body),
    signature
  );
  
  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  res.status(200).send('OK');
});
```

### Policy Marketplace

```typescript
// Browse marketplace policies
const policies = await client.browseMarketplace({
  category: 'compliance',
  framework: 'HIPAA'
});

// Install a policy
const installedPolicy = await client.installPolicy(
  'policy_marketplace_id',
  agent.id
);
```

### Usage & Limits

```typescript
// Check current usage
const usage = await client.getUsage();
console.log('API calls this month:', usage.apiCalls);
console.log('Agent hours:', usage.agentHours);

// Check account limits
const limits = await client.getLimits();
console.log('Max agents:', limits.agents);
console.log('API calls remaining:', limits.apiCallsRemaining);
```

## Configuration Options

```typescript
const client = createClient({
  apiKey: 'your-api-key',          // Required
  baseURL: 'https://api.custom.com', // Optional, defaults to production
  timeout: 30000,                   // Optional, request timeout in ms
  retryAttempts: 3,                 // Optional, number of retry attempts
  webhookSecret: 'your-secret'      // Optional, for webhook verification
});
```

## Error Handling

```typescript
try {
  const agent = await client.createAgent({ /* ... */ });
} catch (error) {
  if (error.response) {
    // API error
    console.error('Status:', error.response.status);
    console.error('Message:', error.response.data.message);
  } else if (error.request) {
    // Network error
    console.error('Network error:', error.message);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { Agent, Workflow, Policy, TelemetryEvent } from '@ai-agent-mesh/sdk';

const agent: Agent = await client.getAgent('agent_123');
const workflow: Workflow = await client.createWorkflow({ /* ... */ });
```

## Advanced Usage

### Custom Base URL for Self-Hosted Deployments

```typescript
const client = createClient({
  apiKey: 'your-api-key',
  baseURL: 'https://mesh.your-company.com/api/v3'
});
```

### Batch Operations

```typescript
// Create multiple agents concurrently
const agentConfigs = [
  { name: 'Agent 1', type: 'support', config: {}, status: 'active' },
  { name: 'Agent 2', type: 'sales', config: {}, status: 'active' }
];

const agents = await Promise.all(
  agentConfigs.map(config => client.createAgent(config))
);
```

## Support

- **Documentation:** https://docs.ai-agent-mesh.com
- **API Reference:** https://api.ai-agent-mesh.com/docs
- **GitHub Issues:** https://github.com/ai-agent-mesh/sdk-js/issues
- **Community Discord:** https://discord.gg/ai-agent-mesh

## License

MIT © AI-Agent Mesh Team
