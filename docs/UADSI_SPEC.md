# UADSI Specification

**Unified Agent Diagnostics & Synchronization Intelligence**  
**Version**: 1.0.0  
**Date**: 2025-10-30

## Overview

UADSI is the core differentiator of ORCA, providing unified intelligence across agent discovery, synchronization monitoring, trust scoring, and automated reporting.

## Components

### 1. Agent Discovery

**Purpose**: Automatically discover agents across multiple platforms

**Supported Sources**:
- MCP Servers (Model Context Protocol)
- Zapier workflows
- Make (Integromat) scenarios
- n8n workflows
- Apache Airflow DAGs
- AWS Lambda functions

**Discovery Process**:
```
1. Configure discovery sources
2. Scan sources at regular intervals (default: 15 minutes)
3. Normalize agent metadata to standard format
4. Register in Agent Registry (status: QUARANTINED)
5. Notify security team for review
6. Manual approval required before ACTIVE
```

**Discovery Metadata**:
```typescript
{
  external_id: string;        // Source-specific ID
  name: string;               // Human-readable name
  type: AgentType;           // chatbot, copilot, pipeline, service
  vendor: Vendor;            // openai, anthropic, custom, etc.
  model: string;             // Model identifier
  source: string;            // Discovery source URL
  discovered_at: timestamp;  // Discovery time
  discovery_method: string;  // auto_discovery or manual
}
```

**Configuration Example**:
```typescript
agentDiscovery.addSource({
  type: 'mcp',
  endpoint: 'https://mcp.example.com',
  credentials: { apiKey: process.env.MCP_API_KEY }
});

agentDiscovery.startAutoScan(900000); // 15 minutes
```

---

### 2. Sync Analyzer

**Purpose**: Detect synchronization gaps and data freshness issues

**Detection Types**:

#### Missing Records
- Compares source and target record counts
- Identifies specific missing IDs
- Severity based on count (>100 = critical)

#### Stale Data
- Tracks last sync timestamp
- Calculates freshness score (0-100)
- Flags sources with lag > threshold (default: 1 hour)

#### Event Ordering Issues
- Detects out-of-order events
- Validates timestamp sequences
- Identifies causality violations

#### Webhook Drift
- Monitors webhook delivery rates
- Compares actual vs expected rates
- Alerts on >20% drift

**Sync Gap Schema**:
```typescript
{
  source: string;
  target: string;
  gap_type: 'missing_records' | 'stale_data' | 'ordering_issue' | 'webhook_drift';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: Date;
  lag_ms?: number;
  missing_count?: number;
  details: Record<string, unknown>;
}
```

**Freshness Scoring**:
```
freshness_score = max(0, 100 - (lag_seconds / threshold_seconds) * 100)

Example:
- 0 lag: 100% fresh
- 30min lag (threshold=1hr): 50% fresh
- >1hr lag: 0% fresh (stale)
```

**API Usage**:
```typescript
const gaps = await syncAnalyzer.analyzeSyncStatus('erp-source', 'data-warehouse');
const freshness = syncAnalyzer.getSyncFreshnessPercent();
const driftRate = syncAnalyzer.getDriftRatePercent();
```

---

### 3. Trust Scoring Engine

**Purpose**: Compute trust metrics for agents and overall system

#### Trust Score (TS) Formula

```
TS = (reliability × 0.35 + policy_adherence × 0.30 + context_freshness × 0.20) - (risk_exposure × 0.30)

Where:
- reliability: Error rate, uptime, response times (0-1)
- policy_adherence: Policy violation rate (0-1)
- context_freshness: Data staleness score (0-1)
- risk_exposure: Compliance tier risk + status risk (0-1)

Result: 0-100 scale
```

**Factor Calculations**:

1. **Reliability**:
```
reliability = base_reliability - (error_rate × 10)
base_reliability = 0.95 (configurable)
error_rate = errors / total_requests
```

2. **Policy Adherence**:
```
adherence = 1 - (violations / (policies × checks))
Example: 5 violations, 10 policies, 100 checks = 1 - (5/1000) = 0.995
```

3. **Context Freshness**:
```
freshness = avg(source_freshness_scores)
source_freshness = 1 - (age_seconds / max_age_seconds)
```

4. **Risk Exposure**:
```
risk = tier_risk + status_risk
tier_risk: none=1.0, standard=0.6, high=0.3, critical=0.1
status_risk: quarantined=0.5, else=0
```

**Trust Grades**:
- **90-100**: Excellent (green)
- **70-89**: Good (light green)
- **50-69**: Fair (yellow)
- **30-49**: Poor (orange)
- **0-29**: Critical (red)

#### Risk Avoided (RA$) Formula

```
RA$ = Expected Loss Baseline - Realized Loss

Where:
- Expected Loss Baseline: Historical average of incidents × avg cost
- Realized Loss: Actual losses during period

Example:
- Baseline: $100,000/month (historical average)
- Realized: $15,000/month (with ORCA)
- RA$ = $85,000/month saved
```

**Incident Recording**:
```typescript
trustScoringEngine.recordIncident(
  'agent-123',
  'critical',  // severity
  5000        // loss in USD
);
```

#### Additional KPIs

**Sync Freshness %**:
```
sync_freshness = avg(all_source_freshness_scores)
Target: >90%
```

**Drift Rate %**:
```
drift_rate = (sources_with_gaps / total_sources) × 100
Target: <5%
```

**Compliance SLA %**:
```
compliance_sla = (policy_checks_passed / total_policy_checks) × 100
Target: >95%
```

**Self-Resolution Ratio**:
```
self_resolution_ratio = auto_healed_incidents / total_incidents
Target: >0.80 (80%)
```

**ROI**:
```
roi = risk_avoided_usd / platform_cost_usd
Example: $85,000 / $10,000 = 8.5x ROI
```

**API Usage**:
```typescript
const trustScore = await trustScoringEngine.computeTrustScore('agent-123');
const riskAvoided = await trustScoringEngine.computeRiskAvoided('agent-123');
const kpis = await trustScoringEngine.computeTrustKPIs(startDate, endDate);
```

---

### 4. Report Engine

**Purpose**: Generate executive and operational reports

**Report Types**:

#### Executive Summary
- **Frequency**: Monthly (configurable)
- **Format**: Markdown, PDF
- **Audience**: Executives, stakeholders
- **Sections**:
  - Key Performance Indicators
  - Operational Metrics
  - Agent Inventory
  - Key Insights (strengths, improvements, recommendations)
  - Trend Analysis
  - Next Steps

#### Trust KPIs Report
- **Frequency**: Weekly (configurable)
- **Format**: Markdown, JSON, CSV
- **Audience**: Engineering, operations
- **Content**:
  - Overall KPIs
  - Agent-level trust scores
  - Trend charts
  - Top/bottom performers

#### Sync Gaps Report
- **Frequency**: Daily (configurable)
- **Format**: Markdown, JSON
- **Audience**: Data engineering, operations
- **Content**:
  - Gap summary by severity
  - Data freshness table
  - Detailed gap descriptions
  - Remediation recommendations

**Report Generation**:
```typescript
const executiveSummary = await reportEngine.generateExecutiveSummary(
  new Date('2025-10-01'),
  new Date('2025-10-31')
);

const trustReport = await reportEngine.generateTrustKPIsReport(
  startDate,
  endDate
);

const syncReport = await reportEngine.generateSyncGapsReport();
```

**Auto-Scheduling**:
```typescript
// Example: Daily sync gap report
cron.schedule('0 8 * * *', async () => {
  await reportEngine.generateSyncGapsReport();
  // Send via email, Slack, etc.
});
```

---

## Algorithms

### Trust Score Optimization

**Current**: Weighted linear combination  
**Future**: ML-based with historical patterns

**Weights Tuning**:
```typescript
trustScoringEngine.setWeights({
  reliability: 0.35,      // Can adjust based on priorities
  policy_adherence: 0.30,
  context_freshness: 0.20,
  risk_exposure: 0.15
});
```

### Drift Detection

**Statistical Approach**:
```
1. Establish baseline: Mean and stddev of sync lag
2. Monitor current lag
3. Alert if lag > mean + (2 × stddev)  // 95% confidence
```

**Trend Detection**:
```
1. Track metric over time window (7 days)
2. Fit linear regression
3. Alert if slope > threshold (e.g., +5% per day)
```

---

## Data Persistence

### In-Memory (Current)
- Fast, simple
- No persistence
- Single-process only
- Good for: Development, small deployments

### Database (Recommended for Production)
```sql
-- Agent Registry
CREATE TABLE agents (
  id VARCHAR PRIMARY KEY,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Trust Scores
CREATE TABLE trust_scores (
  agent_id VARCHAR REFERENCES agents(id),
  score FLOAT,
  reliability FLOAT,
  policy_adherence FLOAT,
  context_freshness FLOAT,
  risk_exposure FLOAT,
  computed_at TIMESTAMP,
  PRIMARY KEY (agent_id, computed_at)
);

-- Sync Gaps
CREATE TABLE sync_gaps (
  id UUID PRIMARY KEY,
  source VARCHAR,
  target VARCHAR,
  gap_type VARCHAR,
  severity VARCHAR,
  detected_at TIMESTAMP,
  resolved_at TIMESTAMP,
  details JSONB
);
```

---

## Performance Considerations

### Scalability

**Current Limits**:
- Agents: ~10K (in-memory)
- Events: ~1M/day
- Trust calculations: ~1K/minute

**Optimization Strategies**:
1. **Caching**: Redis for trust scores (TTL: 5 minutes)
2. **Batching**: Batch trust calculations for multiple agents
3. **Sampling**: Sample sync checks instead of checking all sources
4. **Async Processing**: Use queue for heavy computations

**Horizontal Scaling**:
- Stateless API servers: Scale with load balancer
- Worker processes: Scale trust calculations independently
- Database: Read replicas for queries

---

## Integration Points

### Inbound
- MCP servers (HTTP/gRPC)
- Zapier webhooks (HTTPS)
- Custom adapters (plugin system)

### Outbound
- OpenTelemetry (metrics/traces)
- Notification systems (email, Slack, PagerDuty)
- Ticketing systems (Jira, ServiceNow)

---

## Testing

### Unit Tests
```typescript
describe('TrustScoringEngine', () => {
  it('computes trust score within bounds', async () => {
    const score = await engine.computeTrustScore('agent-1');
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(100);
  });
});
```

### Integration Tests
```typescript
describe('UADSI Integration', () => {
  it('discovers agents and computes trust', async () => {
    // Discover
    await agentDiscovery.scanAll();
    
    // Compute trust
    const kpis = await trustScoringEngine.computeTrustKPIs(start, end);
    
    // Generate report
    const report = await reportEngine.generateExecutiveSummary(start, end);
    
    expect(report).toContain('Trust Score');
  });
});
```

---

## Future Enhancements

1. **ML-Based Trust Scoring**: Use historical data to predict trust trends
2. **Anomaly Detection**: Identify unusual patterns in sync/trust metrics
3. **Predictive Analytics**: Forecast future trust scores and risks
4. **Auto-Remediation**: Automatically fix common sync issues
5. **Multi-Dimensional Trust**: Separate trust scores for different aspects

---

**Version History**:
- v1.0.0 (2025-10-30): Initial specification
