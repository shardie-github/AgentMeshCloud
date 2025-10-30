# UADSI Specification

**U**niversal **A**gent **D**iscovery, **S**ync, and **I**ntelligence

## Overview

UADSI is the core intelligence layer of ORCA AgentMesh, providing:
- Automated agent discovery and registration
- Synchronization health monitoring
- Trust scoring and risk quantification
- Self-healing and drift detection

## Components

### 1. Agent Discovery

**Purpose**: Automatically discover and register agents from multiple sources.

**Sources**:
- MCP Registry (YAML-based)
- Adapter webhooks (Zapier, n8n)
- Manual registration (API)

**Process**:
1. Scan MCP registry on startup
2. Create agent records in context bus
3. Assign initial trust level (0.75)
4. Track metadata (capabilities, version, etc.)

**API**:
```typescript
class AgentDiscovery {
  async discover(): Promise<DiscoveryResult>
  async discoverAgents(): Promise<Agent[]>
  async getAgentHealth(agentId: string): Promise<HealthScore>
}
```

### 2. Sync Analyzer

**Purpose**: Monitor workflow synchronization and detect staleness.

**SLO**: Configurable freshness window (default: 24 hours)

**Metrics**:
- **Sync Freshness %**: Percentage of workflows receiving events within SLO
- **Stale Workflows**: Workflows exceeding freshness SLO
- **Drift Detections**: Workflows with staleness > 2× SLO

**Algorithm**:
```
For each workflow:
  last_event = most recent event timestamp
  age = now - last_event
  
  If age < SLO:
    status = fresh
  Else:
    status = stale
    
  If age > 2 × SLO:
    drift_detected = true

Sync Freshness % = (fresh_count / total_workflows) × 100
Drift Rate % = (drift_count / total_workflows) × 100
```

**API**:
```typescript
class SyncAnalyzer {
  async analyze(): Promise<SyncAnalysis>
  async detectDrift(): Promise<DriftDetection[]>
  async getSyncFreshness(): Promise<number>
}
```

### 3. Trust Scoring

**Purpose**: Compute system-wide trust score based on multiple dimensions.

**Formula**:
```
TS = (agent_uptime × 0.30) + 
     (policy_adherence × 0.30) + 
     (sync_freshness × 0.25) + 
     (risk_exposure × 0.15)
```

**Components**:

#### Agent Uptime Score
```
uptime = success_count / (success_count + errors)
```

#### Policy Adherence Score
```
violation_rate = violations / total_events
adherence = max(0, 1 - violation_rate × 20)
```
*Note: 5% violation rate = 0 score (heavy penalty)*

#### Sync Freshness Score
```
freshness_score = sync_freshness_pct / 100
```

#### Risk Exposure Score
```
risk_exposure = avg(agent_trust_levels)
```

**Risk Avoided Calculation**:
```
RA$ = baseline_cost × (TS - baseline_trust) × num_agents
```

**Confidence Level**:
```
confidence = min(1.0, avg_telemetry_points / 50)
```

**API**:
```typescript
class TrustScoring {
  async computeTrustScore(): Promise<TrustMetrics>
  async updateAgentTrustLevels(): Promise<void>
}
```

### 4. Report Engine

**Purpose**: Generate executive summaries and exports.

**Formats**:
- Markdown
- CSV
- JSON (via API)

**Content**:
- KPIs (TS, RA$, Sync Freshness, Drift Rate, Compliance SLA)
- Insights (automated analysis)
- Recommendations (actionable next steps)

**Insight Generation**:
- Trust score vs. baseline comparison
- Sync freshness status
- Drift detection count
- Agent/workflow counts

**Recommendation Logic**:
- Low trust → Review agents with violations
- Stale workflows → Investigate and restore
- Drift detected → Enable self-healing
- Low compliance → Strengthen policies

**API**:
```typescript
class ReportEngine {
  async generateExecutiveSummary(): Promise<ExecutiveSummary>
  async exportMarkdown(): Promise<string>
  async exportCSV(): Promise<string>
  async saveReport(format: 'markdown' | 'csv'): Promise<string>
}
```

## Data Flow

```
┌─────────────────────────────────────────────┐
│           External Systems                  │
│   (MCP, Zapier, n8n, Manual)               │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│        Agent Discovery                      │
│  - Scan sources                             │
│  - Register agents                          │
│  - Sync metadata                            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│        Context Bus (Postgres)               │
│  - agents, workflows, events                │
│  - telemetry, metrics                       │
└───────┬──────────────────────┬──────────────┘
        │                      │
        ▼                      ▼
┌──────────────┐      ┌──────────────┐
│ Sync Analyzer│      │Trust Scoring │
│ - Freshness  │      │ - Compute TS │
│ - Drift      │      │ - Update TL  │
└──────┬───────┘      └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  ▼
         ┌────────────────┐
         │ Report Engine  │
         │ - Summary      │
         │ - Export       │
         └────────────────┘
```

## Configuration

### Environment Variables

```bash
# Trust Scoring
TRUST_SCORE_BASELINE=0.85
RISK_BASELINE_COST_USD=10000

# Sync Analysis
SYNC_FRESHNESS_SLO_HOURS=24
DRIFT_THRESHOLD_PCT=5.0

# Compliance
COMPLIANCE_SLA_TARGET_PCT=99.5

# Features
ENABLE_TRUST_SCORING=true
ENABLE_DRIFT_DETECTION=true
ENABLE_SELF_HEALING=true
```

### Thresholds

| Metric | Excellent | Good | Moderate | Critical |
|--------|-----------|------|----------|----------|
| Trust Score | ≥ 0.85 | 0.70-0.85 | 0.50-0.70 | < 0.50 |
| Sync Freshness | ≥ 95% | 90-95% | 75-90% | < 75% |
| Drift Rate | < 5% | 5-10% | 10-20% | > 20% |
| Compliance SLA | ≥ 99.5% | 99.0-99.5% | 95-99% | < 95% |

## Self-Healing Integration

UADSI feeds drift detections to the Self-Healing Engine:

```
SyncAnalyzer.detectDrift() 
  → drift_detections[]
  → SelfHealingEngine.diagnoseAndHeal()
  → remediation_actions[]
```

See [Self-Healing Engine](../src/diagnostics/self_healing_engine.ts) for details.

## Telemetry Requirements

For accurate UADSI metrics, agents must report:

| Field | Required | Description |
|-------|----------|-------------|
| `agent_id` | Yes | Agent UUID |
| `ts` | Yes | Timestamp |
| `latency_ms` | No | Request latency |
| `errors` | Yes | Error count |
| `policy_violations` | Yes | Violation count |
| `success_count` | Yes | Success count |

## API Examples

### Get Trust Metrics

```bash
curl http://localhost:3000/trust
```

Response:
```json
{
  "timestamp": "2023-12-01T12:00:00Z",
  "kpis": {
    "trust_score": 0.8245,
    "risk_avoided_usd": 2450.50,
    "sync_freshness_pct": 95.5,
    "drift_rate_pct": 2.1,
    "compliance_sla_pct": 99.2
  },
  "components": {
    "agent_uptime_score": 0.89,
    "policy_adherence_score": 0.92,
    "sync_freshness_score": 0.96,
    "risk_exposure_score": 0.78
  },
  "confidence": 0.85
}
```

### Refresh Trust Metrics

```bash
curl -X POST http://localhost:3000/trust/refresh
```

### Generate Executive Summary

```bash
curl http://localhost:3000/reports/executive-summary
```

### Export Report

```bash
curl -X POST http://localhost:3000/reports/export \
  -H "Content-Type: application/json" \
  -d '{"format": "markdown"}' \
  -o executive_summary.md
```

## Future Enhancements

- **Vector Embeddings**: Semantic agent similarity
- **ML Anomaly Detection**: Advanced drift detection
- **Predictive Trust**: Forecast trust score trends
- **Multi-Dimensional Scoring**: Custom KPI weights
- **Real-Time Streaming**: WebSocket updates
- **Historical Analysis**: Time-series trend analysis
