# Deployment Guide

This document outlines the deployment process for AgentMesh Cloud across GitHub, Vercel, and Supabase.

## Environment Matrix

### Required Environment Variables

| Variable | Local | GitHub Actions | Vercel Preview | Vercel Production | Description |
|----------|-------|----------------|----------------|-------------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ✅ | Supabase anonymous key (client-side) |
| `SUPABASE_URL` | ✅ | ✅ | ✅ | ✅ | Supabase project URL (server-side) |
| `SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | ✅ | Supabase anonymous key (server-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ❌ | ❌ | Supabase service role key (server-only) |
| `SUPABASE_PROJECT_REF` | ✅ | ✅ | ✅ | ✅ | Supabase project reference |
| `DATABASE_URL` | ✅ | ✅ | ✅ | ✅ | PostgreSQL connection string |
| `PRISMA_CLIENT_ENGINE_TYPE` | ✅ | ✅ | ✅ | ✅ | Set to `wasm` for Vercel compatibility |
| `NODE_ENV` | ✅ | ✅ | ✅ | ✅ | Environment mode |
| `VERCEL_ORG_ID` | ❌ | ✅ | ❌ | ❌ | Vercel organization ID (CI only) |
| `VERCEL_PROJECT_ID` | ❌ | ✅ | ❌ | ❌ | Vercel project ID (CI only) |

### Supabase Project Reference
- **Production**: `ghqyxhbyyirveptgwoqm`
- **Preview**: Uses same project with different database schema

## Deployment Order of Operations

### 1. Database Migrations
```bash
# Check migration status
pnpm run db:status

# Deploy migrations (idempotent)
pnpm run db:deploy

# Generate Prisma client
pnpm run db:generate
```

### 2. Application Build
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Build all packages
pnpm run build
```

### 3. Health Checks
```bash
# Run comprehensive health checks
pnpm run health:check

# Run RLS smoke tests
pnpm run rls:smoke

# Run database performance tests
pnpm run db:performance

# Run bundle analysis
pnpm run bundle:analyze

# Run secrets scan
pnpm run secrets:scan
```

## CI/CD Pipeline

### Pull Request Flow
1. **Lint & Type Check** - Code quality validation
2. **Security Audit** - Dependency vulnerability scan
3. **Secrets Scan** - Detect leaked secrets in code
4. **Bundle Analysis** - Check bundle size budgets
5. **Test** - Unit and integration tests
6. **Database Performance** - Query performance validation
7. **RLS Smoke Test** - Row Level Security validation
8. **Prisma Validation** - Schema validation and migration status
9. **Build** - Compile all packages
10. **Deploy Preview** - Deploy to Vercel preview environment
11. **Health Checks** - Validate preview deployment
12. **Cost Guard** - Monitor usage and costs

### Main Branch Flow
1. **Lint & Type Check** - Code quality validation
2. **Security Audit** - Dependency vulnerability scan
3. **Secrets Scan** - Detect leaked secrets in code
4. **Bundle Analysis** - Check bundle size budgets
5. **Test** - Unit and integration tests
6. **Database Performance** - Query performance validation
7. **RLS Smoke Test** - Row Level Security validation
8. **Prisma Validation** - Schema validation and migration status
9. **Build** - Compile all packages
10. **Deploy Production** - Deploy to Vercel production
11. **Deploy Supabase** - Deploy migrations and edge functions
12. **Health Checks** - Validate production deployment
13. **Cost Guard** - Monitor usage and costs

## Environment Setup

### Local Development
1. Copy `.env.example` to `.env.local`
2. Fill in your Supabase credentials
3. Run `pnpm install`
4. Run `pnpm run db:generate`
5. Run `pnpm run dev`

### GitHub Actions
Required secrets in repository settings:
- `DATABASE_URL` - Production database URL
- `DATABASE_URL_PREVIEW` - Preview database URL (optional)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `SUPABASE_PROJECT_REF` - Supabase project reference
- `VERCEL_TOKEN` - Vercel deployment token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Vercel Configuration
1. Connect repository to Vercel
2. Set build command: `cd ../.. && pnpm run build --filter=@agentmesh/front`
3. Set install command: `cd ../.. && pnpm install --frozen-lockfile`
4. Configure environment variables for Production and Preview

## Security Considerations

### Client-Side Safety
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code
- Use `NEXT_PUBLIC_*` variables only for client-safe values
- Validate all environment variables in CI/CD

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies enforce tenant isolation
- Anonymous users have limited access
- Service role has elevated permissions (server-only)

### Database Security
- Use connection pooling for production
- Rotate service role keys regularly
- Monitor for policy violations
- Enable audit logging

## Rollback Procedures

### Application Rollback
1. Revert to previous commit
2. Trigger deployment pipeline
3. Verify health checks pass

### Database Rollback
1. Identify problematic migration
2. Create rollback migration
3. Deploy rollback migration
4. Verify data integrity

### Emergency Procedures
1. Disable auto-deployments
2. Revert to last known good state
3. Investigate root cause
4. Fix issues before re-enabling deployments

## Monitoring & Alerts

### Health Checks
- Application availability
- Database connectivity
- API endpoint responses
- Environment variable validation

### Performance Monitoring
- Build times
- Deployment duration
- Database query performance
- API response times

### Security Monitoring
- Failed authentication attempts
- Policy violations
- Unusual access patterns
- Environment variable leaks

## Performance & Security Checks

### Bundle Size Budgets

| Type | Warning | Failure | Bypass |
|------|---------|---------|--------|
| Client Bundle | 250 KB | 400 KB | Add `perf-check` label to PR |
| Serverless Bundle | 1.2 MB | 1.5 MB | Add `perf-check` label to PR |
| Edge Bundle | 1.2 MB | 1.5 MB | Add `perf-check` label to PR |

### Database Performance Budgets

| Metric | Warning | Failure | Bypass |
|--------|---------|---------|--------|
| Query P95 | 300 ms | 500 ms | Add `perf-check` label to PR |
| Query P99 | 500 ms | 1000 ms | Add `perf-check` label to PR |

### Security Checks

| Check | Failure Condition | Bypass |
|-------|------------------|--------|
| Secrets Scan | Any SERVICE_ROLE detected | Add `security-review` label to PR |
| Security Audit | High/Critical vulnerabilities | Add `security-review` label to PR |
| RLS Smoke Test | Any policy violations | Add `security-review` label to PR |

### Bypassing Budgets

To bypass performance or security budgets:

1. **Add appropriate label to PR:**
   - `perf-check` - Bypass performance budgets
   - `security-review` - Bypass security checks

2. **Provide justification in PR description:**
   - Explain why the budget should be exceeded
   - Provide timeline for optimization
   - Include monitoring plan

3. **Get approval from:**
   - Team lead for performance budgets
   - Security team for security bypasses

### Emergency Bypass

For critical issues requiring immediate deployment:

1. **Create hotfix branch:**
   ```bash
   git checkout -b hotfix/critical-fix
   ```

2. **Add emergency bypass comment:**
   ```
   EMERGENCY_BYPASS: [reason]
   - Performance: [justification]
   - Security: [justification]
   - Timeline: [when will be fixed]
   ```

3. **Deploy with approval:**
   - Requires team lead approval
   - Monitor closely after deployment
   - Fix issues within 24 hours

## Troubleshooting

### Common Issues

#### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are installed
- Check for TypeScript errors
- Validate Prisma schema

#### Database Issues
- Verify connection string format
- Check migration status
- Validate RLS policies
- Test with service role client

#### Deployment Issues
- Check Vercel build logs
- Verify environment variables
- Test locally first
- Check for memory/timeout issues

#### RLS Policy Issues
- Test with both anon and service clients
- Verify tenant isolation
- Check policy syntax
- Test edge cases

### Getting Help
1. Check CI/CD logs for errors
2. Run health checks locally
3. Verify environment configuration
4. Check Supabase dashboard for issues
5. Review Vercel deployment logs