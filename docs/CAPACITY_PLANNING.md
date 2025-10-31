# Capacity Planning & Forecasting

Predictive capacity planning using time series forecasting to proactively scale before hitting limits.

## Overview

The capacity forecasting system uses double exponential smoothing (Holt's method) to predict resource utilization 30 and 90 days ahead, enabling proactive scaling decisions.

```
Historical Metrics → Forecasting Engine → Predictions → Alert Threshold Updates → Proactive Scaling
```

## Components

### 1. Capacity Forecaster (`reliability/forecast.ts`)

**Forecasted Metrics:**
- Request rate
- Error rate
- P95/P99 latency
- Database connections
- Database size
- Memory usage
- CPU usage

**Forecast Outputs:**
- 30-day forecast
- 90-day forecast
- Confidence intervals
- Trend direction
- Breach probability
- Recommended actions

**Usage:**
```typescript
import { createCapacityForecaster } from './reliability/forecast';

const forecaster = createCapacityForecaster();

// Generate forecasts for all metrics
const forecasts = await forecaster.generateForecasts();

forecasts.forEach(forecast => {
  console.log(`${forecast.metric}:`);
  console.log(`  Current: ${forecast.current_value}`);
  console.log(`  30d forecast: ${forecast.forecast_30d}`);
  console.log(`  90d forecast: ${forecast.forecast_90d}`);
  console.log(`  Breach probability: ${(forecast.breach_probability_90d * 100).toFixed(1)}%`);
  console.log(`  Trend: ${forecast.trend}`);
  console.log(`  Recommendations:`, forecast.recommended_actions);
});

// Update alert thresholds dynamically
await forecaster.updateAlertThresholds();
```

### 2. Alert Configuration (`reliability/alerts_config.yaml`)

Dynamic alert configuration that auto-tunes based on forecasts.

**Structure:**
```yaml
thresholds:
  request_rate:
    warning: 8000
    critical: 10000
    auto_scale: true
    evaluation_window: "5m"

rules:
  - name: capacity_warning
    condition: forecast.breach_probability_30d > 0.5
    severity: high
    message: "Capacity warning: {{ $metric }} has {{ $probability }}% chance of breaching in 30 days"
    runbook_url: "https://docs/runbooks/capacity-planning"

routing:
  channels:
    - name: slack_ops
      type: slack
      webhook_url: ${SLACK_OPS_WEBHOOK}
      severity_filter: ["high", "critical"]
```

**Features:**
- Dynamic threshold adjustment
- Alert grouping and deduplication
- Maintenance window support
- Auto-remediation actions
- Escalation policies

## Forecasting Algorithm

### Double Exponential Smoothing (Holt's Method)

Used for metrics with trend but no seasonality:

```
Level: L[t] = α * Y[t] + (1 - α) * (L[t-1] + T[t-1])
Trend: T[t] = β * (L[t] - L[t-1]) + (1 - β) * T[t-1]
Forecast: F[t+h] = L[t] + h * T[t]
```

Where:
- `α` (alpha) = 0.3: Level smoothing parameter
- `β` (beta) = 0.1: Trend smoothing parameter
- `h`: Forecast horizon (30 or 90 days)

### Breach Probability

Calculated using normal distribution:

```
Z = (Threshold - Forecast) / StdDev
P(breach) = 1 - Φ(Z)
```

Where Φ is the cumulative distribution function.

## Capacity Alerts

### Alert Types

1. **Threshold Breach** (Critical)
   - Current value ≥ 95% of threshold
   - Immediate action required

2. **Capacity Warning** (High)
   - >50% probability of breaching in 30 days
   - Plan scaling within 1-2 weeks

3. **Rapid Growth** (Medium)
   - Projected 50%+ growth in 30 days
   - Monitor closely

### Alert Actions

Alerts are automatically generated and routed based on configuration:

```typescript
// Alerts stored in database
CREATE TABLE capacity_alerts (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  metric TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  forecast_data JSONB NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE
);
```

## Database Schema

```sql
-- Capacity forecasts
CREATE TABLE capacity_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  metric TEXT NOT NULL,
  current_value FLOAT NOT NULL,
  forecast_30d FLOAT NOT NULL,
  forecast_90d FLOAT NOT NULL,
  confidence_interval_low FLOAT NOT NULL,
  confidence_interval_high FLOAT NOT NULL,
  trend TEXT NOT NULL,
  alert_threshold FLOAT NOT NULL,
  breach_probability_30d FLOAT NOT NULL,
  breach_probability_90d FLOAT NOT NULL,
  recommended_actions JSONB NOT NULL
);

-- Metric thresholds (configurable)
CREATE TABLE metric_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT UNIQUE NOT NULL,
  threshold FLOAT NOT NULL,
  auto_adjust BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

## Workflows

### Daily Forecast Generation

Run via cron or GitHub Actions:

```bash
# Generate forecasts
tsx reliability/forecast.ts --generate

# Update alert thresholds
tsx reliability/forecast.ts --update-thresholds
```

Schedule in cron:
```
0 3 * * * cd /app && tsx reliability/forecast.ts --generate
```

### Weekly Capacity Review

1. Review forecast dashboard
2. Identify metrics with high breach probability
3. Plan scaling/optimization actions
4. Update capacity runbooks

## Capacity Runbooks

### High Database Connections

**Symptoms:**
- Forecast shows >80% connection pool utilization in 30 days

**Actions:**
1. Review connection pool configuration
2. Implement connection pooling (PgBouncer)
3. Optimize long-running queries
4. Scale database tier

### High Database Size

**Symptoms:**
- Forecast shows database size exceeding plan limits in 90 days

**Actions:**
1. Implement data archival for old records
2. Compress large tables
3. Review retention policies
4. Upgrade storage tier

### High Request Rate

**Symptoms:**
- Forecast shows request rate exceeding capacity in 30 days

**Actions:**
1. Enable auto-scaling for compute
2. Implement rate limiting
3. Add caching layer (Redis)
4. Optimize expensive endpoints

## Integration with Auto-Scaling

```typescript
// Example: Trigger scaling based on forecast
const forecasts = await forecaster.generateForecasts();

const requestRateForecast = forecasts.find(f => f.metric === 'request_rate');

if (requestRateForecast.breach_probability_30d > 0.7) {
  // Proactively scale up
  await scaleComputeResources({
    desired_capacity: Math.ceil(requestRateForecast.forecast_30d / 1000),
    reason: 'Capacity forecast indicates high load'
  });
}
```

## Metrics & KPIs

Track forecasting accuracy:

- **Forecast Accuracy:** Mean Absolute Percentage Error (MAPE)
- **Alert Precision:** % of alerts resulting in actual breaches
- **Lead Time:** Days of advance warning before breach
- **Prevention Rate:** % of breaches prevented by proactive action

## Best Practices

1. **Review Regularly:** Weekly capacity planning meetings
2. **Update Thresholds:** Adjust based on SLA requirements
3. **Test Forecasts:** Compare predictions vs actuals monthly
4. **Document Actions:** Track scaling decisions and outcomes
5. **Automate Remediation:** Where safe, auto-scale based on forecasts

## Advanced: Seasonal Decomposition

For metrics with seasonal patterns (e.g., business hours), use STL decomposition:

```typescript
// Future enhancement: Add seasonal component
// Forecast[t] = Trend[t] + Seasonal[t] + Residual[t]
```

## References

- [Holt's Linear Trend Method](https://otexts.com/fpp2/holt.html)
- [Forecasting: Principles and Practice](https://otexts.com/fpp2/)
- [AWS Capacity Planning](https://aws.amazon.com/architecture/well-architected/)
