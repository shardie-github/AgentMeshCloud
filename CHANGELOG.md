# Changelog

All notable changes to ORCA Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-30

### Added

#### Core Architecture
- **Agent Registry**: MCP-compliant agent registration and lifecycle management
- **UADSI Module**: Unified Agent Diagnostics & Synchronization Intelligence
  - Agent discovery across MCP servers and automation platforms
  - Trust scoring engine with TS (Trust Score) calculation
  - Sync analyzer for data freshness and drift detection
  - Report engine for executive summaries and KPI reports
- **Policy Enforcer**: RBAC, data classification, NIST AI RMF & OWASP LLM Top 10 alignment
- **Telemetry**: OpenTelemetry integration for traces, metrics, and logs
- **Context Bus**: Federated context and embeddings exchange (foundation)
- **Security**: Secrets bridge, PII redaction, encryption support
- **Adapters**: Zapier integration adapter (template for others)
- **API**: REST endpoints for agents, trust, and health checks

#### Trust KPIs
- Trust Score (TS): 0-100 weighted metric
- Risk Avoided (RA$): Financial risk mitigation tracking
- Sync Freshness %: Data currency monitoring
- Drift Rate %: Configuration/data consistency tracking
- Compliance SLA %: Policy adherence rate
- Self-Resolution Ratio: Auto-healing effectiveness
- ROI: Return on investment calculation

#### Developer Experience
- Strict TypeScript with path aliases (@/*)
- ESLint with security, import order, promise rules
- Prettier code formatting
- EditorConfig for consistency
- Docker Compose for local development
- GitHub Actions CI/CD pipeline
- Doctor script for environment health checks
- Comprehensive documentation

#### Configuration
- `mcp_registry.yaml`: Agent registry schema with MCP support
- `policy_rules.yaml`: RBAC, NIST AI RMF, OWASP LLM Top 10 controls
- `drift_policy.yaml`: Self-healing and drift detection policies
- `otel_config.yaml`: OpenTelemetry configuration
- `context_bus.yaml`: Context federation settings
- `mesh_event.schema.json`: Unified event contract
- `.env.example`: Environment variable template

#### Documentation
- `README.md`: Project overview and quickstart
- `SECURITY.md`: Security policy and vulnerability reporting
- `CONTRIBUTING.md`: Contribution guidelines
- `CHANGELOG.md`: Version history
- `repo_health.md`: Pre-transformation audit report
- `CODEOWNERS`: Code ownership mapping

#### Observability
- OpenTelemetry traces with correlation IDs
- Prometheus metrics export
- Jaeger distributed tracing support
- Custom ORCA metrics (trust score, drift rate, etc.)
- Structured JSON logging with PII redaction
- Health check endpoints

### Changed
- Node.js engine requirement updated from `<20.0.0` to `>=18.18.0` (supports Node 22)
- TypeScript config enhanced with strict mode and better path resolution
- Package manager constraint changed from npm to pnpm

### Removed
- Legacy agent mesh versions (v4-v8) - ~1.8MB archived implementations
- Unused relative imports (replaced with @/* aliases)

### Security
- HMAC signature validation for adapters
- PII detection and redaction in logs
- Secrets management via environment variables + KMS bridge
- Policy enforcement with blocking/logging/advisory modes
- Audit trail for compliance (SOC2, ISO 27001, GDPR)
- Rate limiting and circuit breakers

### Fixed
- Node version mismatch between package.json and runtime
- Missing strict TypeScript checks
- Inconsistent code formatting
- Vulnerable dependencies (3 critical, 5 high addressed)

### Infrastructure
- PostgreSQL with pgvector for embeddings
- Redis for caching
- OpenTelemetry Collector for telemetry
- Prometheus for metrics
- Grafana for dashboards
- Jaeger for distributed tracing

## [Unreleased]

### Planned
- GraphQL API support
- Real-time WebSocket subscriptions for events
- Multi-tenant support
- Advanced self-healing policies
- ML-based anomaly detection
- Additional adapters (Make, n8n, Airflow, Lambda)
- Context bus full implementation with pgvector
- Comprehensive test suite (unit + integration)
- Performance benchmarks
- Helm charts for Kubernetes deployment

---

## Release Process

1. Update version in `package.json`
2. Update this CHANGELOG with changes
3. Create git tag: `git tag -a v1.0.0 -m "Release v1.0.0"`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will create release automatically

## Links

- [GitHub Repository](https://github.com/orca-mesh/orca-core)
- [Documentation](https://docs.orca-mesh.io)
- [Issue Tracker](https://github.com/orca-mesh/orca-core/issues)
