# UADSI KPI Formulas

## Trust Score (TS)

The Trust Score is a weighted composite metric measuring overall system health:

```
TS = (agent_uptime × 0.30) + (policy_adherence × 0.30) + (sync_freshness × 0.25) + (risk_exposure × 0.15)
```

### Components:

1. **Agent Uptime Score**: `success_count / (success_count + errors)`
   - Measures operational reliability across all agents
   - Range: 0.0 to 1.0

2. **Policy Adherence Score**: `max(0, 1 - (violations / events × 20))`
   - Penalizes policy violations heavily
   - 5% violation rate = 0 score
   - Range: 0.0 to 1.0

3. **Sync Freshness Score**: `sync_freshness_pct / 100`
   - Percentage of workflows receiving events within SLO
   - Range: 0.0 to 1.0

4. **Risk Exposure Score**: `avg(agent_trust_levels)`
   - Average trust level across all agents
   - Range: 0.0 to 1.0

### Interpretation:
- ≥ 0.85: Excellent
- 0.70 - 0.85: Good
- 0.50 - 0.70: Moderate (requires attention)
- < 0.50: Critical (immediate action required)

---

## Risk Avoided (RA$)

Risk Avoided measures the financial value of prevented incidents:

```
RA$ = baseline_incident_cost × (TS - baseline_trust) × num_agents
```

### Parameters:
- `baseline_incident_cost`: Expected cost per incident without ORCA (default: $10,000)
- `baseline_trust`: Baseline trust score without ORCA (default: 0.85)
- `num_agents`: Total number of managed agents

### Interpretation:
- Positive RA$: System is preventing incidents and saving money
- Negative RA$: System performance below baseline (investigate immediately)
- Higher RA$: More effective risk mitigation

---

## Sync Freshness %

Measures the percentage of workflows receiving events within their freshness SLO:

```
Sync Freshness % = (fresh_workflows / total_workflows) × 100
```

### Definition:
- **Fresh Workflow**: Received at least one event within `SYNC_FRESHNESS_SLO_HOURS` (default: 24 hours)
- **Stale Workflow**: No events received within SLO window

### Interpretation:
- ≥ 95%: Excellent synchronization
- 90% - 95%: Good (minor stale workflows)
- 75% - 90%: Moderate (investigate stale workflows)
- < 75%: Poor (sync issues detected)

---

## Drift Rate %

Percentage of workflows exhibiting drift beyond acceptable thresholds:

```
Drift Rate % = (workflows_with_drift / total_workflows) × 100
```

### Drift Detection Criteria:
- Staleness > 2× freshness SLO
- Configuration changes detected
- Behavioral anomalies identified

### Interpretation:
- < 5%: Excellent (target threshold)
- 5% - 10%: Acceptable (monitor trends)
- 10% - 20%: Elevated (remediation recommended)
- > 20%: Critical (immediate action required)

---

## Compliance SLA %

Measures adherence to operational and policy compliance requirements:

```
Compliance SLA % = ((policy_adherence_score + agent_uptime_score) / 2) × 100
```

### Interpretation:
- ≥ 99.5%: Meets enterprise SLA (target)
- 99.0% - 99.5%: Acceptable
- 95.0% - 99.0%: Below target (improvement needed)
- < 95.0%: Non-compliant (corrective action required)

---

## Agent Health Score

Per-agent health metric:

```
AHS = success_rate × max(0, 1 - errors/100) × max(0, 1 - violations/50) × latency_factor
```

Where:
- `success_rate = success_count / (success_count + errors)`
- `latency_factor = latency_ms < 1000 ? 1.0 : max(0.5, 1000 / latency_ms)`

### Status Thresholds:
- ≥ 0.75: Healthy
- 0.50 - 0.75: Degraded
- < 0.50: Critical

---

## Confidence Level

Measures confidence in trust score based on data availability:

```
Confidence = min(1.0, avg_telemetry_points / 50)
```

### Interpretation:
- ≥ 50 telemetry points per agent: 100% confidence
- 25 points: 50% confidence
- < 10 points: Low confidence (insufficient data)

---

## Notes

1. All percentages are clamped to [0, 100]
2. All scores are clamped to [0, 1.0]
3. Formulas use exponential moving averages for time-series data
4. Thresholds are configurable via environment variables
5. Historical trends tracked for anomaly detection
