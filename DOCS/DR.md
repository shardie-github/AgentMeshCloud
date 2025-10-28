# Disaster Recovery

This document outlines the disaster recovery procedures, backup/restore processes, and recovery time objectives for the AgentMesh Cloud platform.

## Recovery Objectives

### RTO (Recovery Time Objective)
- **Critical Systems**: 15 minutes
- **Non-Critical Systems**: 1 hour
- **Full Platform**: 4 hours

### RPO (Recovery Point Objective)
- **Database**: 5 minutes (PITR enabled)
- **File Storage**: 1 hour
- **Configuration**: Real-time

## Backup Strategy

### 1. Database Backups
- **Type**: Point-in-Time Recovery (PITR)
- **Frequency**: Continuous
- **Retention**: 30 days
- **Location**: Supabase managed backups
- **Verification**: Monthly restore tests

### 2. Application Backups
- **Type**: Git repository + build artifacts
- **Frequency**: Every deployment
- **Retention**: Indefinite
- **Location**: GitHub + Vercel
- **Verification**: Automated CI/CD

### 3. Configuration Backups
- **Type**: Environment variables + secrets
- **Frequency**: On change
- **Retention**: 90 days
- **Location**: GitHub Secrets + Vercel
- **Verification**: Access audit logs

## Recovery Procedures

### 1. Database Recovery

#### Full Database Restore
```bash
# 1. Identify restore point
psql $DATABASE_URL -c "SELECT * FROM pg_stat_archiver ORDER BY archived_at DESC LIMIT 10;"

# 2. Restore from PITR
# (Handled by Supabase dashboard or API)

# 3. Verify restore
pnpm run dr:check --shadow-db=$RESTORED_DB_URL --source-db=$PROD_DB_URL

# 4. Update application
vercel env add DATABASE_URL $RESTORED_DB_URL
```

#### Partial Data Recovery
```bash
# 1. Identify affected tables
psql $DATABASE_URL -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public';"

# 2. Restore specific table
pg_restore --table=agents --data-only $BACKUP_FILE $DATABASE_URL

# 3. Verify data integrity
pnpm run db:performance
```

### 2. Application Recovery

#### Complete Application Restore
```bash
# 1. Rollback to last known good deployment
vercel --prod --rollback

# 2. Verify application health
curl -f https://agentmesh.com/api/health

# 3. Check feature flags
psql $DATABASE_URL -c "SELECT * FROM config_flags WHERE enabled = true;"
```

#### Partial Application Recovery
```bash
# 1. Disable problematic features
psql $DATABASE_URL -c "UPDATE config_flags SET value = '{\"enabled\": false}' WHERE key = 'feature_problematic';"

# 2. Enable maintenance mode if needed
psql $DATABASE_URL -c "UPDATE config_flags SET value = '{\"enabled\": true, \"message\": \"Recovery in progress\"}' WHERE key = 'maintenance_mode';"

# 3. Monitor system health
pnpm run slo:check
```

### 3. Infrastructure Recovery

#### Supabase Recovery
1. **Access Supabase Dashboard**
2. **Navigate to Database > Backups**
3. **Select restore point**
4. **Initiate restore process**
5. **Verify data integrity**

#### Vercel Recovery
1. **Access Vercel Dashboard**
2. **Navigate to Deployments**
3. **Select previous deployment**
4. **Promote to production**
5. **Verify application health**

## Recovery Testing

### 1. Monthly DR Drills

#### Automated Testing
```bash
# Run monthly DR drill
pnpm run dr:check

# Check results
cat dr-restore-check-report.json
```

#### Manual Testing
1. **Create test environment**
2. **Restore from backup**
3. **Run smoke tests**
4. **Verify data integrity**
5. **Document results**

### 2. Recovery Validation

#### Data Integrity Checks
- Row count verification
- Checksum validation
- Constraint verification
- Index integrity

#### Application Health Checks
- API endpoint availability
- Database connectivity
- Feature flag functionality
- Performance metrics

## Emergency Contacts

### 1. Escalation Matrix
- **Level 1**: On-call engineer (15 min response)
- **Level 2**: Engineering manager (30 min response)
- **Level 3**: CTO (1 hour response)

### 2. Communication Channels
- **Primary**: Slack #incidents
- **Secondary**: PagerDuty
- **External**: Status page updates

### 3. External Dependencies
- **Supabase**: support@supabase.com
- **Vercel**: support@vercel.com
- **GitHub**: Enterprise support

## Recovery Scenarios

### 1. Database Corruption
1. **Detect**: Monitoring alerts
2. **Assess**: Check backup availability
3. **Restore**: Use PITR to last known good state
4. **Verify**: Run integrity checks
5. **Communicate**: Update stakeholders

### 2. Application Failure
1. **Detect**: Health check failures
2. **Assess**: Check deployment status
3. **Restore**: Rollback to previous version
4. **Verify**: Run smoke tests
5. **Communicate**: Update status page

### 3. Infrastructure Outage
1. **Detect**: Provider status page
2. **Assess**: Check alternative regions
3. **Restore**: Failover to backup region
4. **Verify**: Full system health check
5. **Communicate**: Incident updates

## Post-Recovery Procedures

### 1. Validation Checklist
- [ ] All systems operational
- [ ] Data integrity verified
- [ ] Performance within SLOs
- [ ] Security controls active
- [ ] Monitoring functional

### 2. Documentation
- [ ] Incident timeline
- [ ] Root cause analysis
- [ ] Recovery steps taken
- [ ] Lessons learned
- [ ] Process improvements

### 3. Communication
- [ ] Stakeholder notification
- [ ] Status page update
- [ ] Post-mortem meeting
- [ ] Action items assigned

## Prevention Measures

### 1. Monitoring
- **Database**: Query performance, connection pools
- **Application**: Response times, error rates
- **Infrastructure**: Resource utilization, availability

### 2. Testing
- **Backup Verification**: Monthly restore tests
- **Failover Testing**: Quarterly DR drills
- **Load Testing**: Performance validation

### 3. Documentation
- **Runbooks**: Step-by-step procedures
- **Playbooks**: Common scenarios
- **Training**: Regular team updates

## Recovery Tools

### 1. Scripts
- `scripts/clone-and-restore-check.ts`: DR validation
- `scripts/slo-checker.ts`: Health verification
- `scripts/chaos-mini.ts`: Resilience testing

### 2. Monitoring
- **Grafana**: System dashboards
- **PagerDuty**: Alert management
- **Status Page**: External communication

### 3. Automation
- **GitHub Actions**: CI/CD pipelines
- **Vercel**: Deployment automation
- **Supabase**: Database management

## Recovery Metrics

### 1. Key Indicators
- **MTTR**: Mean Time To Recovery
- **MTBF**: Mean Time Between Failures
- **Recovery Success Rate**: % of successful recoveries
- **Data Loss**: Amount of data lost during incidents

### 2. Reporting
- **Monthly**: DR drill results
- **Quarterly**: Recovery metrics review
- **Annually**: DR strategy assessment

### 3. Improvement
- **Process Updates**: Based on lessons learned
- **Tool Upgrades**: Better recovery capabilities
- **Training**: Enhanced team skills
