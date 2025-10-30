# E2E Synthetic Test Harness

End-to-end test suite that exercises the full ORCA/AgentMesh data flow:
**Adapters → Registry → Telemetry → UADSI Analytics → Trust KPIs → Executive Report**

## Overview

This test harness simulates real-world webhook traffic from integration platforms (Zapier, n8n) and validates that:
- Events are correctly ingested with correlation & idempotency tracking
- Metrics are calculated and exposed via `/trust` endpoint
- Trust Score, Risk Avoided, Sync Freshness, Drift Rate, and Compliance SLA meet thresholds
- Executive summary reports are generated

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Synthetic  │────▶│   Adapters   │────▶│  Registry   │────▶│  UADSI   │
│  Webhooks   │     │ (Zapier/n8n) │     │  + Telemetry│     │ Analytics│
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘
                                                                    │
                                                                    ▼
                                          ┌─────────────────────────────┐
                                          │   /trust KPIs + Reports     │
                                          └─────────────────────────────┘
```

## Quick Start

### Prerequisites

- Docker Compose stack running (`docker compose up -d`)
- PostgreSQL with required tables (auto-created by seed script)
- API server running on port 3000 (or set `API_BASE_URL`)

### Local Execution

```bash
# From repository root

# 1. Seed baseline metrics and tables
pnpm run e2e:seed

# 2. Fire synthetic webhooks
pnpm run e2e:fire

# 3. Assert KPI thresholds
pnpm run e2e:assert

# OR: Run all three steps
pnpm run e2e
```

### Environment Variables

```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agentmesh
API_BASE_URL=http://localhost:3000
ADAPTER_SECRET=changeme

# Optional
E2E_TIMEOUT_MS=60000  # KPI polling timeout (default: 60s)
```

## Test Components

### 1. `seed_baselines.ts`

Sets up test database with:
- **Baselines table**: Incident costs and freshness SLOs
- **Metrics table**: Initial trust score frame (all zeros)
- **Events table**: Adapter event log with deduplication

### 2. `fire_webhooks.ts`

Sends synthetic webhook payloads to adapter endpoints:
- **Zapier**: `order.created`, `order.fulfilled`
- **n8n**: `ticket.opened`, `ticket.resolved`

Each request includes:
- `x-correlation-id`: Distributed tracing
- `x-idempotency-key`: Deduplication
- `x-signature`: HMAC-SHA256 verification

### 3. `assert_kpis.ts`

Polls `/trust` endpoint (60s timeout) and validates:

| KPI                  | Threshold  |
|----------------------|------------|
| Trust Score          | >= 75      |
| Sync Freshness %     | >= 90      |
| Drift Rate %         | <= 5       |
| Compliance SLA %     | >= 95      |

Also triggers `/reports/export` and verifies executive summary generation.

### 4. `fixtures/*.json`

Realistic test payloads with:
- `{{now}}` placeholders (replaced with current timestamp)
- Order lifecycle events (created → fulfilled)
- Compliance ticket events (opened → resolved)
- Customer PII and GDPR metadata

## CI Integration

The E2E suite runs in GitHub Actions CI:

```yaml
e2e:
  runs-on: ubuntu-latest
  needs: build
  services:
    postgres:
      image: ankane/pgvector
      # ... health checks
  steps:
    - run: pnpm run build
    - run: node dist/api/server.js &  # Background API
    - run: pnpm run e2e:seed
    - run: pnpm run e2e:fire
    - run: pnpm run e2e:assert
    - uses: actions/upload-artifact@v4  # Upload executive_summary.md
```

## Debugging

### Check API logs
```bash
docker compose logs -f api
```

### Inspect database
```bash
docker compose exec postgres psql -U postgres agentmesh -c "SELECT * FROM events;"
docker compose exec postgres psql -U postgres agentmesh -c "SELECT * FROM metrics ORDER BY ts DESC LIMIT 5;"
```

### Manual webhook test
```bash
curl -X POST http://localhost:3000/adapters/zapier/webhook \
  -H "Content-Type: application/json" \
  -H "x-correlation-id: test-123" \
  -H "x-idempotency-key: idempotent-456" \
  -H "x-signature: $(echo -n '{"test":true}' | openssl dgst -sha256 -hmac 'changeme' | cut -d' ' -f2)" \
  -d @scripts/e2e/fixtures/zapier.order.created.json
```

### KPI endpoint
```bash
curl http://localhost:3000/trust | jq
```

## Acceptance Criteria

- ✅ All scripts run without errors locally
- ✅ CI `e2e` job passes and uploads `executive_summary.md` artifact
- ✅ `/trust` returns non-zero Trust Score and Risk Avoided
- ✅ Events logged with correlation IDs and deduplicated by idempotency keys
- ✅ All KPI thresholds met (TS ≥75, Freshness ≥90%, Drift ≤5%, SLA ≥95%)

## Next Steps

- **ServiceNow Connector**: Add ServiceNow incident webhook fixtures
- **Datadog Integration**: Add APM trace validation
- **Negative Tests**: Test duplicate events, invalid signatures, schema violations
- **Load Testing**: k6 scenarios with 100+ events/sec
- **Chaos Testing**: Network failures, database unavailability, slow APIs

## Troubleshooting

### "KPIs did not populate before timeout"
- Ensure API server is running and healthy
- Check that adapters are correctly writing to events table
- Verify UADSI analytics job is processing events
- Increase `E2E_TIMEOUT_MS` if analytics are slow

### "webhook failed: 401"
- Verify `ADAPTER_SECRET` matches between `.env` and test scripts
- Check HMAC signature generation in `fire_webhooks.ts`

### "DATABASE_URL connection failed"
- Ensure PostgreSQL container is running: `docker compose ps`
- Check connection string format: `postgresql://user:pass@host:port/db`
- Verify database exists: `docker compose exec postgres psql -l`

---

**Owner**: SRE + Test Architecture Team  
**Last Updated**: 2025-10-30  
**Status**: ✅ Production Ready
