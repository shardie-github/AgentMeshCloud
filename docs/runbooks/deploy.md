# Deploy Runbook

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Owner:** SRE Team

---

## Quick Reference

**One-Click Deploy (Production):**
```bash
pnpm run deploy:blue-green
```

**Emergency Rollback:**
```bash
pnpm run release:rollback
```

---

## Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Code review approved (2+ reviewers)
- [ ] Staging deployment successful
- [ ] Smoke tests pass on staging
- [ ] Database migrations tested (if applicable)
- [ ] Environment variables synced
- [ ] Rollback plan reviewed
- [ ] On-call engineer notified
- [ ] Status page prepared (if user-facing changes)

---

## Deployment Methods

### Method 1: Vercel Auto-Deploy (Recommended)

**Trigger:** Merge to `main` branch

**Process:**
1. Merge PR to `main`
2. Vercel automatically deploys
3. Preview builds run first
4. Production deployment after checks pass

**Monitoring:**
```bash
# Watch deployment status
vercel inspect <deployment-url>

# View logs
vercel logs <deployment-url>
```

### Method 2: Manual Deploy via CLI

```bash
# 1. Ensure you're on latest main
git checkout main
git pull origin main

# 2. Run pre-flight checks
pnpm run doctor
pnpm run lint
pnpm run typecheck
pnpm run test:ci

# 3. Build for production
pnpm run build

# 4. Deploy to Vercel
vercel --prod

# 5. Wait for deployment URL
# Example: https://orca-mesh-xyz.vercel.app
```

### Method 3: Blue-Green Deployment

```bash
# Automated blue-green with health checks
pnpm run deploy:blue-green

# What it does:
# 1. Deploys to "green" environment
# 2. Runs smoke tests
# 3. Switches traffic to green
# 4. Keeps blue as fallback for 24h
```

### Method 4: Canary Deployment (Gradual Rollout)

```bash
# Stage 1: 5% of traffic
pnpm run deploy:canary --percentage=5
# Monitor for 30 minutes

# Stage 2: 25% of traffic
pnpm run deploy:canary --percentage=25
# Monitor for 1 hour

# Stage 3: 50% of traffic
pnpm run deploy:canary --percentage=50
# Monitor for 2 hours

# Stage 4: 100% of traffic
pnpm run deploy:canary --percentage=100
```

---

## Environment-Specific Deployments

### Staging
```bash
# Deploy to staging
vercel --env=preview

# Or via script
pnpm run deploy:staging
```

### Production
```bash
# Deploy to production (after staging verification)
vercel --prod

# Or via script
pnpm run deploy:production
```

---

## Database Migrations

**Pre-Migration Checklist:**
- [ ] Backup database (`pnpm run db:backup`)
- [ ] Test migration on staging
- [ ] Rollback script prepared
- [ ] Maintenance window scheduled (if downtime expected)

**Migration Process:**

```bash
# 1. Backup database
pnpm run db:backup

# 2. Apply migrations (production)
pnpm run db:migrate

# 3. Verify migration
pnpm run db:status

# 4. Run post-migration tests
pnpm run test:integration
```

**If Migration Fails:**
```bash
# Rollback migration
pnpm run db:rollback

# Restore from backup (last resort)
pnpm run db:restore --backup=<backup-id>
```

---

## Post-Deployment Verification

### Automated Checks

```bash
# Run smoke tests against production
pnpm run smoke:test --env=production

# Check health endpoints
curl https://api.orca-mesh.io/health
curl https://api.orca-mesh.io/status/readiness
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T12:00:00Z"
}
```

### Manual Verification

1. **API Endpoints:**
   - [ ] GET /agents (list agents)
   - [ ] GET /trust (trust KPIs)
   - [ ] GET /health (health check)

2. **Dashboard:**
   - [ ] Login works
   - [ ] Agent list loads
   - [ ] Workflows execute
   - [ ] Metrics display correctly

3. **Monitoring:**
   - [ ] Grafana dashboards loading
   - [ ] No error spikes in logs
   - [ ] Latency within SLOs (P95 <700ms)
   - [ ] Error rate <1.5%

### Key Metrics to Watch (First Hour)

```bash
# Terminal 1: Monitor error rate
watch -n 10 'curl -s https://api.orca-mesh.io/health | jq'

# Terminal 2: Monitor logs
vercel logs --prod --follow

# Terminal 3: Grafana dashboard
open https://dashboards.orca-mesh.io
```

**Alert Thresholds:**
- ⚠️ **Warning:** Error rate >1.0%, P95 latency >600ms
- 🚨 **Critical:** Error rate >2.0%, P95 latency >1000ms, health check failure

---

## Rollback Procedures

### Automatic Rollback (Vercel)

Vercel automatically rolls back if:
- Health checks fail
- Error rate >5% for 5 minutes
- Deployment build fails

### Manual Rollback

**Option 1: Vercel UI**
1. Go to https://vercel.com/orca-mesh/orca-core
2. Click "Deployments"
3. Find previous successful deployment
4. Click "…" → "Promote to Production"

**Option 2: CLI**
```bash
# List recent deployments
vercel list

# Rollback to specific deployment
vercel rollback <deployment-id>

# Or use script (rolls back to previous version)
pnpm run release:rollback
```

**Option 3: Git Revert**
```bash
# Find commit to revert
git log --oneline -10

# Revert the commit
git revert <commit-hash>

# Push (triggers auto-deploy)
git push origin main
```

### Database Rollback

**If migration caused issues:**
```bash
# Rollback to previous migration
pnpm run db:rollback

# Or restore from backup
pnpm run db:restore --backup=$(pnpm run db:list-backups | head -n1)
```

---

## Troubleshooting

### Deployment Fails

**Issue:** Build fails with type errors
```bash
# Fix: Regenerate Prisma client
pnpm run db:generate
pnpm run build
```

**Issue:** Environment variables missing
```bash
# Check current env vars
vercel env ls --env=production

# Pull env vars locally
vercel env pull .env.production

# Add missing var
vercel env add ENV_VAR_NAME --env=production
```

**Issue:** Deployment timeout
```bash
# Increase function timeout in vercel.json
{
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

### Post-Deployment Issues

**Issue:** 500 errors on API
```bash
# Check logs
vercel logs --prod --follow | grep "ERROR"

# Check health endpoint
curl https://api.orca-mesh.io/health
```

**Issue:** Database connection errors
```bash
# Verify DB is accessible
pnpm run db:check

# Check connection pool
# Look for "too many connections" in logs
```

**Issue:** High latency
```bash
# Check cold start times
vercel inspect <deployment-url>

# Check bundle size
pnpm run bundle:analyze

# Review Grafana for slow queries
```

---

## Communication Templates

### Pre-Deployment Announcement

**Slack (#engineering):**
```
🚀 Deploying v1.2.0 to production
📅 Scheduled: 2025-10-31 14:00 UTC
⏱️ Expected duration: 10 minutes
📝 Changes: Bug fixes, performance improvements
🔗 Release notes: https://github.com/orca-mesh/orca-core/releases/v1.2.0
👤 Release captain: @john.doe
```

### Post-Deployment Success

**Slack (#general):**
```
✅ v1.2.0 deployed successfully
📊 All systems operational
🔗 Status: https://status.orca-mesh.io
📈 Metrics: https://dashboards.orca-mesh.io
```

### Post-Deployment Issues

**Slack (#incidents):**
```
🚨 Issue detected after v1.2.0 deployment
❌ Error rate spike: 3.5% (baseline: 0.8%)
🔄 Rolling back to v1.1.9
🔗 Incident: INC-2025-001
```

---

## Post-Deployment Tasks

**Immediately After Deploy (T+0):**
- [ ] Verify deployment URL is live
- [ ] Run smoke tests
- [ ] Check health endpoints
- [ ] Monitor Grafana for 15 minutes

**1 Hour Post-Deploy (T+1h):**
- [ ] Review error logs
- [ ] Check user feedback (if applicable)
- [ ] Verify key metrics (WAU, error rate, latency)

**24 Hours Post-Deploy (T+24h):**
- [ ] Full metrics review
- [ ] Post-mortem scheduled (even if successful)
- [ ] Update status page if needed
- [ ] Archive deployment artifacts

---

## Maintenance Window

**For breaking changes or major migrations:**

1. **Schedule Maintenance:**
   - Update status page 48h in advance
   - Send email to customers (if applicable)
   - Post in Slack #general

2. **During Maintenance:**
   - Display maintenance page
   - Disable background jobs
   - Pause new signups (if needed)

3. **Post-Maintenance:**
   - Re-enable services
   - Update status page
   - Send completion notification

**Maintenance Page:**
```html
<!-- Deploy to /maintenance.html -->
<h1>🛠️ Scheduled Maintenance</h1>
<p>We're upgrading ORCA AgentMesh. Back online in ~30 minutes.</p>
<p>Status: <a href="https://status.orca-mesh.io">status.orca-mesh.io</a></p>
```

---

## Emergency Contacts

| Role | Name | Slack | PagerDuty |
|------|------|-------|-----------|
| SRE Lead | TBD | @sre-lead | +1-555-0100 |
| On-Call Engineer | (Rotation) | @oncall | PagerDuty |
| CTO | TBD | @cto | +1-555-0101 |
| DevOps | TBD | @devops | +1-555-0102 |

**Slack Channels:**
- `#engineering` - General eng updates
- `#oncall` - On-call discussions
- `#incidents` - Active incidents only
- `#releases` - Release announcements

**Escalation Path:**
1. On-Call Engineer (respond <15min)
2. SRE Lead (respond <30min)
3. CTO (respond <1h)

---

## Useful Commands

```bash
# List recent deployments
vercel list

# Inspect specific deployment
vercel inspect <deployment-url>

# View logs
vercel logs --prod --follow

# Check environment variables
vercel env ls

# Run health check
curl https://api.orca-mesh.io/health | jq

# Run smoke tests
pnpm run smoke:test --env=production

# Check bundle size
pnpm run bundle:analyze

# Database status
pnpm run db:status

# Rollback deployment
pnpm run release:rollback
```

---

## Checklist Generator

**Generate pre-deployment checklist:**
```bash
pnpm run deploy:checklist > pre-deploy-$(date +%Y%m%d).md
```

---

**Last Updated:** 2025-10-31  
**Next Review:** Before next major release

**Questions?** Slack #oncall or email sre@orca-mesh.io
