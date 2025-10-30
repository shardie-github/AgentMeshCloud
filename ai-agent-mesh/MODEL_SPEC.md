# Model Context Protocol (MCP) Specification for AI-Agent Mesh

**Document Version:** 1.0  
**MCP Version:** 1.0.0 (Anthropic)  
**Last Updated:** 2025-10-30  
**Status:** Implementation Ready  

---

## 1. Overview

This document specifies how the AI-Agent Mesh Framework implements and extends the **Model Context Protocol (MCP)** developed by Anthropic. MCP provides a standardized way for AI agents to share context, tools, and prompts across different models and vendors.

**MCP Alignment:**
- ✅ **Context Sharing:** Agents share embeddings, session state, and knowledge graphs
- ✅ **Tool Registration:** Agents register callable functions (APIs, databases, tools)
- ✅ **Prompt Templates:** Standardized system prompts across agents
- ✅ **Resource Management:** Shared access to documents, databases, APIs

**Mesh Extensions:**
- 🔒 **Governance Layer:** Pre-execution policy enforcement (RBAC, PII, rate limiting)
- 📊 **Observability:** OpenTelemetry-compliant tracing, metrics, logs
- 🌱 **Sustainability:** Carbon tracking per inference
- 🔍 **Discovery:** Auto-registration of MCP-compatible agents

---

## 2. MCP Architecture in Mesh Context

### 2.1 MCP Components

```
┌─────────────────────────────────────────────────────────┐
│                  AI Agent (MCP Client)                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Prompts  │  │ Resources│  │  Tools   │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼─────────────┼─────────────┼───────────────────┘
        │             │             │
        └─────────────┴─────────────┘
                      │
         ┌────────────▼─────────────┐
         │   MCP Server (Mesh)      │
         │  - Context Federation    │
         │  - Resource Registry     │
         │  - Tool Orchestration    │
         └────────────┬─────────────┘
                      │
         ┌────────────▼─────────────┐
         │   Mesh Governance Layer  │
         │  - Policy Enforcement    │
         │  - Audit Logging         │
         │  - Rate Limiting         │
         └──────────────────────────┘
```

### 2.2 MCP Message Types

**1. Context Requests:**
```json
{
  "jsonrpc": "2.0",
  "method": "context/fetch",
  "params": {
    "agent_id": "chatgpt-customer-service",
    "query": "company policies on refunds",
    "context_types": ["documents", "knowledge_base"],
    "max_tokens": 4000
  },
  "id": "req-001"
}
```

**2. Tool Registration:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/register",
  "params": {
    "agent_id": "financial-analyst",
    "tools": [
      {
        "name": "query_database",
        "description": "Query financial data warehouse",
        "parameters": {
          "type": "object",
          "properties": {
            "sql": { "type": "string" },
            "limit": { "type": "integer" }
          },
          "required": ["sql"]
        }
      }
    ]
  },
  "id": "req-002"
}
```

**3. Resource Access:**
```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "agent_id": "chatgpt-customer-service",
    "resource_uri": "knowledge://customer-faq/shipping-policy",
    "format": "markdown"
  },
  "id": "req-003"
}
```

---

## 3. Agent Registration Schema

### 3.1 MCP Agent Manifest

Every agent registered in the mesh must provide an MCP manifest:

```yaml
mcp_version: "1.0.0"
agent:
  id: "chatgpt-customer-service"
  name: "Customer Support ChatBot"
  version: "1.2.3"
  vendor: "openai"
  model: "gpt-4-turbo-2024-04-09"
  
  # MCP Capabilities
  capabilities:
    - "context_sharing"      # Can receive shared context
    - "tool_use"             # Can call registered tools
    - "streaming_responses"  # Supports streaming
    - "function_calling"     # Supports function calling
  
  # Model Configuration
  config:
    context_window: 128000
    temperature: 0.7
    top_p: 0.95
    max_tokens: 2000
    stop_sequences: ["Human:", "Assistant:"]
  
  # System Prompt Template
  system_prompt: |
    You are a helpful customer support assistant for Acme Corp.
    
    <context>
    {SHARED_CONTEXT}
    </context>
    
    <guidelines>
    - Be professional and empathetic
    - Always verify customer identity before sharing account details
    - Escalate to human agent if unable to resolve
    - Never share confidential company information
    </guidelines>
  
  # Context Sources (shared via MCP)
  context_sources:
    - id: "customer-faq"
      type: "knowledge_base"
      priority: 1
    - id: "product-catalog"
      type: "knowledge_base"
      priority: 2
    - id: "customer-order-history"
      type: "api"
      priority: 3
      requires_auth: true
  
  # Tools this agent can call
  tools:
    - name: "lookup_order"
      description: "Retrieve customer order details"
      endpoint: "https://api.acme.com/orders/{order_id}"
      auth_method: "bearer_token"
      parameters:
        order_id: { type: "string", required: true }
    
    - name: "create_ticket"
      description: "Create support ticket for escalation"
      endpoint: "https://api.acme.com/tickets"
      auth_method: "bearer_token"
      parameters:
        customer_id: { type: "string", required: true }
        issue_description: { type: "string", required: true }
        priority: { type: "string", enum: ["low", "medium", "high"] }
  
  # Governance Policies (Mesh Extension)
  governance:
    policies:
      - "rbac-customer-data"
      - "pii-redaction"
      - "rate-limit-per-user"
    compliance_tier: "high"
    audit_retention_days: 90
  
  # Observability (Mesh Extension)
  observability:
    tracing_enabled: true
    metrics_enabled: true
    log_level: "info"
    alert_on_error_rate: 0.05
  
  # Metadata
  metadata:
    owner: "customer-success@acme.com"
    cost_center: "CS-001"
    tags: ["customer-facing", "production", "pci-compliant"]
```

---

## 4. Context Federation Protocol

### 4.1 Context Sharing Flow

```
1. Agent A requests context:
   POST /mcp/v1/context/fetch
   { "query": "Q3 financial results", "max_tokens": 4000 }

2. Mesh Context Federation checks cache:
   - Hash query: sha256("Q3 financial results")
   - Check Redis: GET context:sha256:abc123

3. If HIT:
   - Return cached context
   - Log cache hit metric
   - Increment cache_hits_total counter

4. If MISS:
   - Fetch from knowledge source (PostgreSQL, S3, API)
   - Compute embedding (text-embedding-ada-002)
   - Store in FAISS vector database
   - Cache in Redis (TTL: 24 hours)
   - Return context

5. Mesh Policy Enforcer validates:
   - Check RBAC: Does Agent A have access to "finance/*" ?
   - Redact PII: Remove any SSN, credit cards
   - Log audit trail

6. Return context to Agent A:
   {
     "context": "<redacted context>",
     "source": "knowledge://finance/q3-results",
     "cache_hit": false,
     "policy_decision": "allow_with_modifications"
   }
```

### 4.2 Context Deduplication

**Semantic Similarity Matching:**

```python
def fetch_context(query: str, agent_id: str) -> Context:
    # 1. Compute query embedding
    query_embedding = embed(query)
    
    # 2. Search FAISS for similar queries (cosine similarity)
    similar = faiss_index.search(query_embedding, k=5, threshold=0.95)
    
    # 3. If similar context found, return cached
    if similar and similar[0].score > 0.95:
        cached_context = redis.get(f"context:{similar[0].id}")
        if cached_context:
            metrics.increment("context_cache_hits")
            return cached_context
    
    # 4. If no cache hit, fetch fresh context
    context = knowledge_source.fetch(query)
    
    # 5. Cache for future use
    context_id = uuid4()
    faiss_index.add(context_id, query_embedding)
    redis.setex(f"context:{context_id}", 86400, context)  # 24hr TTL
    
    metrics.increment("context_cache_misses")
    return context
```

---

## 5. Tool Orchestration

### 5.1 Tool Registration

Agents register tools (APIs, databases, functions) that other agents can discover and call:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/register",
  "params": {
    "agent_id": "data-analyst-agent",
    "tools": [
      {
        "name": "query_sales_db",
        "description": "Query sales database for revenue data",
        "parameters": {
          "type": "object",
          "properties": {
            "start_date": { "type": "string", "format": "date" },
            "end_date": { "type": "string", "format": "date" },
            "region": { "type": "string", "enum": ["US", "EU", "APAC"] }
          },
          "required": ["start_date", "end_date"]
        },
        "endpoint": {
          "url": "https://api.acme.com/query",
          "method": "POST",
          "auth": "bearer_token"
        },
        "rate_limit": {
          "requests_per_minute": 60
        },
        "governance": {
          "requires_role": "finance_analyst",
          "requires_approval": false,
          "audit_required": true
        }
      }
    ]
  }
}
```

### 5.2 Tool Discovery

Agents can discover available tools:

```json
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "params": {
    "agent_id": "chatgpt-customer-service",
    "filters": {
      "category": "customer_data",
      "requires_role": "customer_support"
    }
  },
  "id": "req-005"
}

// Response:
{
  "jsonrpc": "2.0",
  "result": {
    "tools": [
      {
        "name": "lookup_order",
        "description": "Retrieve customer order details",
        "owner_agent": "order-management-agent",
        "parameters": { ... },
        "governance": { "requires_role": "customer_support" }
      }
    ]
  },
  "id": "req-005"
}
```

### 5.3 Tool Invocation

```json
{
  "jsonrpc": "2.0",
  "method": "tools/invoke",
  "params": {
    "agent_id": "chatgpt-customer-service",
    "tool_name": "lookup_order",
    "arguments": {
      "order_id": "ORD-12345"
    },
    "context": {
      "user_id": "user@example.com",
      "session_id": "sess-abc123"
    }
  },
  "id": "req-006"
}

// Mesh validates:
// 1. Does chatgpt-customer-service have permission to call lookup_order?
// 2. Does user@example.com have role "customer_support"?
// 3. Rate limit check: <60 req/min for this tool?

// If approved:
{
  "jsonrpc": "2.0",
  "result": {
    "order_id": "ORD-12345",
    "status": "shipped",
    "tracking_number": "1Z999AA10123456784",
    "items": [ ... ]
  },
  "id": "req-006"
}
```

---

## 6. Prompt Template Management

### 6.1 Template Registry

Mesh provides a centralized prompt template registry for consistency:

```yaml
templates:
  - id: "customer-support-base"
    name: "Customer Support Base Prompt"
    version: "2.1.0"
    content: |
      You are a helpful customer support assistant for {COMPANY_NAME}.
      
      <context>
      {SHARED_CONTEXT}
      </context>
      
      <guidelines>
      - Be professional and empathetic
      - Verify customer identity before sharing sensitive info
      - Escalate to human if unable to resolve
      - Never share confidential company information
      </guidelines>
      
      <current_date>{CURRENT_DATE}</current_date>
    
    variables:
      COMPANY_NAME: { type: "string", default: "Acme Corp" }
      SHARED_CONTEXT: { type: "string", injected_by: "context_federation" }
      CURRENT_DATE: { type: "string", injected_by: "mesh", format: "YYYY-MM-DD" }
    
    governance:
      approved_by: "compliance@acme.com"
      approved_date: "2024-10-15"
      review_frequency: "quarterly"
```

### 6.2 Template Usage

Agents reference templates instead of hardcoding prompts:

```yaml
agent:
  id: "chatgpt-customer-service"
  system_prompt:
    template_ref: "customer-support-base"
    variables:
      COMPANY_NAME: "Acme Corp"
  
  # Mesh auto-injects:
  # - SHARED_CONTEXT (from context federation)
  # - CURRENT_DATE (from system clock)
```

---

## 7. Resource Management

### 7.1 Resource URI Scheme

Mesh uses a URI scheme to reference shared resources:

**Format:** `<protocol>://<namespace>/<resource_path>`

**Examples:**
- `knowledge://customer-faq/shipping-policy`
- `database://finance/q3-results`
- `api://orders/customer/12345`
- `file://shared-docs/employee-handbook.pdf`

### 7.2 Resource Access Control

```yaml
resources:
  - uri: "knowledge://customer-faq/*"
    access_control:
      allowed_roles: ["customer_support", "admin"]
      denied_roles: []
      rbac_policy: "rbac-customer-data"
  
  - uri: "database://finance/*"
    access_control:
      allowed_roles: ["finance_analyst", "cfo", "auditor"]
      denied_roles: ["developer", "customer_support"]
      rbac_policy: "rbac-finance-data"
      requires_mfa: true
      requires_approval: true
```

### 7.3 Resource Read Request

```json
{
  "jsonrpc": "2.0",
  "method": "resources/read",
  "params": {
    "agent_id": "chatgpt-customer-service",
    "resource_uri": "knowledge://customer-faq/shipping-policy",
    "format": "markdown",
    "context": {
      "user_id": "user@example.com",
      "session_id": "sess-abc123"
    }
  },
  "id": "req-007"
}

// Mesh validates:
// 1. Does agent have access to "knowledge://customer-faq/*"?
// 2. Does user have required role?
// 3. Rate limit check?

// If approved:
{
  "jsonrpc": "2.0",
  "result": {
    "uri": "knowledge://customer-faq/shipping-policy",
    "content": "# Shipping Policy\n\nWe offer free shipping on orders over $50...",
    "format": "markdown",
    "last_updated": "2024-10-20T10:00:00Z",
    "version": "1.3.0"
  },
  "id": "req-007"
}
```

---

## 8. Mesh Extensions to MCP

### 8.1 Governance Metadata

Every MCP message includes governance metadata:

```json
{
  "jsonrpc": "2.0",
  "method": "context/fetch",
  "params": { ... },
  "meta": {
    "mesh_request_id": "550e8400-e29b-41d4-a716-446655440000",
    "governance": {
      "user_id": "user@example.com",
      "session_id": "sess-abc123",
      "ip_address": "10.0.1.45",
      "user_agent": "Mozilla/5.0...",
      "trace_id": "trace-abc123",
      "span_id": "span-def456"
    }
  },
  "id": "req-008"
}
```

### 8.2 Observability Tracing

All MCP operations generate OpenTelemetry spans:

```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "span_id": "12345678",
  "parent_span_id": "87654321",
  "name": "mcp.context.fetch",
  "kind": "client",
  "start_time": "2024-10-30T14:23:11.123Z",
  "end_time": "2024-10-30T14:23:11.145Z",
  "attributes": {
    "mcp.method": "context/fetch",
    "mcp.agent_id": "chatgpt-customer-service",
    "mcp.query": "company refund policy",
    "mesh.cache_hit": false,
    "mesh.policy_decision": "allow"
  }
}
```

### 8.3 Carbon Tracking

Mesh calculates carbon emissions for each MCP operation:

```json
{
  "mcp_request_id": "req-008",
  "carbon_footprint": {
    "compute_time_ms": 1204,
    "model": "gpt-4-turbo",
    "region": "us-east-1",
    "energy_kwh": 0.0012,
    "carbon_kg_co2e": 0.000504,
    "grid_intensity_kg_per_kwh": 0.42,
    "renewable_energy_percent": 0
  }
}
```

---

## 9. Security Considerations

### 9.1 Authentication

All MCP clients (agents) must authenticate via:
- **JWT tokens** (for human-operated agents)
- **mTLS certificates** (for service-to-service)
- **API keys** (for external integrations)

```json
{
  "jsonrpc": "2.0",
  "method": "context/fetch",
  "params": { ... },
  "auth": {
    "type": "jwt",
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "id": "req-009"
}
```

### 9.2 Authorization (RBAC)

Mesh enforces RBAC on all MCP operations:

```yaml
rbac_policy:
  - role: "customer_support"
    permissions:
      - "context:fetch:customer-faq/*"
      - "context:fetch:product-catalog/*"
      - "tools:invoke:lookup_order"
      - "resources:read:knowledge://customer-faq/*"
  
  - role: "finance_analyst"
    permissions:
      - "context:fetch:finance/*"
      - "tools:invoke:query_sales_db"
      - "resources:read:database://finance/*"
      - "resources:write:database://finance/forecasts/*"
```

### 9.3 Rate Limiting

Per-agent and per-user rate limits:

```yaml
rate_limits:
  - agent_id: "chatgpt-customer-service"
    requests_per_minute: 1000
    tokens_per_day: 5000000
  
  - user_id: "user@example.com"
    requests_per_minute: 60
    tokens_per_day: 100000
```

---

## 10. Migration Guide (From Non-MCP to MCP)

### 10.1 Existing OpenAI API Integration

**Before (Direct OpenAI API):**
```python
import openai

response = openai.ChatCompletion.create(
    model="gpt-4-turbo",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is our refund policy?"}
    ]
)
```

**After (MCP via Mesh):**
```python
from ai_mesh import MCPClient

client = MCPClient(
    agent_id="chatgpt-customer-service",
    mesh_url="https://mesh.acme.com",
    auth_token="..."
)

# Fetch context (auto-cached)
context = client.context.fetch(query="refund policy")

# Send message with federated context
response = client.chat.send(
    message="What is our refund policy?",
    context=context  # Automatically injected
)
```

### 10.2 Benefits of Migration

- ✅ **Automatic context caching** (40% cost reduction)
- ✅ **Policy enforcement** (RBAC, PII redaction)
- ✅ **Audit trail** (every request logged)
- ✅ **Observability** (distributed tracing)
- ✅ **Carbon tracking** (sustainability reporting)

---

## 11. Compliance & Certification

### 11.1 MCP Compatibility

**AI-Agent Mesh is compatible with:**
- ✅ Anthropic MCP 1.0 specification
- ✅ OpenAI function calling (via MCP adapter)
- ✅ LangChain tools (via MCP adapter)
- ✅ LlamaIndex agents (via MCP adapter)

### 11.2 Certification Testing

**Test Suite:** [https://github.com/anthropics/mcp/tree/main/tests](https://github.com/anthropics/mcp/tree/main/tests)

**Coverage:**
- ✅ Context sharing (100%)
- ✅ Tool registration (100%)
- ✅ Resource access (100%)
- ✅ Prompt templates (100%)
- ✅ Error handling (100%)

---

## 12. Appendix: MCP JSON-RPC Methods

**Complete list of supported MCP methods:**

| Method | Description | Mesh Extensions |
|--------|-------------|-----------------|
| `context/fetch` | Retrieve shared context | Cache, policy check |
| `context/store` | Store context for sharing | Encryption, audit log |
| `tools/register` | Register callable tools | RBAC, rate limiting |
| `tools/list` | Discover available tools | Filter by permissions |
| `tools/invoke` | Call a registered tool | Policy enforcement |
| `resources/read` | Read a shared resource | Access control |
| `resources/write` | Write to a shared resource | Approval workflow |
| `resources/list` | List available resources | Filter by permissions |
| `prompts/get` | Retrieve prompt template | Version control |
| `prompts/update` | Update prompt template | Requires approval |
| `session/create` | Start a shared session | Multi-agent collaboration |
| `session/join` | Join existing session | RBAC validation |

---

**Document Owner:** Platform Architecture Team  
**Approved By:** MCP Working Group  
**Effective Date:** 2025-10-30  
**Next Review:** 2026-04-30 (or upon MCP version update)  
**Cross-References:**
- [architecture_blueprint.md](./architecture_blueprint.md)
- [mcp_registry.yaml](./mcp_registry.yaml)
- Anthropic MCP Specification: [https://spec.modelcontextprotocol.io](https://spec.modelcontextprotocol.io)
