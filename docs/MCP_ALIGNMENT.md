# MCP Alignment - ORCA Core

**Model Context Protocol (MCP) Compliance**  
**Version**: 1.0.0  
**Date**: 2025-10-30

## Overview

This document describes how ORCA Core aligns with and extends the Model Context Protocol (MCP) standard.

## MCP Fundamentals

### What is MCP?

The Model Context Protocol (MCP) is a standardized protocol for:
- Agent registration and discovery
- Context sharing between agents
- Tool/function calling
- Streaming responses
- Capability negotiation

**Key Principles**:
1. **Vendor Neutrality**: Works with any LLM provider
2. **Standardized Interfaces**: Common API contracts
3. **Context Portability**: Share context across agents
4. **Security First**: Built-in authentication and authorization

## ORCA's MCP Implementation

### 1. Agent Registry (MCP-Compliant)

**MCP Standard**: Agent registration with metadata  
**ORCA Implementation**: `src/registry/agent-registry.ts`

```typescript
interface MCPConfig {
  protocol_version: string;       // MCP version (e.g., "1.0.0")
  capabilities: string[];         // Supported capabilities
  context_window: number;         // Token limit
  temperature: number;            // Sampling temperature
  top_p: number;                 // Nucleus sampling
  max_tokens: number;            // Max generation length
  system_prompt_template?: string; // System instructions
}
```

**Extensions**:
- Compliance tier classification
- Policy attachment
- Observability configuration
- Deployment metadata

**Example Registration**:
```yaml
# mcp_registry.yaml
agents:
  - id: "chatgpt-customer-service"
    name: "Customer Support ChatBot"
    type: "chatbot"
    vendor: "openai"
    model: "gpt-4-turbo-2024-04-09"
    status: "active"
    mcp_config:
      protocol_version: "1.0.0"
      capabilities:
        - "context_sharing"
        - "tool_use"
        - "streaming_responses"
      context_window: 128000
      temperature: 0.7
```

### 2. Context Sharing

**MCP Standard**: Federated context exchange  
**ORCA Implementation**: `src/context-bus/` (foundation)

**MCP Context Format**:
```json
{
  "context_id": "ctx-123",
  "agent_id": "agent-456",
  "content": "...",
  "metadata": {
    "timestamp": "2025-10-30T...",
    "classification": "internal",
    "ttl_seconds": 3600
  }
}
```

**ORCA Extensions**:
- Vector embeddings for semantic search
- Multi-modal context (text, images, audio)
- Deduplication and versioning
- Access control and encryption

**Context Bus Features**:
```yaml
# context_bus.yaml
storage:
  type: "pgvector"  # MCP-compatible storage
  dimension: 1536   # Embedding dimension

search:
  algorithm: "cosine"  # MCP-standard similarity
  threshold: 0.75

deduplication:
  enabled: true
  threshold: 0.95  # Cosine similarity
```

### 3. Capability Negotiation

**MCP Standard**: Declare and negotiate capabilities  
**ORCA Implementation**: Automatic detection and validation

**Supported Capabilities**:
```typescript
const STANDARD_MCP_CAPABILITIES = [
  // Core
  'context_sharing',
  'tool_use',
  'streaming_responses',
  
  // Advanced
  'structured_outputs',
  'batch_processing',
  'code_execution',
  
  // ORCA Extensions
  'policy_enforcement',
  'telemetry_export',
  'trust_scoring'
];
```

**Capability Checking**:
```typescript
const agent = await agentRegistry.getById('agent-123');
const hasToolUse = agent.mcp_config?.capabilities.includes('tool_use');
```

### 4. Tool/Function Calling

**MCP Standard**: Structured function definitions  
**ORCA Implementation**: Aligned with MCP tool schema

**MCP Tool Schema**:
```json
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "parameters": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name"
      }
    },
    "required": ["location"]
  }
}
```

**ORCA Extensions**:
- Policy checks before tool execution
- Audit logging of tool calls
- Rate limiting per tool
- Tool result validation

### 5. Streaming Responses

**MCP Standard**: Server-sent events (SSE) or WebSocket  
**ORCA Implementation**: Planned for Phase 2

**Current**: HTTP/JSON responses  
**Roadmap**: Add SSE and WebSocket support

```typescript
// Future API
app.get('/api/v1/agents/:id/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  // Stream MCP-compliant events
});
```

## ORCA's MCP Extensions

### 1. Policy Layer

**Not in MCP**: Policy enforcement and governance  
**ORCA Addition**: Full policy framework

**Benefits**:
- RBAC for MCP agents
- Data classification (public, confidential, etc.)
- Compliance (NIST AI RMF, OWASP LLM Top 10)
- PII detection and redaction

**Example**:
```yaml
# policy_rules.yaml
policies:
  - id: "mcp-agent-rbac"
    applies_to: "mcp_agents"
    rules:
      - allow_role: ["admin", "power_user"]
      - deny_pii_in_public_context: true
```

### 2. Trust Scoring

**Not in MCP**: Agent reliability metrics  
**ORCA Addition**: UADSI trust scoring

**Trust Score Components**:
- Reliability (uptime, error rates)
- Policy adherence (violations)
- Context freshness (data staleness)
- Risk exposure (compliance tier)

**Integration with MCP**:
```typescript
// Attach trust score to MCP agent
const agent = await agentRegistry.getById('agent-123');
const trustScore = await trustScoringEngine.computeTrustScore('agent-123');

agent.metadata.trust_score = trustScore.score;
```

### 3. Observability

**Not in MCP**: Telemetry and monitoring  
**ORCA Addition**: OpenTelemetry integration

**Observability Features**:
- Distributed tracing with correlation IDs
- Custom metrics (trust score, drift rate)
- Structured logging with PII redaction
- Automatic alert generation

**MCP Event Tracing**:
```typescript
// Trace MCP context sharing
await withSpan('mcp_context_share', async (span) => {
  span.setAttribute('agent_id', agentId);
  span.setAttribute('context_size', contextSize);
  
  await contextBus.shareContext(context);
});
```

### 4. Discovery & Synchronization

**Not in MCP**: Multi-platform agent discovery  
**ORCA Addition**: UADSI discovery and sync analysis

**Discovery Sources**:
- MCP servers (native)
- Zapier, Make, n8n (adapters)
- Airflow, Lambda (adapters)

**Sync Monitoring**:
- Detect MCP context staleness
- Monitor cross-agent sync lag
- Alert on sync gaps

## MCP Compliance Matrix

| MCP Feature | Status | Implementation | Notes |
|-------------|--------|----------------|-------|
| Agent Registration | ✅ Full | `src/registry/` | MCP-compliant schema |
| Capability Declaration | ✅ Full | `mcp_config.capabilities` | Standard + extensions |
| Context Sharing | 🟡 Partial | `src/context-bus/` | Foundation only |
| Tool Calling | 🟡 Planned | Roadmap | Phase 2 |
| Streaming | 🟡 Planned | Roadmap | Phase 2 |
| Authentication | ✅ Full | JWT + API keys | MCP-compatible |
| Encryption | ✅ Full | TLS 1.3 | At rest + in transit |

**Legend**:
- ✅ Full: Complete MCP compliance
- 🟡 Partial: Foundation in place, full implementation pending
- 🟡 Planned: On roadmap

## Migration from Non-MCP Agents

### Step 1: Assess Current Agent

```typescript
// Check if agent is MCP-compatible
const isMCP = agent.mcp_config !== undefined;

if (!isMCP) {
  // Non-MCP agent - needs adapter
  console.log('Creating adapter for non-MCP agent');
}
```

### Step 2: Create MCP Configuration

```yaml
# Add MCP config to existing agent
mcp_config:
  protocol_version: "1.0.0"
  capabilities:
    - "context_sharing"  # Minimum required
  context_window: 4096   # Token limit
  temperature: 0.7
```

### Step 3: Implement Adapter (if needed)

```typescript
// Example: Zapier to MCP adapter
class ZapierMCPAdapter {
  async transformToMCPFormat(zapierEvent) {
    return {
      event_type: 'mcp.context.share',
      agent_id: zapierEvent.zap_id,
      content: zapierEvent.data,
      mcp_config: {
        protocol_version: '1.0.0',
        capabilities: ['context_sharing']
      }
    };
  }
}
```

### Step 4: Register in ORCA

```typescript
await agentRegistry.register({
  name: 'Migrated Agent',
  type: 'service',
  vendor: 'custom',
  model: 'legacy',
  mcp_config: {
    protocol_version: '1.0.0',
    capabilities: ['context_sharing'],
    context_window: 4096,
    temperature: 0.7
  }
});
```

## Best Practices

### 1. MCP Configuration

✅ **DO**:
- Set realistic context_window (match model limits)
- Declare only supported capabilities
- Use semantic versioning for protocol_version
- Include meaningful system_prompt_template

❌ **DON'T**:
- Over-declare capabilities you don't support
- Hardcode secrets in configuration
- Ignore MCP version compatibility
- Skip capability validation

### 2. Context Sharing

✅ **DO**:
- Encrypt sensitive context
- Set appropriate TTLs
- Use deduplication to save storage
- Tag contexts for easy retrieval

❌ **DON'T**:
- Share PII without redaction
- Keep stale contexts indefinitely
- Skip access control checks
- Ignore classification labels

### 3. Tool Integration

✅ **DO**:
- Validate tool inputs
- Log all tool executions
- Handle errors gracefully
- Rate limit tool calls

❌ **DON'T**:
- Execute untrusted tool code
- Skip policy checks
- Ignore audit requirements
- Allow unbounded tool execution

## Interoperability

### MCP Server Integration

```typescript
// Connect to external MCP server
agentDiscovery.addSource({
  type: 'mcp',
  endpoint: 'https://mcp-server.example.com',
  credentials: {
    apiKey: process.env.MCP_API_KEY
  }
});

// Scan and register agents
await agentDiscovery.scanAll();
```

### Cross-Platform Context

```typescript
// Share context from Zapier to MCP agent
const zapierEvent = await zapierAdapter.transformToMeshEvent(webhook);
const mcpContext = await contextBus.publishContext(zapierEvent.data);

// MCP agent can now access context
const contexts = await contextBus.searchContext({
  agent_id: 'mcp-agent-123',
  similarity_threshold: 0.8
});
```

## Future MCP Enhancements

### Roadmap

1. **Q1 2026**: Full context bus with pgvector
2. **Q2 2026**: Tool calling framework
3. **Q3 2026**: Streaming responses (SSE + WebSocket)
4. **Q4 2026**: Multi-agent orchestration

### Research Areas

- **Federated MCP**: Cross-org agent collaboration
- **MCP Extensions**: Standard proposals for governance
- **Performance**: Optimize context sharing at scale
- **Security**: Zero-trust architecture for MCP

---

## References

- **MCP Specification**: https://modelcontextprotocol.io/spec
- **ORCA MCP Registry**: `/mcp_registry.yaml`
- **Context Bus Config**: `/context_bus.yaml`
- **Implementation**: `/src/registry/`, `/src/context-bus/`

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-10-30  
**Maintained By**: ORCA Platform Team
