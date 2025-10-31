# Rollback Playbook

Emergency procedures for rolling back ORCA Core deployments.

## Table of Contents

- [Overview](#overview)
- [Rollback Scenarios](#rollback-scenarios)
- [Quick Rollback](#quick-rollback)
- [Application Rollback](#application-rollback)
- [Database Rollback](#database-rollback)
- [Full System Rollback](#full-system-rollback)
- [Post-Rollback](#post-rollback)
- [Prevention](#prevention)

## Overview

**Target: < 5 minutes from decision to rollback complete**

### When to Rollback

✅ **DO rollback when:**

- Critical bug in production
- Data corruption detected
- Security vulnerability exposed
- Performance degradation > 50%
- Error rate > 5%

⚠️ **CONSIDER alternatives when:**

- Minor bug with workaround
- Feature flag can disable feature
- Forward fix is quick (< 10 min)

## Rollback Scenarios

### Scenario 1: Application Bug (No DB Changes)

**Time:** ~2 minutes

1. Rollback Vercel deployment
2. Verify health checks
3. Monitor metrics

### Scenario 2: Database Migration Issue

**Time:** ~5 minutes

1. Stop application traffic
2. Rollback database
3. Rollback application
4. Resume traffic

### Scenario 3: Full System Failure

**Time:** ~10 minutes

1. Enable maintenance mode
2. Rollback database
3. Rollback application
4. Verify all services
5. Disable maintenance mode

## Quick Rollback

### Automated Script

```bash
# Rollback to previous release tag
./scripts/rollback/restore_prev_release.ts

# Or manually specify version
./scripts/rollback/restore_prev_release.ts --version v1.2.3
```

This script handles:

- ✅ Vercel deployment rollback
- ✅ Database migration rollback
- ✅ Health check verification
- ✅ Notification to team

## Application Rollback

### Via Vercel Dashboard

1. **Go to Vercel Dashboard**
   - Project → Deployments → Production

2. **Find Previous Deployment**
   - Look for last known good deployment
   - Check timestamp and commit hash

3. **Promote to Production**
   - Click "..." → "Promote to Production"
   - Confirm rollback

**Time:** ~30 seconds

### Via Vercel CLI

```bash
# List recent deployments
vercel ls --prod

# Promote specific deployment
vercel alias set <deployment-url> <production-domain>
```

**Example:**

```bash
vercel alias set orca-abc123-team.vercel.app orca-production.vercel.app
```

### Via Git Tag

```bash
# Find last release tag
git tag -l --sort=-version:refname | head -n 2

# Example output:
# v1.2.5  (current, broken)
# v1.2.4  (last good)

# Rollback to v1.2.4
pnpm run release:rollback --tag v1.2.4
```

## Database Rollback

### ⚠️ WARNING

Database rollbacks are **destructive** and can cause data loss.

### Pre-Rollback Checklist

- [ ] Backup current database state
- [ ] Identify migration to rollback to
- [ ] Check if data loss is acceptable
- [ ] Notify team of rollback

### Via Supabase Dashboard

1. **Go to Supabase Dashboard**
   - Database → Backups

2. **Select Restore Point**
   - Choose point-in-time or backup

3. **Restore**
   - Confirm restore (creates new database)
   - Update connection strings

**Time:** ~3-5 minutes

### Via Migration Rollback

```bash
# Check migration status
pnpm run db:status

# Rollback one migration
pnpm run supabase:migrate:down

# Rollback to specific migration
pnpm run supabase:migrate:to <migration-name>
```

### Manual Rollback

```bash
# Create backup first
pnpm run db:backup

# Apply rollback SQL
psql $SUPABASE_DB_URL < supabase/rollback/v1.2.4.sql
```

## Full System Rollback

### Step-by-Step Procedure

#### 1. Enable Maintenance Mode (Optional)

```bash
# Set maintenance mode
vercel env add MAINTENANCE_MODE true production

# Redeploy
vercel --prod
```

**OR** use CloudFlare maintenance page (if configured).

#### 2. Backup Current State

```bash
# Database backup
pnpm run db:backup

# Save current deployment URL
vercel ls --prod | head -n 1 > current_deployment.txt
```

#### 3. Rollback Database

```bash
# Restore to last known good
pnpm run db:restore --timestamp="2025-10-30 14:00:00"
```

#### 4. Rollback Application

```bash
# Rollback to previous tag
./scripts/rollback/restore_prev_release.ts --version v1.2.4
```

#### 5. Verify Health

```bash
# Check application
curl https://api.orca-mesh.io/api/health

# Check database
pnpm run db:status

# Check trust scores endpoint
curl https://api.orca-mesh.io/api/trust/health
```

#### 6. Disable Maintenance Mode

```bash
# Remove maintenance mode
vercel env rm MAINTENANCE_MODE production

# Redeploy
vercel --prod
```

#### 7. Monitor

Watch dashboards for 15 minutes:

- Error rates
- Response times
- Trust score calculations
- Database queries

## Post-Rollback

### Immediate Tasks

- [ ] Post incident notification
- [ ] Update status page
- [ ] Notify stakeholders
- [ ] Document issue in runbook

### Within 24 Hours

- [ ] Root cause analysis
- [ ] Create fix PR
- [ ] Add regression tests
- [ ] Update deployment process
- [ ] Schedule post-mortem

### Post-Mortem Template

```markdown
## Incident: [Title]

**Date:** 2025-10-31
**Duration:** 15 minutes
**Severity:** High

### Timeline

- 14:00 - Deployment v1.2.5
- 14:05 - Alert: Error rate spike
- 14:10 - Decision to rollback
- 14:15 - Rollback complete
- 14:20 - System stable

### Root Cause

[Detailed explanation]

### Impact

- Users affected: ~500
- API errors: 1,200
- Data loss: None

### Resolution

Rolled back to v1.2.4

### Action Items

- [ ] Fix bug in trust scoring
- [ ] Add integration test
- [ ] Update deployment checklist
```

## Prevention

### Pre-Deployment Checklist

- [ ] All CI checks pass
- [ ] E2E tests pass
- [ ] Database migrations tested
- [ ] Feature flags configured
- [ ] Rollback plan documented
- [ ] Team notified
- [ ] Monitoring ready

### Deployment Best Practices

1. **Deploy during low-traffic hours**
2. **Use canary deployments** (10% → 50% → 100%)
3. **Monitor for 15 minutes** after deployment
4. **Have rollback ready** before deploying
5. **Test rollback procedure** quarterly

### Feature Flags

Use feature flags for risky changes:

```typescript
if (isFeatureEnabled('new-trust-algorithm')) {
  return newTrustScore();
} else {
  return oldTrustScore();
}
```

Allows instant rollback without deployment.

## Rollback Decision Tree

```
┌─────────────────────────────┐
│   Issue Detected            │
└──────────┬──────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Severity?    │
    └──┬───────┬───┘
       │       │
   Critical   Minor
       │       │
       ▼       ▼
   Rollback   Forward Fix
       │       │
       ▼       │
   ┌────────────┴───────┐
   │ DB changes?        │
   └──┬──────────┬──────┘
      │          │
     Yes        No
      │          │
      ▼          ▼
   Full      App Only
   Rollback   Rollback
```

## Emergency Contacts

- **On-Call Engineer:** See PagerDuty
- **Database Admin:** [contact]
- **Vercel Support:** support@vercel.com
- **Supabase Support:** support@supabase.io

## Quick Reference

| Action | Command |
|--------|---------|
| Rollback app | `vercel alias set <old-deployment> <prod-domain>` |
| Rollback DB | `pnpm run db:restore --timestamp="..."` |
| Check health | `curl https://api.orca-mesh.io/api/health` |
| View logs | `vercel logs --prod --follow` |
| Backup DB | `pnpm run db:backup` |

---

**Remember:** It's okay to rollback. Safety first. 🛡️
