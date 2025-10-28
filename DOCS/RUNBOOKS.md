# Incident Response & Operational Runbooks

This document provides step-by-step procedures for common operational tasks, incident response, and system maintenance.

## Table of Contents

1. [Incident Response](#incident-response)
2. [Database Operations](#database-operations)
3. [Deployment Procedures](#deployment-procedures)
4. [Security Incidents](#security-incidents)
5. [Performance Issues](#performance-issues)
6. [Cost Management](#cost-management)
7. [Backup & Recovery](#backup--recovery)

## Incident Response

### Severity Levels

- **P0 - Critical**: Complete service outage, data loss, security breach
- **P1 - High**: Major feature broken, significant performance degradation
- **P2 - Medium**: Minor feature issues, moderate performance impact
- **P3 - Low**: Cosmetic issues, minor bugs

### Incident Response Process

#### 1. Initial Response (0-15 minutes)

```bash
# 1. Check service status
curl -f https://your-app.vercel.app/api/health

# 2. Check recent deployments
gh run list --limit 10

# 3. Check error logs
vercel logs --follow

# 4. Check database status
pnpm run db:status
```

#### 2. Assessment (15-30 minutes)

```bash
# 1. Run health checks
pnpm run health:check

# 2. Check RLS policies
pnpm run rls:smoke

# 3. Analyze performance
pnpm run db:performance

# 4. Check cost metrics
pnpm run cost:guard
```

#### 3. Resolution (30+ minutes)

- Implement hotfix if needed
- Rollback if necessary
- Monitor recovery
- Document incident

### Common Incident Scenarios

#### Service Outage

1. **Check Vercel Status**
   ```bash
   # Check Vercel dashboard
   open https://vercel.com/dashboard
   
   # Check function logs
   vercel logs --follow
   ```

2. **Check Database Connectivity**
   ```bash
   # Test database connection
   pnpm run db:status
   
   # Check Supabase status
   open https://status.supabase.com
   ```

3. **Rollback if Necessary**
   ```bash
   # Rollback to previous deployment
   vercel rollback
   
   # Or rollback specific commit
   vercel rollback <deployment-url>
   ```

#### Database Issues

1. **Check Migration Status**
   ```bash
   pnpm run db:status
   ```

2. **Run Migrations if Needed**
   ```bash
   pnpm run db:deploy
   ```

3. **Check Query Performance**
   ```bash
   pnpm run db:performance
   ```

#### Performance Degradation

1. **Check Bundle Sizes**
   ```bash
   pnpm run bundle:analyze
   ```

2. **Check Database Performance**
   ```bash
   pnpm run db:performance
   ```

3. **Check API Response Times**
   ```bash
   # Use health check endpoint
   curl -w "@curl-format.txt" -o /dev/null -s https://your-app.vercel.app/api/health
   ```

## Database Operations

### Migration Management

#### Deploy Migrations

```bash
# Deploy to production
pnpm run db:deploy

# Check migration status
pnpm run db:status

# Generate new migration
pnpm run db:migrate
```

#### Rollback Migrations

```bash
# Rollback last migration
npx prisma migrate reset

# Rollback to specific migration
npx prisma migrate resolve --rolled-back <migration-name>
```

#### Database Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
psql $DATABASE_URL < backup_file.sql
```

### Row Level Security (RLS)

#### Test RLS Policies

```bash
# Run RLS smoke tests
pnpm run rls:smoke

# Check specific table policies
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE tablename = 'agents';"
```

#### Fix RLS Issues

1. **Check Policy Definitions**
   ```sql
   -- List all policies
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies;
   ```

2. **Test Anonymous Access**
   ```bash
   # Test with anonymous key
   curl -H "Authorization: Bearer $ANON_KEY" \
        https://your-project.supabase.co/rest/v1/agents
   ```

3. **Test Service Role Access**
   ```bash
   # Test with service role key
   curl -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        https://your-project.supabase.co/rest/v1/agents
   ```

## Deployment Procedures

### Standard Deployment

1. **Pre-deployment Checks**
   ```bash
   # Run all checks
   pnpm run lint
   pnpm run type-check
   pnpm run test
   pnpm run bundle:analyze
   pnpm run secrets:scan
   ```

2. **Deploy to Preview**
   ```bash
   # Create PR (triggers preview deployment)
   gh pr create --title "Feature: Description"
   ```

3. **Deploy to Production**
   ```bash
   # Merge to main (triggers production deployment)
   gh pr merge <pr-number>
   ```

### Emergency Deployment

1. **Create Hotfix Branch**
   ```bash
   git checkout -b hotfix/issue-description
   ```

2. **Make Changes**
   ```bash
   # Make minimal changes
   git add .
   git commit -m "hotfix: description"
   ```

3. **Deploy Directly**
   ```bash
   # Deploy to Vercel
   vercel --prod
   
   # Run database migrations if needed
   pnpm run db:deploy
   ```

### Rollback Procedures

#### Vercel Rollback

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>

# Rollback to previous deployment
vercel rollback
```

#### Database Rollback

```bash
# Check migration history
pnpm run db:status

# Rollback specific migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or reset to specific state
npx prisma migrate reset --to <migration-name>
```

## Security Incidents

### Suspected Security Breach

1. **Immediate Response**
   ```bash
   # Rotate all secrets immediately
   # Check for unauthorized access
   # Review audit logs
   ```

2. **Investigation**
   ```bash
   # Check access logs
   # Review database queries
   # Analyze error patterns
   ```

3. **Containment**
   ```bash
   # Disable compromised accounts
   # Revoke suspicious tokens
   # Update security policies
   ```

### Secret Leakage

1. **Detect Leakage**
   ```bash
   # Run secrets scan
   pnpm run secrets:scan
   ```

2. **Immediate Actions**
   ```bash
   # Rotate leaked secrets
   # Update environment variables
   # Check git history
   ```

3. **Prevention**
   ```bash
   # Update .gitignore
   # Add pre-commit hooks
   # Review CI/CD processes
   ```

## Performance Issues

### High Response Times

1. **Identify Bottlenecks**
   ```bash
   # Check database performance
   pnpm run db:performance
   
   # Analyze bundle sizes
   pnpm run bundle:analyze
   ```

2. **Optimize Queries**
   ```sql
   -- Add indexes for slow queries
   CREATE INDEX CONCURRENTLY idx_agents_tenant_status 
   ON agents(tenant_id, status);
   ```

3. **Optimize Bundles**
   ```bash
   # Use dynamic imports
   # Split vendor chunks
   # Remove unused dependencies
   ```

### High Error Rates

1. **Check Error Logs**
   ```bash
   # Vercel logs
   vercel logs --follow
   
   # Supabase logs
   # Check Supabase dashboard
   ```

2. **Identify Root Cause**
   ```bash
   # Check recent deployments
   # Review configuration changes
   # Analyze error patterns
   ```

3. **Implement Fix**
   ```bash
   # Deploy hotfix
   # Update configuration
   # Monitor recovery
   ```

## Cost Management

### Cost Monitoring

```bash
# Run cost guard
pnpm run cost:guard

# Check Vercel usage
# Check Supabase usage
```

### Cost Optimization

1. **Bundle Optimization**
   ```bash
   # Reduce bundle sizes
   pnpm run bundle:analyze
   ```

2. **Database Optimization**
   ```bash
   # Optimize queries
   pnpm run db:performance
   ```

3. **Resource Optimization**
   ```bash
   # Review function usage
   # Optimize caching
   # Remove unused resources
   ```

### Cost Alerts

- Set up Vercel usage alerts
- Monitor Supabase usage
- Track function invocations
- Review monthly costs

## Backup & Recovery

### Database Backup

#### Automated Backups

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > "backup_${DATE}.sql"
aws s3 cp "backup_${DATE}.sql" s3://your-backup-bucket/
```

#### Manual Backup

```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Compress backup
gzip backup.sql

# Store backup securely
aws s3 cp backup.sql.gz s3://your-backup-bucket/
```

### Recovery Procedures

#### Point-in-Time Recovery

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql

# Or restore specific tables
psql $DATABASE_URL -c "\\copy agents FROM 'agents_backup.csv' CSV HEADER;"
```

#### Full System Recovery

1. **Restore Database**
   ```bash
   # Restore from latest backup
   psql $DATABASE_URL < latest_backup.sql
   ```

2. **Redeploy Application**
   ```bash
   # Deploy from main branch
   vercel --prod
   ```

3. **Verify Recovery**
   ```bash
   # Run health checks
   pnpm run health:check
   
   # Run smoke tests
   pnpm run rls:smoke
   ```

## Key Rotation

### API Keys

1. **Generate New Keys**
   ```bash
   # Generate new Supabase keys
   # Generate new Vercel tokens
   # Generate new GitHub tokens
   ```

2. **Update Environment Variables**
   ```bash
   # Update Vercel environment variables
   vercel env add NEW_KEY_NAME
   
   # Update GitHub secrets
   gh secret set NEW_SECRET_NAME
   ```

3. **Deploy Changes**
   ```bash
   # Deploy with new keys
   vercel --prod
   ```

4. **Revoke Old Keys**
   ```bash
   # Revoke old keys from respective dashboards
   # Update documentation
   ```

### Database Credentials

1. **Update Database URL**
   ```bash
   # Update in Vercel
   vercel env add DATABASE_URL
   
   # Update in GitHub
   gh secret set DATABASE_URL
   ```

2. **Test Connection**
   ```bash
   # Test new connection
   pnpm run db:status
   ```

3. **Deploy Changes**
   ```bash
   # Deploy with new credentials
   vercel --prod
   ```

## Monitoring & Alerting

### Health Monitoring

- **Endpoint**: `/api/health`
- **Frequency**: Every 5 minutes
- **Alerts**: Email/Slack on failures

### Performance Monitoring

- **Bundle Sizes**: CI/CD pipeline
- **Database Performance**: Daily checks
- **API Response Times**: Continuous monitoring

### Cost Monitoring

- **Daily Cost Reports**: Automated
- **Threshold Alerts**: Email notifications
- **Monthly Reviews**: Team meetings

## Emergency Contacts

- **On-call Engineer**: [Contact Info]
- **Team Lead**: [Contact Info]
- **DevOps Engineer**: [Contact Info]
- **Security Team**: [Contact Info]

## Escalation Procedures

1. **P0 Issues**: Immediate escalation to on-call
2. **P1 Issues**: Escalate within 1 hour
3. **P2 Issues**: Escalate within 4 hours
4. **P3 Issues**: Escalate within 24 hours

## Post-Incident Review

1. **Document Incident**
   - Timeline of events
   - Root cause analysis
   - Resolution steps
   - Lessons learned

2. **Update Runbooks**
   - Add new procedures
   - Update existing steps
   - Improve documentation

3. **Prevent Recurrence**
   - Implement monitoring
   - Add automated checks
   - Update processes