# Release Management

This document outlines the release management process, promotion flow, and rollback procedures for the AgentMesh Cloud platform.

## Release Flow

### 1. Trunk-Based Development

- **Main Branch**: `main` is the primary branch for production releases
- **Protection**: Main branch requires:
  - Green CI checks
  - At least 1 reviewer approval
  - Up-to-date branches
  - Conventional commit messages

### 2. Conventional Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New features (minor version bump)
- `fix`: Bug fixes (patch version bump)
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/changes
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous commit

### 3. Release Process

#### Automatic Release (via PR)
1. Create PR to `main` with conventional commits
2. CI runs release validation:
   - Builds and tests
   - Checks migration status
   - Generates version and changelog
   - Creates GitHub release
3. Merge PR triggers production deployment

#### Manual Release
1. Use GitHub Actions workflow dispatch
2. Select version bump type (patch/minor/major)
3. Follows same validation process

### 4. Promotion Gates

#### Preview Environment
- **Trigger**: All PRs automatically deploy to preview
- **URL**: `https://preview.agentmesh.com`
- **Purpose**: Testing and validation

#### Production Environment
- **Trigger**: Manual promotion after PR merge
- **Requirements**:
  - All CI checks passed
  - Migration gates passed
  - SLO checks in budget
  - Manual approval

### 5. Migration Gates

#### EMC Pattern
- **Expand**: Add nullable columns, views
- **Migrate**: Backfill data in chunks
- **Contract**: Remove old columns after verification

#### Migration Process
1. Create migration with EMC comments
2. CI detects pending migrations
3. Run backfill script if needed
4. Verify data integrity
5. Proceed with deployment

## Rollback Procedures

### 1. Vercel Rollback
```bash
# Rollback to previous deployment
vercel --prod --rollback

# Or promote specific deployment
vercel --prod --confirm <deployment-url>
```

### 2. Database Rollback
```bash
# Check migration status
pnpm run db:status

# Rollback specific migration
npx prisma migrate resolve --rolled-back <migration-name>

# Or restore from backup
pnpm run dr:check --restore
```

### 3. Feature Flag Rollback
```sql
-- Disable problematic feature
UPDATE config_flags 
SET value = '{"enabled": false}' 
WHERE key = 'feature_problematic';

-- Enable maintenance mode
UPDATE config_flags 
SET value = '{"enabled": true, "message": "Rolling back deployment"}' 
WHERE key = 'maintenance_mode';
```

## Emergency Procedures

### 1. Kill Switches
- **API Kill Switch**: Disables all API endpoints
- **Database Kill Switch**: Disables database writes
- **Maintenance Mode**: Shows maintenance page

### 2. Incident Response
1. **Assess**: Determine severity and impact
2. **Communicate**: Update status page and stakeholders
3. **Mitigate**: Use kill switches or rollback
4. **Resolve**: Fix root cause
5. **Post-mortem**: Document lessons learned

### 3. Status Page
- **URL**: `https://status.agentmesh.com`
- **Updates**: Automated via CI/CD
- **Notifications**: Slack, email, webhook

## Release Artifacts

### 1. GitHub Release
- **Version Tag**: Semantic version (e.g., `v1.2.3`)
- **Changelog**: Auto-generated from conventional commits
- **Artifacts**: Bundle reports, migration summaries
- **Metadata**: Build SHA, schema hash, environment matrix

### 2. Build Artifacts
- **Frontend**: Next.js build output
- **Backend**: Compiled TypeScript
- **Database**: Migration files and schemas
- **Reports**: Bundle analysis, performance metrics

### 3. Audit Trail
- **Git History**: All changes tracked
- **CI Logs**: Build and test results
- **Deployment Logs**: Vercel and Supabase logs
- **Monitoring**: SLO metrics and alerts

## Quality Gates

### 1. Pre-deployment
- [ ] All tests passing
- [ ] Security scan clean
- [ ] Performance within SLOs
- [ ] Migration status verified
- [ ] Feature flags configured

### 2. Post-deployment
- [ ] Health checks passing
- [ ] SLO metrics stable
- [ ] Error rates normal
- [ ] Performance acceptable
- [ ] User feedback positive

### 3. Rollback Criteria
- [ ] SLO violations
- [ ] High error rates
- [ ] Performance degradation
- [ ] Security issues
- [ ] User complaints

## Monitoring and Alerting

### 1. Key Metrics
- **Availability**: 99.95% target
- **Latency**: p95 < 300ms
- **Error Rate**: < 0.1%
- **Success Rate**: > 99.9%

### 2. Alert Channels
- **Critical**: PagerDuty, Slack #alerts
- **Warning**: Slack #devops
- **Info**: Slack #releases

### 3. Dashboards
- **Grafana**: System metrics
- **Vercel**: Deployment status
- **Supabase**: Database health
- **GitHub**: CI/CD status

## Best Practices

### 1. Release Planning
- Plan releases during low-traffic periods
- Coordinate with stakeholders
- Prepare rollback plan
- Test in preview environment

### 2. Communication
- Announce releases in advance
- Update documentation
- Notify support team
- Monitor social media

### 3. Documentation
- Keep runbooks updated
- Document known issues
- Maintain troubleshooting guides
- Record lessons learned

## Troubleshooting

### Common Issues

#### 1. Migration Failures
```bash
# Check migration status
pnpm run db:status

# Run EMC migration
pnpm run migrate:emc

# Dry run first
pnpm run migrate:emc:dry
```

#### 2. Build Failures
```bash
# Check build locally
pnpm run build

# Check specific package
pnpm run build --filter=@agentmesh/front

# Check dependencies
pnpm install --frozen-lockfile
```

#### 3. Deployment Issues
```bash
# Check Vercel status
vercel ls

# Check logs
vercel logs <deployment-url>

# Check environment variables
vercel env ls
```

### Getting Help

- **Documentation**: [docs.agentmesh.com](https://docs.agentmesh.com)
- **Support**: support@agentmesh.com
- **Slack**: #devops, #releases
- **GitHub**: Create issue with `release` label
