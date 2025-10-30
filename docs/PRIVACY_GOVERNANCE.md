# Privacy & Governance

Comprehensive privacy and compliance framework for ORCA Platform.

---

## Overview

ORCA Platform implements privacy-by-design and privacy-by-default principles, ensuring compliance with:
- **GDPR** (EU General Data Protection Regulation)
- **CCPA/CPRA** (California privacy laws)
- **PIPEDA** (Canada)
- **UK GDPR** and Data Protection Act 2018

---

## Core Components

### 1. Privacy Redactor

**Implementation**: `src/middleware/privacy_redactor.ts`

Automatically detects and redacts PII from:
- Log outputs
- Error traces
- HTTP responses
- Audit trails

**Supported PII Types**:
- Email addresses
- Phone numbers
- SSN/Tax IDs
- Credit card numbers
- IP addresses
- API keys and tokens
- Passwords in URLs or bodies

**Usage**:
```typescript
import { privacyRedactor, redactObject } from '@/middleware/privacy_redactor.js';

// Express middleware
app.use(privacyRedactor({ mode: 'mask', logRedactions: true }));

// Manual redaction
const safeData = redactObject(userData, { mode: 'hash' });
logger.info('User updated', safeData);
```

**Redaction Modes**:
- `mask`: Replace with `********`
- `hash`: Replace with `[REDACTED:type:hash]`
- `remove`: Remove field entirely

### 2. Data Inventory & Flow Mapping

**Files**:
- `compliance/DATA_MAP.csv` - Complete data inventory
- `compliance/ROPA_register.csv` - Record of Processing Activities

**Contents**:
- All personal data processed
- Legal basis for each category
- Storage locations and encryption
- Retention periods
- Cross-border transfers
- Sub-processors

**Usage**:
- GDPR Article 30 compliance
- DPIA inputs
- Privacy notice generation
- Vendor risk assessments

### 3. Data Processing Agreements (DPAs)

**Template**: `compliance/DPA_template.md`

Standard contract with customers covering:
- Controller-Processor relationship
- Processing instructions
- Security measures (SOC 2, ISO 27001)
- Sub-processor management
- Data breach notification (48h)
- Data subject rights support
- International data transfers (SCCs)
- Audit rights

**Execution**: Legal team customizes per customer

### 4. Data Protection Impact Assessments (DPIAs)

**Checklist**: `compliance/DPIA_checklist.md`

Required for:
- Large-scale profiling
- Automated decision-making
- Special category data
- New technologies
- High-risk processing

**Process**:
1. Screening (Part 1): Determine if DPIA needed
2. Description (Part 2): Document processing activity
3. Risk Assessment (Part 3): Identify and rate risks
4. Compliance (Part 4): Document mitigation measures
5. Consultation (Part 5): Stakeholder input
6. Mitigation Plan (Part 6): Action items
7. Approval (Part 7): DPO and management sign-off

**Review Triggers**:
- Annually
- Major feature changes
- Data breach
- New sub-processors
- Regulatory guidance

### 5. Retention Policy

**Policy**: `compliance/RETENTION_POLICY.yaml`

**Key Principles**:
- **Storage Limitation** (GDPR Article 5): Retain only as long as necessary
- **Legal Compliance**: 7-year audit retention
- **Data Minimization**: Delete when purpose fulfilled

**Retention Periods**:
| Data Type | Retention | Legal Basis |
|-----------|-----------|-------------|
| Passwords | Account + 7d | Consent |
| User emails | Account + 30d | Contract |
| Workflows | 3y after deletion | Contract |
| UADSI reports | 7y | Audit compliance |
| Audit logs | 7y | Legal obligation |
| Session tokens | 1h / 30d | Legitimate interest |
| Backups | 90d | Legitimate interest |

**Automated Enforcement**:
```yaml
scheduled_jobs:
  - purge_expired_sessions (hourly)
  - delete_old_workflow_logs (daily, >90d)
  - archive_old_reports (weekly, >1y)
  - purge_old_backups (daily, >90d)
```

**Legal Holds**: Override automated deletion during litigation

### 6. Data Classification

**Matrix**: `compliance/DATA_CLASSIFICATION.yaml`

**Classification Levels**:

| Level | Examples | Encryption | Access |
|-------|----------|------------|--------|
| **Restricted** | Passwords, payment cards, SSN | AES-256 + vault | MFA required |
| **Confidential** | PII, API keys, workflows | AES-256 | RBAC |
| **Internal** | Metrics, docs | Recommended | Authenticated |
| **Public** | Marketing, docs | Optional | Anonymous |

**Automated Classification**:
- ML-based PII detection
- Regex pattern matching
- Keyword scanning
- Confidence scoring

**Handling Requirements**:
- **Restricted**: Encrypted vault, MFA, secure overwrite disposal, immediate breach notification
- **Confidential**: Encrypted DB, RBAC, standard deletion, 72h breach notification
- **Internal**: Standard DB, authentication, standard deletion
- **Public**: No restrictions

---

## Privacy by Design

### 1. Data Minimization

**Principle**: Collect only necessary data

**Implementation**:
- No optional fields in registration
- Workflow logs redact sensitive payloads
- Analytics use anonymized identifiers
- Aggregated metrics delete raw data after 30d

**Function**:
```typescript
import { minimizeData } from '@/middleware/privacy_redactor.js';

const safeUser = minimizeData(user, ['id', 'email', 'created_at']);
// Removes all fields except allowed list
```

### 2. Purpose Limitation

**Principle**: Use data only for stated purposes

**Enforcement**:
- Legal basis documented for each data category (DATA_MAP.csv)
- Consent checkboxes granular (marketing vs. service)
- No repurposing without explicit consent
- Analytics opt-out available

### 3. Privacy by Default

**Defaults**:
- ✅ Analytics: Anonymized
- ✅ Logging: PII redacted
- ✅ Backups: Encrypted
- ✅ Sessions: Short-lived (1h)
- ✅ API keys: Scoped to minimum permissions
- ✅ Reports: Tenant-isolated, signed URLs required

---

## Data Subject Rights

### Right of Access (Article 15)

**Request**: `GET /api/privacy/data-export`

**Response**: JSON export of all personal data
- User profile
- Workflows created
- Reports generated
- API keys (hashed)
- Audit log (user's actions only)

**Timeline**: 30 days (GDPR), expedited if feasible

### Right to Erasure ("Right to be Forgotten", Article 17)

**Request**: `DELETE /api/privacy/erase-my-data`

**Process**:
1. User submits erasure request
2. Identity verified (re-authenticate)
3. Data export offered (30d to download)
4. Soft delete (30d recovery period)
5. Hard delete (overwrite + backup rotation)

**Exceptions** (data not deleted):
- Audit logs (legal obligation)
- Billing records (7-year tax requirement)
- Data in backups (deleted in normal course, 90d)

**Implementation**:
```typescript
async function eraseUserData(userId: string) {
  // 1. Anonymize identifiers
  await db.user.update({ id: userId }, {
    email: anonymizeUserId(userId) + '@deleted.local',
    name: '[DELETED]',
    deleted_at: new Date(),
  });
  
  // 2. Delete associated data
  await db.workflow.deleteMany({ user_id: userId });
  await db.api_key.deleteMany({ user_id: userId });
  
  // 3. Audit log retention (do NOT delete)
  await db.audit_log.updateMany({ user_id: userId }, {
    user_email: '[REDACTED]'
  });
}
```

### Right to Rectification (Article 16)

**UI**: Profile settings → Edit information

**Validation**: Email verification required for email changes

### Right to Restriction (Article 18)

**Use Case**: User disputes data accuracy, requests processing pause

**Implementation**: `processing_restricted` flag
- Workflows not executed
- Reports not generated
- Data not deleted (preserved for dispute)

### Right to Data Portability (Article 20)

**Format**: JSON (structured, machine-readable)

**Includes**:
- User-provided data (workflows, settings)
- Computed data (reports, trust scores)

**Delivery**: Signed download URL (7-day expiry)

### Right to Object (Article 21)

**Use Cases**:
- Object to direct marketing
- Object to profiling/automated decisions
- Object to legitimate interest processing

**UI**: Privacy settings → Opt-outs
- [ ] Marketing emails
- [ ] Anonymous analytics
- [ ] Workflow optimization (ML)

---

## Cross-Border Transfers

### Mechanisms

1. **Standard Contractual Clauses (SCCs)**
   - EU Commission approved (2021)
   - All US-based sub-processors (Supabase, AWS, Stripe)
   - Module 2: Controller-to-Processor

2. **Adequacy Decisions**
   - UK: Adequate under GDPR
   - Switzerland: Adequate

3. **Data Residency Options**
   - EU region: Supabase Frankfurt
   - US region: Supabase US-East (default)
   - Custom: Contact sales

### Sub-Processors with Data Transfer

| Sub-Processor | Service | Location | Safeguard |
|---------------|---------|----------|-----------|
| Supabase Inc. | Database, Auth | US | SCCs |
| AWS Inc. | Infrastructure | US, EU | SCCs |
| Stripe Inc. | Payments | US | SCCs + PCI DSS |
| SendGrid | Email | US | SCCs |
| Sentry | Error tracking | US | SCCs |

**Customer Notification**: 30 days before new sub-processor added

---

## Breach Notification

### Timeline

- **Restricted data**: <24 hours (customer + DPO + affected users)
- **Confidential data**: <72 hours (customer + DPO + affected users if high risk)
- **Internal data**: Case-by-case
- **Supervisory authority**: 72 hours (GDPR Article 33)

### Process

1. **Detection**: Automated monitoring, user report, audit finding
2. **Containment**: Isolate affected systems
3. **Assessment**: Determine scope (data categories, subjects, risk)
4. **Notification**: Customer (DPA requirement), users (if high risk), authority (72h)
5. **Remediation**: Fix vulnerability, enhance controls
6. **Reporting**: Post-incident review, lessons learned

### Notification Content

- Nature of breach
- Data categories and approximate subjects affected
- Likely consequences
- Measures taken/proposed
- Contact point (DPO)

---

## Privacy Governance

### Roles

**Data Protection Officer (DPO)**:
- Contact: dpo@orca-platform.example
- Responsibilities: GDPR compliance, DPIA reviews, breach coordination
- Independence: Reports to executive team, not sales/marketing

**Chief Information Security Officer (CISO)**:
- Contact: security@orca-platform.example
- Responsibilities: Technical security, access controls, incident response

**Legal Team**:
- DPA negotiations
- Privacy policy updates
- Regulatory correspondence

### Policies

- Privacy Policy (public)
- Data Retention Policy (this doc)
- Data Classification Policy (this doc)
- Incident Response Plan (see `docs/OPERATIONS_RUNBOOK.md`)

### Training

**Frequency**: Annual (all employees)

**Modules**:
- GDPR fundamentals
- Data classification
- PII handling
- Incident reporting
- Data subject rights

**Certification**: Required

### Audits

**Internal**:
- Quarterly: Access control reviews
- Annually: Retention policy compliance
- Annually: Sub-processor assessments

**External**:
- SOC 2 Type II (annual)
- ISO 27001 (triennial)
- Customer audits (upon request, max 1/year)

---

## Privacy Impact Assessments (ORCA-Specific)

### Scenario 1: ML Workflow Optimization

**Trigger**: Add ML-based workflow optimization

**High Risk Factors**:
- ✅ Automated decision-making (workflow routing)
- ✅ Profiling (user behavior analysis)

**Mitigation**:
- Human review option ("Override AI suggestion")
- Explainability (show reasoning)
- Opt-out setting
- No special category data used

**Outcome**: DPIA completed, approved with controls

### Scenario 2: New Integration Partner

**Trigger**: Add Slack integration

**Assessment**:
- ✅ New sub-processor (Slack LLC)
- Data shared: User IDs, workflow names, notifications
- Transfer: US (SCC required)

**Mitigation**:
- Execute DPA with Slack
- Add to sub-processor list
- Customer notification (30d)
- On/off toggle in settings

**Outcome**: Approved

---

## Compliance Monitoring

### Metrics

- **Data Deletion SLA**: 99% within retention period + 7d
- **Breach Notification**: 100% within 72h (GDPR)
- **Access Requests**: 95% within 30 days
- **DPIAs Completed**: 100% for high-risk processing

### Dashboards

- Data inventory health (unclassified data alerts)
- Retention compliance (overdue deletions)
- Access request status
- Sub-processor risk scores

### Reports

**Monthly**:
- Privacy metrics summary
- Overdue action items
- Access request log

**Quarterly**:
- DPO report to board
- Sub-processor review
- Policy update log

**Annually**:
- Privacy program maturity assessment
- Training completion rates
- External audit results

---

## Resources

### Documentation
- [DATA_MAP.csv](../compliance/DATA_MAP.csv) - Data inventory
- [ROPA_register.csv](../compliance/ROPA_register.csv) - Processing activities
- [DPA_template.md](../compliance/DPA_template.md) - Customer DPA
- [DPIA_checklist.md](../compliance/DPIA_checklist.md) - Impact assessment
- [RETENTION_POLICY.yaml](../compliance/RETENTION_POLICY.yaml) - Retention rules
- [DATA_CLASSIFICATION.yaml](../compliance/DATA_CLASSIFICATION.yaml) - Classification matrix

### External Resources
- [GDPR Text](https://gdpr-info.eu/)
- [ICO Guidelines](https://ico.org.uk/for-organisations/)
- [EDPB Guidance](https://edpb.europa.eu/our-work-tools/general-guidance_en)
- [NIST Privacy Framework](https://www.nist.gov/privacy-framework)

### Contact
- **DPO**: dpo@orca-platform.example
- **Security**: security@orca-platform.example
- **Legal**: legal@orca-platform.example
- **Support**: support@orca-platform.example
