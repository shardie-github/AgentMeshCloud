# ORCA AgentMesh Operations Guide

## Deployment

### Docker Compose (Recommended for MVP)

```bash
# Start all services
docker compose -f docker-compose.orca.yml up -d

# View logs
docker compose -f docker-compose.orca.yml logs -f api

# Stop services
docker compose -f docker-compose.orca.yml down

# Rebuild after code changes
docker compose -f docker-compose.orca.yml up --build
```

### Manual Deployment

```bash
# 1. Start PostgreSQL with pgvector
# 2. Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/orcamesh"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"
# ... other env vars

# 3. Run migrations
pnpm run db:migrate

# 4. Seed database (optional)
pnpm run db:seed

# 5. Build and start
pnpm run build
pnpm run start
```

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed status
curl http://localhost:3000/status

# System diagnostics
pnpm run doctor
```

### Metrics & Dashboards

- **Grafana**: http://localhost:3001
  - Default credentials: admin/admin
  - Dashboard: ORCA AgentMesh Observatory
  
- **Prometheus**: http://localhost:9090
  - Metrics endpoint: http://localhost:3000/metrics

### Key Metrics to Monitor

| Metric | Alert Threshold | Description |
|--------|----------------|-------------|
| Trust Score | < 0.75 | System health degraded |
| Sync Freshness | < 80% | Workflows becoming stale |
| Drift Rate | > 10% | Excessive configuration drift |
| Compliance SLA | < 99.0% | Policy violations increasing |
| API Latency (p95) | > 1000ms | Performance degradation |
| Error Rate | > 5% | Increased failures |

## Maintenance

### Database Maintenance

```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup_20231201.sql

# Clean old telemetry (>90 days)
psql $DATABASE_URL -c "DELETE FROM telemetry WHERE created_at < NOW() - INTERVAL '90 days';"

# Vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

### Log Management

```bash
# View API logs (Docker)
docker compose -f docker-compose.orca.yml logs -f api

# View specific component logs
docker compose -f docker-compose.orca.yml logs -f otel-collector

# Export logs for analysis
docker compose -f docker-compose.orca.yml logs api > api_logs.txt
```

### Updating MCP Registry

```bash
# Edit MCP registry
vi src/registry/mcp_registry.schema.yaml

# Restart API to sync changes
docker compose -f docker-compose.orca.yml restart api

# Verify sync
curl http://localhost:3000/agents | jq '.agents[] | select(.type=="mcp")'
```

## Troubleshooting

### API Won't Start

**Symptoms**: API container exits immediately

**Checks**:
1. Database connection: `pnpm run doctor`
2. Environment variables: Check `.env` file
3. Port conflicts: Ensure 3000 is available
4. Logs: `docker compose logs api`

**Solutions**:
```bash
# Check database connectivity
docker compose exec db psql -U orca -d orcamesh -c "SELECT 1;"

# Rebuild and restart
docker compose down && docker compose up --build
```

### High Memory Usage

**Symptoms**: API memory > 1GB

**Checks**:
1. Connection pool size
2. Query result limits
3. Memory leaks in long-running processes

**Solutions**:
```bash
# Restart API
docker compose restart api

# Monitor memory
docker stats api

# Adjust connection pool (if needed)
export PGMAXCONNECTIONS=10
```

### Stale Workflows

**Symptoms**: Sync Freshness < 90%

**Checks**:
1. Adapter connectivity
2. Webhook delivery
3. Event ingestion logs

**Solutions**:
```bash
# Check recent events
curl http://localhost:3000/workflows | jq '.workflows[] | select(.last_run_at < "2023-01-01")'

# Manually trigger sync (future feature)
# For now, check adapter configuration
```

### Trust Score Dropping

**Symptoms**: Trust Score < 0.85

**Checks**:
1. Agent telemetry errors
2. Policy violations
3. Sync freshness

**Solutions**:
```bash
# Get trust breakdown
curl http://localhost:3000/trust | jq '.components'

# Check agent health
curl http://localhost:3000/agents | jq '.agents[] | select(.trust_level < 0.75)'

# Run self-healing
curl http://localhost:3000/reports/healing

# Refresh trust metrics
curl -X POST http://localhost:3000/trust/refresh
```

## Backup & Recovery

### Automated Backups

```bash
# Add to crontab
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/orca_$(date +\%Y\%m\%d).sql.gz

# Retention: Keep 30 days
find /backups -name "orca_*.sql.gz" -mtime +30 -delete
```

### Disaster Recovery

```bash
# 1. Stop API
docker compose stop api

# 2. Restore database
gunzip -c /backups/orca_20231201.sql.gz | psql $DATABASE_URL

# 3. Restart API
docker compose start api

# 4. Verify
pnpm run doctor
curl http://localhost:3000/status
```

## Scaling

### Horizontal API Scaling

```bash
# Scale API replicas (Docker Compose)
docker compose up --scale api=3

# Add load balancer (nginx example)
# Configure upstream to api:3000
```

### Database Scaling

- Use read replicas for analytics queries
- Partition large tables (events, telemetry) by date
- Archive old data to cold storage

## Security Operations

### Rotate Secrets

```bash
# Generate new secrets
export NEW_JWT_SECRET=$(openssl rand -hex 32)
export NEW_HMAC_SECRET=$(openssl rand -hex 32)

# Update .env
echo "JWT_SECRET=$NEW_JWT_SECRET" >> .env
echo "HMAC_SECRET=$NEW_HMAC_SECRET" >> .env

# Restart API
docker compose restart api

# Notify adapter users to update signatures
```

### Audit Logs

```bash
# Query policy violations
psql $DATABASE_URL -c "SELECT * FROM policy_violations WHERE resolved = false ORDER BY created_at DESC LIMIT 10;"

# Query drift detections
psql $DATABASE_URL -c "SELECT * FROM drift_detections WHERE resolved = false ORDER BY created_at DESC LIMIT 10;"
```

## Performance Tuning

### Database Indexes

Already created via schema.sql. Monitor slow queries:

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### API Optimization

- Use connection pooling (already enabled)
- Add caching for trust metrics (future)
- Batch telemetry writes (future)

## Runbooks

### Weekly Maintenance

```bash
# 1. Check system health
pnpm run doctor

# 2. Review trust metrics
curl http://localhost:3000/trust

# 3. Export executive summary
curl -X POST http://localhost:3000/reports/export \
  -H "Content-Type: application/json" \
  -d '{"format": "markdown"}' \
  -o executive_summary_$(date +%Y%m%d).md

# 4. Run self-healing diagnostics
curl http://localhost:3000/reports/healing

# 5. Vacuum database
psql $DATABASE_URL -c "VACUUM ANALYZE;"
```

### Incident Response

1. **Detect**: Alerts from monitoring, user reports
2. **Assess**: Check `/status`, `/trust`, logs
3. **Mitigate**: Restart services, run self-healing
4. **Resolve**: Fix root cause, deploy patch
5. **Document**: Update runbook, post-mortem

## Support

- Logs: `docker compose logs`
- Metrics: http://localhost:3001 (Grafana)
- Health: `pnpm run doctor`
- Reports: `curl http://localhost:3000/reports/executive-summary`
