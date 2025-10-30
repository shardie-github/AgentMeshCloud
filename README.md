# ORCA Core

**Production-Ready Agent Mesh with UADSI (Unified Agent Diagnostics & Synchronization Intelligence)**

[![CI](https://github.com/orca-mesh/orca-core/actions/workflows/ci.yml/badge.svg)](https://github.com/orca-mesh/orca-core/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.18%2B-green)](https://nodejs.org/)

---

## Overview

ORCA (Orchestrated Reliable Cognitive Agents) is a production-ready platform for managing, monitoring, and governing AI agents across your organization. Built with TypeScript, OpenTelemetry, and MCP compliance, ORCA provides:

- **🔍 Agent Discovery**: Automatic discovery across MCP servers, Zapier, Make, n8n, Airflow, and Lambda
- **🛡️ Policy Enforcement**: RBAC, data classification, NIST AI RMF, and OWASP LLM Top 10 alignment
- **📊 Trust Scoring**: Compute Trust Score (TS), Risk Avoided (RA$), and comprehensive KPIs
- **🔄 Sync Intelligence**: Detect data freshness issues, drift, and synchronization gaps
- **📈 Observability**: OpenTelemetry traces, metrics, and structured logging
- **🔐 Security**: Secrets management, PII redaction, encryption, audit trails

---

## Quick Start

### Prerequisites

- Node.js >= 18.18.0
- pnpm >= 8.0.0
- Docker & Docker Compose (for local services)

### Installation

```bash
# Clone repository
git clone https://github.com/orca-mesh/orca-core.git
cd orca-core

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL, Redis, OpenTelemetry, etc.)
docker-compose up -d

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run health check
pnpm run doctor

# Start ORCA
pnpm run orca:dev
```

### Verify Installation

```bash
# Check health
curl http://localhost:3000/health

# Get Trust KPIs
curl http://localhost:3000/api/v1/trust

# List agents
curl http://localhost:3000/api/v1/agents
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        ORCA Core                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Registry   │  │  Telemetry   │  │    Policy    │     │
│  │   (MCP)      │  │  (OTel)      │  │  (RBAC)      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              UADSI (Core Differentiator)             │  │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────────────┐   │  │
│  │  │Discovery │ │Sync       │ │Trust Scoring     │   │  │
│  │  │          │ │Analyzer   │ │& Reporting       │   │  │
│  │  └──────────┘ └───────────┘ └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Context Bus  │  │ Diagnostics  │  │   Security   │     │
│  │ (pgvector)   │  │ (Healing)    │  │  (Secrets)   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              REST API + GraphQL (planned)            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
    ┌─────────┐         ┌─────────┐       ┌──────────┐
    │   MCP   │         │ Zapier  │       │  Airflow │
    │ Servers │         │  Make   │       │  Lambda  │
    └─────────┘         │   n8n   │       └──────────┘
                        └─────────┘
```

---

## Key Features

### 1. UADSI - Unified Agent Diagnostics & Synchronization Intelligence

**The Core Differentiator**

#### Agent Discovery
- Scans MCP servers, Zapier, Make, n8n, Airflow, Lambda
- Builds comprehensive agent inventory
- Quarantines shadow AI for review
- Auto-registration with approval workflow

#### Trust Scoring
```
Trust Score (TS) = weighted(
  reliability × policy_adherence × context_freshness
) ÷ risk_exposure

Result: 0-100 scale
```

#### Trust KPIs
- **TS (Trust Score)**: Overall trust metric (0-100)
- **RA$ (Risk Avoided)**: Financial risk mitigation
- **Sync Freshness %**: Data currency across integrations
- **Drift Rate %**: Configuration/data inconsistency detection
- **Compliance SLA %**: Policy adherence rate
- **Self-Resolution Ratio**: Auto-healing effectiveness
- **ROI**: RA$ ÷ platform cost

#### Sync Analysis
- Detect missing records
- Monitor data freshness
- Identify event ordering issues
- Track webhook drift

### 2. Policy Enforcement

**NIST AI RMF & OWASP LLM Top 10 Aligned**

- Role-Based Access Control (RBAC)
- Data classification (public → critical)
- PII detection and redaction
- Content safety (hate speech, violence, etc.)
- Rate limiting and quota management
- Audit trails for compliance (SOC2, ISO 27001, GDPR)

### 3. OpenTelemetry Integration

**Full Observability Stack**

- Distributed tracing with correlation IDs
- Custom metrics (trust score, drift rate, etc.)
- Structured logging with PII redaction
- Prometheus exporter
- Jaeger trace visualization
- Grafana dashboards

### 4. MCP Compliance

**Model Context Protocol v1.0**

- Standard agent registration
- Context sharing (foundation)
- Capability negotiation
- Tool/function calling (planned)
- Streaming responses (planned)

---

## API Reference

### REST Endpoints

#### Agents
```bash
GET    /api/v1/agents          # List agents
POST   /api/v1/agents          # Register agent
GET    /api/v1/agents/:id      # Get agent
PUT    /api/v1/agents/:id      # Update agent
DELETE /api/v1/agents/:id      # Delete agent
POST   /api/v1/agents/:id/suspend  # Suspend agent
```

#### Trust & KPIs
```bash
GET    /api/v1/trust                    # Get Trust KPIs
GET    /api/v1/trust/score/:agentId    # Agent trust score
GET    /api/v1/trust/sync-gaps         # Sync gaps report
GET    /api/v1/trust/report/executive  # Executive summary
POST   /api/v1/trust/incident          # Record incident
```

#### Health
```bash
GET    /health                 # Health check
GET    /ready                  # Readiness check
GET    /status                 # Status endpoint
```

See [openapi.yaml](./openapi.yaml) for full API specification.

---

## Configuration

### Environment Variables

See [.env.example](./.env.example) for all configuration options.

Key settings:
```bash
NODE_ENV=production
PORT=3000
DB_HOST=postgres.example.com
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
ENABLE_DISCOVERY=true
```

### Policy Configuration

Edit `policy_rules.yaml` to customize:
- RBAC roles and permissions
- Data classification levels
- PII patterns
- Rate limits
- Compliance frameworks

### MCP Registry

Edit `mcp_registry.yaml` to register agents:
```yaml
agents:
  - id: "my-agent"
    name: "My AI Agent"
    type: "chatbot"
    vendor: "openai"
    model: "gpt-4"
    mcp_config:
      protocol_version: "1.0.0"
      capabilities: ["context_sharing", "tool_use"]
```

---

## Deployment

### Docker Compose (Development)

```bash
docker-compose up -d
```

### Kubernetes (Production)

```bash
# Coming soon: Helm charts
kubectl apply -f kubernetes/
```

### AWS ECS / EKS

```bash
# Coming soon: Terraform modules
terraform apply
```

---

## Monitoring & Observability

### Dashboards

1. **Service Health**: Request rate, latency, errors
2. **Trust KPIs**: TS, RA$, Sync Freshness, Drift Rate
3. **Agent Registry**: Agents by status, type, vendor

Access Grafana: http://localhost:3001 (admin/admin)

### Metrics

```
orca.trust.score                # Trust Score
orca.risk.avoided_usd           # Risk Avoided
orca.sync.lag                   # Sync lag in ms
orca.drift.rate                 # Drift rate %
orca.requests.total             # Total requests
orca.requests.duration          # Request duration
orca.errors.total               # Total errors
orca.policy.violations          # Policy violations
```

### Tracing

View traces in Jaeger: http://localhost:16686

---

## Security

### Best Practices

1. **Secrets**: Use environment variables or KMS/Vault
2. **Authentication**: Enable JWT or API key auth
3. **TLS**: Use TLS 1.3 for all external communication
4. **PII**: Enable PII redaction in logs
5. **Policies**: Set enforcement mode to `blocking` in production
6. **Auditing**: Enable comprehensive audit logging

See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

---

## Development

### Project Structure

```
/workspace
├── src/                    # ORCA Core source
│   ├── common/             # Shared utilities
│   ├── registry/           # Agent registry
│   ├── telemetry/          # OpenTelemetry
│   ├── policy/             # Policy enforcer
│   ├── uadsi/              # Discovery, trust, sync
│   ├── api/                # REST API
│   ├── adapters/           # Integration adapters
│   └── security/           # Security utilities
├── docs/                   # Documentation
├── scripts/                # Utility scripts
├── .github/workflows/      # CI/CD
└── docker-compose.yml      # Local infrastructure
```

### Running Tests

```bash
pnpm run test              # Run all tests
pnpm run test:watch        # Watch mode
pnpm run test:coverage     # Coverage report
```

### Linting & Formatting

```bash
pnpm run lint              # ESLint
pnpm run format            # Prettier
pnpm run type-check        # TypeScript
pnpm run doctor            # Health check
```

### Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Documentation

- **[ASSUMPTIONS.md](./docs/ASSUMPTIONS.md)**: Decisions & tradeoffs
- **[OPERATIONS.md](./docs/OPERATIONS.md)**: Runbooks & on-call procedures
- **[UADSI_SPEC.md](./docs/UADSI_SPEC.md)**: Algorithms, scoring formulae, KPIs
- **[MCP_ALIGNMENT.md](./docs/MCP_ALIGNMENT.md)**: MCP compliance details
- **[SECURITY.md](./SECURITY.md)**: Security policy
- **[CHANGELOG.md](./CHANGELOG.md)**: Version history

---

## Roadmap

### v1.1 (Q1 2026)
- [ ] Complete context bus with pgvector
- [ ] Full self-healing diagnostics
- [ ] GraphQL API
- [ ] Comprehensive test suite
- [ ] Performance benchmarks

### v1.2 (Q2 2026)
- [ ] Multi-tenant support
- [ ] Real-time WebSocket subscriptions
- [ ] Advanced ML-based trust scoring
- [ ] Additional adapters (Make, n8n, Airflow, Lambda)

### v2.0 (Q3 2026)
- [ ] Federated MCP across organizations
- [ ] Zero-trust architecture
- [ ] Advanced anomaly detection
- [ ] Multi-agent orchestration

---

## Support

- **Documentation**: https://docs.orca-mesh.io
- **Issues**: https://github.com/orca-mesh/orca-core/issues
- **Discussions**: https://github.com/orca-mesh/orca-core/discussions
- **Email**: support@orca-mesh.io

---

## License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## Acknowledgments

Built with:
- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [OpenTelemetry](https://opentelemetry.io/)
- [PostgreSQL](https://www.postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector)
- [Redis](https://redis.io/)
- [Prometheus](https://prometheus.io/)
- [Jaeger](https://www.jaegertracing.io/)
- [Grafana](https://grafana.com/)

---

**⭐ Star this repo if you find it useful!**

**Made with ❤️ by the ORCA Team**
