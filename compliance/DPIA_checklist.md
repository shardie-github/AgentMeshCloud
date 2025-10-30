# Data Protection Impact Assessment (DPIA) Checklist

**For ORCA Platform Processing Activities**

A DPIA is required under GDPR Article 35 when processing is likely to result in high risk to data subjects. Use this checklist to determine if a DPIA is necessary and to conduct the assessment.

---

## Part 1: Screening (Is DPIA Required?)

Check all that apply. If **2 or more** are checked, a full DPIA is recommended.

- [ ] **Large-scale processing** of special categories of data (health, biometric, etc.)
- [ ] **Systematic monitoring** of publicly accessible areas (cameras, tracking)
- [ ] **Automated decision-making** with legal or significant effects (profiling, credit scoring)
- [ ] **Processing vulnerable populations** (children, employees, patients)
- [ ] **Large-scale profiling** or behavioral analysis
- [ ] **Biometric data** for unique identification
- [ ] **Genetic or health data** processing
- [ ] **Data matching** from multiple sources
- [ ] **New technology** with unclear privacy implications
- [ ] **Preventing data subjects from exercising rights** or using services

**Assessment**: 
- If DPIA required: Proceed to Part 2
- If not required: Document rationale and file for records

**Assessor**: ___________________  
**Date**: ___________________

---

## Part 2: Processing Description

### 2.1 Nature of Processing

**What data is being processed?**
- [ ] Contact information (names, emails, phone)
- [ ] Identification data (IDs, government numbers)
- [ ] Financial data (bank accounts, payment cards)
- [ ] Location data (GPS, IP addresses)
- [ ] Behavioral data (usage patterns, interactions)
- [ ] Credentials (passwords, API keys)
- [ ] Biometric data
- [ ] Health data
- [ ] Other: ___________________

**How is data collected?**
- [ ] Direct from data subjects (forms, APIs)
- [ ] Automated collection (logs, sensors)
- [ ] Third-party sources
- [ ] Public sources
- [ ] Other: ___________________

**Data volume**: ___________________  
**Data subjects count**: ___________________

### 2.2 Scope of Processing

**Purpose**: (e.g., "User authentication for platform access")

___________________________________________

**Legal basis** (GDPR Article 6):
- [ ] Consent
- [ ] Contract
- [ ] Legal obligation
- [ ] Vital interests
- [ ] Public task
- [ ] Legitimate interests

**Special category legal basis** (if applicable, GDPR Article 9):
- [ ] Explicit consent
- [ ] Employment/social security law
- [ ] Vital interests (data subject unable to consent)
- [ ] Public interest (health, archiving)
- [ ] Other: ___________________

### 2.3 Context

**Who are the data subjects?**
- [ ] Customers
- [ ] Employees
- [ ] Contractors
- [ ] Children (under 16)
- [ ] Vulnerable groups
- [ ] Other: ___________________

**Relationship with data subjects**:
- [ ] Voluntary engagement
- [ ] Contractual obligation
- [ ] Legal requirement
- [ ] Employment relationship

**Data subject expectations**: Do they reasonably expect this processing?
- [ ] Yes
- [ ] No
- [ ] Partially

**Existing privacy controls**:
- [ ] Privacy notice provided
- [ ] Consent obtained
- [ ] Opt-out available
- [ ] Data minimization applied
- [ ] Encryption in use

---

## Part 3: Risk Assessment

For each risk, rate **Likelihood** (Low/Medium/High) and **Impact** (Low/Medium/High).

### 3.1 Risks to Data Subjects

| Risk | Likelihood | Impact | Overall Risk | Mitigation |
|------|------------|--------|--------------|------------|
| Unauthorized access to personal data | | | | |
| Data breach / loss of confidentiality | | | | |
| Identity theft or fraud | | | | |
| Discrimination or unfair treatment | | | | |
| Reputational damage | | | | |
| Financial loss | | | | |
| Loss of control over personal data | | | | |
| Inability to exercise rights | | | | |
| Function creep (expanded use) | | | | |
| Surveillance or monitoring concerns | | | | |
| Re-identification of pseudonymized data | | | | |
| Other: _________________ | | | | |

**Overall Risk Level** (after mitigation):
- [ ] Low - Processing can proceed
- [ ] Medium - Additional safeguards required
- [ ] High - Processing should not proceed without significant changes or supervisory authority consultation

---

## Part 4: Compliance Measures

### 4.1 Data Minimization

- [ ] Only necessary data collected
- [ ] Collection limited to stated purposes
- [ ] Retention periods defined and minimal
- [ ] Data deletion/anonymization procedures in place

**Evidence**: ___________________

### 4.2 Data Subject Rights

- [ ] Access request procedure
- [ ] Rectification procedure
- [ ] Erasure ("right to be forgotten") procedure
- [ ] Data portability procedure
- [ ] Objection/restriction procedure
- [ ] Automated decision-making opt-out (if applicable)

**Response time commitment**: ___________ (GDPR requires ≤30 days)

### 4.3 Security Measures

**Technical measures**:
- [ ] Encryption at rest (AES-256 or equivalent)
- [ ] Encryption in transit (TLS 1.3+)
- [ ] Access controls (RBAC, least privilege)
- [ ] Multi-factor authentication
- [ ] Logging and monitoring
- [ ] Regular security testing
- [ ] Pseudonymization/anonymization
- [ ] Data loss prevention (DLP)

**Organizational measures**:
- [ ] Security policies documented
- [ ] Staff training completed
- [ ] Background checks for data handlers
- [ ] Incident response plan
- [ ] Business continuity plan
- [ ] Vendor management program
- [ ] Regular audits

**Certification/standards**:
- [ ] SOC 2 Type II
- [ ] ISO 27001
- [ ] ISO 27701 (Privacy)
- [ ] PCI DSS (if payment data)
- [ ] Other: ___________________

### 4.4 Data Transfers

**Location of processing**: ___________________

**International transfers**:
- [ ] No transfers outside EEA
- [ ] Transfers to adequate countries (EU adequacy decision)
- [ ] Standard Contractual Clauses (SCCs) in place
- [ ] Binding Corporate Rules (BCRs)
- [ ] Derogations (Article 49)

**Sub-processors**:
- [ ] Sub-processor list maintained
- [ ] DPAs signed with all sub-processors
- [ ] Customer notification process for changes

---

## Part 5: Consultation

### 5.1 Stakeholder Input

**Data subjects consulted?**
- [ ] Yes - Method: ___________________
- [ ] No - Reason: ___________________

**Data Protection Officer (DPO) consulted?**
- [ ] Yes - Date: ___________ Outcome: ___________________
- [ ] No DPO appointed

**Other stakeholders**:
- [ ] Legal team
- [ ] Security team
- [ ] Business owners
- [ ] IT/Engineering
- [ ] External privacy counsel

### 5.2 Supervisory Authority

**Is supervisory authority consultation required?** (Article 36)
- [ ] Yes - High risk after mitigation
- [ ] No - Risk adequately mitigated

If yes, authority contacted: ___________________  
Response received: ___________________

---

## Part 6: Mitigation Plan

For each **Medium** or **High** risk identified in Part 3:

| Risk | Mitigation Measure | Responsible Party | Deadline | Status |
|------|-------------------|-------------------|----------|--------|
| | | | | |
| | | | | |
| | | | | |
| | | | | |

---

## Part 7: Review and Approval

### 7.1 Review Schedule

**Initial DPIA Date**: ___________________  
**Next Review Date**: ___________________ (recommend annually or when significant changes occur)

**Triggers for review**:
- [ ] Change in processing purpose
- [ ] New technology introduced
- [ ] Data breach or security incident
- [ ] Change in legal requirements
- [ ] Significant increase in data volume or subjects
- [ ] New sub-processors
- [ ] Supervisory authority guidance

### 7.2 Sign-off

**Prepared by**:

Name: ____________________________  
Title: ____________________________  
Date: ____________________________

**Reviewed by DPO** (if applicable):

Name: ____________________________  
Date: ____________________________  
Recommendation: [ ] Approve [ ] Approve with conditions [ ] Reject

**Approved by**:

Name: ____________________________  
Title: ____________________________  
Date: ____________________________

---

## Annex: ORCA Platform-Specific Scenarios

### Scenario 1: New Analytics Feature

**Trigger**: Adding ML-based workflow optimization

**Assessment**:
- Automated decision-making: [ ] Yes [ ] No
- Profiling: [ ] Yes [ ] No
- High risk: [ ] Yes [ ] No

**Mitigation**: 
- Provide human review option
- Explain optimization logic
- Allow opt-out

### Scenario 2: New Integration Partner

**Trigger**: Adding Slack integration

**Assessment**:
- New sub-processor: [X] Yes
- Data categories shared: User IDs, Workflow names
- Transfer outside EEA: [X] Yes (US - Slack LLC)

**Mitigation**:
- Add to sub-processor list
- Execute DPA with Slack
- Update customer notice
- Provide integration on/off control

### Scenario 3: Increased Data Retention

**Trigger**: Extending audit logs from 90 days to 7 years

**Assessment**:
- Impacts data minimization principle
- Increases breach risk window
- May affect erasure requests

**Mitigation**:
- Document legal basis (compliance requirement)
- Implement archival storage with restricted access
- Anonymize non-essential fields after 90 days
- Update retention policy and privacy notice

---

**Template Version**: 1.0  
**Last Updated**: 2025-10-30  
**Next Review**: 2026-10-30
