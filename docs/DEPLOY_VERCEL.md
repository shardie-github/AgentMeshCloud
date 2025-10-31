# Vercel Deployment Guide

**ORCA Production Deployment on Vercel**

---

## Overview

ORCA uses a blue/green deployment strategy with canary traffic promotion for zero-downtime production deployments. This guide covers:

- Blue/Green deployment process
- Canary rollout stages
- Environment synchronization
- Rollback procedures
- Monitoring and validation

---

## Prerequisites

### Required Environment Variables

```bash
# Vercel
VERCEL_TOKEN=<your-vercel-token>
VERCEL_PROJECT_ID=<your-project-id>
VERCEL_ORG_ID=<your-org-id>

# Supabase
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_KEY=<your-service-key>
DATABASE_URL=<your-database-url>

# Application
OPENAI_API_KEY=<your-openai-key>
NODE_ENV=production
```

### Required Tools

- Node.js ≥ 18.18.0
- pnpm ≥ 8.0.0
- Vercel CLI
- Supabase CLI (for database operations)

---

## Deployment Strategies

### 1. Blue/Green Deployment

**Use case:** Major releases, breaking changes, full production cutover

```bash
# Deploy blue environment (preview)
pnpm tsx deploy/vercel_blue_green.ts

# Skip health checks (not recommended)
pnpm tsx deploy/vercel_blue_green.ts --skip-health-check
```

**Process:**

1. Deploy to preview environment (blue)
2. Run health checks on blue
3. Flip production alias to blue (promote to green)
4. Validate production
5. Keep old deployment for quick rollback

**Timeline:** ~10-15 minutes

---

### 2. Canary Deployment

**Use case:** Standard releases, incremental rollout, progressive validation

```bash
# Deploy with canary promotion
pnpm tsx deploy/vercel_canary.ts --deployment-url=<preview-url>

# Fast-forward (skip gradual rollout)
pnpm tsx deploy/vercel_canary.ts --deployment-url=<preview-url> --fast-forward
```

**Stages:**

| Stage | Traffic % | Duration | SLO Checks |
|-------|-----------|----------|------------|
| 1 | 1% | 5 min | 3 |
| 2 | 5% | 10 min | 4 |
| 3 | 25% | 15 min | 5 |
| 4 | 100% | 10 min | 4 |

**Auto-rollback triggers:**
- p95 latency > 500ms
- Error rate > 1%
- Throughput < 100 req/s
- Any SLO check fails

**Timeline:** ~40 minutes (full canary) or ~1 minute (fast-forward)

---

### 3. Environment Sync

**Use case:** Update environment variables, feature flags, secrets

```bash
# Sync production environment
pnpm tsx deploy/vercel_env_sync.ts --env=production

# Dry run (preview changes)
pnpm tsx deploy/vercel_env_sync.ts --env=production --dry-run

# Sync staging
pnpm tsx deploy/vercel_env_sync.ts --env=staging
```

**Supported environments:**
- `production` → Vercel production
- `staging` → Vercel preview
- `preview` → Vercel preview + development

---

## Complete Deployment Workflow

### Step 1: Pre-Deployment

```bash
# 1. Create release candidate
pnpm tsx release/tag_rc.ts --type=rc

# 2. Run tests
pnpm test
pnpm typecheck
pnpm lint

# 3. Backup database
./scripts/supabase_backup_now.sh

# 4. Sync environment variables
pnpm tsx deploy/vercel_env_sync.ts --env=production --dry-run
pnpm tsx deploy/vercel_env_sync.ts --env=production
```

### Step 2: Blue Deployment

```bash
# Deploy to preview (blue environment)
pnpm tsx deploy/vercel_blue_green.ts
```

**Expected output:**
```
🚀 Vercel Blue/Green Deployment

Environment: production
Health checks: Enabled

🔵 Deploying blue environment (preview)...
  Building application...
  Deploying to Vercel...
  ✅ Blue deployed: https://orca-blue-preview.vercel.app

🏥 Running health checks on blue deployment...
  ✅ /health: 200 (120ms)
  ✅ /status: 200 (98ms)
  ✅ /api/trust: 200 (245ms)

✅ Blue/Green deployment successful!
```

### Step 3: Canary Promotion

```bash
# Get deployment URL from step 2
BLUE_URL="https://orca-blue-preview.vercel.app"

# Start canary rollout
pnpm tsx deploy/vercel_canary.ts --deployment-url=$BLUE_URL
```

**Expected output:**
```
🕊️ Vercel Canary Deployment

Deployment URL: https://orca-blue-preview.vercel.app
Fast-forward: No
Stages: 1% → 5% → 25% → 100%

============================================================
🎯 Stage 1/4: 1%
============================================================

🔀 Setting traffic to 1%...
  ✅ Traffic set to 1%

📊 Monitoring 1% stage...
  Duration: 300s
  SLO checks: 3

  🔍 SLO check 1/3...
    ✅ p95_latency: 245 (threshold: 500)
    ✅ error_rate: 0.12 (threshold: 1.0)
    ✅ throughput: 187 (threshold: 100)
  ✅ SLO check 1 passed
  ...

✅ Canary deployment successful!
```

### Step 4: Post-Deployment Validation

```bash
# Run SLO checks
pnpm run slo:check

# Run synthetics
pnpm run smoke:test

# Check production health
curl https://orca-mesh.io/health
curl https://orca-mesh.io/api/trust
```

---

## Rollback Procedures

### Automated Rollback

Canary deployment automatically rolls back on SLO breach:

```bash
# Canary will auto-rollback if any gate fails
pnpm tsx deploy/vercel_canary.ts --deployment-url=<url>
```

### Manual Rollback

```bash
# Rollback to last good deployment
pnpm tsx release/rollback.ts --reason="Production issue"

# Include database restore
pnpm tsx release/rollback.ts --reason="Data corruption" --db-restore
```

### Emergency Rollback (Vercel CLI)

```bash
# List recent deployments
vercel ls

# Promote previous deployment to production
vercel alias set <previous-deployment-url> orca-mesh.io

# Or rollback via Vercel dashboard
# https://vercel.com/<team>/<project>/deployments
```

---

## Monitoring

### Health Endpoints

```bash
# Overall health
GET /health

# Status with details
GET /status

# Trust score (application-specific)
GET /api/trust
```

### SLO Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **p95 Latency** | < 500ms | > 500ms |
| **Error Rate** | < 1% | > 1% |
| **Throughput** | > 100 req/s | < 100 req/s |
| **Uptime** | > 99.9% | < 99.9% |

### Vercel Analytics

Access at: `https://vercel.com/<team>/<project>/analytics`

**Key metrics:**
- Real User Monitoring (RUM)
- Web Vitals (LCP, FID, CLS)
- Geo distribution
- Device breakdown

---

## Troubleshooting

### Deployment Fails

**Symptom:** Blue deployment fails to create

**Solutions:**
1. Check Vercel token: `echo $VERCEL_TOKEN`
2. Verify build passes locally: `pnpm build`
3. Check Vercel build logs
4. Validate environment variables are set

### Health Check Fails

**Symptom:** Health checks fail on blue deployment

**Solutions:**
1. Check application logs in Vercel
2. Verify database connectivity
3. Test health endpoint manually: `curl <blue-url>/health`
4. Check for missing environment variables

### Canary Rollout Stalls

**Symptom:** Canary stops at intermediate stage

**Solutions:**
1. Check SLO metrics: `pnpm run slo:check`
2. Review canary report: `deploy/canary-*.json`
3. Manually rollback if needed: `pnpm tsx release/rollback.ts`
4. Investigate root cause before retry

### Environment Sync Fails

**Symptom:** Variables not syncing to Vercel

**Solutions:**
1. Verify `.env.production` exists
2. Check Vercel API token permissions
3. Run with `--dry-run` to preview changes
4. Manually set critical variables in Vercel dashboard

---

## Best Practices

### 1. Always Use Canary

- Never deploy directly to 100% traffic
- Use `--fast-forward` only for hotfixes
- Monitor SLOs at each stage

### 2. Backup Before Deploy

```bash
# Always backup before major deployments
./scripts/supabase_backup_now.sh
```

### 3. Test Blue Thoroughly

- Run full health check suite
- Validate critical user paths
- Check database connectivity
- Verify external integrations

### 4. Monitor Post-Deploy

- Watch SLOs for 1 hour after 100%
- Check error logs
- Monitor user feedback channels
- Keep rollback plan ready

### 5. Document Changes

- Update CHANGELOG.md
- Generate release notes
- Notify stakeholders
- Create evidence pack

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build
        run: pnpm build
      
      - name: Sync Environment
        run: pnpm tsx deploy/vercel_env_sync.ts --env=production
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      
      - name: Deploy Blue/Green
        run: pnpm tsx deploy/vercel_blue_green.ts
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
      
      - name: Canary Rollout
        run: pnpm tsx deploy/vercel_canary.ts --deployment-url=${{ steps.deploy.outputs.url }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## Security Considerations

### Secrets Management

- Store sensitive variables as Vercel encrypted secrets
- Use environment-specific secrets
- Rotate secrets regularly
- Never commit secrets to git

### Access Control

- Limit Vercel access to authorized users
- Use team-level permissions
- Enable SSO for production access
- Audit deployment logs

### Network Security

- Enable HTTPS-only
- Configure CORS policies
- Set up WAF rules (if available)
- Use Vercel IP allowlisting for admin endpoints

---

## Support

**Issues:** https://github.com/orca-mesh/orca-core/issues  
**Docs:** https://docs.orca-mesh.io  
**Slack:** #orca-deployments

---

**Last updated:** 2025-10-31  
**Version:** 1.0.0
