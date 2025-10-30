# ASSUMPTIONS.md

## Technical Assumptions

### Database
- PostgreSQL 14+ with pgvector extension installed
- Supabase-compatible (no RLS required for MVP)
- Connection string format: `postgresql://user:password@host:port/database`
- Default port: 5432

### OpenTelemetry
- OTLP gRPC endpoint available (default: http://localhost:4317)
- Collector supports metrics and traces
- Prometheus scraping enabled for metrics export
- Grafana available for dashboard visualization (optional)

### Authentication & Security
- JWT secrets are min 32 characters
- HMAC SHA-256 for webhook verification
- Bearer token auth for privileged routes
- PII masking enabled by default

### Environment
- Node.js 18.18.0+ required
- pnpm 8+ for package management
- Docker + Docker Compose for local development
- Linux/macOS for native development (Windows via WSL2)

## Business Assumptions

### Trust Scoring
- Baseline trust score: 0.85 (configurable)
- Baseline incident cost: $10,000 USD (configurable)
- Risk Avoided calculation assumes baseline represents pre-ORCA state
- Trust levels initialized at 0.75 for new agents

### Sync Freshness
- Default SLO: 24 hours (configurable)
- Workflows without events within SLO are "stale"
- Drift threshold: 2× freshness SLO (48 hours default)

### Compliance SLA
- Target: 99.5%
- Calculated from policy adherence + agent uptime
- Policy violations weighted higher than uptime

### Self-Healing
- Enabled by default (can be disabled)
- Automatic remediation for low-risk actions only
- High-risk actions require manual approval (future)
- Max 3 retries with 60s delay between attempts

## Data Assumptions

### Seed Data
- 3 sample agents (1 MCP, 1 Zapier, 1 n8n)
- 2 sample workflows
- 50 telemetry records (hourly intervals over ~2 days)
- 30 events (2-hour intervals)
- 1 initial metrics snapshot

### Telemetry Collection
- Latency recorded in milliseconds
- Error rate: ~10% for realistic testing
- Policy violation rate: ~5% for realistic testing
- Success rate: ~90%

## Integration Assumptions

### MCP (Model Context Protocol)
- MCP servers installed via npx
- Registry defined in YAML
- Servers run as child processes (not managed by ORCA MVP)
- Capabilities discovered from registry metadata

### Zapier
- Webhooks use standard Zapier webhook format
- `zap_id` and `zap_name` provided in payload
- HMAC signature in `x-signature` header
- Idempotency via `x-idempotency-key` header

### n8n
- Webhooks use standard n8n webhook format
- `workflow_id`, `workflow_name`, `execution_id` provided
- HMAC signature in `x-signature` header
- Correlation via `x-correlation-id` header

## Deployment Assumptions

### Docker Compose
- All services run in same network
- Database initializes from schema.sql on first start
- API waits for database readiness (health check)
- Grafana/Prometheus optional for local dev

### CI/CD
- GitHub Actions for CI
- Runs on `ubuntu-latest` runners
- Artifacts: executive_summary.md
- No CD to production in MVP

## Scalability Assumptions

### MVP Limits
- Single API instance (horizontal scaling future)
- Up to 100 agents
- Up to 500 workflows
- Up to 100K events/day
- Single Postgres instance

### Performance
- API response time: < 500ms p95
- Database query time: < 100ms p95
- Telemetry ingestion: < 50ms p95
- Report generation: < 5s

## Feature Flags

All feature flags default to `true`:
- `ENABLE_SELF_HEALING`
- `ENABLE_DRIFT_DETECTION`
- `ENABLE_TRUST_SCORING`

## Known Limitations

1. **JWT Verification**: Token presence checked, but signature not validated (use proper JWT library in production)
2. **HMAC Timing Attack**: Basic `timingSafeEqual` used, consider rate limiting
3. **Vector Search**: Embeddings table exists but not used in MVP
4. **Self-Healing**: Limited to status resets, no complex remediation
5. **Drift Detection**: Staleness-based only, no ML anomaly detection
6. **Reporting**: Manual export only, no scheduled delivery
7. **Multi-tenancy**: Single tenant, no isolation
8. **Audit Logging**: Basic logging only, no compliance audit trail

## Future Enhancements

- Real JWT verification with role-based claims
- Vector embeddings for semantic agent discovery
- ML-based drift and anomaly detection
- Automated report delivery (email, Slack)
- Multi-tenant architecture with data isolation
- Advanced self-healing with rollback capabilities
- Horizontal API scaling with load balancing
- Real-time dashboard with WebSocket updates
