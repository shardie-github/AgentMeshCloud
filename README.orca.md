# ORCA AgentMesh

> Minimum Working Slice: UADSI-powered agent coordination with MCP alignment, observability, and self-healing.

[![CI Status](https://github.com/your-org/orca-agentmesh/workflows/CI/badge.svg)](https://github.com/your-org/orca-agentmesh/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🚀 Quick Start

### Prerequisites

- Node.js 18.18.0+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 14+ with pgvector (or use Docker Compose)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/orca-agentmesh.git
cd orca-agentmesh
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start with Docker Compose

```bash
docker compose -f docker-compose.orca.yml up
```

The system will:
- Start PostgreSQL with pgvector
- Run migrations automatically
- Seed sample data
- Start the API on http://localhost:3000
- Launch OpenTelemetry collector, Prometheus, and Grafana

### 4. Verify System Health

```bash
# Check status
curl http://localhost:3000/status

# Run doctor
pnpm run doctor

# View trust metrics
curl http://localhost:3000/trust
```

## 📊 Dashboard Access

- **API**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ORCA AgentMesh                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Zapier  │  │   n8n    │  │   MCP    │            │
│  │ Adapter  │  │ Adapter  │  │ Registry │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │              │                   │
│       └─────────────┴──────────────┘                   │
│                     │                                  │
│              ┌──────▼──────┐                           │
│              │ Context Bus │                           │
│              │  (Postgres) │                           │
│              └──────┬──────┘                           │
│                     │                                  │
│       ┌─────────────┼─────────────┐                   │
│       │             │             │                   │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐               │
│  │ Agent   │  │  Sync   │  │  Trust  │               │
│  │Discovery│  │Analyzer │  │ Scoring │               │
│  └────┬────┘  └────┬────┘  └────┬────┘               │
│       │             │             │                   │
│       └─────────────┴─────────────┘                   │
│                     │                                  │
│              ┌──────▼──────┐                           │
│              │   Report    │                           │
│              │   Engine    │                           │
│              └─────────────┘                           │
│                                                         │
├─────────────────────────────────────────────────────────┤
│           OpenTelemetry → Prometheus → Grafana         │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Key Features

### ✅ UADSI Trust Scoring
- **Trust Score (TS)**: Weighted composite of agent uptime, policy adherence, sync freshness, risk exposure
- **Risk Avoided (RA$)**: Financial value of prevented incidents
- **Sync Freshness**: % of workflows receiving events within SLO
- **Drift Rate**: % of workflows exhibiting behavioral drift
- **Compliance SLA**: Policy and operational compliance %

### ✅ MCP Alignment
- Auto-discovery of MCP servers from registry
- Agent registration and trust level management
- Metadata synchronization

### ✅ Adapter Webhooks
- Zapier webhook ingestion with HMAC verification
- n8n webhook ingestion with correlation tracking
- Normalized event schema for cross-platform consistency

### ✅ Self-Healing
- Automatic drift detection
- Workflow status remediation
- Trust level updates
- Healing reports with action audit

### ✅ Observability
- OpenTelemetry traces and metrics
- Grafana dashboard
- Real-time KPI monitoring
- Executive summary reports

## 📖 API Documentation

### Core Endpoints

```bash
# System Status
GET /status

# Trust Metrics
GET /trust
POST /trust/refresh

# Agents
GET /agents
GET /agents/:id
GET /agents/:id/telemetry

# Workflows
GET /workflows
GET /workflows/:id
GET /workflows/:id/events

# Reports
GET /reports/executive-summary
POST /reports/export
GET /reports/healing

# Adapters (with HMAC verification)
POST /adapters/zapier/webhook
POST /adapters/n8n/webhook
```

Full API documentation: [openapi.orca.yaml](./openapi.orca.yaml)

## 🔧 Development

### Local Development

```bash
# Start API in watch mode
pnpm run dev

# Run migrations
pnpm run db:migrate

# Seed database
pnpm run db:seed

# Run type checking
pnpm run typecheck

# Run linter
pnpm run lint

# Format code
pnpm run format

# Health check
pnpm run doctor
```

### Build for Production

```bash
pnpm run build
pnpm run start
```

## 🧪 Testing

```bash
# Run all tests
pnpm run test

# Example: Test webhook endpoint
curl -X POST http://localhost:3000/adapters/zapier/webhook \
  -H "Content-Type: application/json" \
  -H "x-signature: YOUR_HMAC_SIGNATURE" \
  -H "x-correlation-id: $(uuidgen)" \
  -d '{
    "zap_id": "12345",
    "zap_name": "Test Zap",
    "event_type": "webhook",
    "data": {"test": true}
  }'
```

## 📊 KPI Formulas

See [src/uadsi/kpi_formulas.md](./src/uadsi/kpi_formulas.md) for detailed formulas.

**Trust Score**:
```
TS = (agent_uptime × 0.30) + (policy_adherence × 0.30) + 
     (sync_freshness × 0.25) + (risk_exposure × 0.15)
```

**Risk Avoided**:
```
RA$ = baseline_cost × (TS - baseline_trust) × num_agents
```

## 🔒 Security

- HMAC SHA-256 webhook verification
- JWT bearer token authentication (privileged routes)
- PII field masking
- RBAC policy enforcement
- Secrets managed via environment variables

See [SECURITY.md](./SECURITY.md) for security policy.

## 📚 Documentation

- [ASSUMPTIONS.md](./ASSUMPTIONS.md) - Technical and business assumptions
- [OPERATIONS.md](./docs/OPERATIONS.md) - Operations playbook
- [UADSI_SPEC.md](./docs/UADSI_SPEC.md) - UADSI specification
- [MCP_ALIGNMENT.md](./docs/MCP_ALIGNMENT.md) - MCP alignment guide
- [KPI Formulas](./src/uadsi/kpi_formulas.md) - Detailed KPI calculations

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🎉 Acceptance Criteria

✅ `docker compose up` → `/status` returns healthy  
✅ `/trust` returns real KPI numbers  
✅ `pnpm run doctor` prints all checks passing  
✅ Registry has ≥ 3 agents  
✅ Adapters accept webhooks and store events  
✅ CI green on lint, types, build  
✅ `executive_summary.md` generated with all KPIs

## 🚧 Roadmap

- [ ] Real-time WebSocket dashboard updates
- [ ] ML-based anomaly detection
- [ ] Advanced self-healing workflows
- [ ] Multi-tenant architecture
- [ ] Horizontal API scaling
- [ ] Scheduled report delivery
- [ ] Vector semantic search

## 📞 Support

- 📧 Email: support@orca.agentmesh.dev
- 💬 Slack: [ORCA Community](https://orca-community.slack.com)
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/orca-agentmesh/issues)

---

**Built with ❤️ by the ORCA Team**
