# ORCA Core - Architecture Overview

High-level architecture and design decisions for the ORCA AI Agent Mesh platform.

## Table of Contents

- [System Overview](#system-overview)
- [Core Components](#core-components)
- [Architecture Diagram](#architecture-diagram)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Design Decisions](#design-decisions)
- [Scalability](#scalability)
- [Security Architecture](#security-architecture)

## System Overview

ORCA Core is an AI agent mesh platform that provides:

- **Agent Registry:** Centralized registration and discovery
- **Trust Scoring (UADSI):** Unified Autonomous Decisioning Safety Intelligence
- **Policy Engine:** Declarative policy enforcement
- **Telemetry:** OpenTelemetry-based observability
- **API Gateway:** RESTful API for agent interactions

### Key Differentiators

1. **Trust-First Design:** Every agent interaction includes trust score validation
2. **Policy-Driven:** Declarative policies enforced at runtime
3. **Observable by Default:** Full OpenTelemetry instrumentation
4. **Multi-Tenant Safe:** Row-level security and tenant isolation

## Core Components

### 1. Agent Registry (`/src/registry`)

**Purpose:** Central directory of AI agents

**Responsibilities:**

- Agent registration and metadata storage
- Capability discovery
- Health monitoring
- Lifecycle management

**Key APIs:**

```typescript
POST   /api/agents           // Register agent
GET    /api/agents/:id       // Get agent details
GET    /api/agents           // List agents
PATCH  /api/agents/:id       // Update agent
DELETE /api/agents/:id       // Deregister agent
```

### 2. Trust Scoring - UADSI (`/src/uadsi`)

**Purpose:** Compute and track agent trustworthiness

**Scoring Factors:**

- **Reliability:** Uptime, error rate, response time
- **Compliance:** Policy adherence rate
- **Reputation:** User feedback, audit results
- **Historical:** Past performance trends

**Trust Score Range:** 0-100

- **90-100:** Highly trusted (green)
- **70-89:** Trusted (yellow)
- **50-69:** Moderate trust (orange)
- **0-49:** Low trust (red)

**Key APIs:**

```typescript
GET /api/trust/:agentId     // Get trust score
GET /api/trust/trends       // Historical trends
```

### 3. Policy Engine (`/src/policy`)

**Purpose:** Enforce governance rules

**Policy Types:**

- **Access Control:** Who can do what
- **Rate Limiting:** Request quotas
- **Data Governance:** PII handling, retention
- **Compliance:** SOC2, GDPR, etc.

**Policy Format (YAML):**

```yaml
policies:
  - id: require-high-trust
    rule: agent.trustScore >= 70
    enforcement: blocking
    impact: critical
```

**Key APIs:**

```typescript
GET  /api/policies          // List policies
POST /api/policies/evaluate // Evaluate policy
```

### 4. Telemetry (`/src/telemetry`)

**Purpose:** Observability and monitoring

**Signals:**

- **Traces:** Distributed tracing across agents
- **Metrics:** Performance and business metrics
- **Logs:** Structured application logs

**Stack:**

- OpenTelemetry SDK
- Exporters: OTLP, Prometheus
- Backends: Jaeger, Grafana

### 5. API Gateway (`/src/api`)

**Purpose:** Unified API entry point

**Features:**

- Authentication (JWT)
- Authorization (RBAC)
- Rate limiting
- Request validation
- Response caching

**Middleware Stack:**

```
Request → CORS → Auth → RLS → Rate Limit → Handler → Response
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express.js + Helmet + CORS + JWT Auth              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────┬────────────────────────────────────────┬──────────┘
         │                                        │
    ┌────▼────┐   ┌──────────┐   ┌──────────┐   │
    │ Agent   │   │  Trust   │   │ Policy   │   │
    │Registry │   │ (UADSI)  │   │  Engine  │   │
    └────┬────┘   └────┬─────┘   └────┬─────┘   │
         │             │              │          │
         │             │              │          │
    ┌────▼─────────────▼──────────────▼──────────▼───┐
    │          Supabase PostgreSQL                    │
    │  ┌──────────────────────────────────────────┐  │
    │  │  RLS Policies │ Indexes │ Monitoring     │  │
    │  └──────────────────────────────────────────┘  │
    └────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐           ┌────▼─────┐
    │ OpenTel  │           │  Audit   │
    │ Collector│           │   Logs   │
    └──────────┘           └──────────┘
```

## Data Flow

### Agent Registration Flow

```
1. Agent → POST /api/agents (metadata)
2. API Gateway → Validate JWT
3. API Gateway → Check Policy (can register?)
4. Agent Registry → Insert into Supabase
5. Agent Registry → Initialize Trust Score
6. API Gateway → Return agent ID + initial trust score
```

### Trust Score Update Flow

```
1. Telemetry → Collect metrics (uptime, errors, latency)
2. Policy Engine → Evaluate compliance
3. UADSI → Compute trust score (0-100)
4. UADSI → Update trust_scores table
5. UADSI → Emit trust.score.updated event
6. Dashboards → Render updated scores
```

### Policy Evaluation Flow

```
1. Request → API Gateway
2. API Gateway → Extract context (agent, tenant, action)
3. Policy Engine → Load applicable policies
4. Policy Engine → Evaluate rules
5. Policy Engine → Return decision (allow/deny)
6. API Gateway → Enforce decision
7. Audit → Log policy evaluation
```

## Technology Stack

### Core Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Node.js 18+ | JavaScript runtime |
| Language | TypeScript 5+ | Type safety |
| Framework | Express.js | HTTP server |
| Database | Supabase (PostgreSQL) | Data persistence |
| ORM | Prisma | Database client |
| Auth | Supabase Auth / JWT | Authentication |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Hosting | Vercel (API) + Supabase (DB) |
| CDN | Vercel Edge Network |
| Monitoring | OpenTelemetry + Prometheus |
| Logging | Structured JSON logs |
| Secrets | Vercel Environment Variables |

### Development

| Tool | Purpose |
|------|---------|
| pnpm | Package management |
| Turbo | Monorepo build system |
| ESLint | Linting |
| Prettier | Formatting |
| Husky | Git hooks |
| Commitlint | Commit message validation |

## Design Decisions

### 1. PostgreSQL over NoSQL

**Decision:** Use PostgreSQL (via Supabase)

**Rationale:**

- ✅ ACID transactions
- ✅ Rich query capabilities (joins, aggregations)
- ✅ Row-Level Security (RLS) for multi-tenancy
- ✅ Mature ecosystem
- ❌ NoSQL better for unstructured data (not our use case)

### 2. Trust Score as Core Primitive

**Decision:** Every agent has a real-time trust score

**Rationale:**

- ✅ Quantifies reliability and safety
- ✅ Enables policy-based decisions
- ✅ Transparent to users and auditors
- ✅ Differentiator vs competitors

### 3. Policy as Code (YAML)

**Decision:** Declarative YAML policies

**Rationale:**

- ✅ Human-readable
- ✅ Version-controlled
- ✅ Auditable
- ✅ Non-developers can write policies
- ❌ Rego (OPA) considered but steeper learning curve

### 4. OpenTelemetry for Observability

**Decision:** OpenTelemetry as telemetry standard

**Rationale:**

- ✅ Vendor-neutral
- ✅ Unified API for traces/metrics/logs
- ✅ Wide ecosystem support
- ✅ Future-proof

### 5. Monorepo with Turbo

**Decision:** Monorepo with Turborepo

**Rationale:**

- ✅ Code sharing (common utilities)
- ✅ Unified versioning
- ✅ Fast incremental builds
- ✅ Simplified dependency management

## Scalability

### Horizontal Scaling

**API Layer:**

- Deploy multiple Vercel Edge Functions
- Auto-scale based on traffic
- Target: Handle 10,000 req/s

**Database:**

- Supabase auto-scaling
- Read replicas for heavy read workloads
- Connection pooling (PgBouncer)

### Caching Strategy

| Data Type | Cache | TTL |
|-----------|-------|-----|
| Trust scores | Edge cache | 5 min |
| Agent metadata | Edge cache | 10 min |
| Policy definitions | In-memory | 1 hour |
| API responses | CDN | Varies |

### Performance Targets

| Metric | Target |
|--------|--------|
| API Latency (p50) | < 100ms |
| API Latency (p99) | < 500ms |
| Trust Score Calc | < 50ms |
| Policy Evaluation | < 10ms |
| Database Query | < 50ms |

## Security Architecture

### Defense in Depth

1. **Network:** TLS 1.3 only, HSTS enabled
2. **API Gateway:** JWT auth, rate limiting, input validation
3. **Database:** RLS policies, encrypted at rest
4. **Application:** Parameterized queries, CSRF protection
5. **Secrets:** Environment variables, no hardcoding

### Multi-Tenancy

**Approach:** Shared database with RLS

```sql
-- Example RLS policy
CREATE POLICY "Users see own tenant data"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

**Isolation:**

- Row-level: RLS policies
- Schema-level: Separate schemas per tenant (future)
- Database-level: Separate DB per tenant (enterprise)

### Compliance

| Framework | Status | Notes |
|-----------|--------|-------|
| SOC 2 Type II | ✅ Ready | Audit trail, encryption, access control |
| GDPR | ✅ Ready | Data retention, PII redaction, right to delete |
| NIST AI RMF | 🟡 Partial | Trust scoring aligns, policy governance in progress |

## Future Architecture

### Planned Enhancements

- **Event Bus:** Kafka/NATS for event-driven architecture
- **Search:** Elasticsearch for advanced agent search
- **ML Pipeline:** Real-time trust score ML model
- **GraphQL API:** Alternative to REST for flexible queries
- **Federation:** Cross-org agent mesh

---

**Version:** 1.0
**Last Updated:** 2025-10-31
**Maintained by:** @orca-team
