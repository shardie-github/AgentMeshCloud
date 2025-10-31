# Analytics & Success Metrics

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Owner:** Product & Engineering

---

## Overview

ORCA AgentMesh implements a comprehensive analytics strategy to track product adoption, business metrics, and system reliability. Events are categorized into two tiers:

- **Tier A (Product/Business)**: User behavior, conversions, engagement, retention, revenue
- **Tier B (Technical/Reliability)**: Error rates, latency, Core Web Vitals, SLO compliance

---

## Event Catalog

All tracked events are documented in `/analytics/event-catalog.json` with:
- Event name and description
- Properties schema (type, required, PII classification)
- Trigger source (user action, system, scheduled)
- Destination systems (analytics, monitoring, CRM, etc.)

**Event Categories:**
- `activation` - First-time user actions
- `engagement` - Ongoing feature usage
- `conversion` - Plan upgrades, purchases
- `retention` - Return visits, churn signals
- `reliability` - Errors, incidents, performance

---

## Analytics SDK

### Initialization

```typescript
import { initAnalytics } from './lib/analytics';

const analytics = initAnalytics({
  enabled: process.env.ANALYTICS_ENABLED === 'true',
  endpoint: process.env.ANALYTICS_ENDPOINT,
  apiKey: process.env.ANALYTICS_API_KEY,
  flushInterval: 10000, // 10 seconds
  batchSize: 50,
});
```

### Tracking Events

```typescript
import { analytics } from './lib/analytics';

// Track custom event
analytics.track('agent.registered', {
  agent_id: 'agent-123',
  agent_type: 'chatbot',
  mcp_version: '1.0.0',
  discovery_method: 'auto_discovery',
});

// Identify user
analytics.identify('user-456', {
  plan: 'pro',
  company_size: '50-200',
});

// Track page view
analytics.page('Dashboard', {
  page_url: '/dashboard',
  session_id: 'session-789',
});
```

### PII Protection

The analytics SDK automatically:
- Redacts fields containing `password`, `token`, `secret`, `api_key`, `ssn`, `credit_card`
- Masks email patterns in non-email fields
- Applies server-side PII detection before sending

**PII Classification in Event Catalog:**
- `pii: true` - Contains personally identifiable information (requires consent)
- `pii: false` - Safe to track without special handling

---

## Success Metrics (North Star & Guardrails)

### Tier A: Product & Business Metrics

#### Activation
**Goal:** Get users to first value quickly

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **First Agent Registered** | % of users who register ≥1 agent within 7 days | 70% | Track `agent.registered` event within D7 of `user.signed_up` |
| **Onboarding Completion** | % of users who complete onboarding flow | 80% | Track `onboarding.completed` event |
| **Time to First Value** | Days from signup to first workflow execution | ≤2 days | Measure time between `user.signed_up` and `workflow.executed` |

**Query Example (SQL):**
```sql
SELECT 
  COUNT(DISTINCT CASE WHEN agent_registered_at <= signup_at + INTERVAL '7 days' THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) AS activation_rate
FROM users
WHERE signup_at >= NOW() - INTERVAL '30 days';
```

#### Conversion
**Goal:** Convert free users to paid plans

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **Trial→Paid Conversion** | % of trial users who upgrade to paid | 15% | Track `subscription.upgraded` from `free` to `pro`/`enterprise` |
| **Checkout Drop-off** | % of users who abandon checkout | <20% | Track `checkout.started` vs `subscription.upgraded` |
| **Average Order Value** | Mean revenue per conversion | $99+ | Calculate from `subscription.upgraded.mrr_change` |

#### Engagement
**Goal:** Maximize feature usage and session depth

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **Weekly Active Users (WAU)** | Unique users with ≥1 session per week | Growing 10% MoM | Count distinct `user_id` with any event in past 7 days |
| **Feature Depth** | Avg. # of features used per user per week | ≥5 | Count distinct `feature.adopted` events per user |
| **Session Length** | Median session duration | ≥10 min | Calculate `page.viewed` timestamp deltas per session |

**Query Example:**
```sql
SELECT 
  DATE_TRUNC('week', event_timestamp) AS week,
  COUNT(DISTINCT user_id) AS wau
FROM analytics_events
WHERE event_name IN ('page.viewed', 'agent.registered', 'workflow.executed')
  AND event_timestamp >= NOW() - INTERVAL '8 weeks'
GROUP BY week
ORDER BY week;
```

#### Retention
**Goal:** Keep users coming back

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **D1 Retention** | % of users who return day 1 | ≥40% | Track activity D1 after signup |
| **D7 Retention** | % of users who return within 7 days | ≥30% | Track activity D7 after signup |
| **D30 Retention** | % of users who return within 30 days | ≥20% | Track activity D30 after signup |
| **Churn Rate** | % of paid users who cancel per month | <5% | Track `subscription.cancelled` events |

**Cohort Analysis:**
```sql
WITH cohorts AS (
  SELECT 
    DATE_TRUNC('week', signup_at) AS cohort_week,
    user_id
  FROM users
),
activity AS (
  SELECT 
    user_id,
    DATE_TRUNC('week', event_timestamp) AS activity_week
  FROM analytics_events
  GROUP BY user_id, activity_week
)
SELECT 
  c.cohort_week,
  COUNT(DISTINCT c.user_id) AS cohort_size,
  COUNT(DISTINCT a.user_id) AS retained_users,
  COUNT(DISTINCT a.user_id) * 100.0 / COUNT(DISTINCT c.user_id) AS retention_rate
FROM cohorts c
LEFT JOIN activity a ON c.user_id = a.user_id AND a.activity_week = c.cohort_week + INTERVAL '7 days'
GROUP BY c.cohort_week
ORDER BY c.cohort_week;
```

#### Revenue
**Goal:** Maximize sustainable revenue growth

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **MRR (Monthly Recurring Revenue)** | Total monthly recurring revenue | Growing 20% QoQ | Sum `subscription.mrr` for active subscriptions |
| **ARPU (Avg Revenue Per User)** | MRR / total active users | $50+ | Calculate MRR / WAU |
| **Refund Rate** | % of revenue refunded | <2% | Track `payment.refunded` vs total payments |
| **Expansion Revenue** | Revenue from upsells/upgrades | ≥30% of new MRR | Track `subscription.upgraded` MRR changes |

---

### Tier B: Reliability & Performance Metrics

#### Error Rate
**Goal:** Minimize user-facing errors

| Metric | Definition | Target | SLO |
|--------|-----------|--------|-----|
| **API Error Rate** | % of API requests returning 5xx | <1.5% | 99% of 5-minute windows |
| **Uncaught Exceptions** | Count of unhandled errors | <10/hour | Alert on >20/hour |
| **Failed Workflows** | % of workflow executions that fail | <5% | Track `workflow.executed` with `status=failed` |

**Query Example:**
```sql
SELECT 
  DATE_TRUNC('hour', event_timestamp) AS hour,
  COUNT(*) FILTER (WHERE status_code >= 500) * 100.0 / COUNT(*) AS error_rate_pct
FROM api_requests
WHERE event_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY hour
HAVING error_rate_pct > 1.5;
```

#### Latency
**Goal:** Fast, responsive API

| Metric | Definition | Target | SLO |
|--------|-----------|--------|-----|
| **P95 API Latency** | 95th percentile response time | <700ms | 99% of requests |
| **P99 API Latency** | 99th percentile response time | <1200ms | 95% of requests |
| **Database Query P95** | 95th percentile query time | <200ms | 99% of queries |

**Prometheus Query:**
```promql
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
)
```

#### Core Web Vitals
**Goal:** Excellent user experience

| Metric | Definition | Target | Measurement |
|--------|-----------|--------|-------------|
| **LCP (Largest Contentful Paint)** | Time to render largest element | <2.5s | Track in RUM (Real User Monitoring) |
| **CLS (Cumulative Layout Shift)** | Visual stability score | <0.1 | Track layout shift events |
| **INP (Interaction to Next Paint)** | Responsiveness to interactions | <200ms | Track user interaction latency |

**Lighthouse CI Integration:**
- Run on every PR for key pages
- Fail build if LCP >3s or CLS >0.15

#### Background Jobs
**Goal:** Reliable async processing

| Metric | Definition | Target | SLO |
|--------|-----------|--------|-----|
| **Job Success Rate** | % of jobs that complete successfully | >99% | Track job execution status |
| **Job SLA Compliance** | % of jobs completing within SLA | >95% | Track `job.completed` duration vs SLA |
| **Queue Lag** | Time between job enqueue and start | <30s | Monitor job queue depth |

---

## Data Flows

### Client-Side Events
```
Browser
  → Analytics SDK (lib/analytics.ts)
  → Batch Queue (50 events or 10s flush)
  → Analytics API Endpoint
  → Event Stream (Kafka/Kinesis)
  → Data Warehouse (PostgreSQL/BigQuery)
```

### Server-Side Events
```
API Server
  → OpenTelemetry (traces, metrics)
  → OTEL Collector
  → Prometheus (metrics) + Jaeger (traces)
  → Grafana Dashboards
```

### PII Handling
1. **Client SDK**: Automatic redaction of sensitive fields
2. **API Gateway**: PII detection middleware (`src/middleware/privacy_redactor.ts`)
3. **Storage**: Encrypted at rest, access-controlled
4. **Retention**: PII deleted after 90 days (configurable per regulation)

---

## Dashboards

### Product Dashboard
- **Activation Funnel**: Signup → Agent Registered → First Workflow
- **Engagement**: WAU/MAU, Feature Adoption Heatmap
- **Retention Cohorts**: D1/D7/D30 retention by cohort week
- **Revenue**: MRR, ARPU, Churn Rate

### Technical Dashboard
- **API Health**: Error rate, latency (P50/P95/P99), throughput
- **Trust KPIs**: Trust Score, Risk Avoided ($), Sync Freshness
- **Infrastructure**: CPU/Memory, Database connections, Queue depth
- **Incidents**: Open incidents, MTTR (Mean Time to Recovery)

**Access:**
- Grafana: http://localhost:3001 (local)
- Production: https://dashboards.orca-mesh.io

---

## SQL Templates

See `/analytics/sql/` for common queries:
- `funnel_analysis.sql` - Conversion funnel with drop-off rates
- `cohort_retention.sql` - Cohort retention analysis
- `wau_mau.sql` - Weekly/Monthly Active Users
- `revenue_growth.sql` - MRR growth and expansion revenue

---

## Alerting

### Product Alerts
- **Activation drop >10%**: Alert Slack #product
- **Churn spike >2x baseline**: Alert Slack #exec
- **Feature adoption <50% for new feature**: Alert product owner

### Technical Alerts
- **Error rate >1.5%**: PagerDuty P2
- **P95 latency >700ms**: PagerDuty P3
- **Trust Score <80**: Slack #oncall
- **Incident detected**: PagerDuty P1 (critical) or P2 (high)

**Configuration:** See `docs/slo_manifest.yaml`

---

## Privacy & Compliance

### Data Retention
- **Product Events**: 2 years
- **Technical Metrics**: 90 days
- **PII**: 90 days (or user deletion request)
- **Audit Logs**: 7 years (compliance)

### User Rights (GDPR/CCPA)
- **Right to Access**: Export user's event data
- **Right to Deletion**: Purge all PII within 30 days
- **Right to Opt-Out**: Disable analytics tracking per user

**Implementation:**
```typescript
// Opt-out user from analytics
analytics.track('user.opted_out', { user_id: 'user-123' });
// SDK will automatically exclude this user from future events
```

---

## Testing

### Event Validation
```bash
# Validate event catalog schema
pnpm run analytics:validate

# Test event tracking
pnpm run test:analytics
```

### A/B Testing Framework
```typescript
import { getFeatureFlag } from './src/flags/sdk';

const variant = getFeatureFlag('new_onboarding_flow', userId);
analytics.track('experiment.exposed', {
  experiment_name: 'new_onboarding_flow',
  variant,
});
```

---

## Reporting Schedule

| Report | Frequency | Recipients | Format |
|--------|-----------|-----------|--------|
| **Weekly Product Metrics** | Monday 9am | Product, Exec | Slack + Dashboard |
| **Monthly Business Review** | 1st of month | Exec, Board | PDF + Presentation |
| **Quarterly OKR Review** | End of quarter | All teams | Meeting + Doc |
| **Incident Post-Mortem** | Within 48h of resolution | Engineering, Oncall | Doc |

---

## Support & Resources

- **Event Catalog**: `/analytics/event-catalog.json`
- **Analytics SDK**: `/lib/analytics.ts`
- **SQL Templates**: `/analytics/sql/`
- **Dashboards**: Grafana (see OPERATIONS.md)
- **Questions**: Slack #analytics or email data@orca-mesh.io

---

**Last Review:** 2025-10-31  
**Next Review:** 2026-02-01 (quarterly)
