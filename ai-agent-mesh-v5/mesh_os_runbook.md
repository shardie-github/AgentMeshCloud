# Autonomous Mesh OS - Operational Runbook

**Version:** 5.0.0  
**Last Updated:** 2025-10-30  
**Owner:** SRE Team

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Incident Management](#incident-management)
4. [Escalation Tiers](#escalation-tiers)
5. [Patch & Rollback Workflow](#patch--rollback-workflow)
6. [SLAs & KPIs](#slas--kpis)
7. [Common Operations](#common-operations)
8. [Troubleshooting](#troubleshooting)
9. [Disaster Recovery](#disaster-recovery)
10. [Security Procedures](#security-procedures)

---

## System Overview

The Autonomous Mesh OS is a self-optimizing orchestration layer that manages AI agents across multiple tenants and partners with automated healing, cost optimization, and compliance monitoring.

### Key Components

- **Mesh Kernel** (`mesh_kernel.mjs`): Core orchestration engine
- **Self-Healing Engine** (`self_healing_engine.mjs`): Automated fault remediation
- **Cost Optimizer** (`cost_optimizer.mjs`): Resource and cost management
- **Compliance Auditor** (`compliance_auditor.mjs`): Continuous compliance monitoring
- **Adaptive Learning Loop** (`adaptive_loop.mjs`): ML-driven optimization
- **Executive Dashboard** (`exec_dashboard.mjs`): KPI aggregation and reporting

### System Dependencies

- **Node.js** >= 18.0.0
- **Database**: PostgreSQL 14+
- **Message Queue**: RabbitMQ or Kafka
- **Monitoring**: Prometheus + Grafana
- **Logging**: Elasticsearch + Kibana
- **Tracing**: Jaeger or OpenTelemetry Collector

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Autonomous Mesh OS                      │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ Mesh Kernel  │◄────►│Self-Healing  │            │
│  │              │      │    Engine    │            │
│  └──────┬───────┘      └──────────────┘            │
│         │                                            │
│         ├─────► Cost Optimizer                      │
│         ├─────► Compliance Auditor                  │
│         ├─────► Adaptive Learning Loop              │
│         └─────► Executive Dashboard                 │
│                                                       │
├─────────────────────────────────────────────────────┤
│              Agent Registry & Telemetry              │
├─────────────────────────────────────────────────────┤
│  Agent 1  │  Agent 2  │  Agent 3  │  ...  │ Agent N │
└─────────────────────────────────────────────────────┘
```

---

## Incident Management

### Incident Severity Levels

| Severity | Definition | Response Time | Example |
|----------|-----------|---------------|---------|
| **P0 - Critical** | Complete system outage | 15 minutes | All agents down |
| **P1 - High** | Major functionality impaired | 1 hour | 50%+ agents unavailable |
| **P2 - Medium** | Minor functionality impaired | 4 hours | Performance degradation |
| **P3 - Low** | Minimal impact | 24 hours | Non-critical feature issue |

### Incident Response Process

1. **Detection**: Automated alerts or manual report
2. **Triage**: Assess severity and assign incident commander
3. **Investigation**: Gather logs, metrics, and traces
4. **Mitigation**: Implement fix or workaround
5. **Communication**: Update status page and stakeholders
6. **Resolution**: Verify fix and close incident
7. **Post-Mortem**: Document learnings and action items

### Incident Commander Responsibilities

- Coordinate response efforts
- Make technical decisions
- Manage communications
- Track action items
- Facilitate post-mortem

---

## Escalation Tiers

### Tier 1: On-Call Engineer

**Response Time**: 15 minutes  
**Responsibilities**:
- Initial triage and assessment
- Basic troubleshooting
- Log analysis
- Restart services if needed

**Contact**: PagerDuty rotation

### Tier 2: Engineering Lead

**Response Time**: 30 minutes  
**Responsibilities**:
- Complex troubleshooting
- Architecture decisions
- Database interventions
- Coordinate with vendors

**Contact**: engineering-leads@example.com

### Tier 3: CTO / Senior Leadership

**Response Time**: 1 hour  
**Responsibilities**:
- Business impact decisions
- Customer communications
- Vendor escalations
- Strategic decisions

**Contact**: cto@example.com

---

## Patch & Rollback Workflow

### Patch Deployment

```bash
# 1. Create patch release
cd /workspace/ai-agent-mesh-v5
node release_manager.mjs create patch

# 2. Deploy to staging
node release_manager.mjs deploy <version> staging

# 3. Validate in staging
curl http://staging-mesh-os.example.com/health

# 4. Deploy to production (with approval)
node release_manager.mjs deploy <version> production --strategy=blue-green

# 5. Monitor for 30 minutes
watch -n 30 'curl -s http://mesh-os.example.com/status | jq .'
```

### Emergency Rollback

```bash
# Immediate rollback to previous version
node release_manager.mjs rollback production <previous_version>

# Verify rollback
curl http://mesh-os.example.com/status | jq '.version'

# Check health
curl http://mesh-os.example.com/health
```

### Rollback Decision Tree

```
Issue Detected
     │
     ├─ Affects > 50% users? ──► Yes ──► IMMEDIATE ROLLBACK
     │                            │
     │                            No
     ├─ Error rate > 5%? ──────► Yes ──► ROLLBACK (assess in 15min)
     │                            │
     │                            No
     ├─ Critical alert fired? ─► Yes ──► ROLLBACK (assess)
     │                            │
     │                            No
     └─ Monitor and assess ─────► Can wait for hotfix?
                                   │
                                   ├─ Yes ──► Deploy hotfix
                                   └─ No ───► Schedule rollback
```

---

## SLAs & KPIs

### Service Level Agreements

| Metric | Target | Measurement Window |
|--------|--------|--------------------|
| **Availability** | 99.95% | Monthly |
| **Latency P95** | < 500ms | 5 minutes |
| **Latency P99** | < 1000ms | 5 minutes |
| **Error Rate** | < 0.1% | 5 minutes |
| **MTTR** | < 15 minutes | Per incident |
| **RTO** | < 4 hours | Per disaster |
| **RPO** | < 1 hour | Per disaster |

### Key Performance Indicators

| KPI | Target | Current | Trend |
|-----|--------|---------|-------|
| System Uptime | 99.95% | TBD | - |
| Cost per Agent | $250/month | TBD | - |
| Compliance Score | 95% | TBD | - |
| Automation Rate | 80% | TBD | - |
| Mean Time to Recovery | 15 min | TBD | - |
| SLO Adherence | 99.9% | TBD | - |

### SLA Credits

If we fail to meet SLAs:
- **99.95% - 99.0%**: 10% credit
- **99.0% - 95.0%**: 25% credit
- **< 95.0%**: 50% credit

---

## Common Operations

### Starting the Mesh OS

```bash
# Start all services
docker-compose up -d

# Verify startup
docker-compose ps
curl http://localhost:8080/health

# Check logs
docker-compose logs -f mesh-kernel
```

### Stopping the Mesh OS

```bash
# Graceful shutdown
docker-compose stop

# Force stop (if needed)
docker-compose down

# Remove volumes (WARNING: data loss)
docker-compose down -v
```

### Scaling Agents

```bash
# Scale up
docker-compose up -d --scale agent=5

# Scale down
docker-compose up -d --scale agent=2

# Verify
docker-compose ps | grep agent
```

### Viewing Logs

```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f mesh-kernel

# Tail last 100 lines
docker-compose logs --tail=100 mesh-kernel

# Since timestamp
docker-compose logs --since 2025-10-30T10:00:00
```

### Database Operations

```bash
# Backup database
pg_dump -h localhost -U mesh_user mesh_db > backup_$(date +%Y%m%d).sql

# Restore database
psql -h localhost -U mesh_user mesh_db < backup_20251030.sql

# Check connections
psql -h localhost -U mesh_user mesh_db -c "SELECT * FROM pg_stat_activity;"
```

### Health Checks

```bash
# System health
curl http://localhost:8080/health | jq '.'

# Detailed status
curl http://localhost:8080/status | jq '.'

# Metrics
curl http://localhost:8080/metrics

# Agent health
node health_check.mjs
```

---

## Troubleshooting

### High CPU Usage

**Symptoms**: CPU > 90%, slow response times

**Investigation**:
```bash
# Check container CPU
docker stats

# Top processes
docker-compose exec mesh-kernel top

# Profile application
node --prof mesh_kernel.mjs
```

**Resolution**:
1. Scale up resources
2. Review recent changes
3. Check for infinite loops
4. Profile and optimize hot paths

### High Memory Usage

**Symptoms**: Memory > 85%, OOM errors

**Investigation**:
```bash
# Memory usage
docker stats
free -h

# Heap snapshot
node --inspect mesh_kernel.mjs
# Connect Chrome DevTools and take heap snapshot
```

**Resolution**:
1. Restart service to clear memory
2. Increase memory limits
3. Check for memory leaks
4. Review data retention policies

### Database Connection Issues

**Symptoms**: Connection timeouts, pool exhausted

**Investigation**:
```bash
# Check connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check pool status
docker-compose logs mesh-kernel | grep "pool"
```

**Resolution**:
1. Increase connection pool size
2. Terminate idle connections
3. Restart database if needed
4. Review slow queries

### Agent Unresponsive

**Symptoms**: Agent not sending heartbeats

**Investigation**:
```bash
# Check agent logs
docker-compose logs agent-01

# Network connectivity
docker-compose exec mesh-kernel ping agent-01

# Check agent health
curl http://agent-01:9001/health
```

**Resolution**:
1. Restart agent
2. Check network issues
3. Review agent logs for errors
4. Quarantine if repeatedly failing

### High Job Queue Depth

**Symptoms**: Jobs pending > 100, increasing latency

**Investigation**:
```bash
# Check queue depth
curl http://localhost:8080/status | jq '.jobs'

# Check agent capacity
curl http://localhost:8080/status | jq '.agents'
```

**Resolution**:
1. Scale up agents
2. Increase concurrent job limit
3. Review job distribution
4. Check for stuck jobs

---

## Disaster Recovery

### Backup Strategy

- **Database**: Daily full backup, hourly incremental
- **Configuration**: Version controlled in Git
- **Telemetry Data**: Retained for 30 days
- **Audit Logs**: Retained for 7 years (compliance)

### Recovery Time Objective (RTO): 4 hours

### Recovery Point Objective (RPO): 1 hour

### DR Scenarios

#### Scenario 1: Database Failure

1. Switch to standby database (automatic)
2. Verify data integrity
3. Update DNS if needed
4. Monitor replication lag

#### Scenario 2: Complete Region Failure

1. Activate DR region
2. Update DNS to DR endpoints
3. Verify all services operational
4. Communicate with customers
5. Investigate root cause

#### Scenario 3: Data Corruption

1. Identify corruption scope
2. Restore from last known good backup
3. Replay transaction logs
4. Verify data integrity
5. Resume operations

### DR Testing

- **Frequency**: Quarterly
- **Type**: Full DR failover
- **Duration**: 2-4 hours
- **Participants**: All SRE team

---

## Security Procedures

### Access Control

- All access logged and audited
- MFA required for production access
- Principle of least privilege
- Regular access reviews (quarterly)

### Incident Response

1. **Detect**: Security alert or report
2. **Contain**: Isolate affected systems
3. **Eradicate**: Remove threat
4. **Recover**: Restore services
5. **Lessons Learned**: Post-incident review

### Security Contacts

- **Security Team**: security@example.com
- **CISO**: ciso@example.com
- **Legal**: legal@example.com

### Vulnerability Management

- **Critical (CVSS 9-10)**: Patch within 24 hours
- **High (CVSS 7-8.9)**: Patch within 7 days
- **Medium (CVSS 4-6.9)**: Patch within 30 days
- **Low (CVSS 0-3.9)**: Patch next release

---

## Maintenance Windows

- **Scheduled Maintenance**: Monthly, 3rd Sunday 2-6 AM UTC
- **Emergency Maintenance**: As needed, 2-hour window
- **Customer Notification**: 7 days advance for scheduled

---

## Change Management

All production changes must:
1. Have a JIRA ticket
2. Be peer reviewed
3. Pass all tests
4. Have rollback plan
5. Be approved by lead

---

## Contacts & Escalation

| Role | Contact | Availability |
|------|---------|-------------|
| On-Call Engineer | PagerDuty | 24/7 |
| Engineering Lead | engineering-leads@example.com | Business hours |
| SRE Manager | sre-manager@example.com | Business hours |
| CTO | cto@example.com | Emergency only |
| Security Team | security@example.com | 24/7 |

---

## Appendix

### Useful Commands

```bash
# Quick health check
curl -s localhost:8080/health | jq -r '.status'

# Agent count
curl -s localhost:8080/status | jq '.agents.total'

# Recent errors
docker-compose logs --since 1h | grep ERROR

# Disk usage
df -h

# Network connections
netstat -an | grep ESTABLISHED | wc -l
```

### Log Locations

- Application Logs: `/var/log/mesh-os/`
- Audit Logs: `/var/log/mesh-os/audit/`
- Access Logs: `/var/log/nginx/`
- System Logs: `/var/log/syslog`

---

**Document Control**

- **Version**: 5.0.0
- **Last Review**: 2025-10-30
- **Next Review**: 2025-11-30
- **Owner**: SRE Team
- **Approved By**: CTO
