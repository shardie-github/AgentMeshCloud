# Remediation Patches

This directory contains code patches and configuration updates to harden discovered automations.

## Patch Application Guide

### Prerequisites
- Node.js 18+
- Access to production/staging environments
- Backup of current configurations
- Test environment for validation

### Application Order

Apply patches in this order to minimize risk:

1. **Low-Risk** (0-2 hours downtime, easy rollback)
2. **Medium-Risk** (2-4 hours downtime, moderate complexity)
3. **High-Risk** (requires maintenance window, complex rollback)

---

## Patch Catalog

### P0 - Critical Fixes

#### 1. Webhook Authentication
**File:** `webhook-auth.ts`  
**Risk:** Low  
**Downtime:** 0 minutes  
**Rollback:** Easy (feature flag)

Add HMAC signature validation to webhook endpoints.

```bash
# Apply
cp patches/webhook-auth.ts packages/shared/src/utils/webhook.ts
npm run build
npm run deploy:staging
# Test webhook delivery
npm run test:webhooks
# Deploy to production
npm run deploy:production
```

#### 2. API Key Rotation
**File:** `rotate-api-keys.sh`  
**Risk:** Medium  
**Downtime:** 0 minutes (blue-green)  
**Rollback:** Medium (7-day grace period)

Generate environment-specific API keys.

```bash
# Apply
chmod +x patches/rotate-api-keys.sh
./patches/rotate-api-keys.sh
# Update configs
npm run config:update
# Deploy new configs
npm run deploy:rolling
```

#### 3. Idempotency Middleware
**File:** `idempotency-middleware.ts`  
**Risk:** Low  
**Downtime:** 0 minutes  
**Rollback:** Easy (middleware disabled)

Add idempotency key support to API Gateway.

```bash
# Apply
cp patches/idempotency-middleware.ts apps/orchestrator/src/middleware/idempotency.ts
npm run build
# Deploy in permissive mode
IDEMPOTENCY_ENFORCE=false npm run deploy:production
# Monitor for 48 hours
npm run monitor:idempotency
# Enable enforcement
IDEMPOTENCY_ENFORCE=true npm run deploy:production
```

#### 4. SAGA Pattern
**File:** `saga-pattern.ts`  
**Risk:** High  
**Downtime:** 30 minutes (deployment)  
**Rollback:** Hard (requires data cleanup)

Implement SAGA coordinator for financial workflows.

```bash
# Apply
cp patches/saga-pattern.ts packages/shared/src/patterns/saga.ts
npm run build
# Test in staging
npm run test:saga:staging
# Deploy with feature flag
SAGA_ENABLED=true npm run deploy:production
# Monitor rollback execution
npm run monitor:saga
```

---

### P1 - High Priority

#### 5. DLQ for Workers
**File:** `dlq-worker.ts`  
**Risk:** Low  
**Downtime:** 5 minutes (worker restart)  
**Rollback:** Easy

Add dead letter queue to all background workers.

```bash
# Apply
cp patches/dlq-worker.ts apps/orchestrator/src/workers/base-worker.ts
npm run build
# Deploy workers sequentially
npm run deploy:worker:workflow
npm run deploy:worker:a2a
npm run deploy:worker:agent
# Verify DLQ dashboard
npm run dashboard:dlq
```

#### 6. Circuit Breakers
**File:** `circuit-breaker-integration.ts`  
**Risk:** Low  
**Downtime:** 0 minutes  
**Rollback:** Easy

Add circuit breakers to external API calls.

```bash
# Apply
cp patches/circuit-breaker-integration.ts apps/orchestrator/src/services/MCPService.ts
npm run build
npm run deploy:rolling
# Monitor circuit breaker state
npm run monitor:circuit-breakers
```

#### 7. Rate Limiter
**File:** `api-gateway-rate-limit.ts`  
**Risk:** Medium  
**Downtime:** 2 minutes  
**Rollback:** Easy

Apply rate limiter to API Gateway.

```bash
# Apply
cp patches/api-gateway-rate-limit.ts ai-agent-mesh/src/api/index.ts
npm run build
# Deploy with high limit (test mode)
RATE_LIMIT=10000 npm run deploy:production
# Monitor false positives
npm run monitor:rate-limit
# Adjust to production limit
RATE_LIMIT=1000 npm run deploy:production
```

---

### P2 - Medium Priority

#### 8. HRIS Sync
**File:** `hris-sync.ts`  
**Risk:** High  
**Downtime:** 0 minutes  
**Rollback:** Medium

Automated HRIS sync for RBAC.

```bash
# Apply
cp patches/hris-sync.ts apps/orchestrator/src/services/HRISSync.ts
npm run build
# Test HRIS connectivity
npm run test:hris:connection
# Deploy sync service
npm run deploy:hris-sync
# Verify initial sync
npm run hris:verify-sync
```

#### 9. Correlation IDs
**File:** `correlation-id.ts`  
**Risk:** Low  
**Downtime:** 0 minutes  
**Rollback:** Easy

Add correlation IDs to all requests.

```bash
# Apply
cp patches/correlation-id.ts packages/shared/src/middleware/correlation.ts
npm run build
npm run deploy:all-services
# Verify traces link correctly
npm run verify:correlation
```

---

## Testing Checklist

### Pre-Deployment
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Staging deployment successful
- [ ] Load test results acceptable
- [ ] Rollback plan documented

### Post-Deployment
- [ ] Health checks green
- [ ] Error rate within SLA
- [ ] Latency within SLA
- [ ] No alerts triggered
- [ ] Logs show expected behavior

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes)
```bash
# Revert to previous version
npm run rollback:immediate

# Or revert specific service
npm run rollback:service -- --name=api-gateway --version=v1.2.3
```

### Feature Flag Rollback
```bash
# Disable feature flag
npm run feature:disable -- --flag=IDEMPOTENCY_ENFORCE

# Or via environment variable
IDEMPOTENCY_ENFORCE=false npm run restart:api-gateway
```

### Database Rollback (High-Risk Patches)
```bash
# Restore from backup
npm run db:restore -- --timestamp=2025-10-30T12:00:00Z

# Or run compensating migrations
npm run migrate:down -- --steps=1
```

---

## Monitoring & Validation

### Key Metrics to Monitor

#### Security Patches
- `webhook_signature_validation_failures` (should be 0 after warmup)
- `api_key_usage_by_environment` (should be scoped)
- `unauthorized_access_attempts` (should decrease)

#### Reliability Patches
- `idempotency_cache_hit_rate` (should be >5%)
- `dlq_depth` (should be <10)
- `circuit_breaker_state` (should be mostly CLOSED)
- `saga_rollback_count` (should be minimal)

#### Performance Patches
- `rate_limit_429_count` (should be <1% of requests)
- `p95_latency` (should improve or stay same)
- `correlation_id_coverage` (should be 100%)

### Alerts to Configure

```yaml
# prometheus alerts
groups:
  - name: patch_validation
    rules:
      - alert: WebhookAuthFailureHigh
        expr: rate(webhook_signature_failures[5m]) > 0.1
        annotations:
          summary: "High webhook auth failure rate"
      
      - alert: DLQDepthCritical
        expr: dlq_depth > 100
        annotations:
          summary: "DLQ depth exceeds threshold"
      
      - alert: CircuitBreakerOpen
        expr: circuit_breaker_state{state="OPEN"} > 0
        annotations:
          summary: "Circuit breaker open for {{$labels.service}}"
```

---

## Support & Troubleshooting

### Common Issues

#### Webhook Authentication Failing
```bash
# Check secret configuration
npm run config:verify -- --key=ZAPIER_WEBHOOK_SECRET

# Test signature generation
npm run test:webhook-signature

# Review webhook logs
npm run logs:webhooks -- --since=1h
```

#### Idempotency Cache Miss
```bash
# Verify Redis connection
npm run health:redis

# Check cache TTL
redis-cli TTL idempotency:${KEY}

# Review cache hit rate
npm run metrics:idempotency
```

#### SAGA Rollback Failure
```bash
# Review compensation logs
npm run logs:saga -- --filter=compensate

# Manual compensation
npm run saga:compensate -- --transaction-id=${TXN_ID}

# Send to DLQ for manual review
npm run saga:dlq -- --transaction-id=${TXN_ID}
```

---

## Validation Scripts

### Automated Validation
```bash
# Run full validation suite
npm run validate:patches

# Or validate specific patch
npm run validate:patch -- --name=webhook-auth
```

### Manual Validation
```bash
# Test webhook signature
curl -X POST https://api.example.com/webhooks/zapier \
  -H "X-Zapier-Signature: ${SIGNATURE}" \
  -d '{"event":"test"}'

# Test idempotency
UUID=$(uuidgen)
curl -X POST https://api.example.com/api/workflows \
  -H "Idempotency-Key: $UUID" \
  -d '{"name":"test"}'
# Repeat - should return cached response

# Test circuit breaker
# Trigger 5 failures to open circuit
for i in {1..5}; do
  curl https://api.example.com/external/failing-endpoint
done
# Next request should fail fast with "Circuit breaker is OPEN"
```

---

## Emergency Contacts

- **Security Issues:** security@acme.com, +1-555-0100
- **Production Incidents:** ops@example.com, PagerDuty
- **Compliance Questions:** compliance@acme.com
- **On-Call Engineer:** See PagerDuty schedule

---

## Change Log

| Date | Patch | Status | Notes |
|------|-------|--------|-------|
| 2025-10-30 | All | Created | Initial patch set |

---

**Last Updated:** 2025-10-30  
**Maintainer:** ops@example.com
