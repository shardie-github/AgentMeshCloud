# Change Management Process

**Version:** 1.0  
**Last Updated:** 2025-10-31  
**SOC 2 Control:** CC8.1

---

## Overview

All changes to ORCA production systems must follow this change management process to ensure stability, security, and compliance.

---

## Change Categories

### Standard Changes
Pre-approved, low-risk changes with documented procedures.

**Examples:**
- Dependency updates (security patches)
- Configuration tweaks within approved parameters
- Scheduled maintenance tasks

**Approval:** Automated via CI/CD

### Normal Changes
Routine changes requiring review and approval.

**Examples:**
- Feature releases
- Bug fixes
- Database schema changes
- Infrastructure updates

**Approval:** Tech Lead + 1 peer reviewer

### Emergency Changes
Urgent changes to resolve critical incidents.

**Examples:**
- Security vulnerability patches
- Production outage fixes
- Data integrity issues

**Approval:** On-call engineer + post-incident review

---

## Change Request Process

### 1. Submit Change Request
**Required Information:**
- Description of change
- Business justification
- Risk assessment
- Rollback plan
- Testing evidence
- Affected systems/components

### 2. Review & Approval
- **Automated checks:** CI/CD pipeline (tests, security scans)
- **Peer review:** Code review (minimum 1 approval)
- **Tech Lead approval:** For infrastructure/architecture changes

### 3. Implementation
- **Deployment window:** Weekdays 10 AM - 4 PM PT (avoid Fridays)
- **Staged rollout:** Canary → 10% → 50% → 100%
- **Monitoring:** Real-time during rollout

### 4. Verification
- **Smoke tests:** Automated post-deployment
- **Health checks:** Service status green
- **KPI monitoring:** No degradation

### 5. Documentation
- **Changelog:** Updated with release notes
- **Runbook:** Updated if procedures changed
- **Post-mortem:** If issues occurred

---

## Rollback Procedures

### Automatic Rollback Triggers
- **Error rate:** >1.5% sustained for 5 minutes
- **Latency:** P95 >700ms sustained for 5 minutes
- **Health check failure:** >3 consecutive failures

### Manual Rollback
```bash
# Revert to previous deployment
vercel rollback --yes

# Restore database if schema changed
tsx scripts/restore_latest_backup.ts --confirm
```

---

## CI/CD Pipeline

### Stages
1. **Build:** Compile TypeScript, run linters
2. **Test:** Unit tests, integration tests (must pass)
3. **Security Scan:** CodeQL, npm audit, Snyk (no critical findings)
4. **Deploy Staging:** Automated deployment to staging
5. **E2E Tests:** Synthetic tests on staging
6. **Deploy Production:** Manual approval → canary → full rollout

### Gates
- All tests must pass (100%)
- Code coverage ≥80%
- No critical security findings
- At least 1 code review approval
- Tech Lead approval (for infrastructure changes)

---

## Documentation Requirements

Every change must update:
- **CHANGELOG.md:** User-facing changes
- **README.md:** If setup/config changed
- **Runbooks:** If operational procedures changed
- **API Docs:** If API changed

---

**Owner:** Engineering Team  
**Review Cycle:** Quarterly
