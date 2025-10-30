# Chaos Engineering

Chaos experiments to validate ORCA Platform resilience under failure conditions.

## Overview

Chaos engineering proactively injects failures to verify system resilience, graceful degradation, and recovery mechanisms. These experiments run in controlled environments (staging, pre-production) to surface weaknesses before they impact production.

## Experiments

### 1. Latency Injection

**File**: `inject_latency.ts`

**Purpose**: Verify system handles network delays gracefully

**Scenarios**:
- Random latency (100ms - 1000ms) on 10% of requests
- Persistent high latency (2s+) to trigger timeouts
- Latency on specific endpoints (e.g., database queries)

**Configuration**:
```env
CHAOS_LATENCY_ENABLED=true
CHAOS_LATENCY_MIN_MS=100
CHAOS_LATENCY_MAX_MS=1000
CHAOS_LATENCY_PROBABILITY=0.1  # 10% of requests
CHAOS_LATENCY_EXCLUDE_PATHS=/health,/metrics
CHAOS_LATENCY_TARGET_PATHS=/api/workflows  # Optional: target specific paths
```

**Expected Behavior**:
- ✅ Requests complete successfully (with delay)
- ✅ Error rate remains <5%
- ✅ P95 latency within SLO (<5s)
- ✅ Timeouts rare (<1%)
- ✅ Circuit breakers activate if needed

**Run Test**:
```bash
# Enable latency injection
export CHAOS_LATENCY_ENABLED=true
export CHAOS_LATENCY_PROBABILITY=0.5

# Start server with middleware
npm run dev

# Generate load
npm run load:test

# Verify resilience
tsx chaos/inject_latency.ts -- --verify
```

### 2. Database Connection Failure

**File**: `drop_db_conn.ts`

**Purpose**: Verify graceful degradation when database unavailable

**Scenarios**:
- Connection timeouts
- Connection refused (database down)
- Connection pool exhaustion
- Primary database failover

**Configuration**:
```env
CHAOS_DB_ENABLED=true
CHAOS_DB_PROBABILITY=0.05  # 5% of queries
CHAOS_DB_MODE=timeout  # timeout | connection_refused | random
CHAOS_DB_TIMEOUT_MS=5000
CHAOS_DB_RECOVERY_MS=10000
```

**Expected Behavior**:
- ✅ Circuit breaker activates after threshold
- ✅ Fail-fast (no hanging requests)
- ✅ Graceful error messages to users
- ✅ Automatic failover to replica (<30s)
- ✅ Read queries served from replica
- ✅ Write queue holds updates during outage

**Run Test**:
```bash
# Test database failover
tsx chaos/drop_db_conn.ts -- --test-failover

# Test connection pool exhaustion
tsx chaos/drop_db_conn.ts -- --test-pool-exhaustion

# Verify circuit breaker
tsx chaos/drop_db_conn.ts -- --verify-circuit-breaker
```

### 3. CPU Saturation

**Purpose**: Verify system degrades gracefully under CPU pressure

**Scenarios**:
- Spike to 90% CPU usage
- Sustained 80% CPU for 10 minutes

**Expected Behavior**:
- ✅ Autoscaling triggers within 2 minutes
- ✅ New instances added
- ✅ P95 latency increases but stays <10s
- ✅ No request rejections

**Run Test** (requires K8s or ECS):
```bash
# Stress test
npm run load:test -- --duration=600 --rps=200
```

### 4. Memory Leak

**Purpose**: Detect and handle memory exhaustion

**Scenarios**:
- Gradual memory growth (leak simulation)
- Sudden memory spike

**Expected Behavior**:
- ✅ Memory alerts trigger
- ✅ Process restart or pod eviction before OOM
- ✅ Graceful drain of connections
- ✅ No data loss

**Run Test**:
```bash
# Requires custom script to leak memory
node scripts/chaos-memory-leak.js
```

### 5. Network Partition

**Purpose**: Verify distributed systems handle split-brain scenarios

**Scenarios**:
- API cannot reach database
- Service A cannot reach Service B
- Full cluster partition

**Expected Behavior**:
- ✅ No data corruption
- ✅ Consistent state after recovery
- ✅ Requests queued or rejected (not lost)

**Run Test** (requires infrastructure access):
```bash
# Using tools like toxiproxy or iptables
# See infrastructure team for runbook
```

### 6. Dependency Failure

**Purpose**: Verify resilience when external services fail

**Scenarios**:
- Supabase API down
- n8n/Zapier webhooks timeout
- Stripe payment processing unavailable

**Expected Behavior**:
- ✅ Circuit breaker opens
- ✅ Fallback to cached data
- ✅ Graceful error messages
- ✅ Retry with exponential backoff
- ✅ Manual intervention documented

**Run Test**:
```bash
# Mock external service failures
MOCK_SUPABASE_DOWN=true npm run e2e
```

## Running Experiments

### Manual Execution

```bash
# Individual test
tsx chaos/inject_latency.ts -- --verify

# Full chaos suite (safe mode: staging only)
npm run chaos:test

# Specific experiment
npm run chaos:test -- --experiment=latency
```

### CI Integration

```yaml
# .github/workflows/ops-ci.yml
- name: Chaos Tests (Staging)
  run: |
    npm run chaos:test -- --env=staging
  continue-on-error: true  # Don't block deploy on chaos failure
```

### Production GameDays

⚠️ **Production chaos requires approval and planning**

**Process**:
1. Schedule GameDay (e.g., Tuesday 10 AM PT, low-traffic window)
2. Notify team and stakeholders
3. Ensure runbooks up-to-date
4. On-call engineer available
5. Enable chaos with low probability (1-5%)
6. Monitor for 30-60 minutes
7. Disable chaos and review results
8. Post-mortem: document findings and improvements

**Example**:
```bash
# Production chaos (very low probability)
export CHAOS_LATENCY_ENABLED=true
export CHAOS_LATENCY_PROBABILITY=0.01  # 1%
export CHAOS_LATENCY_MAX_MS=500

# Monitor Grafana dashboard
# Disable after 1 hour or if issues detected
```

## Metrics & Success Criteria

### Experiment Health Metrics

**Availability**:
```
uptime >= 99.9% during chaos
```

**Error Rate**:
```
(4xx + 5xx) / total_requests < 5%
```

**Latency** (with chaos active):
```
P50 < 2x baseline
P95 < 5x baseline
P99 < 10s (absolute max)
```

**Recovery Time**:
```
Return to baseline within 60s of chaos disabled
```

### Resilience Patterns Validated

✅ **Circuit Breakers**:
- Open after N consecutive failures
- Half-open trial after cooldown
- Close when success rate >90%

✅ **Retries**:
- Exponential backoff (1s, 2s, 4s, 8s)
- Maximum 3 retries
- Idempotency keys prevent duplicates

✅ **Timeouts**:
- Connection timeout: 5s
- Request timeout: 30s
- Graceful shutdown: 60s

✅ **Graceful Degradation**:
- Serve stale data if database unavailable (<5min old)
- Queue writes for replay
- Disable non-critical features

✅ **Observability**:
- All failures logged with context
- Metrics exported to Prometheus
- Alerts fired for sustained failures

## Incident Response

If chaos experiment causes production impact:

1. **Immediately disable chaos** (set `CHAOS_*_ENABLED=false`)
2. **Check runbook** for experiment-specific recovery
3. **Escalate** if not recovered in 5 minutes
4. **Incident report** required for post-mortem

## Safety Guardrails

**Excluded Paths**:
- `/health` - Health checks must always succeed
- `/metrics` - Monitoring must be unaffected
- `/admin` - Admin functions protected

**Excluded Environments**:
- `development` - Only if explicitly enabled
- `production` - Requires approval and monitoring

**Throttling**:
- Max failure probability: 20%
- Max concurrent experiments: 1
- Min time between experiments: 1 hour

**Abort Conditions** (automatic):
- Error rate >10%
- P95 latency >10s
- Available replicas <2
- On-call paged

## Tools & Integrations

**Chaos Mesh** (Kubernetes):
```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay-orca
spec:
  action: delay
  mode: one
  selector:
    namespaces:
      - orca-production
    labelSelectors:
      app: orca-api
  delay:
    latency: "1000ms"
    correlation: "25"
    jitter: "500ms"
```

**Toxiproxy** (HTTP proxy with fault injection):
```bash
# Add latency to database connection
toxiproxy-cli toxic add -t latency -a latency=1000 postgres-proxy
```

**Gremlin** (SaaS chaos platform):
- Pre-built experiments
- Scheduled runs
- Built-in safety shutoffs

## Learning Resources

- **Books**:
  - "Chaos Engineering" by Casey Rosenthal, Nora Jones
  - "Site Reliability Engineering" (Google)

- **Principles of Chaos**:
  1. Build a hypothesis around steady-state behavior
  2. Vary real-world events
  3. Run experiments in production
  4. Automate experiments to run continuously
  5. Minimize blast radius

- **External Links**:
  - [Principles of Chaos Engineering](https://principlesofchaos.org/)
  - [Netflix Chaos Engineering](https://netflixtechblog.com/chaos-engineering-at-netflix-b8b0ad26)
  - [AWS Fault Injection Simulator](https://aws.amazon.com/fis/)

## Contact

**Chaos Engineering Team**: chaos@orca-platform.example  
**On-Call Escalation**: See `incident/ESCALATION_POLICY.yaml`  
**Runbooks**: `incident/RUNBOOKS/`
