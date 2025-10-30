# ORCA Platform Handbook

**Enterprise Operations Guide**

Welcome to the ORCA Platform operations handbook. This document serves as the central reference for platform engineering, SRE, security, and operational excellence.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Architecture](#architecture)
3. [Identity & Access](#identity--access)
4. [Deployment](#deployment)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Incident Response](#incident-response)
7. [Security](#security)
8. [Compliance](#compliance)
9. [Cost Management](#cost-management)
10. [On-Call](#on-call)

---

## Platform Overview

**ORCA** (Orchestrated Resilient Cognitive Automation) is an enterprise workflow automation and analytics platform with advanced observability, trust scoring, and multi-tenant capabilities.

### Core Services

- **API Server**: Express.js REST API (`src/api/`)
- **Workflow Engine**: Adapter-based integration framework
- **UADSI Engine**: Trust scoring and analytics
- **Agent Registry**: Multi-agent coordination
- **Context Bus**: Event-driven state management

### Technology Stack

- **Runtime**: Node.js 18+ (TypeScript, ESM)
- **Database**: PostgreSQL 14+ (Supabase hosted)
- **Cache**: Redis
- **Monitoring**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Infrastructure**: AWS / K8s

---

## Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
┌──────▼────────────────────────────┐
│    Load Balancer (ALB)            │
│    + WAF + DDoS Protection        │
└──────┬────────────────────────────┘
       │
┌──────▼────────────────────────────┐
│    ORCA API (Blue/Green)          │
│    - Auth (OIDC + RBAC)           │
│    - Rate Limiting                │
│    - Canary Routing               │
└──────┬────────────────────────────┘
       │
┌──────▼────────────────────────────┐
│    Business Logic                 │
│    - Workflows                    │
│    - UADSI Analytics              │
│    - Agent Coordination           │
└──────┬────────────────────────────┘
       │
┌──────▼────────────────────────────┐
│    Data Layer                     │
│    - PostgreSQL (Primary+Replica) │
│    - Redis Cache                  │
│    - S3 Storage                   │
└───────────────────────────────────┘
```

### Multi-Tenancy

All data isolated by `tenant_id`:
- Row-level security (RLS) in database
- Tenant-scoped API keys
- Separate quotas and rate limits

---

## Identity & Access

**Documentation**: `docs/IDENTITY_ACCESS.md`

### Authentication

- **SSO**: OIDC (Auth0, Okta, Azure AD)
- **API Keys**: HMAC-signed requests
- **Signed URLs**: Time-limited resource access

### Authorization

**4 Role Levels**:
1. **Owner**: Full access
2. **Admin**: Org management
3. **Analyst**: Create reports
4. **Viewer**: Read-only

### Best Practices

- Use SSO for human users
- Use API keys for integrations
- Rotate keys every 90 days
- Enable MFA for admin roles
- Review access quarterly

---

## Deployment

**Documentation**: `docs/DEPLOY_STRATEGY.md`

### Strategies

**Canary** (high-risk changes):
- Start at 1% traffic
- Ramp: 5% → 10% → 25% → 50% → 100%
- Monitor KPIs at each step
- Auto-abort on errors

**Blue/Green** (standard releases):
- Deploy to standby environment
- Run smoke tests
- Check KPI thresholds
- Instant cutover (DNS/LB switch)

**Rollback**:
- Automated on failure detection
- Manual via `npm run deploy:rollback`
- Target previous stable version

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Schema migrations safe (run guard)
- [ ] Staging validated
- [ ] Rollback plan documented
- [ ] Stakeholders notified

---

## Monitoring & Alerting

### Key Metrics

**Golden Signals**:
- **Latency**: P50, P95, P99 response times
- **Traffic**: Requests per second
- **Errors**: 4xx/5xx rate
- **Saturation**: CPU, memory, DB connections

**Business Metrics**:
- Trust scores
- Workflow execution rate
- Synchrony metrics
- Active tenants

### Dashboards

- **Platform Health**: https://grafana.orca.example/d/platform
- **Deployment Status**: https://grafana.orca.example/d/deployments
- **UADSI KPIs**: https://grafana.orca.example/d/uadsi

### Alerts

**Critical** (page immediately):
- Platform down (>5min)
- Error rate >10%
- Database failover
- Security breach

**Warning** (Slack notification):
- Error rate >5%
- P95 latency >1s
- Disk usage >80%
- KPI drop >20%

---

## Incident Response

**Documentation**: `incident/ESCALATION_POLICY.yaml`

### Severity Levels

- **SEV1**: Platform down, data loss, security breach
- **SEV2**: Major degradation, significant user impact
- **SEV3**: Minor issues, workaround available
- **SEV4**: Cosmetic bugs, feature requests

### Response Workflow

1. **Acknowledge** (within SLA)
2. **Assess** severity
3. **Mitigate** (stop the bleeding)
4. **Investigate** root cause
5. **Resolve** permanently
6. **Post-mortem** (SEV1/SEV2)

### Runbooks

- [KPI Drop](../incident/RUNBOOKS/kpi_drop.md)
- [Database Failure](../incident/RUNBOOKS/database_failure.md)
- [High Error Rate](../incident/RUNBOOKS/high_error_rate.md)
- [Adapter Outage](../incident/RUNBOOKS/adapter_outage.md)

---

## Security

**Contact**: security@orca-platform.example

### Security Layers

1. **Network**: WAF, DDoS protection, VPC isolation
2. **Application**: RBAC, input validation, rate limiting
3. **Data**: Encryption at rest/transit, PII redaction
4. **Secrets**: Supabase Vault, secrets bridge
5. **Supply Chain**: Dependabot, CodeQL, SCA

### Security Reviews

- **Code**: Every PR (automated + manual for sensitive)
- **Dependencies**: Weekly (Dependabot)
- **Vulnerabilities**: Weekly (CodeQL)
- **Penetration Test**: Annually
- **SOC 2**: Annual audit

### Incident Response

For security incidents:
1. Isolate affected systems
2. Notify security@orca-platform.example
3. Follow runbook: `incident/RUNBOOKS/security_breach.md`
4. Preserve evidence
5. Notify customers if PII affected (72h)

---

## Compliance

**Documentation**: `docs/PRIVACY_GOVERNANCE.md`

### Regulations

- **GDPR**: EU General Data Protection Regulation
- **CCPA/CPRA**: California privacy laws
- **SOC 2 Type II**: Security and availability

### Data Subject Rights

- **Access**: Export all user data (30 days)
- **Erasure**: Delete user data (30 days)
- **Portability**: JSON export
- **Rectification**: UI-based editing

### Retention

- **User data**: Account lifetime + 30 days
- **Audit logs**: 7 years (legal requirement)
- **Backups**: 90 days
- **Reports**: 7 years

---

## Cost Management

**Documentation**: `docs/FINOPS.md`

### Budget Owners

- **Infrastructure**: SRE Team
- **Database**: DBA Team
- **Observability**: Platform Team
- **Egress**: Engineering Manager

### Cost Optimization

- **Telemetry sampling**: 10% of traces (adjustable)
- **Log retention**: 30 days hot, 90 days cold
- **Database**: Read replicas for analytics
- **Storage**: S3 lifecycle (Standard → IA → Glacier)

### Monthly Review

Cost dashboard: https://grafana.orca.example/d/costs

Review with leadership on 1st of each month.

---

## On-Call

### Rotation

- **Primary**: SRE (weekly rotation)
- **Secondary**: Senior Engineer (weekly rotation)
- **Escalation**: Engineering Manager → CTO

### Schedule

https://orca.pagerduty.com/schedules

### Responsibilities

- Respond to alerts (within SLA)
- Mitigate incidents
- Update status page
- Create incident reports
- Hand off cleanly at rotation end

### Compensation

- **Weekday on-call**: $200/week stipend
- **Weekend on-call**: $400/weekend
- **Page response**: 2x overtime (if outside hours)

---

## Resources

### Documentation

- [Identity & Access](./IDENTITY_ACCESS.md)
- [Privacy & Governance](./PRIVACY_GOVERNANCE.md)
- [Deployment Strategy](./DEPLOY_STRATEGY.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)
- [Operations Runbooks](../incident/RUNBOOKS/)

### Tools

- **GitHub**: https://github.com/orca-platform/orca
- **Grafana**: https://grafana.orca.example
- **Supabase**: https://app.supabase.com/project/orca
- **PagerDuty**: https://orca.pagerduty.com
- **Status Page**: https://status.orca.example

### Support

- **Slack**: #platform-support
- **Email**: platform-team@orca-platform.example
- **Emergency**: oncall-sre@orca-platform.example

---

**Document Owner**: Platform Team  
**Last Updated**: 2025-10-30  
**Next Review**: 2026-01-30
