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
# Run smoke tests
node scripts/healthcheck.js

# Run RLS policy tests
node scripts/supabase-policy-smoke/index.js
```

## CI/CD Pipeline

### Pull Request Flow
1. **Lint & Type Check** - Code quality validation
2. **Test** - Unit and integration tests
3. **Prisma Validation** - Schema validation and migration status
4. **Build** - Compile all packages
5. **Deploy Preview** - Deploy to Vercel preview environment
6. **Smoke Tests** - Validate preview deployment

### Main Branch Flow
1. **Lint & Type Check** - Code quality validation
2. **Test** - Unit and integration tests
3. **Prisma Validation** - Schema validation and migration status
4. **Build** - Compile all packages
5. **Deploy Production** - Deploy to Vercel production
6. **Deploy Supabase** - Deploy migrations and edge functions
7. **Smoke Tests** - Validate production deployment

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