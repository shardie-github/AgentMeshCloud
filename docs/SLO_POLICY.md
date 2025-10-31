# ORCA SLO Policy

**Service Level Objectives & Monitoring Strategy**

---

## Overview

This document defines ORCA's SLO policy, measurement methodology, and breach handling procedures. SLOs are enforced during canary deployments and monitored continuously in production.

---

## Global Targets

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| **p95 Latency** | < 500ms | 5 minutes |
| **p99 Latency** | < 1000ms | 5 minutes |
| **Error Rate** | < 1% | 5 minutes |
| **Uptime** | > 99.9% | 30 days |
| **Freshness** | < 24 hours | Real-time |
| **Drift Rate** | < 5% | 1 hour |

---

## Endpoint-Specific SLOs

### Critical Endpoints (99.99% uptime)

**Health Check**: `GET /health`
- p95 latency: < 100ms
- p99 latency: < 200ms
- Error rate: < 0.1%
- Purpose: Uptime monitoring, load balancer checks

**Trust Score**: `GET /api/trust`
- p95 latency: < 500ms
- Freshness: < 1 hour
- Error rate: < 1%
- Purpose: Executive dashboard, compliance reporting

**Webhook Ingestion**: `POST /api/adapters/*/webhook`
- p95 latency: < 500ms
- Error rate: < 1.5%
- Purpose: External integrations (Zapier, Make, n8n)

### High Priority (99.9% uptime)

**Agent Management**
- List agents: < 400ms p95
- Register agent: < 600ms p95
- Agent details: < 300ms p95

**Adapter Ingest**
- Generic ingest: < 800ms p95
- Batch processing: < 1500ms p99

### Medium Priority (99.5% uptime)

**Workflows**
- List workflows: < 500ms p95
- Execute workflow: < 2000ms p95 (longer tolerance)

**Analytics**
- KPI dashboard: < 1000ms p95
- Freshness: < 24 hours

---

## Measurement Methodology

### Latency

Measured from:
- **Client perspective**: Time from request initiation to final byte received
- **Server perspective**: Time from request receipt to response completion

**Percentiles:**
- p50 (median): Typical user experience
- p95: 95% of requests faster than this
- p99: 99% of requests faster than this
- p99.9: Tail latency

### Error Rate

**Counted as errors:**
- HTTP 5xx (server errors)
- HTTP 429 (rate limit exceeded)
- Timeout errors
- Circuit breaker trips

**NOT counted as errors:**
- HTTP 4xx (client errors, except 429)
- HTTP 401/403 (authentication/authorization)
- Validation failures

### Uptime

```
Uptime % = (Total time - Downtime) / Total time × 100
```

**Downtime defined as:**
- Health check failures > 3 consecutive
- Error rate > 50% for > 1 minute
- Complete service unavailability

**Uptime targets:**
- 99.99% = 52 minutes downtime/year
- 99.9% = 8.7 hours downtime/year
- 99.5% = 43.8 hours downtime/year

### Freshness

Data freshness measured as:
```
Freshness = (Current time - Last update time)
```

**Targets:**
- Trust scores: < 1 hour
- Agent status: < 15 minutes
- Analytics KPIs: < 24 hours

### Drift Rate

Configuration/data consistency:
```
Drift Rate % = (Drifted items / Total items) × 100
```

**Targets:**
- Agent configs: < 3%
- Workflow definitions: < 2%
- Overall: < 5%

---

## Breach Handling

### Automated Actions

**During Canary Deployment:**
1. Detect SLO breach (3 consecutive failures)
2. Halt canary progression
3. Wait 30 seconds for recovery
4. If still breaching: automatic rollback
5. Alert on-call engineer
6. Create incident ticket

**In Production:**
1. Detect SLO breach
2. Fire alert to routing system
3. Page on-call (if critical)
4. Auto-scale if capacity issue
5. Circuit breaker if downstream failure
6. Create incident ticket

### Manual Escalation

**Escalation path:**
```
Alert → On-call Engineer (immediate)
  ↓ (15 min no response)
Team Lead
  ↓ (30 min no resolution)
Engineering Manager
  ↓ (1 hour ongoing)
CTO
```

---

## Alerting

### Notification Channels

| Severity | Slack | Email | PagerDuty | Escalation |
|----------|-------|-------|-----------|------------|
| **Critical** | ✅ @oncall | ✅ | ✅ | Immediate |
| **High** | ✅ | ✅ | ❌ | 15 min |
| **Medium** | ✅ | ❌ | ❌ | 1 hour |
| **Low** | ❌ | ❌ | ❌ | Next day |

### Alert Fatigue Prevention

- **Alert grouping**: Combine related alerts within 5 minutes
- **Noise reduction**: Suppress duplicate alerts for 1 hour
- **Smart routing**: Only page for actionable alerts
- **Runbook links**: Every alert includes remediation steps

---

## SLO Monitoring

### Tools

- **Vercel Analytics**: Real User Monitoring (RUM)
- **Prometheus**: Metrics collection and aggregation
- **Grafana**: Dashboards and visualization
- **Synthetic monitors**: Proactive health checks

### Dashboards

**Executive Dashboard:**
- Overall uptime %
- Trust score trend
- Error rate (24h)
- P95 latency (24h)

**Engineering Dashboard:**
- Per-endpoint SLOs
- Error breakdown by type
- Latency percentiles (p50/p95/p99)
- Database performance

**On-Call Dashboard:**
- Active alerts
- Recent deployments
- SLO breach history
- Runbook quick links

---

## Canary SLO Gates

### Stage 1: 1% Traffic (5 min, 3 checks)

```yaml
checks:
  - p95_latency < 500ms
  - error_rate < 1%
  - throughput > 100 req/s
```

**On failure:** Rollback to 0%

### Stage 2: 5% Traffic (10 min, 4 checks)

Same checks as Stage 1, extended duration

### Stage 3: 25% Traffic (15 min, 5 checks)

Same checks, higher confidence

### Stage 4: 100% Traffic (10 min, 4 checks)

Final validation before cleanup

---

## SLO Review Process

### Weekly Review

- [ ] Review SLO breaches from past week
- [ ] Identify trends and patterns
- [ ] Adjust thresholds if needed
- [ ] Update runbooks based on incidents

### Monthly Review

- [ ] Calculate error budget consumption
- [ ] Review uptime % vs target
- [ ] Assess need for SLO changes
- [ ] Present to engineering leadership

### Quarterly Review

- [ ] Deep dive on SLO trends
- [ ] Compare vs industry benchmarks
- [ ] Adjust targets for next quarter
- [ ] Publish SLO report for stakeholders

---

## Error Budget

### Calculation

```
Error Budget = (1 - SLO target) × Total requests

Example (99.9% uptime):
Error Budget = (1 - 0.999) × 1,000,000 requests
             = 1,000 failed requests allowed
```

### Budget Consumption

**Green (< 50% consumed):**
- Safe to deploy new features
- Aggressive canary rollouts ok
- Normal development pace

**Yellow (50-80% consumed):**
- Proceed with caution
- Extended canary stages
- Focus on reliability

**Red (> 80% consumed):**
- Feature freeze
- Reliability improvements only
- Executive review required

---

## Runbooks

All SLO breaches link to relevant runbooks:

- [Health Check Failure](https://docs.orca-mesh.io/runbooks/health-check)
- [High Latency](https://docs.orca-mesh.io/runbooks/high-latency)
- [Error Rate Spike](https://docs.orca-mesh.io/runbooks/error-spike)
- [Database Issues](https://docs.orca-mesh.io/runbooks/database)
- [Trust Score Stale](https://docs.orca-mesh.io/runbooks/trust-score)
- [Adapter Ingest Failure](https://docs.orca-mesh.io/runbooks/adapter-ingest)
- [Deployment Failure](https://docs.orca-mesh.io/runbooks/deployment-failure)

---

**Owner:** SRE Team  
**Last Updated:** 2025-10-31  
**Next Review:** 2025-11-30
