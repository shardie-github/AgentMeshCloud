# ORCA Disaster Recovery Playbook

**RPO: < 15 minutes | RTO: < 5 minutes**

---

## Overview

This playbook defines disaster recovery procedures for ORCA production infrastructure, covering database restoration, service failover, and data integrity validation.

---

## DR Objectives

| Metric | Target | Acceptable |
|--------|--------|------------|
| **RPO** (Recovery Point Objective) | < 15 min | < 30 min |
| **RTO** (Recovery Time Objective) | < 5 min | < 15 min |
| **Data Loss** | 0% | < 0.01% |
| **Availability** | 99.99% | 99.9% |

---

## Disaster Scenarios

### Scenario 1: Database Failure

**Symptoms:**
- Database connection errors
- Query timeouts
- Data corruption
- Complete Supabase outage

**Response:**

1. **Immediate (0-2 min)**
   ```bash
   # Verify outage
   pnpm run health:check
   
   # Check Supabase status
   curl https://status.supabase.com/api/v2/status.json
   
   # Enable degraded mode (cache-only)
   vercel env add DEGRADED_MODE true production
   ```

2. **Restore from Backup (2-5 min)**
   ```bash
   # List available backups
   supabase db backups list
   
   # Restore latest backup
   supabase db restore --backup-id=<latest-id>
   
   # Verify restoration
   pnpm run db:status
   ```

3. **Validation (5-10 min)**
   ```bash
   # Run integrity checks
   pnpm run dr:check
   
   # Verify trust scores
   curl https://orca-mesh.io/api/trust
   
   # Check data freshness
   pnpm run slo:check
   ```

4. **Resume Normal Operations**
   ```bash
   # Disable degraded mode
   vercel env rm DEGRADED_MODE production
   
   # Monitor for 30 minutes
   pnpm run slo:check --continuous
   ```

---

### Scenario 2: Vercel Deployment Failure

**Symptoms:**
- 5xx errors on all endpoints
- Deployment build failures
- CDN issues

**Response:**

1. **Rollback Immediately**
   ```bash
   pnpm tsx release/rollback.ts --reason="Vercel deployment failure"
   ```

2. **Verify Previous Deployment**
   ```bash
   # Check health on previous deployment
   curl https://orca-mesh.io/health
   
   # Run smoke tests
   pnpm run smoke:test
   ```

3. **Investigate Root Cause**
   - Check Vercel build logs
   - Review deployment diff
   - Verify environment variables

---

### Scenario 3: Complete Regional Outage

**Symptoms:**
- All services unreachable
- DNS resolution failures
- Multiple provider outages

**Response:**

1. **Activate DR Region** (if multi-region)
   ```bash
   # Update DNS to failover region
   # (Manual DNS change or automated failover)
   
   # Verify failover region health
   curl https://dr.orca-mesh.io/health
   ```

2. **Communicate Outage**
   ```bash
   # Post status update
   # Update https://status.orca-mesh.io
   
   # Notify customers via email/Slack
   ```

3. **Monitor Recovery**
   - Track primary region status
   - Prepare failback plan
   - Document incident timeline

---

### Scenario 4: Data Corruption

**Symptoms:**
- Incorrect trust scores
- Missing agent data
- Inconsistent KPIs

**Response:**

1. **Isolate Corrupted Data**
   ```bash
   # Identify affected tables
   psql $DATABASE_URL -c "SELECT * FROM agents WHERE updated_at > NOW() - INTERVAL '1 hour'"
   
   # Export affected data
   pg_dump -t agents > corrupted_agents.sql
   ```

2. **Restore from Backup**
   ```bash
   # Restore specific tables
   supabase db restore --backup-id=<id> --table=agents
   
   # Or point-in-time recovery
   supabase db restore --point-in-time="2025-10-31 10:00:00"
   ```

3. **Validate Restoration**
   ```bash
   # Run data integrity checks
   pnpm run db:integrity-check
   
   # Recalculate trust scores
   pnpm run trust:recalculate
   ```

---

## Backup Strategy

### Automated Backups

**Frequency:**
- Continuous WAL archiving (point-in-time recovery)
- Full snapshot every 6 hours
- Pre-deployment snapshots

**Retention:**
- 7 days: All snapshots
- 30 days: Daily snapshots
- 1 year: Monthly snapshots

**Storage:**
- Primary: Supabase automated backups
- Secondary: S3 cross-region replication

### Manual Backups

```bash
# Pre-deployment backup
./scripts/supabase_backup_now.sh

# Emergency backup
supabase db dump -f emergency_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Restoration Procedures

### Full Database Restore

```bash
# 1. Stop application (prevent writes)
vercel env add MAINTENANCE_MODE true production

# 2. Restore database
supabase db restore --backup-id=<backup-id>

# 3. Verify restoration
psql $DATABASE_URL -c "SELECT COUNT(*) FROM agents;"
psql $DATABASE_URL -c "SELECT MAX(updated_at) FROM trust_scores;"

# 4. Resume application
vercel env rm MAINTENANCE_MODE production

# 5. Validate
pnpm run dr:check
```

### Partial Table Restore

```bash
# 1. Export corrupted table
pg_dump -t corrupted_table > backup.sql

# 2. Drop corrupted table
psql $DATABASE_URL -c "DROP TABLE corrupted_table;"

# 3. Restore from backup
pg_restore -t corrupted_table backup.sql

# 4. Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM corrupted_table;"
```

### Point-in-Time Recovery

```bash
# Restore to specific timestamp
supabase db restore --point-in-time="2025-10-31 14:30:00"

# Verify data at that point in time
psql $DATABASE_URL -c "SELECT * FROM agents WHERE updated_at <= '2025-10-31 14:30:00';"
```

---

## Data Integrity Validation

### Post-Restore Checks

```bash
# 1. Row counts
psql $DATABASE_URL -c "
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
"

# 2. Foreign key constraints
psql $DATABASE_URL -c "
SELECT 
  conname,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE contype = 'f';
"

# 3. Trust score consistency
curl https://orca-mesh.io/api/trust | jq '.trustScore'

# 4. Data freshness
pnpm run slo:check
```

---

## Communication Plan

### Internal

**Immediate (0-5 min):**
- Slack #orca-incidents
- Page on-call engineer
- Alert exec team

**Updates (every 15 min):**
- Status in #orca-incidents
- ETA for resolution
- Impact assessment

### External

**Status Page:**
- Update https://status.orca-mesh.io
- Set status: "Major Outage" or "Partial Outage"
- Provide ETR (Estimated Time to Resolution)

**Customer Communication:**
- Email critical customers
- Post on Twitter/LinkedIn (if major)
- Update in-app banner

---

## Testing Schedule

### Monthly DR Drill

- [ ] Restore from latest backup
- [ ] Verify data integrity
- [ ] Measure RTO/RPO
- [ ] Document findings
- [ ] Update playbook

### Quarterly Full Failover

- [ ] Complete regional failover
- [ ] Validate all services
- [ ] Test communication plan
- [ ] Executive review

### Annual Chaos Day

- [ ] Multiple simultaneous failures
- [ ] Multi-region outage simulation
- [ ] Complete DR procedure execution
- [ ] Board-level review

---

## Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| **On-Call Engineer** | Rotation | +1-XXX-XXX-XXXX | oncall@orca-mesh.io |
| **SRE Lead** | [Name] | +1-XXX-XXX-XXXX | sre@orca-mesh.io |
| **CTO** | [Name] | +1-XXX-XXX-XXXX | cto@orca-mesh.io |
| **Supabase Support** | — | — | support@supabase.com |
| **Vercel Support** | — | — | support@vercel.com |

---

## Post-Incident Review

### Within 24 Hours

- [ ] Timeline of events
- [ ] Root cause analysis
- [ ] Actions taken
- [ ] RTO/RPO achieved
- [ ] Data loss assessment

### Within 48 Hours

- [ ] Post-mortem document
- [ ] Lessons learned
- [ ] Action items assigned
- [ ] Playbook updates

### Within 1 Week

- [ ] Executive summary
- [ ] Customer communication
- [ ] Process improvements
- [ ] Training updates

---

**Last Updated:** 2025-10-31  
**Next Review:** 2025-11-30  
**Owner:** SRE Team
