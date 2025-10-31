# ORCA Release Checklist

**RC Tag:** `v______`  
**Release Date:** `____-__-__`  
**Release Manager:** `_____________`

---

## Pre-Release (T-4h)

### Code Freeze

- [ ] Release branch created: `release/X.Y.Z`
- [ ] CHANGELOG.md updated with all changes
- [ ] Version bumped in package.json
- [ ] RC tag created: `git tag vX.Y.Z-rc.N`
- [ ] GitHub branch protection enabled on staging

### Documentation

- [ ] API documentation updated (OpenAPI schema)
- [ ] README.md reflects current version
- [ ] Migration guide created (if breaking changes)
- [ ] Runbooks updated for new features

### Dependencies

- [ ] All dependencies up to date (non-breaking)
- [ ] Security audit clean: `pnpm audit`
- [ ] No critical or high vulnerabilities
- [ ] License compliance verified

---

## Security & Compliance (T-3h)

### Security Scans

- [ ] CodeQL analysis passed
- [ ] Dependency vulnerability scan passed
- [ ] Secret scanning passed
- [ ] SAST (Static Application Security Testing) passed

### Policy Validation

- [ ] OPA/Rego policy gates passed
- [ ] RBAC rules validated
- [ ] Data retention policies enforced
- [ ] Privacy controls (GDPR/CCPA) compliant

### OpenAPI Contract

- [ ] OpenAPI diff generated
- [ ] No breaking changes (or documented with `BREAKING:` in CHANGELOG)
- [ ] Backward compatibility validated
- [ ] Client SDK compatibility confirmed

---

## Database & Infrastructure (T-3h)

### Database Safety

- [ ] Supabase backup created: `./scripts/supabase_backup_now.sh`
- [ ] Backup URL recorded in evidence pack
- [ ] Migration preflight passed (shadow DB)
- [ ] RLS policies validated
- [ ] RPC contracts tested
- [ ] No unsafe DDL detected

### Infrastructure

- [ ] Vercel deployment preview created
- [ ] Environment variables synced: `pnpm run deploy:env-sync`
- [ ] Feature flags configured
- [ ] CDN cache warmed (if applicable)
- [ ] DNS records verified

---

## Testing (T-2h)

### Automated Tests

- [ ] Unit tests passed: `pnpm test`
- [ ] Integration tests passed: `pnpm run test:e2e`
- [ ] Type checking passed: `pnpm typecheck`
- [ ] Linting passed: `pnpm lint`

### Performance & Load

- [ ] k6 load tests passed: `pnpm run load:test`
- [ ] Baseline performance validated (p95 < 500ms)
- [ ] Spike test passed (no errors under 2x load)
- [ ] Soak test passed (24h stability)

### Resilience

- [ ] Chaos tests passed: `pnpm run chaos:test`
- [ ] Database failover validated
- [ ] Circuit breaker behavior confirmed
- [ ] Recovery time < 30s

### DR (Disaster Recovery)

- [ ] Restore from backup validated: `pnpm run dr:check`
- [ ] Data integrity confirmed
- [ ] RPO (Recovery Point Objective) < 15 min
- [ ] RTO (Recovery Time Objective) < 5 min

---

## Quality Gates (T-2h)

### Frontend

- [ ] Lighthouse scores: Perf ≥ 90, A11y ≥ 95, SEO ≥ 95
- [ ] Visual regression tests passed (Playwright)
- [ ] No a11y critical issues
- [ ] Cross-browser testing passed (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness validated

### Backend

- [ ] SLO checks passed: `pnpm run slo:check`
- [ ] API response times < 500ms (p95)
- [ ] Error rate < 1%
- [ ] Throughput > 100 req/s

### Observability

- [ ] OpenTelemetry tracing operational
- [ ] Metrics export to Prometheus working
- [ ] Dashboards updated (Grafana/Vercel Analytics)
- [ ] Alert rules configured

---

## Monitoring & Alerts (T-1h)

### Synthetics

- [ ] Uptime monitors configured: `./synthetics/uptime.http`
- [ ] Trust endpoint monitor: `./synthetics/trust.http`
- [ ] Ingest monitors: `./synthetics/ingest.http`
- [ ] Scheduled cron jobs verified

### Alert Routing

- [ ] On-call rotation confirmed
- [ ] Alert routing configured: `src/alerts/routing.ts`
- [ ] Runbook links attached to alerts
- [ ] Escalation policy active

### SLOs

- [ ] SLO manifest validated: `./slo/slo_manifest.yaml`
- [ ] Targets confirmed: p95 < 500ms, errors < 1%, uptime > 99.9%
- [ ] Breach thresholds configured
- [ ] Auto-rollback on SLO violation

---

## Deployment (T-0h)

### Blue/Green Setup

- [ ] Blue environment deployed: `pnpm run deploy:blue-green`
- [ ] Health checks passing on blue
- [ ] Traffic routing configured
- [ ] Canary configuration: 1% → 5% → 25% → 100%

### Canary Promotion

- [ ] 1% traffic routed to blue
- [ ] SLO validation at 1% (5 min)
- [ ] Auto-promote to 5%
- [ ] SLO validation at 5% (10 min)
- [ ] Auto-promote to 25%
- [ ] SLO validation at 25% (15 min)
- [ ] Auto-promote to 100%

### Green Flip

- [ ] 100% traffic on new deployment
- [ ] Old deployment marked for cleanup
- [ ] DNS propagation confirmed
- [ ] CDN cache invalidated

---

## Post-Deployment (T+1h)

### Validation

- [ ] All synthetics passing
- [ ] SLOs maintained under production load
- [ ] No critical alerts fired
- [ ] Error rate < 1%
- [ ] User-facing features operational

### Evidence Pack

- [ ] Evidence pack generated: `pnpm run evidence:generate`
- [ ] Release notes attached
- [ ] Test reports included
- [ ] Security scan results included
- [ ] Performance benchmarks included
- [ ] Screenshots captured (C-suite, Trust, Admin)
- [ ] Backup URL recorded
- [ ] GO_LIVE_SIGNATURE.md signed

### Communication

- [ ] Stakeholders notified (Slack #orca-releases)
- [ ] Release notes published
- [ ] Customer-facing changelog updated
- [ ] Marketing/support teams informed

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Release Manager** | | | |
| **SRE Lead** | | | |
| **Security Lead** | | | |
| **Engineering Lead** | | | |
| **Product Owner** | | | |

---

## Rollback Decision

If any gate fails, execute rollback:

```bash
pnpm run release:rollback
```

**Rollback Decision Criteria:**
- SLO breach (p95 > 500ms or errors > 1%)
- Critical security vulnerability discovered
- Data corruption or loss detected
- More than 3 P0 incidents in first hour

---

## Post-Release Actions

- [ ] Clean up old deployments (keep last 3)
- [ ] Archive evidence pack to secure storage
- [ ] Schedule post-mortem (if issues occurred)
- [ ] Update capacity planning metrics
- [ ] Review and update runbooks
- [ ] Document lessons learned
