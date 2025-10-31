# Repository Map - ORCA AgentMesh Cloud

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Purpose:** Comprehensive guide to repository structure, architecture, and development workflows

---

## Executive Summary

ORCA (Orchestrated Reliable Cognitive Agents) is a production-ready TypeScript/Node.js platform for managing, monitoring, and governing AI agents across organizations. Built as a monorepo with pnpm workspaces, deployed on Vercel with Supabase backend.

**Stack:** Node.js 20 · TypeScript 5.3 (strict) · Express.js · Next.js · PostgreSQL/Supabase · Prisma · OpenTelemetry · Docker · Vercel

---

## Repository Structure

### Core Application (`/src`)

```
src/
├── api/                    # REST API server (Express.js)
│   ├── server.ts          # Main entry point with middleware stack
│   └── routes/            # API route handlers
│       ├── agents.ts      # Agent CRUD operations
│       ├── trust.ts       # Trust scoring & KPIs
│       ├── workflows.ts   # Workflow execution
│       ├── reports.ts     # Executive reporting
│       └── status.ts      # Health/readiness probes
│
├── uadsi/                 # UADSI (Core Differentiator)
│   ├── agent_discovery.ts # Auto-discovery across MCP, Zapier, Make, n8n
│   ├── trust_scoring.ts   # Trust Score (TS) algorithm
│   ├── sync_analyzer.ts   # Data freshness & drift detection
│   └── report_engine.ts   # KPI calculation & executive reports
│
├── registry/              # Agent registry (MCP compliant)
│   ├── registry.service.ts
│   └── mcp_registry.schema.yaml
│
├── telemetry/            # OpenTelemetry (traces, metrics, logs)
│   ├── otel.ts           # OTEL initialization
│   ├── correlation.ts    # Request correlation IDs
│   └── metrics.ts        # Custom metrics (TS, RA$, Drift)
│
├── policy/               # Policy enforcement engine
│   ├── policy_enforcer.ts
│   └── policy_rules.yaml  # RBAC, data classification, PII
│
├── security/             # Auth, rate limiting, secrets
│   ├── rate-limiter.ts   # Token bucket rate limiter
│   ├── auth_oidc.ts      # OIDC authentication
│   ├── rbac.ts           # Role-based access control
│   └── secrets_bridge.ts # KMS/Vault integration
│
├── context-bus/          # pgvector-backed context sharing
│   ├── context_bus.ts
│   └── schema.sql
│
├── adapters/             # Integration adapters
│   ├── zapier.ts
│   └── n8n.ts
│
├── diagnostics/          # Self-healing engine
│   └── self_healing_engine.ts
│
├── common/               # Shared utilities
│   ├── logger.ts         # Structured logging (pino)
│   ├── cache.ts          # Redis caching layer
│   ├── circuit-breaker.ts
│   ├── job-queue.ts
│   └── errors.ts
│
└── flags/                # Feature flags
    └── flags_service.ts
```

### Frontend (`/apps`)

```
apps/
├── front/                # Next.js dashboard (Vercel)
│   ├── src/
│   │   ├── app/          # App router pages
│   │   ├── components/   # React components
│   │   └── lib/          # Client utilities
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── [other apps...]       # Additional micro-frontends
```

### Data Layer (`/prisma`, `/supabase`)

```
prisma/
├── schema.prisma         # Database schema (26 tables)
└── client.ts             # Prisma client singleton

supabase/
├── migrations/           # SQL migrations (versioned)
├── seed.sql             # Reference data
└── config.toml          # Supabase project config
```

**Key Tables:**
- `agents` - Agent registry with capabilities
- `workflows` / `workflow_executions` - Orchestration
- `product_feedback` - User feedback with AI classification
- `growth_signals` - Product analytics
- `aiops_incidents` - Incident tracking
- `cognitive_impact_scorecards` - Business metrics
- `semantic_memory` - pgvector embeddings

### Infrastructure & Config

```
/workspace
├── docker-compose.yml     # Local dev stack (Postgres, Redis, OTEL, Jaeger, Prometheus, Grafana)
├── docker-compose.orca.yml
├── Dockerfile            # Production container
├── vercel.json           # Vercel deployment config
├── tsconfig.json         # TypeScript (strict mode enabled)
├── pnpm-workspace.yaml   # Monorepo workspaces
├── turbo.json            # Turborepo build cache
└── .github/workflows/    # CI/CD (18 workflows)
```

### Scripts (`/scripts`)

**Critical Operations:**
```
scripts/
├── doctor.ts             # System health check
├── migrate.ts            # Database migrations
├── seed.ts               # Database seeding
├── deps_audit.ts         # Dependency security audit
├── resilience_test.ts    # Chaos engineering
├── e2e/                  # E2E test suite
│   ├── seed_baselines.ts
│   ├── fire_webhooks.ts
│   ├── assert_kpis.ts
│   └── negative_tests.ts
├── bundle-report.mjs     # Bundle size analysis
├── secrets-scan.mjs      # Secret detection
├── db-slowquery-check.mjs
├── rls-smoke.ts          # Supabase RLS validation
└── playwright-smoke.js   # Smoke tests
```

### Documentation (`/docs`)

**Complete Documentation Set (40+ files):**
```
docs/
├── DEVELOPER_GUIDE.md    # Development workflow
├── RELEASE_GUIDE.md      # Release procedures
├── OPERATIONS.md         # Runbooks & on-call
├── DISASTER_RECOVERY.md  # DR procedures
├── SECURITY_BASELINE.md  # Security controls
├── ARCHITECTURE_OVERVIEW.md
├── UADSI_SPEC.md         # Algorithm specifications
├── MCP_ALIGNMENT.md      # MCP compliance
├── BILLING_MODEL.md      # Pricing & monetization
├── PARTNER_GUIDE.md      # Partner API
├── PERFORMANCE_REPORT.md # Benchmarks
├── DATA_RESIDENCY.md     # Multi-region
├── DEPLOY_STRATEGY.md    # Blue-green, canary
├── FEEDBACK_PROCESS.md   # User feedback loop
├── ONBOARDING_CHECKLIST.md
├── ROLLBACK_PLAYBOOK.md
├── DR_PLAYBOOK.md
├── slo_manifest.yaml     # SLO definitions
└── [28 more files...]
```

### AI-Powered Operations (`/aiops`, `/feedback`, `/growth`)

```
aiops/                    # AI-driven operations
├── cost_awareness.ts     # FinOps recommendations
├── forecasting.ts        # Capacity planning
└── incident_classifier.ts

feedback/                 # User feedback loop
└── src/services/
    ├── TriageBotService.ts      # AI-powered triage
    └── InsightsReportService.ts # Trend analysis

growth/                   # Growth engineering
└── referral_engine.ts    # Referral program

marketing/                # Marketing automation
└── campaign_optimizer.ts # AI-optimized campaigns
```

### Compliance & Audit (`/compliance`, `/evidence`)

```
compliance/
├── CONTROLS_MATRIX.yaml  # SOC 2 controls mapping
├── policy_coverage.csv   # Policy coverage report
└── gdpr_registry.yaml    # GDPR compliance

evidence/
└── generate.ts           # Automated evidence collection
```

### Ecosystem Integrations (`/ecosystem`, `/partners`)

```
ecosystem/               # Partner ecosystem
└── marketplace_sdk.ts   # Marketplace integration

partners/                # Partner API
├── api_scopes.ts        # API access control
└── sandbox.ts           # Partner sandbox env
```

---

## Entry Points

### Development
```bash
pnpm run orca:dev        # Start API server (tsx watch)
pnpm run dev             # Alternative entry point
pnpm run turbo:dev       # Turborepo multi-package dev
```

### Production
```bash
pnpm run build           # Compile TypeScript → dist/
pnpm run start           # Run compiled server (node dist/api/server.js)
```

### Docker
```bash
docker-compose up -d     # Start local infrastructure
docker build -t orca .   # Build production image
```

---

## Data Flow

### Request Lifecycle

```
Client Request
    ↓
[Express Middleware Stack]
    ├─ Helmet (security headers)
    ├─ CORS (origin validation)
    ├─ Rate Limiter (token bucket)
    ├─ Correlation ID (X-Correlation-ID)
    ├─ Request Logger (structured logs)
    └─ Policy Enforcer (RBAC, data classification)
    ↓
[Route Handlers]
    ↓
[Service Layer] (Registry, UADSI, etc.)
    ↓
[Data Layer] (Prisma → PostgreSQL/Supabase)
    ↓
[OpenTelemetry] (traces, metrics, logs)
    ↓
Response
```

### Background Jobs

```
Cron Scheduler
    ├─ Agent Discovery (hourly)
    ├─ Sync Analysis (every 15 min)
    ├─ Trust Score Calculation (hourly)
    ├─ Self-Healing Checks (every 5 min)
    └─ Evidence Collection (daily)
```

---

## External Dependencies

### Services
- **Supabase**: PostgreSQL database with pgvector, RLS policies, edge functions
- **Vercel**: Hosting, edge network, serverless functions
- **OpenTelemetry Collector**: Traces, metrics aggregation
- **Jaeger**: Distributed tracing UI
- **Prometheus**: Time-series metrics
- **Grafana**: Dashboards & alerting
- **Redis**: Caching layer (optional)

### Third-Party APIs
- **Zapier**: Integration discovery
- **Make.com**: Workflow sync
- **n8n**: Automation platform integration
- **OpenAI**: AI-powered features (feedback triage, insights)
- **Stripe**: Billing & subscriptions (planned)

---

## Configuration & Secrets

### Environment Variables

**Required:**
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `PRISMA_CLIENT_ENGINE_TYPE=wasm` (for Vercel)

**Optional:**
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Telemetry endpoint
- `OPENAI_API_KEY` - AI features
- `ENABLE_SELF_HEALING=true` - Auto-healing
- `SEED=true` - Auto-seed on startup
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging verbosity

**See:** `.env.example` for full list

### Feature Flags
- Managed via `src/flags/flags_service.ts`
- Environment-based (env vars) or dynamic (database-backed, planned)

---

## Testing Strategy

### Test Structure
```
tests/                   # Unit tests (Jest/Vitest - TO BE IMPLEMENTED)
ui-tests/               # Visual regression (Playwright)
scripts/e2e/            # E2E tests (API integration)
scripts/resilience_test.ts  # Chaos engineering
```

### Current Test Coverage
**Status:** Test infrastructure exists, but comprehensive test suite is pending implementation.

**Existing Tests:**
- E2E API tests (scripts/e2e/)
- Resilience tests (chaos engineering)
- RLS policy smoke tests
- Visual regression (Playwright)

**Gaps:**
- Unit tests for core services
- Integration tests for adapters
- Contract tests (Pact framework exists)

---

## CI/CD Pipeline

### GitHub Actions Workflows (18 total)

**Core:**
- `ci.yml` - Build, lint, typecheck, test
- `codeql.yml` - Security scanning
- `release.yml` - Release automation

**Operations:**
- `continuous-ops.yml` - Operational checks
- `deps-monitor.yml` - Dependency monitoring
- `evidence-collect.yml` - Compliance evidence
- `slo-check.yml` - SLO validation
- `dr-drill.yml` - Disaster recovery testing

**Quality:**
- `repo-hygiene.yml` - Code quality
- `ai-maintenance.yml` - AI-powered maintenance

### Build Artifacts
- TypeScript compilation → `dist/`
- Bundle analysis reports
- Coverage reports (planned)
- Docker images

---

## Deployment

### Environments

| Environment | URL | Database | Purpose |
|-------------|-----|----------|---------|
| **Local** | http://localhost:3000 | Docker Postgres | Development |
| **Staging** | staging.orca-mesh.io | Supabase (staging) | Integration testing |
| **Production** | api.orca-mesh.io | Supabase (prod) | Live traffic |

### Deployment Strategy
- **Vercel**: Zero-downtime deployments with automatic rollback
- **Blue-Green**: Supported via `scripts/deploy/vercel_blue_green.ts`
- **Canary**: Gradual rollout via `scripts/deploy/vercel_canary.ts`

---

## Observability

### Metrics
**Custom Metrics:**
- `orca.trust.score` - Trust Score (0-100)
- `orca.risk.avoided_usd` - Risk Avoided ($)
- `orca.sync.lag` - Data freshness lag
- `orca.drift.rate` - Configuration drift %
- `orca.policy.violations` - Policy violations count

**Standard Metrics:**
- HTTP request rate, latency (p50/p95/p99), error rate
- Database connection pool, query latency
- Memory/CPU usage, event loop lag

### Logging
- **Structured logs** (JSON) via `src/common/logger.ts`
- **PII redaction** via `src/middleware/privacy_redactor.ts`
- **Correlation IDs** for request tracing

### Dashboards
- Grafana dashboards at `observability_dashboard.json`
- Jaeger for distributed traces: http://localhost:16686

---

## Security Model

### Authentication
- OIDC/OAuth2 integration (`src/security/auth_oidc.ts`)
- API key authentication (planned)
- JWT bearer tokens

### Authorization
- RBAC via `src/security/rbac.ts`
- Policy enforcement via `src/policy/policy_enforcer.ts`
- Supabase Row-Level Security (RLS) policies

### Data Protection
- TLS 1.3 for transit encryption
- At-rest encryption via Supabase
- PII detection & redaction
- Content safety filtering

### Rate Limiting
- Token bucket algorithm
- IP-based throttling
- Tenant-level quotas

---

## Development Workflow

### Getting Started
```bash
# 1. Clone & install
git clone <repo>
cd workspace
pnpm install

# 2. Start infrastructure
docker-compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your settings

# 4. Run health check
pnpm run doctor

# 5. Start dev server
pnpm run orca:dev
```

### Common Tasks
```bash
pnpm run lint              # ESLint
pnpm run format            # Prettier
pnpm run typecheck         # TypeScript
pnpm run build             # Compile
pnpm run test              # Run tests
pnpm run e2e               # E2E tests
pnpm run db:migrate        # Run migrations
pnpm run db:seed           # Seed database
```

### Code Quality Gates
- **TypeScript strict mode** - No implicit any, strict null checks
- **ESLint** - Security rules, import order, promise handling
- **Prettier** - Consistent formatting
- **Pre-commit hooks** - Husky + lint-staged

---

## Performance Characteristics

**Benchmarks (k6 load tests):**
- **P95 Latency:** 450ms (target: <700ms) ✅
- **P99 Latency:** 890ms (target: <1200ms) ✅
- **Error Rate:** 0.8% (target: <1.5%) ✅
- **Throughput:** 25 req/sec sustained

**Bundle Sizes:**
- API server: ~15MB (node_modules excluded)
- Frontend (Next.js): TBD

---

## Known Limitations & TODOs

### Current Gaps
1. **Test Coverage** - Comprehensive unit/integration tests needed
2. **GraphQL API** - Planned for v1.1
3. **Real-time WebSockets** - Planned for v1.1
4. **Mobile App** - Planned for v1.2
5. **China Region** - Requires ICP license

### Technical Debt
- Some duplicate files (kebab-case vs snake_case naming)
- Missing bundle size analysis automation
- Incomplete accessibility testing
- Performance budgets not enforced in CI

---

## Support & Resources

- **Documentation**: All docs in `/docs` folder
- **Runbooks**: See `docs/OPERATIONS.md`, `docs/ROLLBACK_PLAYBOOK.md`
- **Architecture**: See `docs/ARCHITECTURE_OVERVIEW.md`
- **Contributing**: See `CONTRIBUTING.md`
- **Security**: See `SECURITY.md` for vulnerability reporting

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-10-31 | Initial repository map |

---

**Maintained by:** ORCA Platform Team  
**Last Review:** 2025-10-31  
**Next Review:** 2026-01-31 (quarterly)
