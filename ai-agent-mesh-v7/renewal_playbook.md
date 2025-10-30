# Renewal Playbook
**Automated Contract Renewal Best Practices**

Version: 1.0  
Owner: Revenue Operations  
Last Updated: 2025-10-30

---

## Overview

This playbook outlines the automated renewal process for Mesh OS contracts, ensuring high retention rates, proactive churn mitigation, and systematic upsell identification.

**Goals:**
- 95%+ gross retention rate
- 128% net revenue retention (NRR)
- 30-day average renewal close time
- <5% at-risk renewals reaching term-end

---

## Renewal Timeline

### Day -90: Renewal Planning

**Trigger:** 90 days before contract end date

**Automated Actions:**
- [ ] Renewal opportunity created in CRM (Salesforce/HubSpot)
- [ ] Account health score calculated
- [ ] Usage analysis generated
- [ ] Churn risk assessment initiated

**Account Manager Actions:**
- [ ] Review customer health metrics
- [ ] Identify expansion opportunities
- [ ] Schedule internal renewal planning call
- [ ] Update CRM with renewal strategy

---

### Day -60: Early Engagement

**Trigger:** 60 days before contract end date

**Automated Actions:**
- [ ] Usage summary report emailed to customer
- [ ] Trust Score performance report generated
- [ ] Cost savings/ROI report generated
- [ ] Upsell recommendation engine runs

**Account Manager Actions:**
- [ ] Email customer with value summary
- [ ] Propose QBR to discuss renewal + expansion
- [ ] Share success metrics (Trust Score, cost savings, incidents resolved)

---

### Day -30: Renewal Notice

**Trigger:** 30 days before contract end date

**Automated Actions:**
- [ ] Formal renewal notice sent to customer (primary contact + billing contact)
- [ ] Renewal quote generated (current tier + upsell recommendations)
- [ ] Task created in CRM for account manager (priority: medium)
- [ ] Slack alert sent to #renewals channel

**Account Manager Actions:**
- [ ] Call customer to discuss renewal
- [ ] Present renewal quote + upsell opportunities
- [ ] Address any concerns or objections
- [ ] Set follow-up date (within 7 days)

---

### Day -14: Escalation Check

**Trigger:** 14 days before contract end date (if renewal not yet committed)

**Automated Actions:**
- [ ] Task priority escalated to "high" in CRM
- [ ] Alert sent to CS manager
- [ ] Customer health score re-calculated

**Account Manager Actions:**
- [ ] Second renewal call (if first call unsuccessful)
- [ ] Engage executive sponsor (if needed)
- [ ] Identify blockers (budget, procurement, stakeholder buy-in)
- [ ] Escalate to VP Customer Success (if high churn risk)

---

### Day -7: Urgent Renewal

**Trigger:** 7 days before contract end date (if renewal not yet committed)

**Automated Actions:**
- [ ] Task priority escalated to "critical" in CRM
- [ ] Alert sent to VP Customer Success + CRO
- [ ] Churn risk flagged in executive dashboard
- [ ] Urgent renewal email sent to customer

**Account Manager Actions:**
- [ ] Daily check-ins with customer
- [ ] Expedite procurement/legal review (if applicable)
- [ ] Offer short-term extension (if needed)
- [ ] Escalate to CEO (for strategic accounts)

---

### Day 0: Contract Expiration

**Trigger:** Contract end date

**Automated Actions:**
- [ ] Service continues (30-day grace period for Enterprise)
- [ ] Invoice generated for month-to-month billing (20% premium)
- [ ] Alert sent to finance team
- [ ] Churn alert sent to executive team

**Account Manager Actions:**
- [ ] Final escalation to customer (phone call)
- [ ] Offer expedited renewal process
- [ ] Confirm service continuity plan

---

### Day +30: Grace Period End

**Trigger:** 30 days after contract expiration (Enterprise only)

**Automated Actions:**
- [ ] Service suspension notice sent (72-hour warning)
- [ ] Data export offered
- [ ] Account flagged for offboarding

**Account Manager Actions:**
- [ ] Final call to confirm churn decision
- [ ] Conduct exit interview (capture churn reasons)
- [ ] Offer win-back incentives (if appropriate)

---

## Churn Risk Assessment

### Risk Score Calculation

**Formula:**
```
Churn Risk Score = 
  (Low Usage × 30) + 
  (High Support Tickets × 25) + 
  (Login Inactivity × 20) + 
  (Low Trust Score × 15) + 
  (SLA Breaches × 10)
```

### Risk Categories

| Risk Level | Score | Actions |
|------------|-------|---------|
| **Low** | 0-39 | Standard renewal process |
| **Medium** | 40-69 | Schedule health check call, address concerns |
| **High** | 70-100 | Immediate escalation, QBR, executive engagement |

### Churn Risk Factors

#### 1. Low Usage (30 points)
- **Threshold:** <30% of included agent hours utilized
- **Mitigation:** Onboarding workshop, feature adoption campaign

#### 2. High Support Volume (25 points)
- **Threshold:** >10 support tickets per month
- **Mitigation:** Technical deep-dive, product training, bug prioritization

#### 3. Login Inactivity (20 points)
- **Threshold:** No login for 14+ days
- **Mitigation:** Check-in call, re-engagement campaign

#### 4. Low Trust Score (15 points)
- **Threshold:** Average Trust Score <85
- **Mitigation:** Optimization workshop, policy tuning

#### 5. SLA Breaches (10 points)
- **Threshold:** >2 SLA breaches per quarter
- **Mitigation:** Root cause analysis, SLA credit, remediation plan

---

## Upsell Playbook

### Upsell Triggers

#### 1. Agent Count Approaching Limit
- **Threshold:** ≥85% of tier limit
- **Recommendation:** Upgrade to next tier
- **Estimated ARR Increase:** 
  - Starter → Professional: $50K
  - Professional → Enterprise: $175K

#### 2. Frequent Overages
- **Threshold:** ≥3 months of overage charges
- **Recommendation:** Upgrade to next tier (better per-unit economics)
- **Estimated ARR Increase:** Varies by tier

#### 3. Carbon Analytics Opportunity
- **Threshold:** >5,000 compute hours/month
- **Recommendation:** Add Advanced Carbon Analytics ($1,500/month)
- **Estimated ARR Increase:** $18K

#### 4. Partner Ecosystem
- **Threshold:** >0 partners in ecosystem
- **Recommendation:** Add Partner Enablement Package ($2,000/month)
- **Estimated ARR Increase:** $24K

#### 5. Extended Retention Need
- **Threshold:** Compliance requirement or audit request
- **Recommendation:** Add Extended Data Retention ($500/month)
- **Estimated ARR Increase:** $6K

### Upsell Objection Handling

| Objection | Response |
|-----------|----------|
| **"Too expensive"** | Show ROI: cost savings typically exceed Mesh OS investment by 5-10x |
| **"We're not using current features"** | Schedule optimization workshop; demonstrate underutilized capabilities |
| **"Budget frozen"** | Offer payment plans; emphasize cost-saving features (40% compute reduction) |
| **"Need to see more value first"** | Schedule QBR with ROI analysis; share case studies from similar companies |

---

## Renewal Communication Templates

### Template 1: 30-Day Renewal Notice

**Subject:** Your Mesh OS Subscription Renewal - 30 Days

**Body:**
```
Hi [First Name],

Your Mesh OS subscription is up for renewal in 30 days (expires [Date]). We've prepared a renewal summary with your usage highlights and recommended options.

📊 Your Impact This Year:
• Trust Score Avg: [XX.X]
• Incidents Resolved: [XXX]
• Cost Savings: $[XXX]K
• Carbon Offset: [X.X] metric tons CO₂e

💡 Renewal Options:
1. Renew Current Tier ([Tier]): $[XX]K/year
2. Upgrade to [Next Tier]: $[XX]K/year (+[XX]% more agents, [features])

[Add-On Recommendations: if applicable]

Let's schedule a call this week to discuss your renewal and any expansion opportunities.

Best regards,
[Your Name]
[Title]
```

---

### Template 2: 7-Day Urgent Renewal

**Subject:** URGENT: Mesh OS Renewal - Action Needed

**Body:**
```
Hi [First Name],

Your Mesh OS subscription expires in 7 days ([Date]). To ensure uninterrupted service, we need to finalize your renewal this week.

⚠️ Important:
• Service interruption possible after [Date]
• Month-to-month billing (20% premium) applies if renewal not completed
• Data retention policy enforced (90-day deletion)

I'm here to help expedite the renewal process. Can we connect today or tomorrow?

[Phone Number]
[Calendar Link]

Best regards,
[Your Name]
```

---

### Template 3: High Churn Risk

**Subject:** Let's Talk - Your Mesh OS Experience

**Body:**
```
Hi [First Name],

I noticed [specific concern: low usage / high support tickets / Trust Score dip]. I want to make sure Mesh OS is delivering the value you expected.

Can we schedule 30 minutes this week to discuss:
• What's working well?
• What could be better?
• How we can optimize your deployment?

I'm committed to ensuring your success with Mesh OS. Let's make it right.

[Calendar Link]

Best regards,
[Your Name]
```

---

## Success Metrics

### Renewal KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Gross Retention Rate** | ≥95% | (Renewed ARR / Expiring ARR) × 100 |
| **Net Revenue Retention** | ≥128% | ((Renewed + Expansion - Contraction) / Starting ARR) × 100 |
| **Renewal Close Time** | ≤30 days | Avg days from first outreach to signed contract |
| **At-Risk Renewals** | <5% | % of renewals reaching term-end uncommitted |
| **Upsell Attach Rate** | ≥35% | % of renewals with expansion |

### Churn Analysis

| Churn Reason | % of Total | Mitigation Strategy |
|--------------|------------|---------------------|
| **Poor Product Fit** | 35% | Better qualification in sales process |
| **Budget Constraints** | 28% | Demonstrate ROI earlier; offer payment plans |
| **Competitive Replacement** | 18% | Strengthen differentiation; competitive intelligence |
| **Company Out of Business** | 12% | No mitigation (uncontrollable) |
| **Other** | 7% | Case-by-case analysis |

---

## Escalation Paths

### Internal Escalation

| Stage | Owner | When to Escalate |
|-------|-------|------------------|
| **Level 1** | Account Manager | Standard renewal process |
| **Level 2** | CS Manager | 14 days before renewal, uncommitted |
| **Level 3** | VP Customer Success | 7 days before renewal, high churn risk |
| **Level 4** | CRO / CEO | Strategic account, >$500K ARR |

### Customer Escalation

| Stage | Customer Stakeholder | When to Engage |
|-------|----------------------|----------------|
| **Level 1** | Primary Contact | All renewals |
| **Level 2** | Decision Maker (VP/Director) | 14 days before renewal |
| **Level 3** | Executive Sponsor (C-suite) | High churn risk, strategic account |

---

## Tools & Resources

### CRM Configuration
- **Renewal Object:** Salesforce Opportunity (Type: "Renewal")
- **Renewal Stage:** Draft → Engaged → Negotiating → Closed Won/Lost
- **Automated Workflows:** HubSpot Workflows / Salesforce Process Builder

### Reporting Dashboards
- **Renewal Pipeline:** Real-time view of all upcoming renewals
- **Churn Risk:** Flagged accounts by risk score
- **Upsell Opportunities:** Expansion pipeline by tier

### Playbook Tools
- **Renewal Automation Engine:** `/workspace/ai-agent-mesh-v7/renewal_automation.mjs`
- **CRM Bridge:** `/workspace/ai-agent-mesh-v7/crm_bridge.yaml`
- **Trust Metrics:** `/workspace/ai-agent-mesh-v7/trust_metrics.yaml`

---

## Continuous Improvement

### Monthly Renewal Retrospectives
- Review all closed renewals (won + lost)
- Identify patterns in churn reasons
- Update playbook with new objection handling
- Refine upsell recommendations

### Quarterly Strategy Reviews
- Analyze renewal trends (by tier, industry, region)
- Adjust churn risk thresholds
- Calibrate upsell triggers
- Update communication templates

---

**Playbook Owner:** Revenue Operations  
**Contributors:** Customer Success, Sales, Product  
**Next Review:** Monthly  
**Questions:** Contact ops@mesh-os.ai
