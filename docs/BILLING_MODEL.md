# ORCA Billing Model & Monetization Strategy

**Version:** 1.0  
**Last Updated:** 2025-10-31  
**Status:** Production Ready

---

## Overview

ORCA platform uses a transparent, value-based billing model that converts Trust Score and AI-Ops automation into measurable ROI. Our pricing is designed to scale with customer usage while ensuring sustainable growth for the business.

---

## Pricing Tiers

### Free (Community)
**$0/month**

Perfect for individuals and small teams getting started with AI agent governance.

**Included:**
- 5 registered agents
- 1,000 events/day
- 10,000 API calls/month
- Trust Scoring & KPIs
- Basic policy enforcement
- Community support
- 7-day data retention

**Limitations:**
- No AI-Ops automation
- No webhook adapters
- No custom OPA policies

---

### Professional
**$99/month or $990/year** (17% discount)

For growing teams and production workloads.

**Everything in Free, plus:**
- 50 registered agents
- 50,000 events/day
- 1,000,000 API calls/month
- 1,000 AI-Ops actions/month
- Webhook adapters (Zapier, Make, n8n)
- Custom OPA policies
- Advanced analytics
- Email support (24-48h response)
- 30-day data retention

**Add-ons:**
- Extra agents: $2/agent/month
- Extra API calls: $0.10 per 1,000 calls
- Extended retention: $50 per 30 additional days

---

### Enterprise
**$2,500/month or $25,000/year** (17% discount)

For large organizations with custom requirements.

**Everything in Pro, plus:**
- Unlimited agents
- Unlimited events/day
- Unlimited API calls/month
- Unlimited AI-Ops actions
- SSO (SAML/OIDC)
- Custom branding
- Dedicated instance option
- 99.9% SLA guarantee
- Priority support (4h response)
- 90-day data retention
- Dedicated account manager

**Custom Options:**
- White-label deployment
- On-premises installation
- Custom SLA (99.99%+)
- Professional services

---

## Usage Metering

### Tracked Metrics

#### 1. Events Per Day
**Definition:** Total agent events ingested per 24-hour period.

**Examples:**
- MCP server tool invocations
- Webhook deliveries
- Agent state changes
- Context bus messages

**Quota Enforcement:** Rolling 24-hour window. Exceeding quota results in 429 responses until next reset.

#### 2. AI-Ops Actions Per Month
**Definition:** Automated remediation actions triggered by AI-Ops engine.

**Examples:**
- Auto-healing workflows
- Policy violations auto-remediated
- Drift corrections
- Resource optimizations

**Overage Pricing:** $1.00 per additional action

#### 3. API Calls Per Month
**Definition:** REST API requests to ORCA platform.

**Includes:**
- Agent CRUD operations
- KPI/trust queries
- Incident reporting
- Configuration updates

**Excludes:**
- Health checks
- Webhook deliveries (counted as events)

**Overage Pricing:** $0.10 per 1,000 additional calls

#### 4. Storage
**Definition:** Total data storage across all tenants.

**Includes:**
- Agent metadata
- Event logs
- Audit trails
- Analytics data

**Quota:**
- Free: 1 GB
- Pro: 100 GB
- Enterprise: Unlimited

**Overage Pricing:** $0.50 per GB/month

#### 5. Agents
**Definition:** Total number of registered agents in the system.

**Count Method:** Unique agent IDs in active status.

**Overage Pricing (Pro only):** $2 per additional agent/month

#### 6. Users
**Definition:** Number of user accounts with access to ORCA dashboard.

**Quota:**
- Free: 2 users
- Pro: 10 users
- Enterprise: Unlimited

**Overage Pricing:** $10 per additional user/month

---

## ROI Calculation

### Formula

```
Risk Avoided (RA$) = Incidents Avoided × Avg Incident Cost × (Trust Score / 100)

ROI = ((RA$ - Platform Cost) / Platform Cost) × 100%
```

### Example: Professional Plan

**Assumptions:**
- Trust Score: 85/100
- Incidents Avoided: 12 per month
- Average Incident Cost: $5,000 (industry average)
- Platform Cost: $99/month

**Calculation:**
```
RA$ = 12 × $5,000 × (85 / 100)
    = 12 × $5,000 × 0.85
    = $51,000 per month

ROI = (($51,000 - $99) / $99) × 100%
    = $50,901 / $99 × 100%
    = 51,415%
    = 514× return multiple
```

**Annual Savings:** $612,000 - $1,188 = **$610,812**

---

## Billing Cycle

### Monthly Subscriptions
- **Billing Date:** Same day each month (e.g., 15th)
- **Payment Method:** Credit card, ACH, wire transfer (Enterprise)
- **Proration:** Full month charged on sign-up, prorated on plan changes
- **Failed Payments:** 3 retry attempts over 10 days, then service suspended

### Annual Subscriptions
- **Discount:** 17% off monthly price
- **Payment:** Full year upfront
- **Cancellation:** Refund prorated for unused months (minus 10% processing fee)

---

## Quota Enforcement

### Soft Limits (Warning)
At **80% of quota**, we send warning notifications:
- Email to billing contact
- Dashboard banner
- Slack notification (if integrated)

### Hard Limits (Blocking)
At **100% of quota**, requests are blocked:
- HTTP 429 (Too Many Requests) response
- Error message with quota details
- Suggested actions: Upgrade plan or wait for reset

### Overage Behavior

**Free Plan:** Hard block, no overage allowed.

**Pro Plan:** 
- Allow up to 20% overage
- Charge overage fees on next invoice
- If >20%, hard block until upgrade

**Enterprise Plan:** 
- Unlimited (no blocking)
- Track usage for capacity planning

---

## Invoice Generation

### Timing
- Generated on billing date (e.g., 15th of each month)
- Sent via email within 24 hours
- Payment due: Net 30 (Enterprise), immediate (Pro/Free)

### Invoice Contents
```
ORCA Platform Invoice
Invoice #: INV-2025-001234
Date: 2025-10-31
Due: 2025-11-30

Line Items:
- Professional Plan (Monthly)           $99.00
- Overage: 500 AI-Ops Actions @ $1.00  $500.00
- Overage: 50,000 API Calls @ $0.10    $5.00
                                       -------
Subtotal:                              $604.00
Tax (0%):                               $0.00
                                       -------
Total Due:                             $604.00
```

### Payment Methods
- **Credit Card:** Stripe, automatic charge
- **ACH:** US-based customers, 5-7 day processing
- **Wire Transfer:** Enterprise customers, manual reconciliation
- **Invoice:** Net 30 terms (Enterprise only)

---

## Stripe Integration

### Webhook Events

**Handled Events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.upcoming` (7 days before renewal)

### Metadata Tracking
```json
{
  "tenant_id": "tenant_abc123",
  "plan_id": "pro",
  "billing_period": "monthly",
  "overage_alerts": "enabled"
}
```

---

## Upgrade / Downgrade

### Upgrade Process
1. Customer initiates upgrade in dashboard
2. Calculate prorated charge for current period
3. Update subscription in Stripe
4. Immediate access to new features
5. Quotas updated in real-time

### Downgrade Process
1. Customer initiates downgrade
2. Effective at end of current billing period
3. Warning if current usage exceeds new plan limits
4. Grace period: 7 days to reduce usage
5. After grace period: Soft block (readonly mode)

### Proration Example
Upgrade from Free → Pro on day 15 of 30-day month:
```
Prorated charge = $99 × (15 / 30) = $49.50
Next full charge on billing date
```

---

## Trial Period

### Professional Plan Trial
- **Duration:** 14 days
- **No Credit Card Required:** Yes
- **Full Features:** All Pro features enabled
- **Limits:** Pro quotas apply
- **Auto-Downgrade:** To Free plan if not converted

### Conversion Tracking
Metrics monitored:
- Trial sign-ups
- Trial → Paid conversion rate (target: 15%)
- Time to first value (TTF < 24h)
- Feature adoption during trial

---

## Customer Lifecycle

### Onboarding
1. Sign up (email + password)
2. Choose plan (Free or Pro trial)
3. Connect first agent
4. Set up policies
5. View first trust score
6. **Time to Value:** < 30 minutes

### Engagement
- Weekly KPI reports via email
- Monthly ROI summaries
- Quarterly business reviews (Enterprise)
- Feature announcements
- Best practices webinars

### Retention
- Churn risk indicators:
  - Low usage (<10% of quota)
  - No logins in 30 days
  - Support tickets with negative sentiment
- Proactive outreach before cancellation
- Exit surveys for feedback

---

## Revenue Projections

### Year 1 Targets

| Metric | Value |
|--------|-------|
| Free Users | 5,000 |
| Free → Pro Conversion | 10% = 500 paid |
| Pro → Enterprise Conversion | 5% = 25 paid |
| **MRR (Monthly Recurring Revenue)** | $112,000 |
| **ARR (Annual Recurring Revenue)** | $1,344,000 |

### Year 2 Growth
- Target: 3× growth
- ARR: $4,032,000
- Enterprise customers: 100+
- OEM/Partner channel: 20% of revenue

---

## Billing API

### Check Quota
```bash
GET /api/v1/billing/quota?tenant_id={id}&metric=events

Response:
{
  "metric_type": "events",
  "used": 750,
  "limit": 1000,
  "percentage": 75.0,
  "exceeded": false,
  "remaining": 250
}
```

### Get Usage Report
```bash
GET /api/v1/billing/usage?tenant_id={id}

Response:
{
  "tenant_id": "tenant_abc123",
  "plan_id": "pro",
  "period_start": "2025-10-01",
  "period_end": "2025-10-31",
  "quotas": [
    {
      "metric_type": "events",
      "used": 1_250_000,
      "limit": 1_500_000,
      "percentage": 83.3,
      "exceeded": false
    }
  ],
  "overage_charges": 0,
  "total_cost": 99.00
}
```

### Get Invoices
```bash
GET /api/v1/billing/invoices?tenant_id={id}

Response:
{
  "invoices": [
    {
      "id": "inv_001",
      "date": "2025-10-01",
      "amount": 99.00,
      "status": "paid",
      "download_url": "https://..."
    }
  ]
}
```

---

## Compliance & Taxation

### Tax Collection
- **US Customers:** Sales tax collected where applicable (varies by state)
- **EU Customers:** VAT collected (standard rate per country)
- **Other:** GST/VAT where required

### Tax Calculation
Integrated with Stripe Tax for automatic calculation.

### Invoicing Requirements
- Company name, address
- Tax ID / VAT number (if applicable)
- Line-item breakdown
- PDF download available

---

## Partner / Reseller Pricing

### OEM Partner Program
- Revenue share: 70/30 (partner/ORCA)
- White-label option available
- Dedicated partner portal
- Tier-based discounts:
  - 1-10 customers: 20% discount
  - 11-50 customers: 30% discount
  - 51+ customers: 40% discount

### Referral Program
- 20% commission on first year
- 60-day cookie window
- Affiliate dashboard with tracking

---

## Future Enhancements

### Planned (2026 Q1-Q2)
- [ ] Usage-based pricing tier (pay-as-you-go)
- [ ] Multi-year contracts (20% discount)
- [ ] Marketplace add-ons (partners can sell integrations)
- [ ] Credits system for overage (buy in advance at discount)
- [ ] Custom billing schedules (quarterly, semi-annual)

---

## Monitoring & Optimization

### Key Metrics Tracked
- **MRR (Monthly Recurring Revenue)**
- **Churn Rate** (target: <5% monthly)
- **Expansion Revenue** (upgrades + overages)
- **CAC (Customer Acquisition Cost)** (target: <$500)
- **LTV:CAC Ratio** (target: >3:1)
- **Net Revenue Retention** (target: >110%)

### Dashboards
- Billing analytics in Stripe
- Custom dashboard in ORCA admin panel
- Grafana dashboard for real-time usage

---

## Support Contacts

**Billing Questions:**  
Email: billing@orca-mesh.io  
Response: 24-48 hours

**Upgrade / Enterprise Sales:**  
Email: sales@orca-mesh.io  
Phone: +1 (555) 123-4567

**Technical Issues:**  
Slack: #orca-support  
Docs: https://docs.orca-mesh.io/billing

---

## References

- [Usage Metering Implementation](../billing/usage_meters.ts)
- [Stripe Bridge](../billing/stripe_bridge.ts)
- [Plans Configuration](../billing/plans.yaml)
- [Billing Tests](../billing/tests/billing.spec.ts)
- [ROI Widget](../apps/diagnostics-ui/app/kpi/ROIWidget.tsx)

---

**Document Owner:** Finance & Product Team  
**Review Cycle:** Quarterly  
**Next Review:** 2026-01-31
