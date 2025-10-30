# Runbook: KPI Drop

**Trigger**: Trust scores or synchrony metrics drop significantly (>20% decrease)

---

## Symptoms

- Trust scores below 60 (from baseline ~80)
- Synchrony metrics below threshold
- UADSI reports showing degraded scores
- Alert: `kpi_drop_detected`

---

## Severity Assessment

- **SEV2** if affecting multiple tenants
- **SEV3** if single tenant
- **SEV1** if related to data corruption

---

## Initial Response (First 15 minutes)

### 1. Verify the Issue

```bash
# Check recent KPI trends
curl -X GET https://api.orca.example/api/reports/kpis?window=24h

# Check if it's widespread or isolated
npm run scripts/kpi_health_check.ts

# Review Grafana dashboard
open https://grafana.orca.example/d/uadsi-kpis
```

### 2. Check Data Pipeline

```bash
# Verify workflow execution logs
psql -c "SELECT status, COUNT(*) FROM workflow_executions WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status;"

# Check for adapter failures
grep -r "adapter.*error" /var/log/orca/

# Review event ingestion rate
prometheus query: rate(workflow_events_total[5m])
```

### 3. Check Dependencies

```bash
# n8n/Zapier health
curl https://n8n.example/healthz
curl https://hooks.zapier.com/hooks/standard/status

# Database health
psql -c "SELECT * FROM pg_stat_database WHERE datname = 'orca';"

# Supabase status
curl https://status.supabase.com/api/v2/status.json
```

---

## Common Causes & Fixes

### Cause 1: Missing Workflow Events

**Symptoms**: Low event count, high staleness score

**Diagnosis**:
```bash
# Check webhook deliveries
psql -c "SELECT COUNT(*) FROM webhook_deliveries WHERE created_at > NOW() - INTERVAL '1 hour' AND status = 'failed';"
```

**Fix**:
```bash
# Retry failed webhook deliveries
npm run scripts/retry_failed_webhooks.ts -- --hours=24

# Verify adapter connections
npm run scripts/verify_adapters.ts
```

### Cause 2: Stale Cache

**Symptoms**: Old data in KPI calculations

**Diagnosis**:
```bash
# Check cache timestamps
redis-cli GET kpi:cache:last_update
```

**Fix**:
```bash
# Flush KPI cache
redis-cli FLUSHDB

# Trigger recalculation
npm run scripts/recalculate_kpis.ts -- --tenants=all
```

### Cause 3: Threshold Misconfiguration

**Symptoms**: Sudden drop after deployment

**Diagnosis**:
```bash
# Check recent config changes
git log --since="24 hours ago" -- src/uadsi/kpi_formulas.md
```

**Fix**:
```bash
# Rollback config if needed
git revert <commit-hash>
npm run deploy:config

# Or adjust thresholds
vim src/uadsi/trust_scoring.ts # Update thresholds
npm run build && npm run deploy
```

### Cause 4: Database Lag

**Symptoms**: Slow queries, replication delay

**Diagnosis**:
```bash
# Check replication lag
psql -c "SELECT NOW() - pg_last_xact_replay_timestamp() AS replication_lag;"

# Check slow queries
psql -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**Fix**:
```bash
# Force resync if lag >5 minutes
# See RUNBOOKS/database_failure.md

# Or scale up DB resources
aws rds modify-db-instance --db-instance-identifier orca-db --db-instance-class db.r5.xlarge --apply-immediately
```

---

## Escalation

**Escalate to SEV1 if**:
- KPI drop affects >50% of tenants
- Data corruption suspected
- Unable to identify root cause in 2 hours

**Notify**:
- Customer Success team (if customer-facing)
- Product team (may need to adjust expectations)

---

## Communication

**Internal**:
```
#incidents: KPI drop detected. Investigating workflow event ingestion. ETA: 30 minutes.
```

**Customer** (if needed):
```
Subject: Temporary KPI Reporting Delay

We're experiencing a delay in KPI calculations. Your workflow data is safe and being processed. Reports will update within 1 hour.

Status: https://status.orca.example
```

---

## Prevention

- [ ] Add alerts for event ingestion rate drops
- [ ] Implement KPI calculation monitoring
- [ ] Set up synthetic KPI baselines
- [ ] Cache invalidation on config changes

---

## Related Runbooks

- [Database Failure](./database_failure.md)
- [Adapter Outage](./adapter_outage.md)
- [Stale Metrics](./stale_metrics.md)

---

**Last Updated**: 2025-10-30  
**Owner**: SRE Team
