# Disaster Recovery Plan

Comprehensive disaster recovery and business continuity procedures for ORCA Platform.

---

## Executive Summary

**RPO (Recovery Point Objective)**: ≤1 hour (max acceptable data loss)  
**RTO (Recovery Time Objective)**: ≤4 hours (max acceptable downtime)

**Last Tested**: [Quarterly DR drill date]  
**Next Test**: [Scheduled date]

---

## 1. Backup Strategy

### Automated Backups

**Database** (`scripts/backup_db.sh`):
- **Frequency**: Every 6 hours
- **Retention**: 90 days local, 7 years S3 Glacier
- **Format**: pg_dump custom format, gzip compressed, GPG encrypted
- **Storage**: Local disk + S3 (multi-region replication)
- **Verification**: Automated restore test daily

**File Storage**:
- **Frequency**: Continuous (S3 versioning)
- **Retention**: 90 days (versions), 30 days (deleted)
- **Storage**: S3 with cross-region replication

**Configuration**:
- **Frequency**: On every change (git commits)
- **Retention**: Indefinite (git history)
- **Storage**: GitHub + S3 config backups

**Secrets**:
- **Frequency**: On change
- **Retention**: Latest + 3 versions
- **Storage**: Supabase Vault (encrypted)

### Backup Verification

**Daily Automated Test** (`scripts/verify_restore.ts`):
1. Select most recent backup
2. Create test database
3. Restore backup
4. Validate record counts
5. Check referential integrity
6. Calculate checksums
7. Compare to baseline
8. Drop test database
9. Generate report

**Quarterly Full DR Drill**:
1. Simulate complete region failure
2. Restore from backup to new region
3. Validate full functionality
4. Measure RTO achieved
5. Document lessons learned
6. Update runbooks

---

## 2. Disaster Scenarios

### Scenario A: Database Corruption/Loss

**Detection**:
- Health check failures
- Query errors
- Replication lag alerts
- Data integrity violations

**Recovery Procedure**:

1. **Assess Damage** (5 min)
   ```bash
   # Check database status
   psql -c "SELECT * FROM pg_stat_database;"
   
   # Check replication lag
   psql -c "SELECT * FROM pg_stat_replication;"
   ```

2. **Failover to Replica** (10 min)
   ```bash
   # Promote read replica to primary
   aws rds promote-read-replica --db-instance-identifier orca-replica-1
   
   # Update connection strings
   kubectl set env deployment/orca-api DATABASE_URL=${NEW_PRIMARY_URL}
   ```

3. **Restore from Backup if Needed** (60-120 min)
   ```bash
   # Find latest clean backup
   aws s3 ls s3://orca-backups/production/ | tail -n 10
   
   # Download and decrypt
   aws s3 cp s3://orca-backups/production/orca_20250130_120000.sql.gz.gpg .
   gpg --decrypt orca_20250130_120000.sql.gz.gpg | gunzip > restore.sql
   
   # Restore
   pg_restore -d orca_recovery restore.sql
   
   # Verify
   npm run smoke:test
   ```

4. **Verify Data Integrity** (15 min)
   ```bash
   npm run scripts/verify_restore.ts
   ```

**RPO Achieved**: 6 hours (last backup)  
**RTO Achieved**: 2 hours (failover + verification)

---

### Scenario B: Complete Region Outage

**Detection**:
- All health checks failing
- AWS status page shows region issues
- No response from any service

**Recovery Procedure**:

1. **Declare Disaster** (5 min)
   - Page on-call engineer
   - Notify stakeholders
   - Activate DR team

2. **Spin Up DR Region** (30 min)
   ```bash
   # Deploy infrastructure in DR region
   cd terraform/
   terraform workspace select dr-region
   terraform apply -var="enable_dr=true"
   
   # Deploy application
   kubectl config use-context orca-dr
   kubectl apply -f k8s/
   ```

3. **Restore Data** (60-90 min)
   ```bash
   # Download latest backup from S3
   aws s3 cp s3://orca-backups-dr/production/latest.sql.gz.gpg . \
     --region us-west-2
   
   # Restore to DR database
   ./scripts/restore_to_dr.sh latest.sql.gz.gpg
   ```

4. **Update DNS** (15 min)
   ```bash
   # Point DNS to DR region
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123456 \
     --change-batch file://dr-dns-update.json
   ```

5. **Verify and Monitor** (30 min)
   ```bash
   npm run smoke:test
   npm run e2e:assert
   
   # Watch metrics
   open https://grafana.orca-dr.example/d/disaster-recovery
   ```

**RPO Achieved**: 6 hours (cross-region backup replication)  
**RTO Achieved**: 3 hours (infrastructure + data + DNS)

---

### Scenario C: Ransomware/Data Breach

**Detection**:
- Unusual encryption activity
- Mass file modifications
- Security alerts (IDS/IPS)
- User reports of inaccessible data

**Recovery Procedure**:

1. **Immediate Isolation** (5 min)
   ```bash
   # Disable all access
   kubectl scale deployment orca-api --replicas=0
   
   # Revoke all API keys
   npm run admin:revoke-all-keys
   
   # Snapshot current state (evidence)
   aws ec2 create-snapshot --volume-id vol-123456
   ```

2. **Assess Compromise** (30 min)
   - Identify affected systems
   - Determine attack vector
   - Check audit logs
   - Engage security team

3. **Restore from Clean Backup** (90-120 min)
   ```bash
   # Find last known clean backup (before attack)
   # Review backup metadata and audit logs
   
   # Restore to isolated environment
   ./scripts/restore_to_isolated.sh backup-pre-attack.sql.gz.gpg
   
   # Verify no malware/backdoors
   npm run security:scan
   ```

4. **Rebuild Infrastructure** (120-180 min)
   ```bash
   # Tear down potentially compromised infrastructure
   terraform destroy
   
   # Rebuild from scratch with hardened configs
   terraform apply -var="security_mode=high"
   
   # Deploy application
   kubectl apply -f k8s/
   ```

5. **Restore Data and Resume** (60 min)
   ```bash
   # Migrate clean data to new infrastructure
   ./scripts/migrate_clean_data.sh
   
   # Rotate all secrets
   npm run admin:rotate-all-secrets
   
   # Re-enable access (gradually)
   kubectl scale deployment orca-api --replicas=1
   ```

**RPO Achieved**: Varies (depends on when attack detected)  
**RTO Achieved**: 6-8 hours (isolation + rebuild + verification)

---

## 3. Data Recovery Priorities

| Priority | System | RPO | RTO | Notes |
|----------|--------|-----|-----|-------|
| P0 | User authentication | 1h | 1h | Critical - blocks all access |
| P0 | Workflow definitions | 1h | 2h | Core business data |
| P0 | Agent registry | 1h | 2h | Required for operations |
| P1 | UADSI reports | 6h | 4h | Business intelligence |
| P1 | Audit logs | 24h | 8h | Compliance required |
| P2 | Usage analytics | 7d | 24h | Non-critical |
| P2 | Support tickets | 7d | 24h | Can operate without |

---

## 4. Communication Plan

### Internal

**Initial Alert** (within 5 minutes):
- Slack: `#incidents` channel
- Email: engineering@orca, leadership@orca
- Phone: On-call engineer

**Status Updates** (every 30 minutes):
- Slack: Progress updates
- Status page: Public-facing status
- Stakeholder calls: Critical incidents

**Resolution Notification**:
- All-hands email
- Post-mortem scheduled
- Lessons learned doc

### External

**Customer Notification**:
- Status page update (within 15 min)
- Email to affected customers (within 1 hour)
- In-app notification (when service restored)

**Template**:
```
Subject: [RESOLVED] ORCA Platform Incident - [Date]

We experienced a service disruption from [start time] to [end time] UTC.

Impact: [Description]
Root Cause: [Brief explanation]
Resolution: Service fully restored.
Preventive Measures: [Actions being taken]

We apologize for the inconvenience.
Status: https://status.orca.example
```

---

## 5. Runbook References

| Incident Type | Runbook | Owner |
|---------------|---------|-------|
| Database failure | `incident/RUNBOOKS/database_failure.md` | DBA |
| Region outage | `incident/RUNBOOKS/region_failover.md` | SRE |
| Ransomware | `incident/RUNBOOKS/security_breach.md` | Security |
| Data corruption | `incident/RUNBOOKS/data_integrity.md` | DBA |
| Backup restore | `incident/RUNBOOKS/restore_procedure.md` | SRE |

---

## 6. Testing & Validation

### Monthly Tests
- [ ] Backup restoration (automated daily + manual review)
- [ ] Failover to replica (automated)
- [ ] Alert escalation (manual test)

### Quarterly Tests
- [ ] Full DR drill (simulate region outage)
- [ ] Ransomware recovery drill
- [ ] Cross-functional tabletop exercise
- [ ] Update and review DR plan

### Annual Tests
- [ ] External audit of DR procedures
- [ ] Compliance verification (SOC 2)
- [ ] Business continuity plan update

**Test Results Log**: `docs/DR_TEST_RESULTS.md`

---

## 7. Post-Incident Procedures

### Immediate (0-24 hours)
1. Verify all systems operational
2. Monitor for secondary failures
3. Collect incident timeline
4. Preserve logs and evidence

### Short-term (24-72 hours)
1. Conduct post-mortem meeting
2. Write incident report
3. Identify root cause
4. Document lessons learned
5. Create action items

### Long-term (1-4 weeks)
1. Implement preventive measures
2. Update runbooks
3. Conduct training if needed
4. Share learnings with team
5. Update DR plan if needed

**Post-Mortem Template**: `incident/POST_MORTEM_TEMPLATE.md`

---

## 8. Contact Information

| Role | Primary | Secondary | Phone |
|------|---------|-----------|-------|
| **Incident Commander** | SRE Lead | Engineering Manager | [Phone] |
| **DBA** | Database Admin | Sr. Engineer | [Phone] |
| **Security** | CISO | Security Engineer | [Phone] |
| **Comms** | Customer Success | Marketing | [Phone] |
| **Executive** | CTO | CEO | [Phone] |

**Escalation Policy**: `incident/ESCALATION_POLICY.yaml`

---

## 9. Key Metrics

### Current State
- **Last Backup**: [Auto-populated]
- **Last Verified Restore**: [Auto-populated]
- **Backup Success Rate**: 99.8% (last 30 days)
- **Average Backup Size**: 2.3 GB
- **Average Restore Time**: 45 minutes

### SLA Targets
- **Backup Success Rate**: ≥99.5%
- **Restore Verification**: Daily
- **RTO**: ≤4 hours (P0 incidents)
- **RPO**: ≤1 hour (P0 data)

---

## 10. Resources

**Scripts**:
- [backup_db.sh](../scripts/backup_db.sh) - Database backup automation
- [verify_restore.ts](../scripts/verify_restore.ts) - Restore verification
- [restore_to_dr.sh](../scripts/restore_to_dr.sh) - DR region restore

**Monitoring**:
- Backup dashboard: https://grafana.orca.example/d/backups
- DR readiness: https://grafana.orca.example/d/dr-readiness

**External**:
- AWS Support: 1-800-XXX-XXXX (Premium Support)
- Supabase Support: support@supabase.com
- PagerDuty: https://orca.pagerduty.com

**Documentation**:
- AWS RDS DR: https://docs.aws.amazon.com/rds/latest/userguide/disaster-recovery.html
- Postgres Backup: https://www.postgresql.org/docs/current/backup.html
- Kubernetes DR: https://kubernetes.io/docs/tasks/administer-cluster/disaster-recovery/

---

**Document Owner**: SRE Team  
**Last Updated**: 2025-10-30  
**Next Review**: 2026-01-30
