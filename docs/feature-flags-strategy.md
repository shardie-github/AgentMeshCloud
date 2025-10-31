# Feature Flags & Safe Rollout Strategy

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Owner:** Engineering & SRE

---

## Overview

Feature flags enable safe, gradual rollouts of new features with instant rollback capability. ORCA uses a hybrid approach:
- **Environment-based flags**: Simple on/off via environment variables (current)
- **Dynamic flags**: Database-backed with user/tenant segmentation (planned v1.1)

---

## Feature Flag Service

### Implementation

**Location:** `/src/flags/flags_service.ts`

```typescript
// Example usage
import { getFlag, isFlagEnabled } from '@/flags/sdk';

// Check if flag is enabled
if (isFlagEnabled('new_trust_algorithm')) {
  // Use new algorithm
} else {
  // Use legacy algorithm
}

// Get flag value with default
const maxRetries = getFlag('max_retry_attempts', 3);
```

### Configuration

**Environment Variables:**
```bash
# Feature Flags
ENABLE_NEW_TRUST_ALGORITHM=true
ENABLE_ADVANCED_POLICIES=false
ENABLE_SELF_HEALING=true
MAX_RETRY_ATTEMPTS=3
SYNC_FRESHNESS_SLO_HOURS=24
```

**Naming Convention:**
- Boolean flags: `ENABLE_[FEATURE_NAME]` (uppercase snake_case)
- Numeric/string flags: `[CONFIG_NAME]` (descriptive, uppercase)

---

## Flag Categories

### 1. **Feature Rollout Flags**
Gradually enable new features to subset of users.

| Flag Name | Description | Default | Rollout Strategy |
|-----------|-------------|---------|-----------------|
| `new_trust_algorithm` | Use ML-based trust scoring | false | Canary → 10% → 50% → 100% over 2 weeks |
| `advanced_policies` | Enable new policy engine | false | Beta users → Pro → All |
| `real_time_websockets` | Enable WebSocket subscriptions | false | Internal → Beta → GA |

**Rollout Plan:**
```
Week 1: Internal testing (0.1% of traffic)
Week 2: Beta users opt-in (selected tenants)
Week 3: Canary rollout (10% of production)
Week 4: Expanded rollout (50% of production)
Week 5: Full rollout (100% of production)
```

### 2. **Kill Switch Flags**
Instant disable for risky features if issues detected.

| Flag Name | Description | Default | Trigger Criteria |
|-----------|-------------|---------|-----------------|
| `enable_self_healing` | Auto-healing engine | true | Disable if >5 failed healing attempts in 1h |
| `enable_agent_discovery` | Automatic agent discovery | true | Disable if discovery causes >10% error rate spike |
| `enable_external_apis` | Call external APIs (Zapier, etc.) | true | Disable if external API latency >5s P95 |

**Auto-Kill Switch Logic:**
```typescript
// Monitor error rate
if (errorRate > 0.05 && featureName === 'self_healing') {
  disableFlag('enable_self_healing');
  sendAlert('Kill switch activated: self_healing', 'critical');
}
```

### 3. **Operational Flags**
Control system behavior and limits.

| Flag Name | Description | Default | Use Case |
|-----------|-------------|---------|----------|
| `max_retry_attempts` | Max retries for failed operations | 3 | Adjust under high load |
| `cache_ttl_seconds` | Cache TTL | 300 | Tune for performance |
| `batch_size` | Batch processing size | 50 | Optimize throughput |

---

## Canary Deployment Strategy

### Canary Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                     Canary Deployment                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Deploy to Canary Environment (5% traffic)              │
│     ├─ Run smoke tests                                     │
│     ├─ Monitor for 30 minutes                              │
│     └─ Check: Error rate, latency, key metrics            │
│                                                             │
│  2. Expand to 25% traffic                                  │
│     ├─ Monitor for 1 hour                                  │
│     └─ Automated rollback if SLO breach                    │
│                                                             │
│  3. Expand to 50% traffic                                  │
│     ├─ Monitor for 2 hours                                 │
│     └─ Manual approval required                            │
│                                                             │
│  4. Expand to 100% traffic                                 │
│     ├─ Monitor for 24 hours                                │
│     └─ Bake period before removing old version            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Success Criteria (per stage)

**Green Light Conditions:**
- ✅ Error rate ≤ baseline + 0.5%
- ✅ P95 latency ≤ baseline + 100ms
- ✅ Trust Score ≥ 80
- ✅ No critical incidents
- ✅ Smoke tests pass

**Red Light (Auto-Rollback):**
- ❌ Error rate > baseline + 2%
- ❌ P95 latency > baseline + 500ms
- ❌ Trust Score < 75
- ❌ Critical incident detected
- ❌ Smoke tests fail

### Rollback Triggers

**Automated Rollback:**
```bash
# Triggered if any condition met
- Error rate spike >5% above baseline
- P95 latency >1.5x baseline
- Critical alerts fired within 10 minutes of deployment
- Health check failures >3 consecutive
```

**Manual Rollback:**
```bash
# Runbook: Instant rollback
pnpm run release:rollback --version=v1.0.5

# Or via Vercel
vercel rollback --env=production
```

---

## Circuit Breakers

### External API Circuit Breaker

**Implementation:** `/src/common/circuit-breaker.ts`

**States:**
- `CLOSED` (normal): Requests pass through
- `OPEN` (failing): Requests immediately fail, periodic test allowed
- `HALF_OPEN` (testing): Single test request, close or re-open based on result

**Configuration:**
```typescript
const zapierCircuitBreaker = new CircuitBreaker({
  name: 'zapier_api',
  failureThreshold: 5,      // Open after 5 failures
  resetTimeout: 60000,       // Try again after 60s
  monitoringPeriod: 120000,  // 2-minute monitoring window
});

// Usage
try {
  const result = await zapierCircuitBreaker.execute(() => 
    fetch('https://api.zapier.com/...')
  );
} catch (error) {
  // Circuit is open, use fallback
  logger.warn('Zapier circuit open, skipping sync');
}
```

### Database Circuit Breaker

**Configuration:**
```typescript
const dbCircuitBreaker = new CircuitBreaker({
  name: 'postgres',
  failureThreshold: 3,
  resetTimeout: 30000,
  healthCheck: async () => {
    return await db.raw('SELECT 1');
  },
});
```

---

## Retry & Backoff Strategy

### Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000;
      await sleep(delay + jitter);
    }
  }
  throw new Error('Max retries exceeded');
}
```

**Retry Policy by Operation:**
| Operation | Max Retries | Base Delay | Jitter |
|-----------|-------------|------------|--------|
| Database query | 3 | 100ms | Yes |
| External API call | 5 | 1000ms | Yes |
| Background job | 3 | 5000ms | Yes |
| User-facing request | 2 | 500ms | Yes |

---

## Monitoring & Alerting

### Flag Change Audit Log

All flag changes are logged:
```typescript
{
  "timestamp": "2025-10-31T12:00:00Z",
  "flag_name": "new_trust_algorithm",
  "previous_value": false,
  "new_value": true,
  "changed_by": "user@example.com",
  "rollout_percentage": 10,
  "reason": "Gradual canary rollout"
}
```

### Metrics

**Flag Usage Metrics:**
```promql
# Flag evaluation count
flag_evaluation_total{flag_name="new_trust_algorithm", enabled="true"}

# Flag rollout percentage
flag_rollout_percentage{flag_name="new_trust_algorithm"}
```

**Circuit Breaker Metrics:**
```promql
# Circuit state (0=closed, 1=open, 2=half_open)
circuit_breaker_state{circuit_name="zapier_api"}

# Circuit open count
circuit_breaker_open_total{circuit_name="zapier_api"}
```

### Alerts

**Flag-Related Alerts:**
- Circuit breaker opened: Slack #oncall + PagerDuty P2
- Kill switch activated: PagerDuty P1
- Canary rollout failed: Slack #eng + PagerDuty P2

---

## Best Practices

### 1. **Flag Lifecycle**
```
Created → Testing → Canary → Rollout → Fully Deployed → Cleanup
```

**Cleanup Policy:**
- Remove flag code 2 weeks after 100% rollout
- Archive flag metadata for audit trail
- Update documentation

### 2. **Testing Flags**
```typescript
// In tests, override flags
process.env.ENABLE_NEW_FEATURE = 'true';

// Or use test helper
setTestFlag('new_trust_algorithm', true);
```

### 3. **Documentation**
For each flag, document:
- Purpose and use case
- Owner (team/person)
- Created date
- Expected removal date
- Rollout plan
- Rollback criteria

---

## Dynamic Flags (Roadmap v1.1)

### Database-Backed Flags

**Schema:**
```sql
CREATE TABLE feature_flags (
  flag_name VARCHAR(100) PRIMARY KEY,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0,
  user_whitelist TEXT[],
  tenant_whitelist TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Advanced Targeting:**
```typescript
// Check flag for specific user
isFlagEnabled('new_ui', { userId: 'user-123' });

// Check flag for specific tenant
isFlagEnabled('advanced_policies', { tenantId: 'tenant-456' });

// Gradual rollout by user hash
isFlagEnabled('ml_recommendations', { 
  userId: 'user-123',
  rolloutPercentage: 25 
});
```

---

## Runbook: Deploying with Canary

### Pre-Deployment
```bash
# 1. Create feature flag (if new feature)
echo "ENABLE_NEW_FEATURE=false" >> .env.production

# 2. Deploy with flag disabled (safety)
vercel --prod

# 3. Verify deployment
pnpm run smoke:test --env=production
```

### Canary Rollout
```bash
# Stage 1: Enable for 5% of traffic
pnpm run deploy:canary --percentage=5

# Monitor for 30 minutes
pnpm run monitoring:watch --duration=30m

# Stage 2: Expand to 25%
pnpm run deploy:canary --percentage=25

# Stage 3: Expand to 50%
pnpm run deploy:canary --percentage=50

# Stage 4: Full rollout
pnpm run deploy:canary --percentage=100
```

### Rollback (if issues)
```bash
# Instant rollback to previous version
pnpm run release:rollback

# Or disable flag immediately
vercel env rm ENABLE_NEW_FEATURE --env=production
vercel --prod  # Re-deploy with flag disabled
```

---

## Support & Resources

- **Flag Service Code**: `/src/flags/flags_service.ts`
- **Circuit Breaker**: `/src/common/circuit-breaker.ts`
- **Deployment Scripts**: `/scripts/deploy/`
- **Monitoring**: Grafana dashboards
- **Questions**: Slack #eng-platform

---

**Last Review:** 2025-10-31  
**Next Review:** 2026-02-01 (quarterly)
