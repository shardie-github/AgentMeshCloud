# Audit Pipeline & Data Governance

Comprehensive audit trail with real-time change tracking, PII protection, and automated retention enforcement.

## Overview

```
Database Changes → Realtime Changefeed → Audit Logger → Audit Tables
                                              ↓
                                     PII Detection & Flagging
                                              ↓
                                        Retention Enforcer → Archive/Delete
```

## Components

### 1. Changefeed Logger (`audit/changefeed_logger.ts`)

Listens to Supabase realtime changes and logs all modifications with PII detection.

**Logged Operations:**
- `INSERT`: New records created
- `UPDATE`: Records modified (with changed fields)
- `DELETE`: Records removed

**Features:**
- Real-time change capture via Supabase Realtime
- Automatic PII detection based on field names
- User attribution (user_id extraction)
- IP address tracking
- Metadata preservation

**Usage:**
```typescript
import { createChangefeedLogger } from './audit/changefeed_logger';

const logger = createChangefeedLogger();

// Start monitoring specific tables
await logger.startMonitoring([
  'users',
  'orders',
  'payments',
  'api_keys'
]);

// Get audit trail for a specific record
const trail = await logger.getAuditTrail('users', 'user_123');

// Get recent audits
const recent = await logger.getRecentAudits(100);

// Stop monitoring
await logger.stopMonitoring();
```

**PII Detection:**

Automatically flags changes containing sensitive data:
- email
- phone
- ssn
- credit_card
- password
- api_key
- secret
- token

PII-flagged changes are:
1. Logged in main audit table
2. Duplicated to `pii_audit_logs` for compliance
3. Generate alerts for DELETE operations

### 2. Retention Enforcer (`audit/retention_enforcer.ts`)

Automatically enforces data retention policies with optional archival.

**Default Retention Policies:**
- `audit_logs`: 90 days (archive enabled)
- `pii_audit_logs`: 365 days (archive enabled, compliance)
- `telemetry_traces`: 30 days (no archive)
- `telemetry_metrics`: 90 days (archive enabled)
- `feedback`: 730 days (2 years, archive enabled)
- `incidents`: 1825 days (5 years, archive enabled)

**Features:**
- Scheduled daily enforcement (2 AM)
- Configurable retention per table
- Optional archival before deletion
- Retention reports
- Dry-run mode for testing

**Usage:**
```typescript
import { createRetentionEnforcer } from './audit/retention_enforcer';

const enforcer = createRetentionEnforcer();

// Start scheduled enforcement
enforcer.start();

// Run enforcement manually
const reports = await enforcer.enforceRetention();

reports.forEach(report => {
  console.log(`${report.table_name}:`);
  console.log(`  Evaluated: ${report.records_evaluated}`);
  console.log(`  Archived: ${report.records_archived}`);
  console.log(`  Deleted: ${report.records_deleted}`);
  console.log(`  Bytes Freed: ${report.bytes_freed}`);
});

// Add custom retention policy
enforcer.addPolicy({
  table_name: 'custom_logs',
  retention_days: 60,
  archive_before_delete: true,
  archive_destination: 's3://custom-archive',
  timestamp_column: 'created_at'
});

// Stop enforcement
enforcer.stop();
```

## Database Schema

```sql
-- Main audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  record_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],
  user_id TEXT,
  ip_address TEXT,
  has_pii BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_pii ON audit_logs(has_pii) WHERE has_pii = TRUE;

-- PII-specific audit log (stricter retention)
CREATE TABLE pii_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  record_id TEXT NOT NULL,
  user_id TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_pii_audit_timestamp ON pii_audit_logs(timestamp DESC);

-- Audit alerts
CREATE TABLE audit_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  description TEXT NOT NULL,
  audit_log_id TEXT,
  acknowledged BOOLEAN DEFAULT FALSE
);

-- Retention policies
CREATE TABLE retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT UNIQUE NOT NULL,
  retention_days INTEGER NOT NULL,
  archive_before_delete BOOLEAN DEFAULT FALSE,
  archive_destination TEXT,
  timestamp_column TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

-- Retention reports
CREATE TABLE retention_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reports JSONB NOT NULL,
  total_records_deleted INTEGER,
  total_records_archived INTEGER,
  total_bytes_freed BIGINT
);

-- Archive tables (created dynamically)
CREATE TABLE audit_logs_archive (
  LIKE audit_logs INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  original_id UUID
);

CREATE TABLE pii_audit_logs_archive (
  LIKE pii_audit_logs INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  original_id UUID
);

-- Audit statistics function
CREATE OR REPLACE FUNCTION get_audit_stats()
RETURNS TABLE(
  table_name TEXT,
  total_changes BIGINT,
  pii_changes BIGINT,
  recent_24h BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.table_name,
    COUNT(*) as total_changes,
    COUNT(*) FILTER (WHERE a.has_pii) as pii_changes,
    COUNT(*) FILTER (WHERE a.timestamp > NOW() - INTERVAL '24 hours') as recent_24h
  FROM audit_logs a
  GROUP BY a.table_name
  ORDER BY total_changes DESC;
END;
$$ LANGUAGE plpgsql;
```

## Workflows

### Daily Audit Review

```bash
# Get audit statistics
tsx audit/changefeed_logger.ts --stats

# Review PII-flagged changes
tsx audit/changefeed_logger.ts --pii-report

# Run retention enforcement
tsx audit/retention_enforcer.ts --run
```

### Compliance Audit

```sql
-- Get all changes to user data
SELECT * FROM audit_logs
WHERE table_name = 'users'
  AND record_id = 'user_123'
ORDER BY timestamp DESC;

-- Get PII access log
SELECT * FROM pii_audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
  AND operation = 'UPDATE'
ORDER BY timestamp DESC;

-- Get retention report
SELECT * FROM retention_reports
ORDER BY timestamp DESC
LIMIT 10;
```

### GDPR Right to Erasure

```typescript
// Delete user data and log for compliance
async function deleteUserGDPR(userId: string) {
  // 1. Delete user data
  await supabase.from('users').delete().eq('id', userId);
  
  // 2. Check audit log confirms deletion
  const auditTrail = await logger.getAuditTrail('users', userId);
  const deletion = auditTrail.find(log => log.operation === 'DELETE');
  
  if (!deletion) {
    throw new Error('Deletion not logged');
  }
  
  // 3. Generate GDPR report
  return {
    user_id: userId,
    deleted_at: deletion.timestamp,
    audit_trail_preserved: true
  };
}
```

## Security & Compliance

### SOC 2 Compliance

The audit pipeline supports SOC 2 requirements:

- **CC6.1:** Audit logs capture all data access and modifications
- **CC6.2:** PII changes are separately tracked
- **CC6.3:** Retention policies enforce data lifecycle
- **CC7.2:** User attribution for all changes

### GDPR Compliance

- **Right to Access:** Query audit_logs for user's data access history
- **Right to Erasure:** Deletion operations logged and verifiable
- **Data Minimization:** Retention policies automatically purge old data
- **Audit Trail:** Complete history of PII changes

### HIPAA Compliance (if applicable)

- **Access Controls:** User-level audit trail
- **Data Retention:** Minimum 6 year retention for medical records
- **Audit Reports:** Available for compliance audits

## Integration with Alerting

```typescript
// Send alert on suspicious PII access
logger.on('pii_change', async (auditLog) => {
  if (auditLog.operation === 'DELETE' && auditLog.table_name === 'users') {
    await slack.send({
      channel: '#security',
      text: `⚠️ PII Deletion: User data deleted by ${auditLog.user_id}`,
      blocks: [{
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Table:* ${auditLog.table_name}` },
          { type: 'mrkdwn', text: `*Record:* ${auditLog.record_id}` },
          { type: 'mrkdwn', text: `*User:* ${auditLog.user_id}` }
        ]
      }]
    });
  }
});
```

## Monitoring & Metrics

Track audit pipeline health:

- **Audit Log Volume:** Changes per hour/day
- **PII Changes:** % of changes flagged as PII
- **Retention Enforcement:** Records deleted/archived per run
- **Storage Impact:** Bytes freed by retention
- **Alert Response Time:** Time to acknowledge audit alerts

## Best Practices

1. **Comprehensive Coverage:** Monitor all tables with sensitive data
2. **Regular Reviews:** Weekly audit log reviews
3. **Test Retention:** Dry-run before production
4. **Archive Critical Data:** Enable archival for compliance-critical tables
5. **Alert Tuning:** Adjust PII detection keywords for your domain
6. **Access Control:** Restrict audit log access to authorized personnel

## Advanced: Custom Audit Rules

```typescript
// Add custom audit rules
class CustomAuditLogger extends ChangefeedLogger {
  protected async handleChange(tableName: string, payload: any): Promise<void> {
    await super.handleChange(tableName, payload);
    
    // Custom logic: Alert on high-value transaction changes
    if (tableName === 'transactions' && payload.new.amount > 10000) {
      await this.sendHighValueAlert(payload);
    }
    
    // Custom logic: Require approval for admin changes
    if (payload.new.role === 'admin') {
      await this.requestApproval(payload);
    }
  }
}
```

## References

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [SOC 2 Compliance](https://www.aicpa.org/interestareas/frc/assuranceadvisoryservices/aicpasoc2report.html)
- [GDPR Guidelines](https://gdpr.eu/)
- [HIPAA Audit Controls](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html)
