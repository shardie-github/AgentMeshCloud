# ORCA Core - Operations Guide

**Version**: 1.0.0  
**Last Updated**: 2025-10-30

This document provides operational procedures, runbooks, and on-call guidance for ORCA Core.

## Table of Contents

1. [Deployment](#deployment)
2. [Monitoring](#monitoring)
3. [Incident Response](#incident-response)
4. [Maintenance](#maintenance)
5. [Troubleshooting](#troubleshooting)
6. [Runbooks](#runbooks)

---

## Deployment

### Prerequisites

- Docker & Docker Compose OR Kubernetes cluster
- PostgreSQL 16+ with pgvector extension
- Redis 7+
- OpenTelemetry Collector (optional but recommended)

### Development Deployment

```bash
# 1. Clone repository
git clone <repo-url>
cd orca-core

# 2. Install dependencies
pnpm install

# 3. Start infrastructure
docker-compose up -d

# 4. Configure environment
cp .env.example .env
# Edit .env with your settings

# 5. Run health check
pnpm run doctor

# 6. Start ORCA
pnpm run dev
```

### Production Deployment

#### Option 1: Docker Compose

```bash
# 1. Build image
docker build -t orca-core:1.0.0 .

# 2. Update docker-compose.yml for production
# - Remove dev-only services
# - Add health checks
# - Configure resource limits

# 3. Deploy
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify
curl http://localhost:3000/health
```

#### Option 2: Kubernetes

```bash
# 1. Create namespace
kubectl create namespace orca-system

# 2. Create secrets
kubectl create secret generic orca-secrets \
  --from-literal=db-password=<password> \
  --from-literal=api-key=<api-key> \
  -n orca-system

# 3. Deploy
kubectl apply -f kubernetes/ -n orca-system

# 4. Verify
kubectl get pods -n orca-system
kubectl logs -f deployment/orca-core -n orca-system
```

### Post-Deployment Checklist

- [ ] Health endpoint returns 200: `GET /health`
- [ ] Trust KPIs endpoint accessible: `GET /api/v1/trust`
- [ ] Agent registry populated: `GET /api/v1/agents`
- [ ] Telemetry flowing to collector
- [ ] Alerts configured in alerting system
- [ ] Backup strategy implemented
- [ ] SSL/TLS certificates valid
- [ ] Rate limiting configured
- [ ] Logging to centralized system
- [ ] Monitoring dashboards created

---

## Monitoring

### Key Metrics to Monitor

#### Application Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| `orca.requests.total` | - | Track request rate |
| `orca.requests.duration` | p99 < 500ms | Investigate slow requests |
| `orca.errors.total` | < 1% of requests | Check error logs |
| `orca.trust.score` | > 70 | Alert if dropping |
| `orca.sync.lag` | < 60s | Check data sources |
| `orca.drift.rate` | < 10% | Investigate drift causes |

#### Infrastructure Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU usage | < 80% | Scale horizontally |
| Memory usage | < 85% | Investigate memory leaks |
| Disk usage | < 80% | Expand storage or cleanup |
| Network throughput | - | Track for capacity planning |
| Database connections | < 80% of pool | Increase pool size |

#### Business Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Active agents | - | Track growth |
| Trust Score | > 75 | Maintain quality |
| Risk Avoided (RA$) | Increasing | Demonstrate value |
| Policy violations | < 5/day | Review policies |
| Discovery rate | - | Measure coverage |

### Alerting Rules

#### Critical Alerts (P1 - Page immediately)

1. **Service Down**
   - Condition: Health endpoint returns non-200 for >2 minutes
   - Action: Check logs, restart service if needed

2. **Database Unreachable**
   - Condition: Cannot connect to PostgreSQL
   - Action: Check DB status, network, credentials

3. **High Error Rate**
   - Condition: Error rate > 5% for > 5 minutes
   - Action: Check logs, roll back if recent deploy

4. **Trust Score Critical Drop**
   - Condition: Trust score drops below 50
   - Action: Review agent status, check for policy violations

#### Warning Alerts (P2 - Business hours response)

1. **Sync Lag High**
   - Condition: Sync lag > 5 minutes
   - Action: Check data sources, investigate bottlenecks

2. **Drift Rate Elevated**
   - Condition: Drift rate > 15%
   - Action: Review configuration, check for unauthorized changes

3. **Resource Utilization High**
   - Condition: CPU/Memory > 80% for > 15 minutes
   - Action: Prepare to scale, investigate resource leaks

### Dashboards

#### 1. Service Health Dashboard
- Request rate and latency
- Error rate by endpoint
- Service uptime
- Resource utilization

#### 2. Trust KPIs Dashboard
- Trust Score trend
- Risk Avoided (RA$) cumulative
- Sync Freshness %
- Drift Rate %
- Compliance SLA %

#### 3. Agent Registry Dashboard
- Total agents by status
- Agents by type and vendor
- Discovery rate
- Quarantined agents

---

## Incident Response

### Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| P1 (Critical) | Service down, data loss | < 15 minutes | Immediate page |
| P2 (High) | Degraded performance | < 1 hour | Business hours |
| P3 (Medium) | Minor issue, workaround | < 4 hours | Next business day |
| P4 (Low) | Cosmetic, no impact | < 1 week | Backlog |

### Incident Response Process

1. **Detect**: Alert fires or user reports issue
2. **Triage**: Assess severity and impact
3. **Communicate**: Update status page, notify stakeholders
4. **Investigate**: Check logs, metrics, recent changes
5. **Mitigate**: Apply immediate fix or workaround
6. **Resolve**: Implement permanent fix
7. **Review**: Conduct postmortem (for P1/P2)

### On-Call Rotation

- **Primary**: First responder, 24/7 availability
- **Secondary**: Backup, escalation point
- **Manager**: Final escalation for major incidents

**On-Call Responsibilities**:
- Respond to alerts within SLA
- Follow runbooks for common issues
- Escalate when needed
- Document actions taken
- Create tickets for follow-up work

### Communication Channels

- **Status Page**: https://status.orca-mesh.io
- **Slack**: #orca-incidents
- **Email**: incidents@orca-mesh.io
- **PagerDuty**: For P1 alerts

---

## Maintenance

### Daily

- [ ] Check dashboard for anomalies
- [ ] Review error logs
- [ ] Verify backup completion
- [ ] Check alert status

### Weekly

- [ ] Review trust score trends
- [ ] Check for security updates
- [ ] Review quarantined agents
- [ ] Analyze performance metrics

### Monthly

- [ ] Generate executive summary report
- [ ] Review and update policies
- [ ] Check certificate expiration
- [ ] Rotate secrets/credentials
- [ ] Review and close old incidents
- [ ] Update documentation

### Quarterly

- [ ] Conduct disaster recovery drill
- [ ] Review SLA compliance
- [ ] Audit access controls
- [ ] Capacity planning review
- [ ] Security assessment
- [ ] Update dependencies

---

## Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptoms**: Process exits immediately or crashes on startup

**Diagnosis**:
```bash
# Check logs
docker logs orca-core

# Check environment
pnpm run doctor

# Verify dependencies
pnpm install
```

**Solutions**:
- Missing environment variables → Check .env file
- Database connection failed → Verify DB_HOST, credentials
- Port already in use → Change PORT or kill conflicting process

#### 2. High Memory Usage

**Symptoms**: Memory usage climbing over time

**Diagnosis**:
```bash
# Check Node.js heap
node --expose-gc --inspect src/index.ts

# Monitor with clinic
clinic doctor -- node src/index.ts
```

**Solutions**:
- Memory leak → Check for unclosed connections, event listeners
- Large payloads → Implement streaming, pagination
- Cache growing unbounded → Add TTL, implement LRU eviction

#### 3. Slow API Responses

**Symptoms**: Request latency high (> 1s)

**Diagnosis**:
```bash
# Check database queries
# Enable slow query log in PostgreSQL

# Profile with OpenTelemetry
# View traces in Jaeger UI
```

**Solutions**:
- Missing database index → Add index on queried columns
- N+1 queries → Implement batching, DataLoader
- External API slow → Add caching, timeouts

#### 4. Trust Score Dropping

**Symptoms**: Trust score decreasing unexpectedly

**Diagnosis**:
```bash
# Check agent reliability
curl http://localhost:3000/api/v1/trust/score/{agent_id}

# Review policy violations
curl http://localhost:3000/api/v1/trust/sync-gaps
```

**Solutions**:
- Agent failures → Check agent logs, restart if needed
- Policy violations → Review and adjust policies
- Stale data → Trigger manual sync, check data sources

---

## Runbooks

### Runbook 1: Service Restart

```bash
# 1. Check current status
curl http://localhost:3000/health

# 2. Stop service
docker-compose stop orca-core

# 3. Check for stuck processes
ps aux | grep node | grep orca

# 4. Start service
docker-compose start orca-core

# 5. Verify
curl http://localhost:3000/health

# 6. Check logs
docker logs -f orca-core
```

### Runbook 2: Database Connection Issues

```bash
# 1. Test connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME

# 2. Check connection pool
# View active connections in database

# 3. Reset connections
# Restart application or reset pool

# 4. Verify credentials
echo $DB_PASSWORD | wc -c  # Should not be empty

# 5. Check firewall/security groups
```

### Runbook 3: High Error Rate

```bash
# 1. Identify error type
curl http://localhost:3000/api/v1/agents | jq

# 2. Check recent deployments
git log --oneline -10

# 3. Review error logs
docker logs orca-core | grep ERROR

# 4. If recent deployment, consider rollback
git revert <commit>
# or
docker-compose down
docker pull orca-core:<previous-version>
docker-compose up -d

# 5. Monitor recovery
watch curl -s http://localhost:3000/health
```

### Runbook 4: Telemetry Not Flowing

```bash
# 1. Check OTel collector
curl http://localhost:13133/  # Health endpoint

# 2. Verify OTEL_EXPORTER_OTLP_ENDPOINT
echo $OTEL_EXPORTER_OTLP_ENDPOINT

# 3. Check network connectivity
telnet otel-collector 4317

# 4. Review ORCA logs for export errors
docker logs orca-core | grep otel

# 5. Test with console exporter
# Set exporter to console in otel_config.yaml
```

---

## Backup & Recovery

### Backup Strategy

**Daily Automated Backups**:
- PostgreSQL: Full backup to S3
- Redis: RDB snapshots
- Configuration: Git repository

**Retention Policy**:
- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months

### Recovery Procedure

```bash
# 1. Stop service
docker-compose stop orca-core

# 2. Restore database
pg_restore -h $DB_HOST -U $DB_USER -d $DB_NAME backup.dump

# 3. Verify data
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM agents;"

# 4. Start service
docker-compose start orca-core

# 5. Verify functionality
pnpm run doctor
```

---

## Performance Tuning

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_type ON agents(type);

-- Enable query plan analysis
EXPLAIN ANALYZE SELECT * FROM agents WHERE status = 'active';

-- Configure connection pool
-- Set min: 5, max: 50 connections
```

### Application Optimization

```typescript
// Enable response compression
app.use(compression());

// Implement caching
const cache = new NodeCache({ stdTTL: 600 });

// Use connection pooling
// Configure in otel_config.yaml
```

---

## Contact Information

- **On-Call Engineer**: Check PagerDuty rotation
- **Engineering Manager**: manager@orca-mesh.io
- **Security Team**: security@orca-mesh.io
- **Database Admin**: dba@orca-mesh.io

---

**Document Version**: 1.0.0  
**Last Updated**: 2025-10-30  
**Next Review**: 2025-11-30
