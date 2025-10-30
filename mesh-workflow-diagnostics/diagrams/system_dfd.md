# System Data Flow Diagram (DFD)
**AgentMesh Cloud - Workflow & Automation Architecture**  
**Generated:** 2025-10-30T00:00:00Z

---

## Level 0: Context Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          External Entities                                  │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Users   │  │  Zapier  │  │   Make   │  │   n8n    │  │ Airflow  │   │
│  │          │  │          │  │          │  │          │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │             │           │
│       │             │             │             │             │           │
│       │             └─────────────┴─────────────┴─────────────┘           │
│       │                                 │                                  │
│       │                                 ▼                                  │
│       │                    ┌──────────────────────────┐                   │
│       │                    │                          │                   │
│       └───────────────────▶│   AgentMesh Cloud        │                   │
│                            │   (System Boundary)      │                   │
│                            │                          │                   │
│                            └────────────┬─────────────┘                   │
│                                         │                                  │
│                                         ▼                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   CRM    │  │   ERP    │  │   HRIS   │  │   IDP    │  │ Market   │   │
│  │          │  │          │  │          │  │          │  │  Data    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                                             │
│                        Enterprise Systems                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Level 1: System Overview DFD

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│                           AgentMesh Cloud - System DFD                              │
│                                                                                     │
│  External                                                                           │
│  Triggers                                                                           │
│     │                                                                               │
│     │ [1] HTTP/Webhook                                                             │
│     ▼                                                                               │
│  ┌─────────────────┐                                                               │
│  │  API Gateway    │───[2] Route Request────┐                                      │
│  │  (P: 3000)      │                        │                                      │
│  └────────┬────────┘                        │                                      │
│           │                                 │                                      │
│           │ [3] Policy Check                │                                      │
│           ▼                                 ▼                                      │
│  ┌─────────────────┐              ┌─────────────────┐                             │
│  │ Policy Service  │◀────[4]──────│ Registry Service│                             │
│  │   (OPA/P:3003)  │   Fetch      │   (P: 3001)     │                             │
│  └────────┬────────┘   Policies   └────────┬────────┘                             │
│           │                                 │                                      │
│           │ [5] Decision                    │ [6] Agent                            │
│           │ (allow/deny)                    │     Config                           │
│           ▼                                 ▼                                      │
│  ┌──────────────────────────────────────────────────┐                             │
│  │                                                  │                             │
│  │              Agent Layer (MCP)                   │                             │
│  │                                                  │                             │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐   │                             │
│  │  │ChatGPT    │  │  Claude   │  │  Copilot  │   │                             │
│  │  │Customer   │  │ Financial │  │ Enterprise│   │                             │
│  │  │Support    │  │ Analyst   │  │           │   │                             │
│  │  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘   │                             │
│  │        │              │              │         │                             │
│  └────────┼──────────────┼──────────────┼─────────┘                             │
│           │              │              │                                        │
│           │ [7] Context  │              │                                        │
│           │     Share    │              │                                        │
│           ▼              ▼              ▼                                        │
│  ┌──────────────────────────────────────────────────┐                             │
│  │      Context Federation Service (P: 3004)         │                             │
│  │      - Vector dedup (cosine > 0.95)              │                             │
│  │      - Redis cache (TTL: 24h)                    │                             │
│  └────────────────────┬─────────────────────────────┘                             │
│                       │                                                            │
│                       │ [8] Store/Query                                            │
│                       ▼                                                            │
│  ┌─────────────────────────────────────────────────────────────┐                  │
│  │                   Data Layer                                │                  │
│  │                                                             │                  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐           │                  │
│  │  │ PostgreSQL │  │   Redis    │  │  Vector DB │           │                  │
│  │  │ (P: 5432)  │  │ (P: 6379)  │  │  (Faiss)   │           │                  │
│  │  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘           │                  │
│  │         │               │               │                 │                  │
│  └─────────┼───────────────┼───────────────┼─────────────────┘                  │
│            │               │               │                                     │
│            │ [9] Sync      │               │                                     │
│            ▼               ▼               ▼                                     │
│  ┌──────────────────────────────────────────────────┐                             │
│  │              Enterprise Systems                  │                             │
│  │  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐   │                             │
│  │  │ CRM │  │ ERP │  │HRIS │  │ IDP │  │Mkt  │   │                             │
│  │  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘   │                             │
│  └──────────────────────────────────────────────────┘                             │
│                                                                                     │
│  ┌──────────────────────────────────────────────────┐                             │
│  │      Observability Layer                         │                             │
│  │                                                  │                             │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐   │                             │
│  │  │Telemetry  │  │Prometheus │  │   Grafana │   │                             │
│  │  │(P: 3002)  │  │(P: 9090)  │  │(P: 3100)  │   │                             │
│  │  └───────────┘  └───────────┘  └───────────┘   │                             │
│  │        ▲              ▲              ▲          │                             │
│  └────────┼──────────────┼──────────────┼──────────┘                             │
│           │              │              │                                         │
│           └──────────[10] Metrics/Traces/Logs──────┘                             │
│                     (OpenTelemetry)                                               │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

Legend:
[N] = Data flow number
P: = Port number
─── = Synchronous flow
╌╌╌ = Asynchronous flow
```

---

## Level 2: Agent Workflow DFD

### Workflow: Zapier → MCP Agent → Enterprise System

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  [External Event]                                                      │
│       │                                                                │
│       ▼                                                                │
│  ┌──────────────┐                                                     │
│  │   Zapier     │                                                     │
│  │   Trigger    │                                                     │
│  └──────┬───────┘                                                     │
│         │                                                              │
│         │ [1] Webhook POST                                            │
│         │ {event_type, payload, signature}                            │
│         ▼                                                              │
│  ┌──────────────────────────────────────┐                             │
│  │  Zapier MCP Adapter                  │                             │
│  │  ────────────────────────────────    │                             │
│  │  [2] Validate signature (HMAC)       │                             │
│  │  [3] Check idempotency (Redis)       │                             │
│  │  [4] Enforce policies (OPA)          │                             │
│  └──────────────┬───────────────────────┘                             │
│                 │                                                      │
│                 │ [5] Publish to Context Bus                           │
│                 │ {correlation_id, context_type, payload}              │
│                 ▼                                                      │
│  ┌──────────────────────────────────────┐                             │
│  │  Context Federation Service          │                             │
│  │  ────────────────────────────────    │                             │
│  │  [6] Deduplicate (vector similarity) │                             │
│  │  [7] Cache (Redis, TTL: 24h)         │                             │
│  │  [8] Notify subscribers               │                             │
│  └──────────────┬───────────────────────┘                             │
│                 │                                                      │
│                 │ [9] Context notification                             │
│                 │ {correlation_id, source, payload}                    │
│                 ▼                                                      │
│  ┌──────────────────────────────────────┐                             │
│  │  MCP Agent (ChatGPT)                 │                             │
│  │  ────────────────────────────────    │                             │
│  │  [10] Fetch context history          │                             │
│  │  [11] Execute workflow                │                             │
│  │  [12] Generate response               │                             │
│  └──────────────┬───────────────────────┘                             │
│                 │                                                      │
│                 │ [13] Store result                                    │
│                 │ {workflow_id, status, output}                        │
│                 ▼                                                      │
│  ┌──────────────────────────────────────┐                             │
│  │  PostgreSQL Database                 │                             │
│  │  (Agent execution logs)              │                             │
│  └──────────────┬───────────────────────┘                             │
│                 │                                                      │
│                 │ [14] Sync to enterprise                              │
│                 ▼                                                      │
│  ┌──────────────────────────────────────┐                             │
│  │  Enterprise CRM System               │                             │
│  │  (Customer record updated)           │                             │
│  └──────────────────────────────────────┘                             │
│                                                                        │
│  [Observability - All Steps]                                          │
│  ┌──────────────────────────────────────┐                             │
│  │  Telemetry Service                   │                             │
│  │  - Traces (OpenTelemetry)            │                             │
│  │  - Metrics (Prometheus)              │                             │
│  │  - Logs (Elasticsearch)              │                             │
│  └──────────────────────────────────────┘                             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Analysis

### Data Flow 1: External Request → Agent Response

| Step | From | To | Data | Protocol | Sync/Async |
|------|------|-----|------|----------|------------|
| 1 | User | API Gateway | HTTP request | HTTPS | Sync |
| 2 | API Gateway | Policy Service | Policy check request | REST | Sync |
| 3 | Policy Service | OPA | Policy evaluation | HTTP | Sync |
| 4 | OPA | Policy Service | Decision (allow/deny) | HTTP | Sync |
| 5 | Policy Service | API Gateway | Decision result | REST | Sync |
| 6 | API Gateway | Agent | Execute request | MCP | Sync |
| 7 | Agent | Context Federation | Share context | MCP | Async |
| 8 | Agent | Data Layer | Store result | SQL | Sync |
| 9 | Agent | API Gateway | Response | MCP | Sync |
| 10 | API Gateway | User | HTTP response | HTTPS | Sync |

### Data Flow 2: Background Job Processing

| Step | From | To | Data | Protocol | Sync/Async |
|------|------|-----|------|----------|------------|
| 1 | Scheduler | Worker Queue | Job message | Redis | Async |
| 2 | Worker | Policy Service | Policy check | REST | Sync |
| 3 | Worker | Agent | Execute job | MCP | Async |
| 4 | Agent | Data Layer | Store result | SQL | Sync |
| 5 | Worker | DLQ | Failed job (on error) | Redis | Async |
| 6 | Worker | Telemetry | Metrics/logs | OTLP | Async |

### Data Flow 3: Enterprise System Sync

| Step | From | To | Data | Protocol | Sync/Async |
|------|------|-----|------|----------|------------|
| 1 | CRM | Zapier | Webhook event | HTTPS | Async |
| 2 | Zapier | API Gateway | Transformed event | HTTPS | Async |
| 3 | API Gateway | Context Federation | Event data | REST | Async |
| 4 | Context Federation | Subscribed Agents | Notification | MCP | Async |
| 5 | Agent | PostgreSQL | Update local state | SQL | Sync |

---

## Data Stores

### Primary Data Stores

| Store | Type | Purpose | Size | Backup |
|-------|------|---------|------|--------|
| PostgreSQL | Relational DB | Agent registry, execution logs, audit trail | 50 GB | Daily |
| Redis | Cache/Queue | Context cache, idempotency keys, job queues | 10 GB | AOF |
| Vector DB (Faiss) | Vector Store | Context embeddings for deduplication | 5 GB | Daily |
| Prometheus | Time-series DB | Metrics storage | 20 GB | Retention: 30d |
| Elasticsearch | Document Store | Log storage | 100 GB | Retention: 90d |

### Data Flow Patterns

#### Pattern 1: Idempotency Check
```
Request → Generate Key → Check Redis → (Hit) Return Cached
                                    → (Miss) Process → Store in Redis → Return
```

#### Pattern 2: Circuit Breaker
```
Request → Check CB State → (OPEN) Fail Fast
                        → (CLOSED) Execute → (Success) Record
                                          → (Failure) Record → (Threshold) Open CB
```

#### Pattern 3: SAGA Compensation
```
Step 1 → Execute → (Success) Register Compensation
                → (Failure) → Rollback Previous Steps
```

---

## Security Boundaries

```
┌───────────────────────────────────────────────────────────┐
│  DMZ (Public Internet)                                    │
│                                                           │
│  ┌─────────────┐                                          │
│  │API Gateway  │                                          │
│  │(Rate Limit) │                                          │
│  └──────┬──────┘                                          │
│         │                                                 │
└─────────┼─────────────────────────────────────────────────┘
          │
          │ [Firewall - Allow HTTPS only]
          │
┌─────────┼─────────────────────────────────────────────────┐
│         ▼                                                 │
│  Internal Network (Private Subnet)                        │
│                                                           │
│  ┌──────────────────────────────────────┐                │
│  │  Services (Policy, Registry, etc.)   │                │
│  │  - No direct internet access         │                │
│  │  - mTLS between services             │                │
│  └──────────────────────────────────────┘                │
│                                                           │
└───────────────────────────────────────────────────────────┘
          │
          │ [Private Link / VPC Peering]
          │
┌─────────┼─────────────────────────────────────────────────┐
│         ▼                                                 │
│  Data Layer (Isolated Subnet)                            │
│                                                           │
│  ┌──────────────────────────────────────┐                │
│  │  Databases (PostgreSQL, Redis)       │                │
│  │  - No internet access                │                │
│  │  - Encrypted at rest (AES-256)       │                │
│  │  - Encrypted in transit (TLS 1.3)    │                │
│  └──────────────────────────────────────┘                │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## Performance Characteristics

| Flow Path | Expected Latency | Bottlenecks | Mitigation |
|-----------|------------------|-------------|------------|
| User → Agent → Response | < 500ms (P95) | API Gateway, Agent processing | Rate limiting, caching |
| Zapier → Agent | < 2s | Network, policy check | Circuit breaker, async |
| Agent → Enterprise System | < 1s | External API latency | Circuit breaker, retry |
| Context Federation | < 100ms | Vector similarity | Distributed lock, cache |
| Job Processing | Varies | Queue depth | Auto-scaling workers |

---

**Diagram Version:** 1.0.0  
**Last Updated:** 2025-10-30  
**Maintained By:** platform@example.com
