# Data Flows & PII Classification

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Owner:** Security & Compliance

---

## Overview

This document maps all data flows within ORCA AgentMesh, classifies data by sensitivity (PII, confidential, public), and documents retention policies for GDPR/CCPA compliance.

---

## Data Classification

### Level 1: Public
**Definition:** Data that can be shared publicly without risk.

**Examples:**
- Product documentation
- Public blog posts
- Open-source code
- General product features

**Retention:** Indefinite

**Access:** Anyone

---

### Level 2: Internal
**Definition:** Data for internal use only, not sensitive but not public.

**Examples:**
- Internal documentation
- Team metrics (non-user)
- System logs (anonymized)
- Aggregate analytics (no PII)

**Retention:** 2 years

**Access:** All employees

---

### Level 3: Confidential
**Definition:** Sensitive business data, disclosure could harm company.

**Examples:**
- Revenue data
- Pricing strategy
- Contract terms
- Strategic plans
- Security vulnerabilities (pre-disclosure)

**Retention:** 7 years (legal requirement)

**Access:** Authorized employees only

---

### Level 4: Personal Identifiable Information (PII)
**Definition:** Data that can identify an individual, subject to GDPR/CCPA.

**Examples:**
- User email addresses
- Full names
- IP addresses
- Payment information
- Authentication tokens

**Retention:** 90 days after account deletion

**Access:** Authorized employees only, encrypted at rest

---

### Level 5: Sensitive PII
**Definition:** PII with higher risk if disclosed (special category under GDPR).

**Examples:**
- Passwords (hashed)
- Credit card numbers
- Government IDs
- Health data (if collected)
- Biometric data (if collected)

**Retention:** 30 days after account deletion

**Access:** Minimal access, encrypted at rest and in transit

---

## Data Inventory

### User Data

| Field | Type | PII | Retention | Encryption | Purpose |
|-------|------|-----|-----------|------------|---------|
| `user_id` | UUID | Yes | 90 days post-deletion | At rest | User identification |
| `email` | String | Yes | 90 days post-deletion | At rest | Authentication, communication |
| `password_hash` | String | Sensitive PII | 30 days post-deletion | At rest + hashed (bcrypt) | Authentication |
| `name` | String | Yes | 90 days post-deletion | At rest | Personalization |
| `company` | String | No | 90 days post-deletion | At rest | Context |
| `role` | Enum | No | 90 days post-deletion | None | Authorization |
| `created_at` | Timestamp | No | Indefinite (aggregated) | None | Analytics |
| `last_login_at` | Timestamp | No | 90 days | None | Security monitoring |
| `ip_address` | IP | Yes (EU) | 30 days | At rest | Security, fraud detection |
| `user_agent` | String | No | 30 days | None | Support, compatibility |

---

### Agent Data

| Field | Type | PII | Retention | Encryption | Purpose |
|-------|------|-----|-----------|------------|---------|
| `agent_id` | UUID | No | Indefinite | None | Agent identification |
| `agent_name` | String | No | Indefinite | None | Agent identification |
| `tenant_id` | UUID | Yes (linked to user) | 90 days post-deletion | At rest | Multi-tenancy |
| `capabilities` | JSON | No | Indefinite | None | Agent configuration |
| `status` | Enum | No | 90 days | None | Monitoring |
| `metadata` | JSON | Depends | 90 days | At rest (if PII) | Flexible storage |

**PII Note:** `metadata` may contain PII depending on what users store. Treat as PII by default.

---

### Workflow Execution Data

| Field | Type | PII | Retention | Encryption | Purpose |
|-------|------|-----|-----------|------------|---------|
| `execution_id` | UUID | No | 90 days | None | Execution tracking |
| `workflow_id` | UUID | No | Indefinite | None | Workflow identification |
| `tenant_id` | UUID | Yes | 90 days post-deletion | At rest | Multi-tenancy |
| `inputs` | JSON | Depends | 90 days | At rest | Workflow inputs |
| `outputs` | JSON | Depends | 90 days | At rest | Workflow outputs |
| `logs` | JSON | Depends | 30 days | At rest | Debugging |

**PII Note:** Inputs, outputs, and logs may contain PII. Apply PII redaction before logging.

---

### Analytics Events

| Field | Type | PII | Retention | Encryption | Purpose |
|-------|------|-----|-----------|------------|---------|
| `event_name` | String | No | 2 years | None | Event type |
| `user_id` | UUID | Yes | 90 days (hashed after) | At rest | User attribution |
| `session_id` | UUID | No | 30 days | None | Session tracking |
| `properties` | JSON | Depends | 2 years | At rest (if PII) | Event context |
| `timestamp` | Timestamp | No | 2 years | None | Time series |
| `ip_address` | IP | Yes | 30 days | At rest | Geo-location |

**PII Note:** Properties may contain PII. Sanitize before sending (see `lib/analytics.ts`).

---

### Audit Logs

| Field | Type | PII | Retention | Encryption | Purpose |
|-------|------|-----|-----------|------------|---------|
| `audit_id` | UUID | No | 7 years | None | Audit trail |
| `user_id` | UUID | Yes | 7 years | At rest | Accountability |
| `entity_type` | String | No | 7 years | None | What was changed |
| `entity_id` | UUID | No | 7 years | None | Which entity |
| `action` | String | No | 7 years | None | What action (create, update, delete) |
| `changes` | JSON | Depends | 7 years | At rest | Before/after state |
| `ip_address` | IP | Yes | 7 years | At rest | Security |
| `timestamp` | Timestamp | No | 7 years | None | When |

**Legal Requirement:** Audit logs retained for 7 years for compliance (SOC 2, GDPR).

---

## Data Flow Diagrams

### User Registration Flow

```
User Browser
    ↓ (HTTPS)
[Vercel Edge Network]
    ↓
[Next.js Frontend]
    ↓ (POST /api/auth/signup)
[API Server] 
    ├─ Validate input (Zod schema)
    ├─ Hash password (bcrypt)
    ├─ Check for existing user
    ↓
[Supabase Database]
    ├─ Insert into `users` table
    ├─ PII: email, name, password_hash
    ├─ Encrypted at rest (AES-256)
    ↓
[Analytics SDK]
    ├─ Track event: `user.signed_up`
    ├─ PII redacted (only user_id sent)
    ↓
[Analytics Warehouse]
    ├─ Store event (no PII)
    └─ Retention: 2 years
```

**PII Handling:**
- ✅ Password hashed before storage
- ✅ Email encrypted at rest
- ✅ Analytics sanitized (no email in events)
- ✅ HTTPS for transit encryption

---

### Agent Registration Flow

```
User Browser / API Client
    ↓ (HTTPS)
[API Server]
    ├─ Authenticate user (JWT)
    ├─ Validate input (Zod schema)
    ├─ Check agent quota
    ↓
[Supabase Database]
    ├─ Insert into `agents` table
    ├─ Link to `tenant_id` (PII)
    ↓
[Analytics SDK]
    ├─ Track event: `agent.registered`
    ├─ Properties: agent_id, agent_type, tenant_id
    ↓
[OpenTelemetry]
    ├─ Metric: `agents.total` +1
    └─ Trace: agent registration span
```

**PII Handling:**
- ✅ No PII in agent metadata
- ✅ `tenant_id` linked to user (indirect PII)
- ⚠️ Ensure agent names don't contain PII (validation)

---

### Workflow Execution Flow

```
User / External Trigger
    ↓
[API Server]
    ├─ Authenticate user
    ├─ Validate workflow definition
    ↓
[Workflow Engine]
    ├─ Execute steps sequentially
    ├─ Call external APIs (Zapier, etc.)
    ↓
[Supabase Database]
    ├─ Insert into `workflow_executions` table
    ├─ Store inputs, outputs, logs
    ├─ May contain PII (user-provided)
    ↓
[Analytics SDK]
    ├─ Track event: `workflow.executed`
    ├─ Properties: workflow_id, duration_ms, status
    └─ NO PII (no inputs/outputs in analytics)
```

**PII Handling:**
- ⚠️ Inputs/outputs may contain PII
- ✅ PII redaction applied before logging
- ✅ Retention: 90 days (then purged)
- ❌ Do NOT log full inputs/outputs to analytics

---

### Data Export Flow (GDPR Right to Access)

```
User Request (via UI or email)
    ↓
[Admin Panel / Support]
    ├─ Verify user identity
    ├─ Authenticate (admin only)
    ↓
[Export Script]
    ├─ Query all data for user_id
    ├─ Tables: users, agents, workflows, executions, feedback, analytics_events
    ↓
[JSON Export]
    ├─ Format: JSON (human-readable)
    ├─ Include: All PII, account history, usage data
    ├─ Exclude: Internal IDs, system metadata
    ↓
[Encrypted ZIP]
    ├─ Encrypt with user's email as password
    ├─ Send secure download link (expires in 24h)
    └─ Delete export file after 48h
```

**GDPR Compliance:**
- ✅ User can request data export
- ✅ Delivered within 30 days (SLA: 7 days)
- ✅ Machine-readable format (JSON)
- ✅ Secure delivery (encrypted, expiring link)

---

### Data Deletion Flow (GDPR Right to Erasure)

```
User Request (via UI or email)
    ↓
[Admin Panel / Support]
    ├─ Verify user identity
    ├─ Check for legal holds (contracts, disputes)
    ↓
[Deletion Script]
    ├─ Mark account as `deleted` (soft delete)
    ├─ Schedule hard delete after 30-day grace period
    ↓
[30 Days Grace Period]
    ├─ User can restore account
    └─ Data retained but inaccessible
    ↓
[Hard Delete (Day 30)]
    ├─ Delete from `users` table
    ├─ Cascade delete: agents, workflows, executions
    ├─ Anonymize analytics events (replace user_id with `deleted-user`)
    ├─ Retain audit logs (legal requirement: 7 years)
    └─ Send confirmation email
```

**GDPR Compliance:**
- ✅ User can request deletion
- ✅ 30-day grace period (restore option)
- ✅ Hard delete after 30 days
- ✅ Audit logs retained (legal exception)
- ⚠️ Analytics anonymized (not deleted)

---

## PII Redaction

### Log Redaction

**Implementation:** `/src/middleware/privacy_redactor.ts`

**Patterns Redacted:**
- Email addresses → `[EMAIL]`
- Phone numbers → `[PHONE]`
- Credit card numbers → `[CC]`
- API keys → `[API_KEY]`
- JWT tokens → `[TOKEN]`
- IP addresses (optional) → `[IP]`

**Example:**
```typescript
// Before redaction
logger.info('User logged in', { email: 'user@example.com', ip: '192.168.1.1' });

// After redaction
logger.info('User logged in', { email: '[EMAIL]', ip: '[IP]' });
```

### Analytics Sanitization

**Implementation:** `/lib/analytics.ts` (sanitizeProperties)

**Auto-Redacted Fields:**
- `password`, `token`, `secret`, `api_key`, `ssn`, `credit_card`
- Email patterns in non-email fields

**Example:**
```typescript
analytics.track('form_submitted', {
  email: 'user@example.com',  // ✅ OK (email field)
  password: 'secret123',      // ❌ Redacted to '[REDACTED]'
  api_key: 'sk-1234',         // ❌ Redacted to '[REDACTED]'
  user_id: 'user-123',        // ✅ OK (non-PII ID)
});
```

---

## Retention Policies

| Data Type | Retention | Rationale | Deletion Method |
|-----------|-----------|-----------|-----------------|
| User PII | 90 days post-deletion | GDPR/CCPA requirement | Hard delete |
| Sensitive PII (passwords) | 30 days post-deletion | Minimize risk | Hard delete + overwrite |
| Analytics events | 2 years | Business analysis | Soft delete (anonymize user_id) |
| Audit logs | 7 years | Legal/compliance | Hard delete after 7 years |
| System logs | 30 days | Debugging | Auto-purge |
| Database backups | 30 days | Disaster recovery | Auto-purge |

**Automated Deletion:**
```bash
# Daily cron job
pnpm run ops:retention --run
```

**Script:** `audit/retention_enforcer.ts`

---

## Third-Party Data Sharing

### External Services

| Service | Data Shared | Purpose | Data Processing Agreement |
|---------|-------------|---------|---------------------------|
| **Supabase** | All database data (encrypted) | Database hosting | ✅ DPA signed |
| **Vercel** | Logs, metrics (PII redacted) | Hosting | ✅ DPA signed |
| **OpenTelemetry Collector** | Traces, metrics (no PII) | Observability | ✅ Self-hosted (no sharing) |
| **Stripe** (planned) | Payment info, email | Billing | ✅ DPA required |
| **Zapier** (user-initiated) | User-defined data | Integrations | ⚠️ User responsibility |

**Important:** When users connect Zapier/n8n, they control what data is shared. We do not send PII to third parties without explicit user consent.

---

## User Rights (GDPR/CCPA)

### Right to Access
**Request:** User can request copy of all data  
**Response Time:** 30 days (SLA: 7 days)  
**Format:** JSON export (machine-readable)  
**Process:** See "Data Export Flow" above

### Right to Deletion
**Request:** User can request account deletion  
**Response Time:** 30 days grace period  
**Exceptions:** Audit logs (legal requirement)  
**Process:** See "Data Deletion Flow" above

### Right to Rectification
**Request:** User can update their data  
**Response Time:** Immediate (via UI)  
**Process:** User edits profile in dashboard

### Right to Portability
**Request:** User can export data in machine-readable format  
**Response Time:** 7 days  
**Format:** JSON  
**Process:** Same as "Right to Access"

### Right to Opt-Out (Analytics)
**Request:** User can disable analytics tracking  
**Response Time:** Immediate  
**Process:** Toggle in user settings → `analytics_enabled: false`

---

## Compliance Checklist

- [x] Data inventory documented
- [x] PII classified and encrypted at rest
- [x] PII redaction in logs and analytics
- [x] Retention policies defined and automated
- [x] GDPR user rights supported (access, deletion, portability)
- [x] Third-party DPAs signed (Supabase, Vercel)
- [x] Audit logs retained for 7 years
- [ ] Privacy policy published and linked in UI
- [ ] Cookie consent banner (if tracking cookies)
- [ ] Data breach notification plan (notify within 72h)

---

## Security Measures

### Encryption
- **At Rest:** AES-256 (Supabase)
- **In Transit:** TLS 1.3 (all endpoints)
- **Backups:** Encrypted (Supabase)

### Access Control
- **Principle of Least Privilege:** Users access only their tenant's data
- **RLS Policies:** Row-Level Security enforced in Supabase
- **Admin Access:** MFA required, audit logged

### Monitoring
- **Anomaly Detection:** Alert on unusual data access patterns
- **Audit Logs:** All data access logged (who, what, when)
- **Regular Audits:** Quarterly review of access logs

---

## Incident Response (Data Breach)

**If PII is disclosed:**

1. **Immediate (0-1h):**
   - Identify scope (how much data, which users?)
   - Contain breach (revoke access, patch vulnerability)
   - Notify incident lead

2. **Short-term (1-24h):**
   - Document timeline and root cause
   - Notify affected users (email)
   - Notify regulatory authorities (GDPR: 72h)

3. **Long-term (1-7 days):**
   - Post-mortem
   - Preventive measures
   - Update security controls

**Template:** See `docs/templates/data-breach-notification.md`

---

## Contact

**Privacy Questions:** privacy@orca-mesh.io  
**Data Requests (GDPR/CCPA):** privacy@orca-mesh.io  
**Data Protection Officer:** TBD

---

**Last Updated:** 2025-10-31  
**Next Review:** 2026-01-31 (quarterly)
