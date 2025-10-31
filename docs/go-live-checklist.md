# Go-Live Readiness Checklist

**Version:** 1.0.0  
**Date:** 2025-10-31  
**Target Go-Live:** TBD  
**Release Captain:** TBD

---

## Sign-Off Matrix

| Area | Owner | Status | Sign-Off Date | Notes |
|------|-------|--------|---------------|-------|
| Engineering | CTO | ⬜ Pending | - | - |
| Security | CISO | ⬜ Pending | - | - |
| Product | CPO | ⬜ Pending | - | - |
| Operations | SRE Lead | ⬜ Pending | - | - |
| Legal/Compliance | Legal | ⬜ Pending | - | - |
| Customer Success | CS Lead | ⬜ Pending | - | - |

---

## 0️⃣ Context & Planning

- [x] Repository map created (`docs/repo-map.md`)
- [x] Stack auto-detected (Node.js 20, TypeScript, Express, Next.js, PostgreSQL, Supabase, Vercel)
- [x] Package manager confirmed (pnpm@9.12.0)
- [ ] Go-live date selected and communicated
- [ ] Rollback plan documented and tested
- [ ] Stakeholder approval obtained

---

## 1️⃣ Baseline Health Check

### Dependencies
- [ ] `pnpm audit` shows no high/critical vulnerabilities
- [ ] All dependencies up-to-date (or documented exceptions)
- [ ] Unused dependencies removed
- [ ] `package.json` engines field accurate (`node: ">=20 <21"`)
- [ ] `packageManager` field set (`pnpm@9.12.0`)
- [ ] `pnpm run doctor` script passes

### Type Safety
- [x] TypeScript strict mode enabled (`tsconfig.json`)
- [ ] `pnpm run typecheck` passes with zero errors
- [ ] `tsconfig.build.json` excludes tests/demo scripts
- [ ] All `any` types documented or removed

### Linting & Formatting
- [x] ESLint configured with security rules
- [ ] ESLint security plugin enabled (`eslint-plugin-security`)
- [x] Prettier configured
- [ ] `.editorconfig` present
- [ ] `pnpm run lint` passes
- [ ] `pnpm run format:check` passes
- [ ] Pre-commit hooks configured (Husky + lint-staged)

### Testing
- [x] Vitest configured (`vitest.config.ts`)
- [x] Test setup file created (`tests/setup.ts`)
- [x] Basic unit tests implemented
- [ ] Integration tests for critical paths
- [ ] E2E tests for key user flows
- [ ] Coverage thresholds defined (≥70% lines, 70% functions)
- [ ] `pnpm run test:ci` passes
- [ ] Coverage report generated and reviewed

### Build & Bundle
- [ ] Production build succeeds (`pnpm run build`)
- [ ] Bundle analysis run (`pnpm run bundle:analyze`)
- [ ] Bundle size within budget (JS ≤200KB gzipped per route)
- [ ] Code splitting implemented for admin/dev tools
- [ ] Source maps generated (but not deployed publicly)

### Performance Budgets
- [ ] Performance budgets defined (see below)
- [ ] Lighthouse CI configured
- [ ] Lighthouse tests passing for key pages
- [ ] Image optimization (AVIF/WebP, lazy loading)
- [ ] Preconnect/preload for critical resources

**Performance Targets:**
- [ ] First Contentful Paint (FCP) <1.8s
- [ ] Largest Contentful Paint (LCP) <2.5s
- [ ] Cumulative Layout Shift (CLS) <0.1
- [ ] Interaction to Next Paint (INP) <200ms
- [ ] Time to Interactive (TTI) <3.8s
- [ ] Bundle size <200KB per route

---

## 2️⃣ Security Hardening

### Secrets & Credentials
- [x] Gitleaks configured (`.gitleaks.toml`)
- [ ] Gitleaks scan passes (no secrets in history)
- [ ] All secrets rotated (if any found)
- [ ] Secrets stored in Vercel environment variables
- [ ] `.env.example` reviewed (no actual secrets)
- [ ] API keys have appropriate scopes/permissions

### HTTP Security Headers
- [x] Helmet configured (`src/api/server.ts`)
- [ ] CSP (Content Security Policy) with nonce/sha256
- [ ] HSTS (Strict-Transport-Security) enabled
- [ ] Referrer-Policy: `strict-origin-when-cross-origin`
- [ ] X-Content-Type-Options: `nosniff`
- [ ] X-Frame-Options: `DENY`
- [ ] Permissions-Policy restrictive
- [ ] COOP/COEP headers (if applicable)

### Authentication & Authorization
- [ ] Secure cookies (sameSite, httpOnly, secure)
- [ ] Anti-CSRF protection (token or SameSite)
- [ ] Rate limiting on auth endpoints
- [ ] Brute-force protection (lockout after N attempts)
- [ ] Password requirements enforced (if applicable)
- [ ] Session timeout configured
- [ ] MFA enforced for admin accounts

### Input/Output Validation
- [ ] All inputs validated at API boundaries (Zod schemas)
- [ ] Output sanitization (XSS prevention)
- [ ] SQL injection prevention (parameterized queries via Prisma)
- [ ] Command injection prevention (avoid shell execution)
- [ ] Path traversal prevention

### Data Privacy
- [x] PII classification documented (`docs/data-flows.md` - TBD)
- [ ] PII redaction in logs (`src/middleware/privacy_redactor.ts`)
- [ ] Data retention policies defined
- [ ] GDPR compliance (right to access, deletion, portability)
- [ ] Data encryption at rest (Supabase)
- [ ] Data encryption in transit (TLS 1.3)

---

## 3️⃣ Database & Migrations

### Schema & Migrations
- [x] Prisma schema validated (`pnpm run db:generate`)
- [ ] Migrations tested on staging
- [ ] Idempotent seed script created
- [ ] Migration rollback tested
- [ ] Schema drift check passes
- [ ] Indexes created for query performance
- [ ] Foreign keys and constraints defined

### Supabase
- [ ] RLS (Row-Level Security) policies enabled
- [ ] RLS policies tested for all tables
- [ ] RLS policy tests automated (`pnpm run rls:smoke`)
- [ ] Supabase backup configured (daily)
- [ ] Monitoring queries created (`monitoring.sql`)
- [ ] Connection pooling configured
- [ ] Read replicas configured (if needed)

### Prisma
- [ ] WASM engine enforced (`PRISMA_CLIENT_ENGINE_TYPE=wasm`)
- [ ] `pnpm run prisma:validate` passes
- [ ] `pnpm run prisma:format` passes
- [ ] `pnpm run prisma:migrate:ci` passes in CI
- [ ] Prisma client generated in build step

---

## 4️⃣ Observability

### Logging
- [x] Structured logging (pino/winston) configured
- [x] Correlation IDs added to all requests
- [ ] Log levels appropriate (info/warn/error)
- [ ] PII redacted from logs
- [ ] Log retention policy defined (30 days)
- [ ] Centralized logging configured (Datadog/CloudWatch)

### Metrics
- [x] OpenTelemetry configured
- [ ] Custom metrics instrumented (Trust Score, RA$, etc.)
- [ ] Metrics exported to Prometheus
- [ ] Dashboards created in Grafana
- [ ] Key metrics tracked:
  - [ ] HTTP request rate, latency (p50/p95/p99), error rate
  - [ ] Database connection pool, query latency
  - [ ] Background job queue depth, processing time
  - [ ] Memory/CPU usage, event loop lag

### Tracing
- [x] Distributed tracing configured (Jaeger)
- [ ] Traces include database queries
- [ ] Traces include external API calls
- [ ] Trace sampling configured (100% initially, tune later)

### Health Checks
- [x] `/health` endpoint (basic health)
- [x] `/status/liveness` endpoint (K8s liveness)
- [x] `/status/readiness` endpoint (K8s readiness with dependency checks)
- [ ] Health checks include DB, Redis, external APIs
- [ ] Health check timeout <5s

### Documentation
- [x] Observability docs created (`docs/observability.md` - TBD)
- [ ] Metrics catalog documented
- [ ] Dashboard access documented
- [ ] Alerting runbook created

---

## 5️⃣ Success Metrics & Analytics

### Event Catalog
- [x] Event catalog created (`analytics/event-catalog.json`)
- [x] All events documented (name, properties, PII classification)
- [x] Event destinations defined (analytics, monitoring, CRM)
- [ ] Event validation tests created

### Analytics SDK
- [x] Analytics SDK implemented (`lib/analytics.ts`)
- [ ] SDK initialized in application
- [ ] Server-side events instrumented
- [ ] Client-side events instrumented
- [ ] PII protection tested
- [ ] Batch flushing configured

### Product Metrics
- [x] Activation metrics defined (first agent registered)
- [x] Conversion funnel defined (trial → paid)
- [x] Engagement metrics defined (WAU, feature depth)
- [x] Retention metrics defined (D1/D7/D30)
- [x] Revenue metrics defined (MRR, ARPU, churn)
- [ ] SQL queries for metrics created (`analytics/sql/`)

### Technical Metrics
- [x] Error rate SLO defined (<1.5%)
- [x] Latency SLO defined (P95 <700ms, P99 <1200ms)
- [x] Core Web Vitals targets set
- [x] Background job SLAs defined
- [ ] Baseline metrics collected (for comparison)

---

## 6️⃣ Feature Flags & Safe Rollout

### Feature Flags
- [x] Feature flag service implemented (`src/flags/flags_service.ts`)
- [x] Feature flag strategy documented (`docs/feature-flags-strategy.md`)
- [ ] Critical features behind flags
- [ ] Kill switches documented
- [ ] Flag change audit log implemented

### Circuit Breakers
- [x] Circuit breaker implemented (`src/common/circuit-breaker.ts`)
- [ ] Circuit breakers configured for external APIs
- [ ] Circuit breaker metrics tracked
- [ ] Circuit breaker alerts configured

### Canary Strategy
- [x] Canary deployment strategy documented
- [ ] Canary scripts created (`scripts/deploy/vercel_canary.ts`)
- [ ] Success criteria defined (error rate, latency, etc.)
- [ ] Rollback triggers defined
- [ ] Rollback tested on staging

---

## 7️⃣ CI/CD Pipeline

### GitHub Actions
- [x] CI workflow configured (`.github/workflows/ci.yml`)
- [ ] Build step passes
- [ ] Lint step passes
- [ ] Typecheck step passes
- [ ] Test step passes
- [ ] Coverage upload configured
- [ ] Bundle analysis artifacts uploaded
- [ ] Lighthouse CI job added
- [ ] CodeQL security scanning enabled (`.github/workflows/codeql.yml`)
- [ ] Dependency audit job added

### Deployment
- [ ] Vercel integration configured
- [ ] Environment variables synced to Vercel
- [ ] Preview deployments tested
- [ ] Production deployment tested
- [ ] Deployment verification job added (smoke tests on deployed URL)
- [ ] Required checks enforced (all jobs must pass before merge)

### Secrets Management
- [ ] GitHub Secrets configured
- [ ] Vercel Environment Variables configured
- [ ] Secrets rotation plan documented

---

## 8️⃣ Accessibility & SEO

### Accessibility
- [ ] Axe/pa11y automated tests added
- [ ] WCAG 2.2 AA compliance verified
- [ ] Focus states styled
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (NVDA/JAWS)
- [ ] Color contrast checked (4.5:1 minimum)
- [ ] Alt text for all images

### SEO
- [ ] Unique `<title>` tags per page
- [ ] Meta descriptions (<160 chars)
- [ ] Canonical URLs set
- [ ] `robots.txt` configured
- [ ] `sitemap.xml` generated
- [ ] OpenGraph meta tags (social sharing)
- [ ] Twitter Card meta tags
- [ ] Structured data (JSON-LD) for key pages

### Performance
- [ ] Images have width/height attributes (CLS prevention)
- [ ] Responsive images (`srcset`, `sizes`)
- [ ] Lazy loading for below-fold images
- [ ] Preconnect/preload for critical assets
- [ ] Font loading optimized (font-display: swap)

---

## 9️⃣ Operational Runbooks

### Runbooks Created
- [ ] Deploy runbook (`docs/runbooks/deploy.md`)
- [ ] Rollback runbook (`docs/runbooks/rollback.md`)
- [ ] On-call runbook (`docs/runbooks/oncall.md`)
- [ ] Releases runbook (`docs/runbooks/releases.md`)
- [ ] Incident response runbook (`docs/runbooks/incident-response.md`)

### Runbook Content
- [ ] Step-by-step procedures
- [ ] Commands with examples
- [ ] Decision trees for common issues
- [ ] Contact information (Slack channels, PagerDuty)
- [ ] Links to dashboards and logs
- [ ] Escalation paths

### Disaster Recovery
- [ ] DR plan documented (`docs/DISASTER_RECOVERY.md`)
- [ ] Backup schedule defined (daily DB, weekly full)
- [ ] Backup restoration tested
- [ ] RTO (Recovery Time Objective) defined (<4 hours)
- [ ] RPO (Recovery Point Objective) defined (<1 hour)

---

## 🔟 Final Release Preparation

### Release Artifacts
- [ ] `CHANGELOG.md` updated with release notes
- [ ] Release notes drafted (user-facing changes)
- [ ] Breaking changes documented
- [ ] Migration guide created (if needed)
- [ ] Version bumped (`package.json`)
- [ ] Git tag created (`v1.0.0`)

### Communication
- [ ] Internal announcement drafted (all-hands)
- [ ] Customer communication plan (if applicable)
- [ ] Status page updated (status.orca-mesh.io)
- [ ] Social media posts scheduled (if applicable)

### Release PR
- [ ] Single Release PR created
- [ ] PR title: `release: go-live readiness + SLOs + success metrics`
- [ ] PR description includes:
  - [ ] Summary of changes
  - [ ] Links to repo map, observability, analytics docs
  - [ ] CI dashboard links (coverage, Lighthouse)
  - [ ] Bundle analysis report
- [ ] PR labels: `release`, `security`, `observability`, `performance`, `ready-for-QA`
- [ ] All CI checks passing
- [ ] Code review completed (2+ approvers)
- [ ] Merge approval obtained

---

## 1️⃣1️⃣ Quality Gates Verification

### Build & Test
- [ ] `pnpm run lint` ✅
- [ ] `pnpm run typecheck` ✅
- [ ] `pnpm run test:ci` ✅
- [ ] `pnpm run build` ✅
- [ ] Coverage ≥70% (or no regression >1%)

### Security
- [ ] `pnpm run security:audit` ✅ (no high/critical)
- [ ] Gitleaks scan ✅
- [ ] CodeQL scan ✅
- [ ] Security headers verified

### Performance
- [ ] Lighthouse CI passes for key pages ✅
- [ ] Bundle size within budget ✅
- [ ] LCP <2.5s ✅
- [ ] CLS <0.1 ✅

### Deployment
- [ ] Staging deployment successful
- [ ] Smoke tests pass on staging
- [ ] Performance tests pass (k6 load tests)
- [ ] Rollback tested on staging

---

## 1️⃣2️⃣ Pre-Launch Final Checks

**48 Hours Before Launch:**
- [ ] All stakeholders notified
- [ ] On-call schedule confirmed
- [ ] Monitoring dashboards reviewed
- [ ] Alerts tested (send test alert to verify PagerDuty/Slack)
- [ ] Backup verified (restore test successful)
- [ ] Rollback plan reviewed with team
- [ ] Customer support trained (if applicable)

**24 Hours Before Launch:**
- [ ] Final code freeze (no changes unless critical)
- [ ] Production environment variables verified
- [ ] Database migrations tested one last time
- [ ] Load test re-run (confirm capacity)
- [ ] War room scheduled (Zoom/Slack channel)

**Go-Live (T-0):**
- [ ] Deploy to production
- [ ] Smoke tests pass on production
- [ ] Health checks green
- [ ] Key metrics monitored (error rate, latency)
- [ ] First user transactions verified
- [ ] Status page updated: "All Systems Operational"

**Post-Launch (T+1h, T+4h, T+24h):**
- [ ] Monitor error rates, latency, throughput
- [ ] Check for anomalies in logs
- [ ] Review alerts (any unexpected alerts?)
- [ ] Collect user feedback
- [ ] Post-mortem scheduled (even if successful)

---

## 1️⃣3️⃣ Issue Board & Traceability

- [ ] GitHub milestone created: "Go-Live Readiness"
- [ ] Issues created for remaining TODOs
- [ ] Issue titles prefixed with domain (`security:`, `db:`, `a11y:`, `perf:`, `analytics:`)
- [ ] Acceptance criteria defined for each issue
- [ ] Estimates added (S/M/L or story points)
- [ ] Owner assigned (or fallback to `@maintainers`)
- [ ] Links to code lines included

---

## 1️⃣4️⃣ GO/NO-GO Decision

### Final Sign-Off

**Date:** _______________________  
**Time:** _______________________

**Decision:** 
- [ ] ✅ **GO** - All critical items complete, ready for launch
- [ ] ⚠️ **GO with caveats** - Launch with known issues (documented)
- [ ] ❌ **NO-GO** - Critical blockers remain

**Remaining Risks:**
1. _______________________
2. _______________________
3. _______________________

**Mitigation Plan:**
1. _______________________
2. _______________________
3. _______________________

---

**Signatures:**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Release Captain | | | |
| Engineering Lead | | | |
| SRE Lead | | | |
| Product Lead | | | |
| Security Lead | | | |

---

## Appendix: Definition of Done

A checklist item is **Done** only if:
1. Implementation complete and tested
2. Documentation updated
3. Code reviewed and approved
4. CI passes (lint, typecheck, test, build)
5. Deployed to staging and verified
6. Stakeholder approved (if applicable)

**Critical Items:** Items marked with 🚨 are **blockers** for go-live.  
**Nice-to-Have:** Items marked with 💡 are desirable but not blockers.

---

**Last Updated:** 2025-10-31  
**Next Review:** Before every major release
