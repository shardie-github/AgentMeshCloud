# Rollback Playbook

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Owner:** SRE Team

---

## 🚨 Emergency Rollback (Quick Reference)

**Instant Rollback (CLI):**
```bash
pnpm run release:rollback
```

**Instant Rollback (Vercel UI):**
1. Go to https://vercel.com/orca-mesh/orca-core/deployments
2. Find last good deployment
3. Click "…" → "Promote to Production"

**Expected Time:** 2-5 minutes

---

## When to Rollback

### Automatic Rollback Triggers

System automatically rolls back if:
- ✅ Health checks fail for >3 consecutive checks
- ✅ Error rate >5% for >5 minutes
- ✅ P95 latency >2x baseline for >5 minutes
- ✅ Deployment build fails

### Manual Rollback Criteria

Consider manual rollback if:
- ❌ Error rate increased by >2% compared to baseline
- ❌ P95 latency increased by >500ms compared to baseline
- ❌ Critical feature broken (blocking user workflows)
- ❌ Data integrity issue detected
- ❌ Security vulnerability introduced
- ❌ Database migration failed
- ❌ >10 user-reported incidents in <1 hour

**Decision Tree:**
```
Is the issue user-facing? 
  ├─ Yes → Rollback immediately
  └─ No → Can it be fixed forward?
       ├─ Yes (fix <30 min) → Hot-fix
       └─ No → Rollback
```

---

## Rollback Methods

### Method 1: Automated Script (Recommended)

```bash
# Rollback to previous version
pnpm run release:rollback

# Rollback to specific version
pnpm run release:rollback --version=v1.0.5

# Dry-run (preview what will happen)
pnpm run release:rollback --dry-run
```

**What it does:**
1. Identifies last known-good deployment
2. Verifies target version is stable
3. Promotes target version to production
4. Runs post-rollback smoke tests
5. Sends Slack notification

### Method 2: Vercel CLI

```bash
# List recent deployments
vercel list

# Example output:
# prod  orca-core-abc123.vercel.app  v1.1.0  14m ago  READY
# prod  orca-core-xyz789.vercel.app  v1.0.9  2h ago   READY

# Rollback to specific deployment
vercel rollback orca-core-xyz789.vercel.app
```

### Method 3: Vercel Dashboard (UI)

**Steps:**
1. Go to https://vercel.com/orca-mesh/orca-core
2. Click "Deployments" tab
3. Find the last known-good deployment (check "Status: Ready")
4. Click the three-dot menu (⋮) on that deployment
5. Select "Promote to Production"
6. Confirm the rollback

### Method 4: Git Revert + Redeploy

**For code-only issues (no DB changes):**
```bash
# Find the commit to revert
git log --oneline -10

# Revert the problematic commit
git revert <bad-commit-hash>

# Push (triggers auto-deploy)
git push origin main
```

**Time estimate:** 5-10 minutes (depends on CI/CD pipeline)

---

## Rollback Procedures

### Step 1: Assess the Situation

**1.1. Gather Evidence**
```bash
# Check error rate
curl https://api.orca-mesh.io/health | jq

# Check logs
vercel logs --prod --follow | grep "ERROR" | tail -50

# Check Grafana
open https://dashboards.orca-mesh.io
```

**1.2. Determine Scope**
- Is the issue affecting all users or a subset?
- Which feature/endpoint is impacted?
- When did the issue start?

**1.3. Confirm Rollback Decision**
- Notify on-call engineer
- Post in #incidents Slack channel
- Get approval from SRE lead (if available)

**1.4. Create Incident**
```bash
# Auto-create incident
pnpm run incident:create --title="Rollback v1.1.0 due to error rate spike"
```

### Step 2: Execute Rollback

**2.1. Identify Target Version**
```bash
# List recent deployments
vercel list --prod

# Or check release history
git log --oneline --grep="release:" -10
```

**2.2. Rollback Application**
```bash
# Option A: Automated
pnpm run release:rollback --version=v1.0.9

# Option B: Manual
vercel rollback <deployment-url>
```

**2.3. Verify Rollback**
```bash
# Check deployment version
curl https://api.orca-mesh.io/health | jq '.version'

# Expected output: "v1.0.9"
```

### Step 3: Rollback Database (if needed)

**⚠️ CAUTION:** Database rollbacks are risky. Only perform if necessary.

**3.1. Assess Database State**
```bash
# Check current migration status
pnpm run db:status

# List recent migrations
pnpm run db:migrations:list
```

**3.2. Rollback Migration (if safe)**
```bash
# Rollback last migration
pnpm run db:rollback

# Verify rollback
pnpm run db:status
```

**3.3. Restore from Backup (if unsafe to rollback)**
```bash
# List available backups
pnpm run db:list-backups

# Restore from latest backup
pnpm run db:restore --backup=<backup-id> --confirm

# EXAMPLE:
# pnpm run db:restore --backup=backup-20251031-120000 --confirm
```

**Expected Downtime:** 5-15 minutes depending on database size

### Step 4: Post-Rollback Verification

**4.1. Run Smoke Tests**
```bash
# Automated smoke tests
pnpm run smoke:test --env=production

# Manual checks
curl https://api.orca-mesh.io/health
curl https://api.orca-mesh.io/agents
curl https://api.orca-mesh.io/trust
```

**4.2. Monitor Metrics (15 minutes)**
- [ ] Error rate back to baseline (<1.5%)
- [ ] P95 latency back to baseline (<700ms)
- [ ] Health checks passing
- [ ] No new errors in logs

**4.3. Notify Stakeholders**
```bash
# Auto-post to Slack
pnpm run release:notify --status=rolled-back --version=v1.0.9
```

### Step 5: Post-Mortem

**Within 24 hours of rollback:**
1. Schedule post-mortem meeting
2. Document root cause
3. Create action items to prevent recurrence
4. Update runbooks if needed

**Post-Mortem Template:**
- What happened?
- When was it detected?
- What was the impact?
- What was the root cause?
- Why did it happen?
- How do we prevent it?

---

## Database Rollback Strategies

### Strategy 1: Backward-Compatible Migrations (Preferred)

**Best Practice:** Always write backward-compatible migrations.

**Example:**
```sql
-- ✅ Good: Add new column with default
ALTER TABLE agents ADD COLUMN new_field TEXT DEFAULT '';

-- ❌ Bad: Remove column (breaks old code)
ALTER TABLE agents DROP COLUMN old_field;
```

**If backward-compatible:** No DB rollback needed, just rollback code.

### Strategy 2: Migration Rollback Script

**For every migration, provide a rollback script:**

**Migration (up):**
```sql
-- migrations/20251031_add_trust_score.sql
ALTER TABLE agents ADD COLUMN trust_score INT DEFAULT 0;
```

**Rollback (down):**
```sql
-- migrations/20251031_add_trust_score.down.sql
ALTER TABLE agents DROP COLUMN trust_score;
```

**Execute rollback:**
```bash
pnpm run db:rollback
```

### Strategy 3: Point-in-Time Recovery (PITR)

**For Supabase:**
```bash
# Restore to specific timestamp
supabase db restore --timestamp="2025-10-31T12:00:00Z"
```

**Expected Downtime:** 10-30 minutes

### Strategy 4: Backup Restore (Last Resort)

**When to use:** Data corruption, irreversible migration, catastrophic failure

**Steps:**
1. Stop application (`vercel rollback --prod`)
2. Restore database from backup
3. Restart application
4. Verify data integrity

```bash
# List backups
pnpm run db:list-backups

# Restore from backup
pnpm run db:restore --backup=<backup-id> --confirm

# Verify
pnpm run db:check
```

---

## Rollback Checklist

### Pre-Rollback
- [ ] Incident created (Slack #incidents)
- [ ] On-call engineer notified
- [ ] Rollback target version identified
- [ ] Backup verified (if DB rollback needed)
- [ ] Rollback command ready

### During Rollback
- [ ] Rollback command executed
- [ ] Deployment successful
- [ ] Smoke tests passing
- [ ] Health checks green
- [ ] Metrics monitored (15 min)

### Post-Rollback
- [ ] Stakeholders notified (Slack, email, status page)
- [ ] Incident updated with resolution
- [ ] Post-mortem scheduled
- [ ] Runbook updated (if needed)
- [ ] Preventive actions documented

---

## Rollback Time Estimates

| Rollback Type | Expected Time | Downtime | Risk Level |
|--------------|---------------|----------|------------|
| Code-only (Vercel) | 2-5 minutes | None | ✅ Low |
| Code + Config | 5-10 minutes | None | ✅ Low |
| Code + DB Migration | 10-20 minutes | ~5 min | ⚠️ Medium |
| Full DB Restore | 20-60 minutes | ~30 min | 🚨 High |

---

## Common Rollback Scenarios

### Scenario 1: Error Rate Spike

**Symptoms:**
- Error rate jumps from 0.8% to 5%
- 500 errors in logs
- User reports of "something went wrong"

**Action:**
```bash
# Immediate rollback
pnpm run release:rollback

# Monitor
watch -n 5 'curl -s https://api.orca-mesh.io/health | jq'
```

### Scenario 2: Performance Degradation

**Symptoms:**
- P95 latency increases from 450ms to 1200ms
- Slow page loads
- Timeouts

**Action:**
```bash
# Rollback
pnpm run release:rollback

# Check for slow queries
pnpm run db:slowquery-check
```

### Scenario 3: Database Migration Failure

**Symptoms:**
- Migration script fails mid-execution
- Database inconsistent state
- Application errors referencing DB schema

**Action:**
```bash
# Rollback migration
pnpm run db:rollback

# Verify schema
pnpm run db:status

# If corrupted, restore from backup
pnpm run db:restore --backup=<latest-backup>
```

### Scenario 4: Critical Feature Broken

**Symptoms:**
- Users cannot register agents
- Workflows fail to execute
- Auth broken

**Action:**
```bash
# Immediate rollback
pnpm run release:rollback

# Verify feature works
pnpm run smoke:test --feature=agent-registration
```

---

## Rollback Communication Templates

### Incident Declaration (Slack #incidents)

```
🚨 INCIDENT: v1.1.0 Rollback in Progress

**Severity:** P1 (Critical)
**Impact:** Error rate spike (5%), all users affected
**Action:** Rolling back to v1.0.9
**ETA:** 5 minutes
**Incident Lead:** @john.doe
**Status:** https://status.orca-mesh.io

Updates will be posted here every 10 minutes.
```

### Rollback Completed (Slack #incidents)

```
✅ RESOLVED: Rollback to v1.0.9 complete

**Status:** All systems operational
**Error Rate:** Back to baseline (0.8%)
**Duration:** 12 minutes (14:00 - 14:12 UTC)
**Next Steps:** Post-mortem scheduled for tomorrow 10am
**Incident Report:** INC-2025-001

Thank you for your patience. 🙏
```

### Customer Communication (Email/Status Page)

```
Subject: Service Restored - Brief Incident Resolved

Hi there,

We experienced a brief service disruption from 14:00 to 14:12 UTC today. 
Our team detected elevated error rates and rolled back to a stable version.

✅ All services are now fully operational.
📊 No data was lost.
📝 A detailed post-mortem will be published within 24 hours.

We apologize for any inconvenience. If you have questions, contact support@orca-mesh.io.

- The ORCA Team
```

---

## Preventive Measures

### Before Deploying
- [ ] Full test suite passes
- [ ] Staging deployment successful
- [ ] Backward-compatible DB migrations
- [ ] Feature flags for risky changes
- [ ] Rollback plan documented
- [ ] On-call engineer briefed

### Rollback Safety Net
- [ ] Automated health checks
- [ ] Error rate alerting
- [ ] Canary deployments for big changes
- [ ] Database backups (daily)
- [ ] Rollback scripts tested regularly
- [ ] Post-mortem culture (learn from failures)

---

## Useful Commands

```bash
# Rollback to previous version
pnpm run release:rollback

# Rollback to specific version
pnpm run release:rollback --version=v1.0.9

# Dry-run rollback
pnpm run release:rollback --dry-run

# List deployments
vercel list --prod

# Rollback via Vercel CLI
vercel rollback <deployment-url>

# Database rollback
pnpm run db:rollback

# Restore from backup
pnpm run db:restore --backup=<backup-id>

# Health check
curl https://api.orca-mesh.io/health

# Smoke tests
pnpm run smoke:test --env=production

# Create incident
pnpm run incident:create --title="Rollback v1.1.0"
```

---

## Emergency Contacts

| Role | Slack | PagerDuty | Response Time |
|------|-------|-----------|---------------|
| On-Call Engineer | @oncall | PagerDuty | <15 min |
| SRE Lead | @sre-lead | +1-555-0100 | <30 min |
| CTO | @cto | +1-555-0101 | <1 hour |

**Escalation:** oncall → SRE lead → CTO

---

**Last Updated:** 2025-10-31  
**Next Review:** Quarterly

**Questions?** Slack #oncall or email sre@orca-mesh.io
