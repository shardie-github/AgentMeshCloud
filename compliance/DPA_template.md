# Data Processing Agreement (DPA)

**Template for ORCA Platform Customer Contracts**

This Data Processing Agreement ("DPA") forms part of the Service Agreement between:

**Controller**: [Customer Name] ("Customer")  
**Processor**: ORCA Platform Inc. ("ORCA")

Effective Date: [Date]

---

## 1. Definitions

1.1 **"Personal Data"** means any information relating to an identified or identifiable natural person as defined under applicable Data Protection Laws.

1.2 **"Data Protection Laws"** means all applicable laws and regulations relating to data protection and privacy, including but not limited to:
- EU General Data Protection Regulation (GDPR) 2016/679
- UK GDPR and Data Protection Act 2018
- California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA)
- Other applicable state, federal, and international privacy laws

1.3 **"Sub-processor"** means any third party appointed by ORCA to process Personal Data on behalf of Customer.

1.4 **"Services"** means the ORCA Platform services as described in the Service Agreement.

---

## 2. Scope and Roles

2.1 **Controller-Processor Relationship**: Customer is the Controller of Personal Data, and ORCA is the Processor acting on Customer's behalf.

2.2 **Processing Scope**: ORCA shall process Personal Data only:
- To provide the Services as described in the Service Agreement
- As documented in this DPA and associated annexes
- As instructed by Customer through the Platform or written instructions

2.3 **Data Categories Processed**:
- User identification data (names, emails)
- API credentials and authentication tokens
- Workflow configurations and execution logs
- Analytics and usage metrics
- Audit logs and system events

See Annex A (Data Processing Details) for comprehensive list.

---

## 3. Customer Instructions

3.1 ORCA shall process Personal Data only on documented instructions from Customer, including:
- Configuration through the Platform UI
- API requests authenticated by Customer
- Support requests submitted by Customer's authorized personnel

3.2 If ORCA believes an instruction violates Data Protection Laws, ORCA shall promptly inform Customer and may suspend processing until the instruction is confirmed or withdrawn.

---

## 4. Security Measures

4.1 ORCA implements and maintains appropriate technical and organizational measures to protect Personal Data, including:

**Technical Measures**:
- AES-256 encryption at rest
- TLS 1.3+ encryption in transit
- Multi-factor authentication (MFA)
- Role-based access control (RBAC)
- API key HMAC signature verification
- Regular security patching and updates

**Organizational Measures**:
- Security policies and procedures
- Employee security training
- Background checks for staff with data access
- Incident response plan
- Regular security audits and penetration testing

4.2 ORCA shall conduct annual security assessments and provide summary reports upon request.

---

## 5. Sub-processors

5.1 **Approved Sub-processors**: Customer consents to ORCA engaging the Sub-processors listed in Annex B.

5.2 **Sub-processor Changes**: ORCA shall notify Customer at least 30 days before engaging new Sub-processors or changing existing ones. Customer may object on reasonable grounds related to data protection.

5.3 **Sub-processor Obligations**: ORCA ensures all Sub-processors are bound by written agreements imposing substantially the same data protection obligations as this DPA.

Current Sub-processors:
- **Supabase Inc.** - Database and authentication services (US, Standard Contractual Clauses)
- **AWS Inc.** - Infrastructure and storage (US/EU, Standard Contractual Clauses)
- **Stripe Inc.** - Payment processing (PCI DSS Level 1 certified)

---

## 6. Data Subject Rights

6.1 ORCA shall assist Customer in responding to Data Subject requests, including:
- Right of access
- Right to rectification
- Right to erasure ("right to be forgotten")
- Right to data portability
- Right to object to processing

6.2 ORCA provides self-service tools in the Platform for common requests. For complex requests, ORCA shall respond to Customer within 5 business days.

6.3 If a Data Subject contacts ORCA directly, ORCA shall forward the request to Customer within 2 business days.

---

## 7. Data Breach Notification

7.1 ORCA shall notify Customer without undue delay upon becoming aware of a Personal Data breach, and in any case within 48 hours.

7.2 Notification shall include:
- Nature of the breach
- Categories and approximate number of affected Data Subjects
- Likely consequences
- Measures taken or proposed to address the breach

7.3 ORCA shall cooperate with Customer in investigating and remediating the breach.

---

## 8. Data Transfers

8.1 ORCA processes Personal Data primarily in the United States and European Union data centers.

8.2 **International Transfers**: Where Personal Data is transferred outside the EEA, ORCA relies on:
- Standard Contractual Clauses (SCCs) approved by the European Commission
- Adequacy decisions where applicable
- Other legally valid transfer mechanisms

8.3 Customers may request data residency options (subject to availability and additional fees).

---

## 9. Data Retention and Deletion

9.1 **Retention**: ORCA retains Customer Personal Data for the duration of the Service Agreement plus:
- 30 days: User credentials and sessions
- 90 days: Audit logs and system events
- 3 years: Operational data (workflows, reports) for compliance
- 7 years: Financial and audit records (legal requirement)

See Annex C (Retention Policy) for detailed schedule.

9.2 **Deletion**: Upon Service Agreement termination, ORCA shall:
- Provide Customer with data export option (30 days)
- Delete or anonymize all Customer Personal Data (within 90 days)
- Provide written certification of deletion upon request

9.3 **Backups**: Deleted data in backups shall be rendered inaccessible and deleted in the normal course (90-day backup retention).

---

## 10. Audits and Compliance

10.1 ORCA shall provide Customer with information necessary to demonstrate compliance with this DPA, including:
- SOC 2 Type II reports (annual)
- Security assessment summaries
- Sub-processor compliance evidence

10.2 Customer may conduct audits of ORCA's processing activities:
- Maximum once per year (unless breach or regulatory requirement)
- Upon 30 days' written notice
- During business hours with minimal disruption
- At Customer's expense (unless breach or non-compliance found)

10.3 ORCA may charge reasonable fees for audit support exceeding 8 hours per year.

---

## 11. Liability and Indemnity

11.1 Each party's liability under this DPA shall be subject to the limitations of liability in the Service Agreement.

11.2 ORCA shall indemnify Customer for damages arising from ORCA's breach of this DPA, provided Customer has complied with its obligations.

---

## 12. Term and Termination

12.1 This DPA shall commence on the Effective Date and continue for the term of the Service Agreement.

12.2 Sections 7, 9, and 11 shall survive termination.

---

## Annexes

**Annex A**: Data Processing Details (linked to `DATA_MAP.csv`)  
**Annex B**: Sub-processor List (linked to `ROPA_register.csv`)  
**Annex C**: Data Retention Policy (linked to `RETENTION_POLICY.yaml`)  
**Annex D**: Standard Contractual Clauses (EU SCCs)

---

## Signatures

**Customer:**

Name: ____________________________  
Title: ____________________________  
Date: ____________________________

**ORCA Platform Inc.:**

Name: ____________________________  
Title: ____________________________  
Date: ____________________________

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-30  
**Next Review**: 2026-04-30
