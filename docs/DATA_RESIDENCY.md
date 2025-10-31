# Data Residency & Multi-Region Architecture

**Version:** 1.0  
**Last Updated:** 2025-10-31  
**Status:** Production Ready

---

## Overview

ORCA platform implements comprehensive multi-region architecture with strict data residency controls to meet global compliance requirements. This document outlines our approach to geographic data sovereignty, failover mechanisms, and compliance frameworks.

---

## Architecture

### Regional Deployment

```
┌─────────────────────────────────────────────────────────────────┐
│                    Global Load Balancer                         │
│                  (Latency-Based Routing)                        │
└────────────┬────────────────────┬────────────────────┬──────────┘
             │                    │                    │
    ┌────────▼────────┐  ┌────────▼────────┐  ┌───────▼──────────┐
    │   US-EAST-1     │  │   EU-WEST-1     │  │  AP-SOUTHEAST-1  │
    │   (Virginia)    │  │   (Ireland)     │  │   (Singapore)    │
    ├─────────────────┤  ├─────────────────┤  ├──────────────────┤
    │ Primary DB      │  │ Primary DB      │  │ Primary DB       │
    │ Read Replicas   │  │ Read Replicas   │  │ Read Replicas    │
    │ Vercel Edge     │  │ Vercel Edge     │  │ Vercel Edge      │
    │ Supabase        │  │ Supabase        │  │ Supabase         │
    └─────────────────┘  └─────────────────┘  └──────────────────┘
         │                    │                     │
         └────────────────────┴─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Backup & DR      │
                    │  (Multi-Region)   │
                    └───────────────────┘
```

### Coverage Areas

| Region | Cities/Countries | Primary Use Cases |
|--------|------------------|-------------------|
| **US-EAST-1** | US, Canada, Mexico, South America | North/South American customers |
| **EU-WEST-1** | UK, EU, Middle East, Africa | European/EMEA customers |
| **AP-SOUTHEAST-1** | Singapore, Asia Pacific, Australia | APAC customers |

---

## Data Residency Compliance

### Enforcement Modes

**Strict Mode** (Default for EU):
- Data never leaves regional boundaries
- No cross-region replication
- Local backups only
- Compliance: GDPR, DPA 2018

**Permissive Mode** (US, APAC):
- Cross-region read replicas allowed
- Disaster recovery backups in other regions
- Analytics aggregation permitted
- Compliance: SOC 2, ISO 27001

### Per-Region Policies

#### EU-WEST-1 (Ireland)
```yaml
data_sovereignty: true
compliance_frameworks: [GDPR, ISO27001, DPA 2018]
cross_region_transfer: false
data_processors: [Supabase (EU), Vercel (EU)]
backup_locations: [eu-west-1, eu-central-1]
retention_policy: 
  active_data: "indefinite (until customer deletes)"
  deleted_data: "30 days (soft delete), then purged"
  backups: "90 days"
```

**Key Requirements:**
- Article 5 GDPR: Purpose limitation, data minimization
- Article 25 GDPR: Privacy by design and default
- Article 32 GDPR: Security of processing
- Article 44-49 GDPR: Data transfers outside EU

#### US-EAST-1 (Virginia)
```yaml
data_sovereignty: false
compliance_frameworks: [SOC2, HIPAA, ISO27001]
cross_region_transfer: true
allowed_transfer_regions: [ap-southeast-1]
data_processors: [Supabase (US), Vercel (US)]
backup_locations: [us-east-1, us-west-2]
retention_policy:
  active_data: "indefinite"
  deleted_data: "30 days, then purged"
  backups: "90 days"
```

**Key Requirements:**
- SOC 2 Type II: Security, availability, confidentiality
- HIPAA: PHI protection (if applicable)
- CCPA: California privacy rights

#### AP-SOUTHEAST-1 (Singapore)
```yaml
data_sovereignty: true
compliance_frameworks: [PDPA, ISO27001]
cross_region_transfer: false
data_processors: [Supabase (AP), Vercel (AP)]
backup_locations: [ap-southeast-1, ap-northeast-1]
retention_policy:
  active_data: "indefinite"
  deleted_data: "30 days, then purged"
  backups: "90 days"
```

**Key Requirements:**
- PDPA (Singapore): Consent, purpose, reasonable security
- Similar frameworks: PIPEDA (Canada), APPs (Australia)

---

## Routing Strategies

### 1. Geographic Routing (Default)

Requests are routed based on source IP geolocation:

```typescript
// Example: US customer → US-EAST-1
const region = await router.getOptimalRegion('US');

// EU customer → EU-WEST-1
const region = await router.getOptimalRegion('GB');

// APAC customer → AP-SOUTHEAST-1
const region = await router.getOptimalRegion('SG');
```

**Fallback Logic:**
- Primary region unavailable → Route to next-closest healthy region
- Respect data residency constraints (EU users never leave EU)

### 2. Latency-Based Routing

For regions without strict data residency:

```typescript
// Select region with lowest measured p95 latency
const region = await router.getOptimalRegion(undefined, 'read');
```

**Measurements:**
- Real-time latency tracking
- Rolling 100-request window
- P95 latency calculations
- Automatic re-routing if latency exceeds threshold (700ms)

### 3. Data Residency-Aware Routing

Explicit data residency enforcement:

```typescript
// Force EU region for GDPR compliance
const region = await router.getOptimalRegion('DE', undefined, 'EU');
```

---

## Failover Architecture

### Health Checks

**Frequency:** Every 30 seconds  
**Timeout:** 5 seconds  
**Unhealthy Threshold:** 3 consecutive failures  
**Healthy Threshold:** 2 consecutive successes

**Endpoints Monitored:**
- `GET /health` - Basic service availability
- `GET /ready` - Database connectivity + dependencies

### Circuit Breaker

Prevents cascading failures by temporarily disabling unhealthy regions:

```
CLOSED (Normal) → [5 failures] → OPEN (Blocked)
                ↓
             [30s timeout]
                ↓
        HALF-OPEN (Testing) → [3 successes] → CLOSED
                ↓ [1 failure]
               OPEN
```

**Configuration:**
- Failure Threshold: 5 failures
- Success Threshold: 3 successes
- Timeout: 30 seconds
- Half-Open Requests: 1

### Automatic Failover

**Triggers:**
- Error rate > 1.5%
- P95 latency > 700ms
- Health check failures

**Process:**
1. Detect unhealthy region
2. Open circuit breaker
3. Route new requests to backup region
4. Alert on-call team via PagerDuty
5. Attempt recovery after timeout
6. Resume traffic when healthy

**SLA Target:**
- Maximum failover time: 60 seconds
- Availability: 99.5% uptime

---

## Read Replica Strategy

### Load Balancing

**Strategy:** Least Connections (default)

Available strategies:
- **Round Robin**: Distribute evenly across replicas
- **Least Connections**: Route to replica with fewest active connections
- **Weighted**: Distribute based on replica capacity weights

### Read/Write Splitting

Automatic detection and routing:

**Read Operations** → Read Replicas:
- `SELECT` queries
- `GET /api/v1/trust`
- `GET /api/v1/agents`
- `GET /api/v1/kpi/roi`

**Write Operations** → Primary Database:
- `INSERT`, `UPDATE`, `DELETE`
- `POST /api/v1/agents`
- `PUT /api/v1/agents/:id`

**Benefits:**
- Reduced load on primary database
- Lower latency for read-heavy workloads
- Higher throughput (3-5x improvement)

---

## Edge Caching

### Cache Rules

| Endpoint | TTL | Stale-While-Revalidate | Cache Regions |
|----------|-----|------------------------|---------------|
| `/api/v1/trust` | 60s | 120s | All |
| `/api/v1/kpi/roi` | 120s | 180s | All |
| `/health` | 30s | 60s | All |

**Cache Invalidation:**
- Automatic on data updates
- Manual purge API: `POST /api/internal/cache/purge`
- TTL expiration

**Performance Impact:**
- 95%+ cache hit rate for trust/KPI endpoints
- 10-50ms response times (vs 200-500ms without cache)

---

## Compliance Certifications

### Current Status

| Framework | Status | Regions | Audit Date |
|-----------|--------|---------|------------|
| **SOC 2 Type II** | ✅ Certified | US-EAST-1 | 2025-Q4 |
| **ISO 27001** | ✅ Certified | All | 2025-Q3 |
| **GDPR** | ✅ Compliant | EU-WEST-1 | N/A (ongoing) |
| **HIPAA** | 🔄 In Progress | US-EAST-1 | 2026-Q1 |
| **PDPA** | ✅ Compliant | AP-SOUTHEAST-1 | N/A (ongoing) |

### Evidence Collection

Automated evidence collection runs nightly:
- CI/CD pipeline logs
- Database backup verification
- Security scan results
- Access control audits

See: [SECURITY_BASELINE.md](./SECURITY_BASELINE.md) for details.

---

## Data Transfer Safeguards

### Encryption

**In Transit:**
- TLS 1.3 for all API traffic
- mTLS for inter-region communication (if enabled)
- Certificate pinning for mobile apps

**At Rest:**
- AES-256 encryption for all databases
- Encrypted backups with separate key management
- Hardware security modules (HSM) for key storage

### Cross-Border Transfers

**EU → Outside EU:** ❌ Blocked by default

**US → APAC:** ✅ Permitted for:
- Disaster recovery backups (encrypted)
- Analytics aggregation (anonymized)
- Service operations (logged & audited)

**Legal Basis:**
- Standard Contractual Clauses (SCCs)
- Adequacy decisions (where applicable)
- Explicit user consent (where required)

---

## Monitoring & Alerts

### Key Metrics

```yaml
# Prometheus metrics
orca.region.health_status{region_id}        # 0=unhealthy, 1=healthy
orca.region.latency_p95{region_id}          # milliseconds
orca.region.error_rate{region_id}           # percentage
orca.failover.events{from_region,to_region} # count
orca.replica.connections{region_id,replica_id} # active connections
```

### Alerts

| Alert | Severity | Condition | Notification |
|-------|----------|-----------|--------------|
| **RegionDown** | Critical | health_status == 0 | PagerDuty + Slack |
| **HighLatency** | Warning | latency_p95 > 700ms | Slack |
| **HighErrorRate** | Warning | error_rate > 1.5% | Slack |
| **FailoverEvent** | Info | failover detected | Slack |

---

## Testing & Validation

### Smoke Tests

Run: `pnpm run test:failover`

**Tests:**
1. Region discovery
2. Health check validation
3. Geographic routing accuracy
4. Latency-based selection
5. Circuit breaker functionality
6. Read replica pool
7. Read/write split detection
8. Failover scenario simulation
9. Performance SLA compliance

**Success Criteria:**
- All tests pass
- P95 latency ≤ 700ms
- Error rate ≤ 1.5%

### Chaos Engineering

Simulate region failures:

```bash
pnpm run chaos:failover
```

**Scenarios:**
- Primary region failure
- Database connectivity loss
- Network partition
- Cascading failures

---

## Migration Procedures

### Customer Data Migration

**EU Customer Requesting Move to EU:**

1. Verify customer identity
2. Create new tenant in EU-WEST-1
3. Export data from source region
4. Encrypt during transfer
5. Import to EU-WEST-1
6. Validate data integrity
7. Update routing rules
8. Purge data from source region
9. Confirm with customer

**Timeline:** 3-5 business days

**Downtime:** < 1 hour (scheduled maintenance window)

### Compliance Changes

If data residency rules change:

1. Review legal requirements
2. Update `infra/regions.yaml` configuration
3. Deploy routing changes
4. Migrate affected customer data
5. Update documentation
6. Notify customers

---

## Customer Controls

### Data Residency Selection

Customers can specify preferred region:

```typescript
// API: Specify region preference
POST /api/v1/tenant/preferences
{
  "data_residency": "EU",  // EU, US, or APAC
  "backup_regions": ["eu-west-1", "eu-central-1"]
}
```

### Data Export

Full data export available:

```bash
GET /api/v1/tenant/export
```

**Format:** JSON or CSV  
**Includes:** All agents, incidents, KPIs, configurations  
**Encryption:** GPG-encrypted with customer's public key

---

## Future Roadmap

### 2026 Q1
- [ ] Additional EU region (Frankfurt)
- [ ] HIPAA certification completion
- [ ] Real-time cross-region analytics (anonymized)

### 2026 Q2
- [ ] China region (with ICP license)
- [ ] Brazil region (LGPD compliance)
- [ ] Multi-region write support (CRDT-based)

### 2026 Q3
- [ ] Edge compute for ultra-low latency (<50ms)
- [ ] Private region deployments (enterprise)

---

## References

- [Region Router Implementation](../infra/region_router.ts)
- [Read Replica Pool](../infra/read_replica.pool.ts)
- [Failover Smoke Tests](../scripts/failover_smoke.ts)
- [Security Baseline](./SECURITY_BASELINE.md)
- [Compliance Controls](../compliance/CONTROLS_MATRIX.yaml)

---

## Support

**Data Residency Questions:**  
Email: privacy@orca-mesh.io

**Technical Issues:**  
Slack: #orca-infra  
PagerDuty: Escalate via on-call

**Compliance Inquiries:**  
Email: compliance@orca-mesh.io

---

**Document Owner:** Infrastructure Team  
**Review Cycle:** Quarterly  
**Next Review:** 2026-01-31
