## Supabase Operations Guide

Complete guide for Day 2 operations of ORCA Core's Supabase database.

## Table of Contents

- [Configuration](#configuration)
- [Safety Parameters](#safety-parameters)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)
- [RLS Testing](#rls-testing)
- [Performance Tuning](#performance-tuning)
- [Troubleshooting](#troubleshooting)
- [Backup & Recovery](#backup--recovery)

## Configuration

### Environment Variables

Required environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
SUPABASE_DB_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres
```

Add to `.env.example` for reference.

### Initial Setup

```bash
# Link to Supabase project
pnpm run supabase:link

# Apply safety parameters
psql $SUPABASE_DB_URL -f supabase/config/parameters.sql

# Install monitoring functions
psql $SUPABASE_DB_URL -f supabase/monitoring/slots.sql
psql $SUPABASE_DB_URL -f supabase/monitoring/maintenance.sql

# Run RLS tests
psql $SUPABASE_DB_URL -f supabase/tests/rls_matrix.spec.sql
```

## Safety Parameters

### Timeouts

The following timeouts are configured in `supabase/config/parameters.sql`:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `statement_timeout` | 8s | Prevent long-running queries |
| `lock_timeout` | 2s | Prevent deadlocks |
| `idle_in_transaction_session_timeout` | 10min | Prevent connection leaks |

### Per-Role Timeouts

| Role | Timeout | Reason |
|------|---------|--------|
| `anon` | 3s | Public access, stricter limits |
| `authenticated` | 5s | Regular users |
| `service_role` | 30s | Admin operations |

### Applying Changes

```bash
# Apply parameters
psql $SUPABASE_DB_URL -f supabase/config/parameters.sql

# Verify settings
psql $SUPABASE_DB_URL -c "SELECT name, setting, unit FROM pg_settings WHERE name IN ('statement_timeout', 'lock_timeout');"
```

## Monitoring

### Replication Slots

Monitor replication slots to prevent WAL accumulation:

```sql
-- Check all replication slots
SELECT * FROM monitor_replication_slots();

-- Get alerts for problematic slots
SELECT * FROM alert_stale_replication_slots();

-- Check WAL disk usage
SELECT * FROM check_wal_size();
```

**Alerts:**

- **CRITICAL:** Lag > 1000 MB - immediate action required
- **WARNING:** Lag > 500 MB - monitor closely
- **OK:** Lag < 100 MB

### Autovacuum

Monitor autovacuum activity and table bloat:

```sql
-- Check autovacuum status
SELECT * FROM monitor_autovacuum_activity() WHERE needs_vacuum;

-- Estimate table bloat
SELECT * FROM estimate_table_bloat() WHERE bloat_level IN ('HIGH', 'MEDIUM');

-- Get vacuum recommendations
SELECT * FROM recommend_vacuum_operations();
```

### Index Health

Check for unused or missing indexes:

```sql
-- Find unused indexes
SELECT * FROM check_index_health() WHERE is_unused;

-- Suggest missing indexes
SELECT * FROM suggest_missing_indexes();
```

### Supabase Dashboard

Access monitoring in the Supabase dashboard:

1. **Database** → **Reports**
   - Query performance
   - Slow queries
   - Index usage

2. **Database** → **Replication**
   - Replication lag
   - WAL size

3. **Settings** → **Database**
   - Connection pooling
   - SSL enforcement

## Maintenance

### ANALYZE (Statistics Update)

Run after migrations or large data changes:

```bash
# Quick ANALYZE on hot tables
./scripts/db/analyze.sh

# Or manually
psql $SUPABASE_DB_URL -c "ANALYZE;"
```

**When to run:**

- After migrations
- After bulk data imports
- After schema changes
- Weekly as preventive maintenance

### VACUUM

```sql
-- Check if vacuum is needed
SELECT * FROM recommend_vacuum_operations();

-- Manual VACUUM (non-blocking)
VACUUM ANALYZE table_name;

-- VACUUM FULL (blocking, use with caution)
VACUUM FULL table_name; -- Requires table lock
```

**VACUUM FULL considerations:**

- ⚠️ Locks table for duration
- Use during maintenance windows only
- Consider `pg_repack` as non-locking alternative

### Hot Table Tuning

Tables with frequent updates have custom autovacuum settings:

```sql
-- Trust scores (high update frequency)
ALTER TABLE trust_scores SET (
  autovacuum_vacuum_scale_factor = 0.01,
  fillfactor = 70  -- Leave room for HOT updates
);

-- Agent registry (moderate updates)
ALTER TABLE agent_registry SET (
  autovacuum_vacuum_scale_factor = 0.02
);
```

## RLS Testing

### Running RLS Tests

```bash
# Run full RLS matrix
psql $SUPABASE_DB_URL -f supabase/tests/rls_matrix.spec.sql

# Or via npm script
pnpm run rls:smoke
```

### RLS Policy Matrix

| Table | anon | authenticated | service_role |
|-------|------|---------------|--------------|
| `agent_registry` | SELECT | SELECT, INSERT (own), UPDATE (own), DELETE (own) | ALL |
| `trust_scores` | SELECT | SELECT | ALL |
| `audit_logs` | - | SELECT (own tenant), INSERT (own tenant) | ALL |
| `policy_evaluations` | - | SELECT (own tenant) | ALL |

### Manual RLS Testing

```sql
-- Test anon role
SET ROLE anon;
SELECT * FROM agent_registry LIMIT 1; -- Should work
INSERT INTO agent_registry (name) VALUES ('test'); -- Should fail
RESET ROLE;

-- Test authenticated role (with JWT claims)
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-id", "tenant_id": "tenant-123"}';
SELECT * FROM audit_logs; -- Should only see own tenant
RESET ROLE;

-- Test service_role (bypass RLS)
SET ROLE service_role;
SELECT * FROM audit_logs; -- Should see all
RESET ROLE;
```

### RLS Coverage Check

Ensure all public tables have RLS enabled:

```sql
SELECT 
  schemaname, 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;
```

If any tables are missing RLS, add policies:

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON your_table FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

## Performance Tuning

### Query Performance

**Find slow queries:**

```sql
-- Supabase provides this view
SELECT * FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

**Explain queries:**

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM trust_scores WHERE agent_id = 'abc';
```

### Connection Pooling

Supabase uses PgBouncer for connection pooling.

**Connection modes:**

- **Transaction mode** (default): Best for most use cases
- **Session mode**: Use for specific operations requiring session state

Configure in Supabase dashboard under **Database** → **Connection pooling**.

### Indexes

**Create indexes for frequently queried columns:**

```sql
-- Example: Index on agent_id for trust_scores lookups
CREATE INDEX IF NOT EXISTS idx_trust_scores_agent_id 
  ON trust_scores(agent_id);

-- Partial index for active agents only
CREATE INDEX IF NOT EXISTS idx_active_agents 
  ON agent_registry(status) 
  WHERE status = 'active';
```

**Monitor index usage:**

```sql
SELECT * FROM check_index_health();
```

## Troubleshooting

### High CPU Usage

1. **Check slow queries:**
   ```sql
   SELECT * FROM pg_stat_activity
   WHERE state = 'active'
   ORDER BY query_start;
   ```

2. **Kill long-running queries:**
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE pid = 12345;
   ```

### Connection Pool Exhaustion

1. **Check connections:**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Increase pool size** in Supabase dashboard

3. **Close idle connections** in application code

### Replication Lag

1. **Check replication status:**
   ```sql
   SELECT * FROM alert_stale_replication_slots();
   ```

2. **Drop inactive slots** (if safe):
   ```sql
   SELECT pg_drop_replication_slot('slot_name');
   ```

### Table Bloat

1. **Estimate bloat:**
   ```sql
   SELECT * FROM estimate_table_bloat() WHERE bloat_pct > 20;
   ```

2. **Run VACUUM:**
   ```sql
   VACUUM FULL table_name; -- During maintenance window
   ```

## Backup & Recovery

### Automatic Backups

Supabase provides automatic daily backups (retention depends on plan).

**View backups:**

1. Supabase Dashboard → **Database** → **Backups**
2. Download PITR (Point-in-Time Recovery) if available

### Manual Backups

```bash
# Full backup
./scripts/supabase_backup_now.sh

# Or via pg_dump
pg_dump $SUPABASE_DB_URL > backup.sql
```

### Restore

```bash
# From backup file
psql $SUPABASE_DB_URL < backup.sql

# PITR (via Supabase dashboard)
# Database → Backups → Restore to point in time
```

### Testing Backups

```bash
# Test restore in non-prod environment
pnpm run db:preflight
```

## Scheduled Maintenance

### Daily Tasks

- [x] Monitor replication slots
- [x] Check for slow queries
- [x] Review error logs

### Weekly Tasks

- [x] Run ANALYZE on hot tables
- [x] Check table bloat
- [x] Review unused indexes
- [x] Verify RLS policies

### Monthly Tasks

- [x] Review connection pool settings
- [x] Audit user permissions
- [x] Test backup restore
- [x] Review and optimize slow queries

## Runbooks

### Runbook: High Replication Lag

1. **Identify lag:**
   ```sql
   SELECT * FROM alert_stale_replication_slots();
   ```

2. **Check WAL size:**
   ```sql
   SELECT * FROM check_wal_size();
   ```

3. **If inactive slot:**
   ```sql
   SELECT * FROM list_inactive_slots();
   SELECT pg_drop_replication_slot('slot_name');
   ```

4. **Monitor after action:**
   Wait 5 minutes and recheck lag.

### Runbook: Table Bloat

1. **Identify bloated tables:**
   ```sql
   SELECT * FROM estimate_table_bloat() WHERE bloat_pct > 25;
   ```

2. **Check autovacuum:**
   ```sql
   SELECT * FROM monitor_autovacuum_activity();
   ```

3. **Manual vacuum:**
   ```sql
   VACUUM ANALYZE table_name;
   ```

4. **If severe (>50% bloat):**
   Schedule VACUUM FULL during maintenance window.

### Runbook: Query Timeout

1. **Identify slow query:**
   Review error logs or monitoring.

2. **Explain query:**
   ```sql
   EXPLAIN (ANALYZE, BUFFERS) <slow_query>;
   ```

3. **Optimize:**
   - Add index
   - Rewrite query
   - Increase timeout (if legitimate)

4. **Monitor:**
   Check query performance after changes.

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Supabase Status](https://status.supabase.com/)

## Support

For issues:

1. Check [Supabase Status](https://status.supabase.com/)
2. Review logs in Supabase dashboard
3. Open ticket in Supabase dashboard
4. See [SUPPORT.md](../SUPPORT.md)

---

**Last Updated:** 2025-10-31
