# Supabase Database Setup

This directory contains Supabase Postgres migrations, RLS policies, RPC functions, and schedulers that power the ORCA/AgentMesh platform.

## Overview

The database schema is designed for:
- **Multi-tenancy**: All data rows carry `tenant_id` and `env` (prod|staging|dev)
- **Security**: Row-Level Security (RLS) enabled by default
- **Performance**: Materialized views for KPI aggregation
- **Automation**: pg_cron schedulers for periodic tasks
- **Idempotency**: Built-in guards for event ingestion

## Architecture

### Core Components

1. **Extensions** (0001): PostgreSQL extensions (pgvector, pg_cron, etc.)
2. **Core Schema** (0002): Tables for agents, workflows, events, telemetry, metrics
3. **RLS Policies** (0003): Row-level security for multi-tenant isolation
4. **Indexes & FKs** (0004): Performance optimization
5. **RPC Functions** (0005): API-callable stored procedures
6. **Materialized Views** (0006): Pre-aggregated KPI data
7. **Cron Jobs** (0007): Scheduled tasks (MV refresh, DLQ pruning)
8. **Seed Data** (0008): Minimal bootstrap data

### Key Tables

| Table | Purpose |
|-------|---------|
| `tenants` | Organization/workspace isolation |
| `user_memberships` | User ↔ tenant mapping with roles |
| `agents` | MCP & non-MCP agent registry |
| `workflows` | UADSI-discovered workflows |
| `events` | Normalized inbound events (idempotent) |
| `telemetry` | Agent performance metrics |
| `metrics` | Trust scores, KPIs, reports |
| `baselines` | Risk Avoided (RA$) baselines |
| `embeddings` | pgvector embeddings for context bus |
| `policies` | Policy rules registry |
| `adapters` | Adapter credentials & status |
| `api_keys` | API authentication |
| `dlq` | Dead letter queue |
| `quarantine` | Resource isolation |
| `reports` | Executive summary exports |
| `jobs` | Background job tracking |

### RPC Functions

All RPCs are `security definer` functions callable from your API:

```sql
-- Compute trust KPIs for a date range
SELECT * FROM api_compute_trust_kpis(tenant_id, env, from_ts, to_ts);

-- List agents
SELECT * FROM api_list_agents(tenant_id, env);

-- List workflows
SELECT * FROM api_list_workflows(tenant_id, env);

-- Ingest event (with idempotency)
SELECT api_ingest_event(tenant_id, env, workflow_id, kind, source, correlation_id, idempotency_key, payload);

-- Record telemetry
SELECT api_record_telemetry(tenant_id, env, agent_id, latency_ms, errors, policy_violations, uptime_pct);

-- Set baseline
SELECT api_set_baseline(tenant_id, env, key, value, note);
```

### Scheduled Jobs (pg_cron)

| Job | Schedule | Purpose |
|-----|----------|---------|
| `mv-kpis-refresh` | */15 * * * * | Refresh materialized view for daily KPIs |
| `kpi-hourly-snapshot` | 0 * * * * | Compute and store hourly metrics |
| `dlq-prune` | 15 3 * * * | Delete DLQ entries older than 30 days |

## Local Development

### Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`)
- Supabase project ([create one](https://app.supabase.com))

### Setup

1. **Create `.env` file** (copy from `.env.example`):

```bash
cp .env.example .env
```

2. **Update Supabase credentials**:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_DB_PASSWORD=your-db-password
```

3. **Link to your Supabase project**:

```bash
npm run supabase:link
```

4. **Push migrations**:

```bash
npm run supabase:push
```

### NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run supabase:link` | Link CLI to your Supabase project |
| `npm run supabase:push` | Apply migrations to remote DB |
| `npm run supabase:reset` | Reset DB and reapply migrations |
| `npm run supabase:seed` | Reset DB, push migrations, and seed data |
| `npm run supabase:studio` | Open Supabase Studio UI |
| `npm run supabase:status` | List applied migrations |
| `npm run supabase:diff` | Generate migration from current schema |

## CI/CD Integration

### GitHub Actions

The CI pipeline includes a `supabase-migrations` job that:
1. Validates migrations on every PR (dry-run)
2. Comments validation status on PR
3. Requires `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD` secrets

### Required GitHub Secrets

Add these to your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `SUPABASE_PROJECT_REF` | Your Supabase project reference ID |
| `SUPABASE_DB_PASSWORD` | Database password (from Supabase dashboard) |

### Production Deployment

For production, use Supabase's built-in migration system or run:

```bash
# Set production credentials
export SUPABASE_PROJECT_REF=prod-project-ref
export SUPABASE_DB_PASSWORD=prod-password

# Apply migrations
npm run supabase:link
npm run supabase:push
```

## Migration Best Practices

1. **Idempotent DDL**: All migrations use `IF NOT EXISTS` / `IF EXISTS`
2. **Versioned naming**: `0001_`, `0002_`, etc. for ordering
3. **No rollbacks**: Always write forward-only migrations
4. **Test locally**: Use `supabase:reset` to test full migration sequence
5. **Seed data**: Keep seed data minimal and environment-aware

## Schema Evolution

To add new migrations:

1. **Generate diff** (if you modified schema manually):

```bash
npm run supabase:diff -- -f new_migration_name
```

2. **Or create manually**:

```bash
touch supabase/migrations/0009_new_feature.sql
```

3. **Test locally**:

```bash
npm run supabase:reset
npm run supabase:push
```

4. **Commit and push**: CI will validate your migration

## RLS Policy Structure

All tables have two policies:
- **`{table}_select`**: Viewers+ can read within their tenant
- **`{table}_write`**: Admins+ can write within their tenant

Roles:
- `owner`: Full access
- `admin`: Read/write within tenant
- `analyst`: Read-only within tenant
- `viewer`: Read-only within tenant

## Troubleshooting

### Migration fails with "already exists"

- Ensure all DDL uses `IF NOT EXISTS` / `IF EXISTS`
- Check for naming conflicts

### RLS denies access

- Ensure user has `user_memberships` row for the tenant
- Check `v_current_memberships` view
- Use `SECURITY DEFINER` for service functions

### Cron jobs not running

- Verify `pg_cron` extension is enabled (requires Supabase Pro/Team plan)
- Check `cron.job_run_details` for errors

### Performance issues

- Add indexes to frequently queried columns
- Use materialized views for heavy aggregations
- Check `pg_stat_statements` for slow queries

## Support

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Discord](https://discord.supabase.com)
- Internal: Slack #orca-db-help

## License

Internal use only. See root LICENSE file.
