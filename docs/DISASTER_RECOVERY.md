# ORCA Disaster Recovery Plan

**Recovery procedures for data loss and service outages**

---

## Overview

**RPO (Recovery Point Objective)**: 1 hour  
**RTO (Recovery Time Objective)**: 30 minutes

This document outlines procedures for recovering ORCA from catastrophic failures.

---

## Table of Contents

1. [Backup Strategy](#backup-strategy)
2. [Recovery Procedures](#recovery-procedures)
3. [Data Loss Scenarios](#data-loss-scenarios)
4. [Service Outage Scenarios](#service-outage-scenarios)
5. [Validation](#validation)
6. [Contacts](#contacts)

---

## Backup Strategy

### Automated Backups

**Database Backups**

- **Frequency**: Every 6 hours
- **Retention**: 30 days
- **Location**: `/backups` volume, S3 bucket
- **Method**: `pg_dump` with compression

**Configuration Backups**

- **Files**: `.env`, `policy_rules.yaml`, `mcp_registry.yaml`
- **Frequency**: On change (git commits)
- **Location**: Git repository, S3 bucket

### Backup Schedule

```
00:00 UTC - Full backup + upload to S3
06:00 UTC - Incremental backup
12:00 UTC - Incremental backup
18:00 UTC - Incremental backup
```

### Backup Verification

```bash
# List available backups
ls -lh /backups/

# Test restore (dry run)
tsx scripts/restore_latest_backup.ts --dry-run

# Automated weekly test
# CI job runs every Sunday
```

---

## Recovery Procedures

### Procedure 1: Database Restore

**When**: Database corruption, data loss, or accidental deletion

```bash
# Step 1: Stop application
docker-compose stop orca-api

# Step 2: List available backups
ls -lh /backups/

# Step 3: Restore latest backup
tsx scripts/restore_latest_backup.ts --yes

# Step 4: Verify restore
psql $DATABASE_URL -c "SELECT COUNT(*) FROM agents;"

# Step 5: Restart application
docker-compose up -d orca-api

# Step 6: Verify health
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/trust
```

**Expected Duration**: 10-15 minutes

### Procedure 2: Full Infrastructure Rebuild

**When**: Complete data center failure, cloud region outage

```bash
# Step 1: Provision new infrastructure
terraform apply -var="region=us-west-2"

# Step 2: Deploy ORCA services
docker-compose up -d

# Step 3: Wait for services to be ready
./scripts/wait-for-services.sh

# Step 4: Restore database from S3
aws s3 cp s3://orca-backups/latest.sql /tmp/
tsx scripts/restore_latest_backup.ts --file /tmp/latest.sql --yes

# Step 5: Restore configurations
aws s3 sync s3://orca-config/ /workspace/

# Step 6: Verify all services
pnpm run doctor
tsx scripts/resilience_test.ts

# Step 7: Update DNS
# Point DNS to new IP address
```

**Expected Duration**: 30-45 minutes

### Procedure 3: Point-in-Time Recovery

**When**: Need to restore to specific timestamp

```bash
# Step 1: Find backup closest to target time
ls -lh /backups/ | grep "2025-10-30"

# Step 2: Restore that backup
tsx scripts/restore_latest_backup.ts --file /backups/orca_2025-10-30T14-00.sql --yes

# Step 3: Replay WAL logs (if available)
pg_waldump /var/lib/postgresql/wal/

# Step 4: Verify data consistency
psql $DATABASE_URL -f scripts/verify_data.sql
```

**Expected Duration**: 20-30 minutes

---

## Data Loss Scenarios

### Scenario 1: Accidental Table Drop

**Problem**: Critical table dropped accidentally

**Recovery**:
```bash
# Immediate action: Stop all writes
docker-compose stop orca-api

# Restore from last good backup
tsx scripts/restore_latest_backup.ts --yes

# Verify restored table
psql $DATABASE_URL -c "SELECT COUNT(*) FROM agents;"

# Resume operations
docker-compose up -d orca-api
```

**Data Loss**: Up to 6 hours (last backup)

### Scenario 2: Database Corruption

**Problem**: Database files corrupted

**Recovery**:
```bash
# Stop database
docker-compose stop postgres

# Remove corrupted data
docker volume rm orca_postgres_data

# Recreate volume
docker volume create orca_postgres_data

# Start fresh database
docker-compose up -d postgres

# Wait for PostgreSQL
sleep 10

# Restore from backup
tsx scripts/restore_latest_backup.ts --yes
```

**Data Loss**: Up to 6 hours

### Scenario 3: Ransomware Attack

**Problem**: Files encrypted by ransomware

**Recovery**:
```bash
# DO NOT PAY RANSOM

# Isolate affected systems
# Shut down network connections

# Provision clean infrastructure
# Use terraform or cloud console

# Restore from clean backups
# Use S3 versioning to get pre-attack backup

# Scan restored data
clamscan -r /workspace

# Deploy to clean environment
# Update all passwords and API keys
```

**Data Loss**: Up to 6 hours

---

## Service Outage Scenarios

### Scenario 1: Database Connection Pool Exhausted

**Problem**: All database connections in use

**Diagnosis**:
```bash
# Check active connections
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pg_stat_activity;"
```

**Resolution**:
```bash
# Terminate idle connections
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE state = 'idle' 
  AND state_change < NOW() - INTERVAL '5 minutes';
"

# Restart application
docker-compose restart orca-api

# Increase max_connections if needed
# Edit postgresql.conf: max_connections = 200
```

### Scenario 2: OTEL Collector Down

**Problem**: Telemetry not being collected

**Diagnosis**:
```bash
docker ps | grep otel-collector
curl http://localhost:13133/
```

**Resolution**:
```bash
# Restart collector
docker-compose restart otel-collector

# Check configuration
cat otel_config.yaml

# Application continues working (telemetry optional)
# Fix OTEL without downtime
```

### Scenario 3: High Memory Usage

**Problem**: API server consuming excessive memory

**Diagnosis**:
```bash
docker stats orca-api
```

**Resolution**:
```bash
# Restart to free memory
docker-compose restart orca-api

# Check for memory leaks
node --heap-prof dist/api/server.js

# Reduce cache sizes in production
# Edit .env: CACHE_MAX_SIZE=100
```

---

## Validation

### Post-Recovery Validation

**Checklist**:

```bash
# 1. Health checks
curl http://localhost:3000/health
# Expected: {"status":"healthy"}

curl http://localhost:3000/status/readiness
# Expected: {"status":"ready", "checks":{...}}

# 2. Database integrity
psql $DATABASE_URL -c "
  SELECT 
    (SELECT COUNT(*) FROM agents) as agent_count,
    (SELECT COUNT(*) FROM policies) as policy_count,
    (SELECT COUNT(*) FROM events) as event_count;
"

# 3. Trust KPIs
curl http://localhost:3000/api/v1/trust
# Expected: {"trust_score":XX, "risk_avoided_usd":XX, ...}

# 4. End-to-end test
pnpm run e2e

# 5. Resilience test
tsx scripts/resilience_test.ts

# 6. Load test
pnpm run load:test
```

### Data Consistency Checks

```sql
-- Check for orphaned records
SELECT COUNT(*) FROM events e 
LEFT JOIN agents a ON e.agent_id = a.id 
WHERE a.id IS NULL;

-- Check trust score consistency
SELECT agent_id, trust_score 
FROM trust_scores 
WHERE trust_score < 0 OR trust_score > 100;

-- Check timestamp consistency
SELECT COUNT(*) FROM events 
WHERE created_at > NOW();
```

---

## Contacts

### On-Call Rotation

- **Primary**: oncall-primary@orca-mesh.io
- **Secondary**: oncall-secondary@orca-mesh.io
- **Manager**: engineering-manager@orca-mesh.io

### Escalation Path

1. **L1 Support**: support@orca-mesh.io (response: 15 min)
2. **L2 Engineering**: oncall@orca-mesh.io (response: 5 min)
3. **L3 Architecture**: cto@orca-mesh.io (response: immediate)

### Vendor Contacts

- **AWS Support**: 1-800-xxx-xxxx (Enterprise tier)
- **PostgreSQL Support**: support@postgresql.org
- **Security Incident**: security@orca-mesh.io

---

## Runbooks

### Database Failover

```bash
# Promote read replica to primary
aws rds promote-read-replica --db-instance-identifier orca-replica

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://new-primary-host:5432/orca_mesh

# Restart application
docker-compose restart orca-api
```

### Certificate Expiry

```bash
# Check certificate expiry
openssl s_client -connect api.orca-mesh.io:443 | openssl x509 -noout -dates

# Renew Let's Encrypt certificate
certbot renew --force-renewal

# Reload nginx
nginx -s reload
```

---

## Testing

### Disaster Recovery Drill

**Frequency**: Quarterly  
**Duration**: 2 hours  
**Participants**: Engineering team, DevOps, Management

**Procedure**:
1. Schedule maintenance window
2. Take production snapshot
3. Simulate failure (database deletion)
4. Execute recovery procedures
5. Validate data integrity
6. Document learnings
7. Update runbooks

### Last Drill

**Date**: 2025-09-15  
**Outcome**: Success  
**RTO Achieved**: 28 minutes  
**Lessons Learned**: Improved backup restore speed by 40%

---

## Continuous Improvement

### Metrics to Track

- Backup success rate
- Restore time (RTO)
- Data loss amount (RPO)
- Recovery drill outcomes

### Goals

- **2025 Q4**: Reduce RTO to 20 minutes
- **2026 Q1**: Implement multi-region active-active
- **2026 Q2**: Zero data loss (streaming replication)

---

**Stay prepared. Test regularly. 🛡️**
