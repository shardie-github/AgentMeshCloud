# UADSI SOFTWARE LICENSE AGREEMENT

**UNIFIED AGENT DIAGNOSTICS & SYNCHRONIZATION INTELLIGENCE**

**Effective Date:** {{effective_date}}  
**Agreement ID:** {{agreement_id}}  
**License Tier:** {{license_tier}}

---

## PARTIES

**Licensor:**  
UADSI Inc.  
123 Innovation Drive  
San Francisco, CA 94105  
United States

**Licensee:**  
{{company_name}}  
{{company_address}}  
{{company_city}}, {{company_state}} {{company_zip}}  
{{company_country}}

---

## 1. DEFINITIONS

**1.1 "UADSI Platform"** means the Unified Agent Diagnostics & Synchronization Intelligence software, including all modules, APIs, dashboards, documentation, and updates provided by Licensor.

**1.2 "Trust Score (TS)"** means the weighted reliability metric calculated by the UADSI Platform ranging from 0-100%.

**1.3 "Risk Avoided (RA$)"** means the calculated monetary value of incidents prevented by the UADSI Platform.

**1.4 "Agent"** means any software entity, service, or workflow monitored by the UADSI Platform.

**1.5 "Authorized Users"** means employees, contractors, or agents of Licensee authorized to access the UADSI Platform.

**1.6 "Subscription Term"** means the period specified in the Order Form during which Licensee has access to the UADSI Platform.

---

## 2. LICENSE GRANT

**2.1 Grant of License**

Subject to the terms of this Agreement and payment of applicable fees, Licensor grants Licensee a non-exclusive, non-transferable, revocable license to:

{{#tier_professional}}
- Access and use the UADSI Platform in object code form
- Monitor up to {{agent_limit}} Agents
- Create up to {{user_limit}} Authorized User accounts
- Generate standard reports and dashboards
- Access the UADSI REST API (rate limited)
{{/tier_professional}}

{{#tier_enterprise}}
- Access and use the UADSI Platform in object code form
- Monitor unlimited Agents across unlimited Workflows
- Create unlimited Authorized User accounts
- Generate all reports, dashboards, and analytics
- Full API access (REST + GraphQL)
- Custom integrations with third-party platforms
- White-label deployment (with add-on)
{{/tier_enterprise}}

{{#tier_oem}}
- All Enterprise license rights
- Embed UADSI Platform within Licensee's products
- Rebrand and white-label UADSI Platform
- Redistribute UADSI Platform to end customers
- Access to UADSI SDK and embeddable components
- Resell UADSI capabilities under Licensee's brand
{{/tier_oem}}

**2.2 License Restrictions**

Licensee shall NOT:

a) Reverse engineer, decompile, or disassemble the UADSI Platform  
b) Remove or modify proprietary notices or labels  
c) Use the UADSI Platform to develop competing products  
d) Share access credentials with unauthorized third parties  
e) Exceed usage limits specified in the Order Form  
f) Attempt to circumvent technical limitations or security measures  

{{#tier_non_oem}}
g) Sublicense, resell, or redistribute the UADSI Platform  
h) Use the UADSI Platform for service bureau purposes
{{/tier_non_oem}}

---

## 3. SUBSCRIPTION FEES & PAYMENT

**3.1 Fees**

{{#tier_professional}}
- **Monthly Subscription:** ${{monthly_fee}} USD
- **Annual Subscription:** ${{annual_fee}} USD ({{discount_percent}}% discount)
- **Payment Cycle:** {{payment_cycle}}
{{/tier_professional}}

{{#tier_enterprise}}
- **Annual Subscription:** ${{annual_fee}} USD
- **Payment Terms:** {{payment_terms}}
- **Billing Cycle:** Annual (paid upfront or quarterly)
{{/tier_enterprise}}

{{#tier_oem}}
- **License Type:** {{pricing_model}}
- **Annual Commitment:** ${{annual_commitment}} USD (minimum)
- **Payment Structure:** {{payment_structure}}
- **Revenue Share:** {{revenue_share_terms}} (if applicable)
{{/tier_oem}}

**3.2 Overage Fees**

{{#has_overage_fees}}
Licensee will be charged additional fees for usage exceeding subscription limits:

- Agents (per 100): ${{overage_agents}}
- API Calls (per 10,000): ${{overage_api}}
- Users (per 10): ${{overage_users}}

Overage fees will be billed monthly in arrears.
{{/has_overage_fees}}

**3.3 Payment Terms**

- All fees are due {{payment_due_days}} days from invoice date
- Accepted payment methods: {{payment_methods}}
- Late payments subject to {{late_fee_percent}}% monthly interest
- Non-payment may result in service suspension after {{grace_period_days}} days

**3.4 Taxes**

All fees are exclusive of taxes. Licensee is responsible for all sales, use, VAT, GST, and other applicable taxes.

---

## 4. TERM & TERMINATION

**4.1 Term**

This Agreement commences on the Effective Date and continues for the Subscription Term specified in the Order Form.

**4.2 Renewal**

{{#auto_renewal}}
This Agreement will automatically renew for successive {{renewal_period}} periods unless either party provides written notice of non-renewal at least {{notice_days}} days before the end of the then-current term.
{{/auto_renewal}}

**4.3 Termination for Convenience**

{{#tier_professional}}
Licensee may terminate this Agreement at any time with {{notice_days}} days written notice. No refunds will be provided for unused Subscription Term.
{{/tier_professional}}

{{#tier_enterprise}}
Either party may terminate this Agreement upon {{notice_days}} days written notice at the end of the then-current Subscription Term.
{{/tier_enterprise}}

**4.4 Termination for Cause**

Either party may terminate this Agreement immediately upon written notice if:

a) The other party materially breaches this Agreement and fails to cure within {{cure_period_days}} days  
b) The other party becomes insolvent or subject to bankruptcy proceedings  
c) The other party ceases business operations

**4.5 Effect of Termination**

Upon termination:

- Licensee's access to the UADSI Platform will be terminated
- Licensee must cease all use of the UADSI Platform
- Licensee may export data within {{data_export_days}} days
- All outstanding fees become immediately due and payable
- Sections 2.2, 6, 7, 8, 9, and 10 survive termination

---

## 5. DATA & PRIVACY

**5.1 Data Ownership**

Licensee retains all rights, title, and interest in and to Licensee Data. Licensor retains all rights to the UADSI Platform and aggregated, anonymized usage data.

**5.2 Data Usage**

Licensor may use Licensee Data solely to:

- Provide the UADSI Platform services
- Generate Trust Scores and Risk Metrics
- Improve the UADSI Platform (using anonymized data)
- Comply with legal obligations

**5.3 Data Security**

Licensor will implement industry-standard security measures including:

- AES-256 encryption at rest
- TLS 1.3 for data in transit
- Regular security audits and penetration testing
- SOC 2 Type II compliance
- Role-based access controls (RBAC)

**5.4 Data Residency**

{{#multi_region}}
Licensee may select data residency region: {{available_regions}}
{{/multi_region}}

{{#single_region}}
Data will be stored in: {{data_region}}
{{/single_region}}

**5.5 GDPR / Privacy**

Licensor will process personal data in accordance with applicable data protection laws including GDPR. A Data Processing Addendum (DPA) is available upon request.

---

## 6. INTELLECTUAL PROPERTY

**6.1 Licensor IP**

The UADSI Platform, including all algorithms, source code, documentation, trademarks, and related intellectual property, is and remains the exclusive property of Licensor.

**6.2 Licensee Feedback**

Licensee grants Licensor a perpetual, royalty-free license to use any feedback, suggestions, or enhancement requests for improving the UADSI Platform.

**6.3 Trademarks**

{{#tier_oem}}
Licensee may use Licensor's trademarks solely as necessary to promote and distribute the licensed UADSI Platform, subject to Licensor's trademark guidelines.
{{/tier_oem}}

{{#tier_non_oem}}
Licensee may reference Licensor's trademarks solely to describe the UADSI Platform, subject to Licensor's trademark guidelines.
{{/tier_non_oem}}

---

## 7. WARRANTIES

**7.1 Licensor Warranties**

Licensor warrants that:

a) It has the right to grant the licenses herein  
b) The UADSI Platform will perform substantially as described in documentation  
c) The UADSI Platform will not infringe third-party intellectual property rights

{{#tier_enterprise}}
d) The UADSI Platform will maintain {{sla_uptime}}% uptime (per SLA)
{{/tier_enterprise}}

**7.2 Warranty Disclaimers**

EXCEPT AS EXPRESSLY PROVIDED ABOVE, THE UADSI PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. LICENSOR DISCLAIMS ALL IMPLIED WARRANTIES INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

**7.3 Limitations**

Licensor does not warrant that:

- The UADSI Platform will be error-free or uninterrupted
- All errors will be corrected
- The UADSI Platform will meet Licensee's specific requirements
- Trust Scores and Risk Avoided calculations guarantee actual outcomes

---

## 8. LIMITATION OF LIABILITY

**8.1 Liability Cap**

EXCEPT FOR BREACHES OF SECTION 2.2 (LICENSE RESTRICTIONS) OR SECTION 5 (DATA & PRIVACY), LICENSOR'S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED:

{{#tier_professional}}
The amounts paid by Licensee in the 12 months preceding the claim
{{/tier_professional}}

{{#tier_enterprise}}
The greater of (a) ${{liability_cap}} or (b) amounts paid in the 12 months preceding the claim
{{/tier_enterprise}}

{{#tier_oem}}
The greater of (a) ${{liability_cap}} or (b) amounts paid in the 24 months preceding the claim
{{/tier_oem}}

**8.2 Excluded Damages**

IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY.

**8.3 Exceptions**

The limitations in this Section 8 do not apply to:

- Licensee's breach of license restrictions
- Licensee's violation of Licensor's intellectual property
- Gross negligence or willful misconduct
- Indemnification obligations

---

## 9. INDEMNIFICATION

**9.1 By Licensor**

Licensor will defend, indemnify, and hold harmless Licensee from third-party claims that the UADSI Platform infringes intellectual property rights, provided Licensee:

a) Promptly notifies Licensor in writing  
b) Grants Licensor sole control of the defense  
c) Cooperates reasonably in the defense

**9.2 By Licensee**

Licensee will defend, indemnify, and hold harmless Licensor from claims arising from:

a) Licensee's breach of this Agreement  
b) Licensee's use of the UADSI Platform in violation of law  
c) Licensee Data or third-party claims related to Licensee Data  

{{#tier_oem}}
d) End-customer claims related to Licensee's distribution of the UADSI Platform
{{/tier_oem}}

---

## 10. GENERAL PROVISIONS

**10.1 Governing Law**

This Agreement shall be governed by the laws of the State of California, excluding conflicts of law principles.

**10.2 Dispute Resolution**

Disputes shall be resolved through:

1. Good faith negotiation (30 days)
2. Mediation (if negotiation fails)
3. Binding arbitration under AAA Commercial Arbitration Rules

**10.3 Entire Agreement**

This Agreement, together with the Order Form and any incorporated documents, constitutes the entire agreement and supersedes all prior agreements and understandings.

**10.4 Amendments**

Licensor may update this Agreement with {{notice_days}} days notice. Continued use constitutes acceptance. Enterprise customers may reject by written notice within {{notice_days}} days.

**10.5 Assignment**

{{#tier_non_oem}}
Licensee may not assign this Agreement without Licensor's prior written consent.
{{/tier_non_oem}}

{{#tier_oem}}
Licensee may assign this Agreement to an acquirer in a merger or acquisition with prior written notice.
{{/tier_oem}}

**10.6 Force Majeure**

Neither party shall be liable for delays or failures due to causes beyond reasonable control.

**10.7 Severability**

If any provision is found unenforceable, the remaining provisions remain in full force and effect.

**10.8 Notices**

All notices must be in writing to:

**Licensor:** legal@uadsi.ai  
**Licensee:** {{licensee_contact_email}}

---

## EXECUTION

By accepting this Agreement electronically or executing an Order Form, Licensee agrees to be bound by these terms.

**LICENSOR:**  
UADSI Inc.

Signature: _________________________  
Name: {{licensor_signer_name}}  
Title: {{licensor_signer_title}}  
Date: {{signature_date}}

**LICENSEE:**  
{{company_name}}

Signature: _________________________  
Name: {{licensee_signer_name}}  
Title: {{licensee_signer_title}}  
Date: {{signature_date}}

---

**Attachments:**
- Exhibit A: Order Form
- Exhibit B: Service Level Agreement (SLA) [Enterprise only]
- Exhibit C: Data Processing Addendum (DPA)
- Exhibit D: Support Terms
- Exhibit E: Acceptable Use Policy

**UADSI License Agreement v1.0**  
**© 2025 UADSI Inc. All Rights Reserved.**
