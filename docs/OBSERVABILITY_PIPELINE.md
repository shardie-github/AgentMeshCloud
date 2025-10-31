# Observability Pipeline

The observability pipeline provides comprehensive telemetry ingestion, KPI aggregation, anomaly detection, and dashboard synchronization capabilities.

## Architecture

```
OTEL Traces/Metrics → Telemetry Ingest → Supabase
                                            ↓
                                      KPI Rollups (Hourly/Daily)
                                            ↓
                                      Anomaly Detector
                                            ↓
                                      Dashboard Sync → Grafana/Datadog
```

## Components

### 1. Telemetry Ingest (`observability/telemetry_ingest.ts`)

Streams OpenTelemetry traces and metrics to Supabase for long-term storage and analysis.

**Features:**
- Batch processing with configurable flush intervals (default: 10s)
- Buffer management for high throughput
- Automatic retry on failures
- Event emission for monitoring

**Usage:**
```typescript
import { createTelemetryIngestor } from './observability/telemetry_ingest';

const ingestor = createTelemetryIngestor();

// Ingest a trace
await ingestor.ingestTrace({
  timestamp: new Date(),
  service: 'api',
  traceId: '...',
  spanId: '...',
  operation: 'GET /users',
  duration_ms: 45,
  status: 'ok'
});

// Ingest a metric
await ingestor.ingestMetric({
  timestamp: new Date(),
  service: 'api',
  metric_name: 'http.requests',
  metric_type: 'counter',
  value: 1,
  labels: { method: 'GET', status: '200' }
});
```

**Configuration:**
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key for writes

### 2. KPI Rollups (`observability/kpi_rollups.ts`)

Performs hourly and daily aggregations of raw telemetry data into materialized views for efficient dashboard queries.

**Features:**
- Hourly rollups at :05 past every hour
- Daily rollups at 00:15
- Materialized view refresh
- Ad-hoc rollup support

**Aggregated Metrics:**
- Total requests
- Error count and rate
- Average, P50, P95, P99 latency
- Uptime percentage

**Usage:**
```typescript
import { createKPIRollupEngine } from './observability/kpi_rollups';

const engine = createKPIRollupEngine();
engine.start(); // Start scheduled rollups

// Get latest KPIs
const kpis = await engine.getLatestKPIs('api');

// Get KPI trends
const trends = await engine.getKPITrends('api', '2024-01-01', '2024-01-31');
```

### 3. Anomaly Detector (`observability/anomaly_detector.ts`)

Detects drift, SLA breaches, and KPI regressions using statistical analysis.

**Detection Methods:**
- **Drift Detection:** Z-score based (threshold: 3σ)
- **Regression Detection:** 20% degradation from P95 baseline
- **Spike Detection:** 200% above baseline
- **SLA Breach:** Error rate >1%, uptime <99.9%

**Usage:**
```typescript
import { createAnomalyDetector } from './observability/anomaly_detector';

const detector = await createAnomalyDetector();

// Detect anomalies in last 5 minutes
const anomalies = await detector.detectAnomalies(5);

// Listen for anomaly events
detector.on('anomaly_detected', (anomaly) => {
  console.log('Anomaly:', anomaly);
  // Trigger alerts, notifications, etc.
});
```

**Anomaly Types:**
- `drift`: Statistical deviation from baseline
- `sla_breach`: SLA threshold violation
- `regression`: Performance degradation
- `spike`: Sudden traffic increase

### 4. Dashboard Sync (`observability/dashboard_sync.ts`)

Pushes metrics to external dashboards via their APIs.

**Supported Platforms:**
- Grafana (annotations)
- Datadog (metrics & events)
- Looker (coming soon)
- Tableau (coming soon)

**Usage:**
```typescript
import { createDashboardSyncEngine } from './observability/dashboard_sync';

const sync = createDashboardSyncEngine();

// Sync latest KPIs
await sync.syncLatestKPIs();

// Push custom event
await sync.pushEvent(
  'Deployment Completed',
  'v1.2.3 deployed to production',
  'info'
);

// Create Grafana dashboard
const dashboardUrl = await sync.createGrafanaDashboard(dashboardJson);
```

**Configuration:**
- `GRAFANA_URL`: Grafana instance URL
- `GRAFANA_API_KEY`: Grafana API key
- `DATADOG_API_KEY`: Datadog API key
- `DATADOG_APP_KEY`: Datadog application key

## Database Schema

### Tables

```sql
-- Raw telemetry traces
CREATE TABLE telemetry_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  service TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  span_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  duration_ms FLOAT NOT NULL,
  status TEXT NOT NULL,
  attributes JSONB DEFAULT '{}',
  resource JSONB DEFAULT '{}'
);

-- Raw telemetry metrics
CREATE TABLE telemetry_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  service TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value FLOAT NOT NULL,
  labels JSONB DEFAULT '{}'
);

-- Hourly KPI rollups
CREATE TABLE kpi_rollups_hourly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  service TEXT NOT NULL,
  total_requests INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  error_rate FLOAT NOT NULL,
  avg_duration_ms FLOAT NOT NULL,
  p50_duration_ms FLOAT NOT NULL,
  p95_duration_ms FLOAT NOT NULL,
  p99_duration_ms FLOAT NOT NULL
);

-- Daily KPI materialized view
CREATE MATERIALIZED VIEW mv_kpis_daily AS
SELECT ...;

-- Anomalies
CREATE TABLE anomalies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL,
  service TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  anomaly_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  current_value FLOAT NOT NULL,
  expected_value FLOAT NOT NULL,
  deviation_percent FLOAT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE
);
```

## Monitoring

The observability pipeline itself is monitored through:
- Event emissions for pipeline health
- Buffer utilization metrics
- Processing latency tracking
- Error rate monitoring

## Runbooks

### High Memory Usage
1. Check buffer sizes: `ingestor.getStats()`
2. Reduce flush interval if needed
3. Increase batch size for better throughput

### Missing Metrics
1. Verify OTEL configuration
2. Check Supabase connectivity
3. Review ingestion errors in logs

### Anomaly False Positives
1. Re-calculate baselines: `detector.initializeBaselines(30)`
2. Adjust Z-score threshold if needed
3. Review metric thresholds

## Best Practices

1. **Retention:** Raw telemetry retained for 30 days, aggregates for 90 days
2. **Sampling:** Use sampling for high-volume traces (1-10%)
3. **Cardinality:** Limit metric label cardinality to avoid explosion
4. **Baselines:** Refresh baselines weekly to adapt to traffic patterns
5. **Alerts:** Configure alert routing in `reliability/alerts_config.yaml`
