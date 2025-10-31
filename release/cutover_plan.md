# ORCA Go-Live Cutover Plan

**Version:** 1.0.0-rc.1  
**Date:** 2025-10-31  
**Owner:** SRE & Release Engineering  
**Status:** DRAFT → LOCKED → EXECUTING → COMPLETE

---

## Overview

This cutover plan orchestrates the production deployment of ORCA using blue/green deployment with canary promotion, comprehensive testing gates, and automated rollback capabilities.

## Release Candidate

**Target RC:** `v1.0.0-rc.1`  
**Base Branch:** `main`  
**Release Branch:** `release/1.0.0`  
**Freeze Window:** 4 hours before cutover  

### Versioning Strategy

```
vMAJOR.MINOR.PATCH-rc.N  → Release Candidate
vMAJOR.MINOR.PATCH       → Production Release
```

---

## Environments

| Environment | Provider | Purpose | Promotion Gate |
|-------------|----------|---------|----------------|
| **dev** | Vercel Preview + Supabase Staging | Feature development | Manual merge |
| **staging** | Vercel Preview + Supabase Staging | RC validation | All gates green |
| **prod** | Vercel Production + Supabase Production | Live traffic | Canary + SLOs |

---

## Cutover Timeline

### T-4h: RC Lock & Freeze

1. **Tag RC**: `pnpm run release:tag -- --type=rc`
2. **Freeze Staging**: GitHub branch protection enabled
3. **Backup Production DB**: `./scripts/supabase_backup_now.sh`
4. **Notify Stakeholders**: Slack #orca-releases

### T-3h: Pre-Flight Validation

1. **Database Migration Check**: Shadow DB validation
2. **RLS Policy Validation**: Contract tests
3. **Security Audit**: CodeQL + dependency scan
4. **OpenAPI Diff**: Breaking change detection

### T-2h: Staging Deployment

1. **Deploy to Staging**: Full deployment
2. **Smoke Tests**: Synthetic monitors
3. **Load Tests**: k6 baseline + spike
4. **Chaos Tests**: Toxics + failover

### T-1h: Blue/Green Setup

1. **Deploy Blue Environment**: Vercel preview deployment
2. **Health Checks**: All systems operational
3. **Canary Configuration**: 1% → 5% → 25% → 100%
4. **Alert Routing**: On-call configured

### T-0h: Production Cutover

1. **Start Canary**: Route 1% traffic to blue
2. **Monitor SLOs**: p95 latency, error rate, freshness
3. **Auto-Promote**: 5% → 25% → 100% on green gates
4. **Green Flip**: Promote blue → green
5. **Cleanup**: Remove old deployment

### T+1h: Post-Cutover Validation

1. **SLO Verification**: All targets met
2. **Synthetic Validation**: Full test suite
3. **Evidence Pack**: Generate compliance artifacts
4. **Sign-Off**: Executive approval

---

## Rollback Procedures

### Automated Rollback Triggers

- **SLO Breach**: p95 > 500ms or error rate > 1%
- **Health Check Failure**: > 3 consecutive failures
- **Canary Failure**: Any gate fails during promotion
- **Database Error**: Connection pool exhaustion

### Rollback Steps

```bash
pnpm run release:rollback
```

1. **Revert CNAME**: Point to previous green
2. **Database Restore**: From pre-cutover snapshot (if needed)
3. **Alert Stakeholders**: Incident notification
4. **Root Cause Analysis**: Post-mortem ticket

---

## Success Criteria

- [ ] All pre-flight gates pass
- [ ] Canary promotes to 100% without intervention
- [ ] SLOs maintained under load (p95 < 500ms, errors < 1%)
- [ ] No critical alerts fired
- [ ] Evidence pack generated and signed
- [ ] Zero data loss or corruption

---

## Communication Plan

### Stakeholders

- **Exec Team**: Go/no-go decision (T-4h)
- **Engineering**: Technical readiness confirmation (T-2h)
- **On-Call**: Alert routing active (T-1h)
- **Support**: Customer communication (T+0h)

### Channels

- **#orca-releases**: Real-time status updates
- **#orca-incidents**: Rollback notifications
- **Email**: Executive summary (T+1h)

---

## Contingency Plans

### Database Migration Failure

1. Revert to previous schema version
2. Restore from backup
3. Postpone cutover by 24h

### Vercel Deployment Failure

1. Rollback to previous production deployment
2. Investigate failure logs
3. Retry deployment after fix

### Canary Promotion Failure

1. Halt canary at current percentage
2. Investigate SLO breach
3. Rollback or fix forward based on severity

---

## Appendices

- [Release Checklist](./checklist.md)
- [Release Notes Template](./notes_template.md)
- [DR Playbook](../docs/DR_PLAYBOOK.md)
- [SLO Policy](../docs/SLO_POLICY.md)
