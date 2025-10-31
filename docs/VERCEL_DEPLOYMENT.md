# Vercel Deployment Guide

Complete guide for deploying ORCA Core to Vercel with security, performance, and caching optimizations.

## Table of Contents

- [Initial Setup](#initial-setup)
- [Environment Variables](#environment-variables)
- [Security Headers](#security-headers)
- [Caching Strategy](#caching-strategy)
- [Edge Functions](#edge-functions)
- [Preview Deployments](#preview-deployments)
- [Production Deployment](#production-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Initial Setup

### Prerequisites

- Vercel account
- GitHub repository connected
- Supabase project configured

### Install Vercel CLI

```bash
npm i -g vercel
```

### Link Project

```bash
vercel link
```

## Environment Variables

### Required Variables

Configure in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Environment | Description |
|----------|-------------|-------------|
| `SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_ANON_KEY` | All | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Service role key (sensitive) |
| `OPENAI_API_KEY` | Production, Preview (optional) | OpenAI for AI features |
| `NODE_ENV` | All | Set to `production` in prod |

### Setting Variables

**Via Vercel Dashboard:**

1. Project Settings → Environment Variables
2. Add each variable
3. Select environments (Production, Preview, Development)
4. Save

**Via Vercel CLI:**

```bash
# Production
vercel env add SUPABASE_URL production

# Preview
vercel env add OPENAI_API_KEY preview

# Development
vercel env add NODE_ENV development
```

### Sync Environment Variables

Script to sync env vars to Vercel:

```bash
pnpm run deploy:env-sync
```

## Security Headers

Security headers are configured in `vercel.json`:

### Global Headers (All Routes)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### API-Specific Headers

```json
{
  "source": "/api/(.*)",
  "headers": [
    { 
      "key": "Content-Security-Policy", 
      "value": "default-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none';" 
    },
    { 
      "key": "Strict-Transport-Security", 
      "value": "max-age=31536000; includeSubDomains; preload" 
    }
  ]
}
```

### Verify Headers

After deployment, verify headers:

```bash
curl -I https://your-deployment.vercel.app/api/health
```

Expected:

```
HTTP/2 200
x-content-type-options: nosniff
x-frame-options: DENY
x-xss-protection: 1; mode=block
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains; preload
```

## Caching Strategy

### Static Assets

Vercel automatically caches static assets with optimal headers.

### API Routes

**Public data (Trust scores, KPIs):**

```typescript
// Cache for 5 minutes, revalidate in background
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const res = await fetch(/* ... */);
  
  return new Response(res.body, {
    headers: {
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
      'CDN-Cache-Control': 'max-age=300',
    },
  });
}
```

**Tenant-specific data:**

```typescript
// Cache per tenant with vary header
export default async function handler(req: Request) {
  const tenantId = req.headers.get('x-tenant-id');
  
  return new Response(data, {
    headers: {
      'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      'Vary': 'x-tenant-id',
    },
  });
}
```

### Cache Purging

Purge cache when data changes:

```bash
# Via Vercel CLI
vercel env rm CACHE_PURGE_TOKEN
vercel env add CACHE_PURGE_TOKEN production

# Via API
curl -X PURGE https://your-deployment.vercel.app/api/trust/scores
```

### ISR (Incremental Static Regeneration)

For Next.js pages (if applicable):

```typescript
export async function getStaticProps() {
  return {
    props: { /* ... */ },
    revalidate: 300, // Revalidate every 5 minutes
  };
}
```

## Edge Functions

### Configuration

Edge functions run on Vercel's Edge Network for low latency.

**Configure in `vercel.json`:**

```json
{
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}
```

### Edge Runtime

Use Edge Runtime for performance-critical routes:

```typescript
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // Edge function logic
}
```

**Benefits:**

- Global distribution
- Sub-50ms cold starts
- Streaming responses

**Limitations:**

- No Node.js APIs
- Limited npm packages
- 4MB code size limit

## Preview Deployments

### Automatic Previews

Every PR creates a preview deployment:

1. Push to branch
2. Vercel builds and deploys
3. Comment on PR with preview URL
4. Test changes in isolation

### Preview Environment Variables

Set preview-specific variables:

```bash
vercel env add OPENAI_API_KEY preview
```

### Preview URLs

Format: `https://<project>-<git-branch>-<scope>.vercel.app`

### E2E Testing on Previews

```bash
# Set preview URL
export PREVIEW_URL="https://orca-pr-123-team.vercel.app"

# Run E2E tests
pnpm run e2e -- --base-url=$PREVIEW_URL
```

## Production Deployment

### Deployment Flow

1. **Merge to `main`** → Triggers production deployment
2. **Vercel builds** → Runs `pnpm run build`
3. **Deploy** → Updates production URL
4. **Monitor** → Check logs and metrics

### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy with specific commit
vercel --prod --git-commit-sha=abc123
```

### Deployment Strategies

#### Blue-Green Deployment

```bash
pnpm run deploy:blue-green
```

Script handles:

1. Deploy to new URL (green)
2. Run smoke tests
3. Switch production alias
4. Keep old deployment (blue) for rollback

#### Canary Deployment

```bash
pnpm run deploy:canary --traffic=10
```

Gradually shift traffic:

- 10% to new version
- Monitor metrics
- Increase to 50%, then 100%

### Rollback

**Via Vercel Dashboard:**

1. Deployments → Production
2. Find previous deployment
3. Click "..." → Promote to Production

**Via CLI:**

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel alias set <deployment-url> <production-domain>
```

## Monitoring

### Vercel Analytics

Enable in Project Settings → Analytics:

- Real User Monitoring (RUM)
- Web Vitals
- Traffic metrics
- Error rates

### Runtime Logs

**Via Dashboard:**

Project → Logs → Filter by deployment

**Via CLI:**

```bash
vercel logs <deployment-url> --follow
```

### Performance Metrics

Monitor in Vercel Dashboard:

| Metric | Target | Action if Over |
|--------|--------|----------------|
| Cold start | < 100ms | Optimize bundle size |
| Response time | < 500ms | Add caching, optimize queries |
| Error rate | < 0.1% | Investigate errors, add monitoring |

### Custom Monitoring

Send metrics to external service:

```typescript
import { sendMetric } from './monitoring';

export default async function handler(req: Request) {
  const start = Date.now();
  
  try {
    const res = await handleRequest(req);
    sendMetric('api.duration', Date.now() - start);
    return res;
  } catch (error) {
    sendMetric('api.error', 1);
    throw error;
  }
}
```

## Troubleshooting

### Build Failures

**Check build logs:**

```bash
vercel logs <deployment-url> --build
```

**Common issues:**

1. **Missing dependencies:** Check `package.json`
2. **Type errors:** Run `pnpm typecheck` locally
3. **Memory limit:** Increase in `vercel.json`:
   ```json
   { "builds": [{ "config": { "maxLambdaSize": "50mb" } }] }
   ```

### Function Timeouts

**Symptoms:**

- 504 Gateway Timeout
- Function execution exceeded timeout

**Solutions:**

1. **Increase timeout** (Pro plan):
   ```json
   { "functions": { "api/**/*.ts": { "maxDuration": 60 } } }
   ```

2. **Optimize function:**
   - Cache external calls
   - Use background jobs for long tasks
   - Return immediately, process async

### Environment Variables Not Working

**Verify:**

```bash
# Check variables
vercel env ls

# Pull variables locally
vercel env pull .env.local
```

**Rebuild if changed:**

Environment changes require redeploy:

```bash
vercel --prod --force
```

### Cache Issues

**Clear cache:**

```bash
# Purge specific route
curl -X PURGE https://your-deployment.vercel.app/api/route

# Redeploy without cache
vercel --prod --force
```

### Headers Not Applied

**Verify `vercel.json` syntax:**

```bash
# Lint configuration
cat vercel.json | jq .
```

**Check in production:**

```bash
curl -I https://your-deployment.vercel.app/api/health | grep -i "x-frame-options"
```

## Best Practices

### Security

- ✅ Use environment variables for secrets
- ✅ Enable security headers
- ✅ Set appropriate CSP
- ✅ Use HTTPS only
- ❌ Don't commit secrets to git
- ❌ Don't expose sensitive data in logs

### Performance

- ✅ Use Edge Runtime when possible
- ✅ Implement caching strategies
- ✅ Optimize bundle size
- ✅ Use CDN for static assets
- ❌ Don't make synchronous API calls
- ❌ Don't load unnecessary dependencies

### Cost Optimization

- ✅ Cache frequently accessed data
- ✅ Use ISR for static content
- ✅ Set appropriate function memory
- ✅ Monitor bandwidth usage
- ❌ Don't over-provision resources
- ❌ Don't skip cache configuration

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Deployment Hooks

Webhook to trigger actions post-deployment:

1. Vercel Dashboard → Project Settings → Git → Deploy Hooks
2. Add webhook URL
3. Trigger on deployment completion

## Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Edge Functions](https://vercel.com/docs/functions/edge-functions)
- [Caching](https://vercel.com/docs/concepts/edge-network/caching)
- [Security](https://vercel.com/docs/security)

---

**Last Updated:** 2025-10-31
