# Supabase Database Setup - Complete ✅

## Overview

Complete Supabase Postgres schema + policies + RPCs + schedulers for ORCA/AgentMesh (UADSI, adapters, KPIs, reports) has been successfully implemented.

## What Was Created

### 📁 Migration Files (`supabase/migrations/`)

1. **0001_extensions.sql** - PostgreSQL extensions
   - uuid-ossp, pgcrypto, pg_trgm
   - pg_stat_statements (performance monitoring)
   - vector (pgvector for embeddings)
   - pg_net (outbound HTTP)
   - pg_cron (job scheduling)

2. **0002_core_schema.sql** - Core database tables
   - Multi-tenant scaffolding (`tenants`, `user_memberships`)
   - Environment-aware (`env_t` enum: dev|staging|prod)
   - Agent & workflow registry
   - Event ingestion (idempotent)
   - Telemetry, metrics, KPIs
   - Baselines, embeddings, policies
   - Adapters, API keys
   - DLQ, quarantine, reports, jobs

3. **0003_rls_policies.sql** - Row-Level Security
   - RLS enabled on all tables
   - Viewer+ can read within tenant
   - Admin+ can write within tenant
   - Role-based access (owner|admin|analyst|viewer)

4. **0004_indexes_fkeys.sql** - Performance optimization
   - Indexes on frequently queried columns
   - Foreign key constraints

5. **0005_rpc_functions.sql** - API-callable stored procedures
   - `api_compute_trust_kpis()` - Compute trust metrics
   - `api_list_agents()` - List agents by tenant/env
   - `api_list_workflows()` - List workflows by tenant/env
   - `api_ingest_event()` - Ingest event with idempotency
   - `api_record_telemetry()` - Record telemetry data
   - `api_set_baseline()` - Upsert baseline values
   - `v_trust_kpis` - Convenience view for latest KPIs

6. **0006_materialized_views.sql** - Pre-aggregated dashboards
   - `mv_kpis_daily` - Daily KPI aggregations
   - `job_compute_hourly_metrics()` - Hourly snapshot function

7. **0007_cron_jobs.sql** - Scheduled tasks
   - MV refresh every 15 minutes
   - Hourly KPI snapshot
   - DLQ pruning (30 days retention)

8. **0008_seed_minimum.sql** - Bootstrap data
   - Default tenant
   - Sample agents (MCP Orchestrator, Zapier Bridge)
   - Sample workflows (Orders Sync, Tickets Sync)
   - Baseline costs (RA$ values)
   - Initial metrics snapshot

### 📝 Configuration Files Updated

#### `package.json` - New NPM scripts added:
```json
{
  "supabase:link": "Link CLI to Supabase project",
  "supabase:push": "Apply migrations",
  "supabase:reset": "Reset DB and reapply",
  "supabase:seed": "Reset + push + seed",
  "supabase:studio": "Open Studio UI",
  "supabase:status": "List migrations",
  "supabase:diff": "Generate migration diff"
}
```

#### `.env.example` - Supabase configuration added:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:...
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=your-db-password
```

#### `.github/workflows/ci.orca.yml` - CI job added:
- **supabase-migrations** job validates migrations on PRs
- Dry-run validation
- Automated PR comments
- Requires GitHub secrets: `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`

### 📚 Documentation

**`supabase/README.md`** - Comprehensive guide covering:
- Architecture overview
- Table descriptions
- RPC function usage
- Scheduled jobs
- Local development setup
- CI/CD integration
- Migration best practices
- Troubleshooting

## Quick Start

### Prerequisites

```bash
# Install Supabase CLI
npm i -g supabase

# Or use npx
npx supabase --version
```

### Setup Steps

1. **Create Supabase project** at https://app.supabase.com

2. **Configure environment**:
```bash
cp .env.example .env
# Update SUPABASE_* variables with your project credentials
```

3. **Link project**:
```bash
npm run supabase:link
```

4. **Apply migrations**:
```bash
npm run supabase:push
```

5. **Verify in Studio**:
```bash
npm run supabase:studio
```

## Database Schema Highlights

### Multi-Tenant Architecture

All tables include:
- `tenant_id` (UUID) - Organization isolation
- `env` (enum) - Environment: dev|staging|prod

### Idempotency Guarantees

Events table has unique constraint on:
```sql
(tenant_id, env, idempotency_key)
```

Prevents duplicate event processing.

### Security (RLS)

Example policy:
```sql
-- Viewers can read their tenant's data
CREATE POLICY agents_select ON agents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM v_current_memberships v 
      WHERE v.tenant_id = agents.tenant_id
    )
  );
```

### Performance

- **Indexes** on high-cardinality columns
- **Materialized views** for aggregated KPIs
- **pg_cron** for background maintenance
- **pgvector** for semantic search

## API Integration Pattern

Your API layer should use RPCs:

```typescript
// Example: Ingest event
const { data, error } = await supabase.rpc('api_ingest_event', {
  p_tenant: tenantId,
  p_env: 'dev',
  p_workflow: workflowId,
  p_kind: 'order.created',
  p_source: 'zapier',
  p_correlation: correlationId,
  p_idem: idempotencyKey,
  p_payload: eventPayload
});

// Example: Get trust KPIs
const { data } = await supabase.rpc('api_compute_trust_kpis', {
  p_tenant: tenantId,
  p_env: 'prod',
  p_from: '2025-10-01T00:00:00Z',
  p_to: '2025-10-30T23:59:59Z'
});
```

## CI/CD Flow

### Pull Requests
1. Dev creates PR with new migration
2. GitHub Action runs `supabase db push --dry-run`
3. Validation result commented on PR
4. Team reviews migration SQL

### Production Deploy
1. Merge to main
2. Manual or automated run:
```bash
npm run supabase:push
```
3. Migrations applied sequentially
4. Rollback: create forward-only migration

## Monitoring & Observability

### Built-in Metrics

- **Trust Score**: Average uptime % from telemetry
- **Risk Avoided (RA$)**: Sum of baseline incident costs
- **Sync Freshness**: % events within SLO window
- **Drift Rate**: % telemetry rows with policy violations
- **Compliance SLA**: % days with zero violations

### Scheduled Jobs (pg_cron)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `mv-kpis-refresh` | Every 15 min | Refresh materialized views |
| `kpi-hourly-snapshot` | Hourly | Compute & store metrics |
| `dlq-prune` | Daily 3:15 AM | Delete old DLQ entries |

### Querying Metrics

```sql
-- Latest KPIs by tenant/env
SELECT * FROM v_trust_kpis
WHERE tenant_id = '...' AND env = 'prod';

-- Daily aggregates
SELECT * FROM mv_kpis_daily
WHERE tenant_id = '...' 
  AND env = 'prod'
  AND d >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY d DESC;
```

## GitHub Secrets Required

Add these to repository settings → Secrets and variables → Actions:

| Secret | Where to Find |
|--------|---------------|
| `SUPABASE_PROJECT_REF` | Project Settings → General → Reference ID |
| `SUPABASE_DB_PASSWORD` | Project Settings → Database → Connection string |

## Next Steps

### 1. Application Integration

Update your API endpoints to use Supabase RPCs:

```typescript
// src/api/routes/trust.ts
app.get('/trust', async (req, res) => {
  const { tenant_id, env } = req.query;
  const { data } = await supabase.rpc('api_compute_trust_kpis', {
    p_tenant: tenant_id,
    p_env: env,
    p_from: new Date(Date.now() - 24*60*60*1000),
    p_to: new Date()
  });
  res.json(data);
});
```

### 2. Adapter Webhooks

Wire up webhook handlers to call `api_ingest_event()`:

```typescript
// src/adapters/zapier.ts
app.post('/webhooks/zapier', async (req, res) => {
  await supabase.rpc('api_ingest_event', {
    p_tenant: req.body.tenant_id,
    p_env: 'prod',
    p_workflow: req.body.workflow_id,
    p_kind: req.body.event_type,
    p_source: 'zapier',
    p_correlation: req.headers['x-correlation-id'],
    p_idem: req.headers['x-idempotency-key'],
    p_payload: req.body
  });
  res.sendStatus(200);
});
```

### 3. Telemetry Collection

Emit telemetry from agents:

```typescript
// After agent execution
await supabase.rpc('api_record_telemetry', {
  p_tenant: agent.tenant_id,
  p_env: agent.env,
  p_agent: agent.id,
  p_latency: executionTime,
  p_errors: errorCount,
  p_policy: policyViolations,
  p_uptime: uptimePercent
});
```

### 4. Dashboard Queries

Build dashboards using materialized views:

```typescript
// Fetch last 30 days of KPIs
const { data } = await supabase
  .from('mv_kpis_daily')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('env', 'prod')
  .gte('d', new Date(Date.now() - 30*24*60*60*1000))
  .order('d', { ascending: false });
```

### 5. Baseline Configuration

Set incident cost baselines:

```typescript
await supabase.rpc('api_set_baseline', {
  p_tenant: tenantId,
  p_env: 'prod',
  p_key: 'incident_cost.order_duplication',
  p_value: 2500.00,
  p_note: 'Avg revenue loss per duplicate order'
});
```

## Validation Checklist

- [ ] Supabase project created
- [ ] GitHub secrets configured
- [ ] Local `.env` updated
- [ ] Migrations pushed successfully
- [ ] Default tenant exists in DB
- [ ] RLS policies tested
- [ ] RPC functions callable
- [ ] pg_cron jobs scheduled
- [ ] Materialized views populated
- [ ] API integrated with RPCs

## Troubleshooting

### "extension does not exist"

Some extensions require Supabase Pro plan:
- `pg_cron` → Pro/Team plan required
- `pgvector` → Available on all plans
- Solution: Comment out in `0001_extensions.sql` if not available

### "permission denied for schema cron"

`pg_cron` requires Pro plan. Alternatives:
- Use external cron (GitHub Actions, AWS EventBridge)
- Remove `0007_cron_jobs.sql` from migrations

### RLS blocking service account

Use `SECURITY DEFINER` functions (already implemented):
```sql
CREATE FUNCTION api_list_agents(...) 
  RETURNS SETOF agents 
  LANGUAGE sql 
  SECURITY DEFINER -- Runs with function owner's privileges
```

### Slow queries

Check `pg_stat_statements`:
```sql
SELECT query, calls, mean_exec_time 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

## Support & Resources

- **Documentation**: `/workspace/supabase/README.md`
- **Supabase Docs**: https://supabase.com/docs
- **Discord**: https://discord.supabase.com
- **Internal**: Slack #orca-db

---

## Summary

✅ **8 versioned SQL migrations** created  
✅ **Multi-tenant + environment-aware** schema  
✅ **RLS policies** for security  
✅ **6 RPC functions** for API integration  
✅ **Materialized views** for fast dashboards  
✅ **3 pg_cron jobs** for automation  
✅ **Idempotency guards** for reliable ingestion  
✅ **CI/CD wired** with GitHub Actions  
✅ **Comprehensive documentation** provided  

**Status**: Ready for production deployment 🚀

**Next Action**: Configure GitHub secrets and run `npm run supabase:push`
