# Release Procedures

**Version:** 1.0.0  
**Last Updated:** 2025-10-31  
**Owner:** Engineering & Release Team

---

## Release Philosophy

**Principles:**
- **Ship often, ship safely:** Aim for weekly releases (Fridays)
- **Gradual rollouts:** Use canary deployments for big changes
- **Feature flags:** Hide incomplete features behind flags
- **Blameless:** Learn from failures, don't punish mistakes

**Versioning:** Semantic Versioning (SemVer)
- **MAJOR.MINOR.PATCH** (e.g., v1.2.3)
- **MAJOR:** Breaking changes
- **MINOR:** New features (backward-compatible)
- **PATCH:** Bug fixes

---

## Release Types

### 1. Patch Release (Bug Fixes)
**Frequency:** As needed (hot-fixes)  
**Example:** v1.0.5 → v1.0.6  
**Process:** Fast-track (simplified approval)

### 2. Minor Release (New Features)
**Frequency:** Every 2-4 weeks  
**Example:** v1.0.0 → v1.1.0  
**Process:** Full release cycle (QA, staging, canary)

### 3. Major Release (Breaking Changes)
**Frequency:** Quarterly or as needed  
**Example:** v1.0.0 → v2.0.0  
**Process:** Extended QA, migration guide, communication plan

---

## Release Schedule

**Standard Weekly Release:**
- **Monday-Thursday:** Development
- **Thursday EOD:** Code freeze, deploy to staging
- **Friday Morning:** QA on staging
- **Friday Afternoon:** Deploy to production (12pm UTC)

**Why Friday?**
- Team available to monitor
- Low user traffic (easier to detect issues)
- Weekend buffer for hot-fixes if needed

**Blackout Dates:**
- No releases 2 days before major holidays
- No releases during company all-hands
- No releases during planned maintenance windows

---

## Release Checklist

### Pre-Release (Thursday EOD)

- [ ] All PRs merged to `main`
- [ ] CI/CD pipeline green (lint, typecheck, test, build)
- [ ] Version bumped in `package.json`
- [ ] `CHANGELOG.md` updated
- [ ] Release notes drafted
- [ ] Database migrations tested (if applicable)
- [ ] Feature flags configured
- [ ] Rollback plan documented

### Release Day (Friday 12pm UTC)

- [ ] Code freeze announced (Slack #engineering)
- [ ] Deploy to staging
- [ ] QA smoke tests on staging (30 minutes)
- [ ] Performance tests on staging (k6 load tests)
- [ ] Stakeholder approval (PM, Engineering Lead)
- [ ] Deploy to production (canary if major change)
- [ ] Monitor for 1 hour (error rate, latency, logs)
- [ ] Announce release (Slack #general, #engineering)

### Post-Release (Friday 2pm UTC)

- [ ] Tag release in GitHub (`git tag v1.1.0`)
- [ ] Publish release notes
- [ ] Update status page (if user-facing changes)
- [ ] Email customers (if major release)
- [ ] Update documentation
- [ ] Post-mortem scheduled (Monday 10am)

---

## Step-by-Step Release Process

### Step 1: Prepare Release Branch

```bash
# 1. Checkout main and pull latest
git checkout main
git pull origin main

# 2. Create release branch (optional, for major releases)
git checkout -b release/v1.1.0

# 3. Bump version
npm version minor  # or: patch, major
# This updates package.json and creates a commit

# 4. Update CHANGELOG.md
vim CHANGELOG.md
# Add release notes (see template below)

# 5. Commit and push
git add CHANGELOG.md
git commit -m "chore(release): prepare v1.1.0"
git push origin release/v1.1.0  # or main
```

### Step 2: Create Release PR

```bash
# If using release branch:
gh pr create --title "release: v1.1.0" --body "$(cat release-notes.md)"
```

**PR Description Template:**
```markdown
## Release: v1.1.0

### 🚀 New Features
- Feature 1 description
- Feature 2 description

### 🐛 Bug Fixes
- Fix 1 description
- Fix 2 description

### 📈 Performance
- Performance improvement 1
- Performance improvement 2

### ⚠️ Breaking Changes
None

### 🧪 Testing
- [ ] All tests pass
- [ ] Smoke tests on staging
- [ ] Load tests on staging

### 📦 Deployment
- [ ] Database migrations: None
- [ ] Environment variables: None
- [ ] Rollback plan: Standard rollback to v1.0.9

### 📚 Documentation
- [ ] CHANGELOG.md updated
- [ ] API docs updated (if applicable)
- [ ] User-facing docs updated (if applicable)
```

### Step 3: QA on Staging

```bash
# Deploy to staging
vercel --env=preview

# Run smoke tests
pnpm run smoke:test --env=staging

# Run load tests
pnpm run load:test --env=staging

# Manual QA checklist
- [ ] Login/logout works
- [ ] Agent registration works
- [ ] Workflow execution works
- [ ] Dashboard loads correctly
- [ ] Key features functional
```

### Step 4: Deploy to Production

**Option A: Standard Deployment**
```bash
# Merge release PR
gh pr merge release/v1.1.0 --squash

# Deploy to production
vercel --prod

# Or use automated script
pnpm run deploy:production
```

**Option B: Canary Deployment (for risky changes)**
```bash
# Stage 1: 5% of traffic
pnpm run deploy:canary --percentage=5
# Monitor for 30 minutes

# Stage 2: 25% of traffic
pnpm run deploy:canary --percentage=25
# Monitor for 1 hour

# Stage 3: 100% of traffic
pnpm run deploy:canary --percentage=100
```

### Step 5: Create Git Tag & GitHub Release

```bash
# Create and push tag
git tag -a v1.1.0 -m "Release v1.1.0: Feature flags, analytics SDK, runbooks"
git push origin v1.1.0

# Create GitHub release
gh release create v1.1.0 \
  --title "v1.1.0: Feature Flags & Analytics" \
  --notes-file release-notes.md \
  --latest
```

### Step 6: Monitor & Communicate

**Monitoring (first hour):**
```bash
# Terminal 1: Real-time logs
vercel logs --prod --follow

# Terminal 2: Health checks
watch -n 30 'curl -s https://api.orca-mesh.io/health | jq'

# Terminal 3: Grafana dashboard
open https://dashboards.orca-mesh.io
```

**Key Metrics to Watch:**
- ✅ Error rate <1.5%
- ✅ P95 latency <700ms
- ✅ Health checks passing
- ✅ No spike in logs

**Communication:**
```bash
# Slack #engineering
🚀 v1.1.0 deployed to production

✅ Deployment successful
📊 Metrics look good
🔗 Release notes: https://github.com/orca-mesh/orca-core/releases/v1.1.0

Monitoring for the next hour. 👀
```

---

## CHANGELOG Template

**Format:** Keep a Changelog (https://keepachangelog.com)

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-07

### Added
- Feature flags SDK for gradual rollouts
- Analytics SDK with event catalog (10 core events)
- Comprehensive runbooks (deploy, rollback, oncall, releases)
- Gitleaks secret scanning in CI
- Lighthouse CI for performance budgets

### Changed
- Improved error handling in trust scoring algorithm
- Updated OpenTelemetry to v1.19
- Enhanced security headers (CSP, HSTS, COOP)

### Fixed
- Fixed race condition in agent discovery
- Fixed memory leak in context bus
- Fixed incorrect P95 latency calculation in dashboard

### Security
- Added Gitleaks secret scanning
- Rotated API keys exposed in commit history
- Enhanced CSP with nonce-based script loading

### Deprecated
- Old trust scoring algorithm (use `ENABLE_NEW_TRUST_ALGORITHM=true`)

### Removed
- Legacy MCP v0.9 support (upgrade to v1.0)

## [1.0.9] - 2025-10-31

### Fixed
- Hotfix: Division by zero in trust scoring
- Hotfix: Supabase RLS policy for guest users

## [1.0.0] - 2025-10-24

### Added
- Initial release
- Agent registry with MCP v1.0 support
- Trust scoring (TS, RA$, Sync Freshness, Drift Rate)
- UADSI: Agent discovery, sync analysis, self-healing
- OpenTelemetry integration
- Policy enforcement (RBAC, data classification)
- Supabase database with RLS policies
- Vercel deployment with auto-scaling
```

---

## Release Notes Template

**User-Facing Release Notes (for blog/email):**

```markdown
# ORCA v1.1.0: Feature Flags & Analytics

**Release Date:** November 7, 2025

## 🚀 What's New

### Feature Flags for Gradual Rollouts
We've added a comprehensive feature flag system that allows us to roll out new features gradually, reducing risk and enabling instant rollback if issues arise.

### Analytics & Success Metrics
Track your agent mesh's performance with our new analytics SDK. We've added 10 core events covering activation, engagement, conversion, and retention.

### Operational Excellence
We've created comprehensive runbooks covering deployment, rollback, on-call procedures, and release management. This ensures faster incident response and more reliable deployments.

## 🐛 Bug Fixes

- Fixed race condition in agent discovery that occasionally caused agents to be registered twice
- Fixed memory leak in context bus affecting long-running instances
- Improved error messages for failed workflow executions

## 📈 Performance

- Reduced P95 API latency from 520ms to 450ms (14% improvement)
- Improved database query performance with new indexes
- Optimized bundle size (15% reduction)

## 🔒 Security

- Added Gitleaks secret scanning to prevent accidental credential commits
- Enhanced Content Security Policy (CSP) with nonce-based script loading
- Rotated all API keys found in commit history

## 🎓 Documentation

- Added comprehensive runbooks (deploy, rollback, oncall, releases)
- Created event catalog documenting all tracked analytics events
- Updated API documentation with new endpoints

## 📦 Migration Notes

**No action required.** This release is fully backward-compatible.

---

**Questions?** Email support@orca-mesh.io or Slack #general
```

---

## Hot-Fix Process (Emergency Patch)

**When:** Critical bug in production requiring immediate fix

**Process (fast-track):**

```bash
# 1. Create hot-fix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/v1.0.10

# 2. Fix the bug
# ... make changes ...
git add .
git commit -m "fix: critical bug in trust scoring (divides by zero)"

# 3. Test locally
pnpm run test
pnpm run build

# 4. Deploy to staging
vercel --env=preview
pnpm run smoke:test --env=staging

# 5. Create PR (expedited review)
gh pr create --title "hotfix: v1.0.10 - Fix divide by zero in trust scoring" \
  --body "Critical fix for production issue. Minimal changes." \
  --label "hotfix"

# 6. Get approval (1 reviewer minimum)
# Ping in Slack #engineering

# 7. Merge and deploy
gh pr merge --squash
vercel --prod

# 8. Bump version
npm version patch
git push origin main

# 9. Tag release
git tag v1.0.10
git push origin v1.0.10

# 10. Communicate
# Slack #engineering: "Hot-fix v1.0.10 deployed"
```

**Hot-Fix SLA:** Deploy within 2 hours of issue detection

---

## Rollback Procedure

**See:** `docs/runbooks/rollback.md`

**Quick Rollback:**
```bash
pnpm run release:rollback
```

**Criteria for Rollback:**
- Error rate >5%
- P95 latency >2x baseline
- Critical feature broken
- Data integrity issue

---

## Release Metrics

**Track these metrics for each release:**
- Deployment duration (target: <10 minutes)
- Rollback rate (target: <5% of releases)
- Time to production (PR merge → production deploy)
- Post-release incidents (target: 0 P1 incidents)
- Mean time to recovery (MTTR) (target: <30 minutes)

**Review Quarterly:**
- Are we shipping too fast? (high rollback rate?)
- Are we shipping too slow? (long cycle times?)
- Are we breaking things? (high incident rate?)

---

## Release Roles

### Release Captain
- **Responsibility:** Owns the release process start to finish
- **Tasks:** 
  - Coordinate with teams (eng, QA, PM)
  - Execute deployment
  - Monitor post-deployment
  - Communicate status
- **Rotation:** Weekly (volunteer or assigned)

### QA Engineer
- **Responsibility:** Test release on staging
- **Tasks:**
  - Run smoke tests
  - Manual exploratory testing
  - Sign-off before production deploy

### On-Call Engineer
- **Responsibility:** Monitor production during release
- **Tasks:**
  - Watch dashboards
  - Respond to alerts
  - Execute rollback if needed

---

## Communication Plan

### Internal (Slack #engineering)

**Pre-Release (Thursday EOD):**
```
🚧 Code Freeze: v1.1.0

No more commits to main until release completes tomorrow.
🔗 Release PR: https://github.com/orca-mesh/orca-core/pull/123
📅 Deploy: Tomorrow (Friday) 12pm UTC
```

**Release Day (Friday 12pm UTC):**
```
🚀 Deploying v1.1.0 to production

📝 Release notes: https://github.com/orca-mesh/orca-core/releases/v1.1.0
⏱️ ETA: 10 minutes
👤 Release Captain: @john.doe
```

**Post-Release (Friday 12:30pm UTC):**
```
✅ v1.1.0 deployed successfully

📊 Metrics looking good (error rate 0.7%, P95 latency 420ms)
🔗 Status: https://status.orca-mesh.io
🎉 Great job team!
```

### External (Email/Blog)

**For major releases (v1.x.0, v2.0.0):**
- Blog post (publish after deploy)
- Email to customers (opt-in list)
- Social media (Twitter, LinkedIn)
- Update landing page

---

## Post-Mortem (Even for Successful Releases)

**Within 1 week:**
- Schedule 30-minute retrospective
- What went well?
- What could be improved?
- Action items for next release

**Continuous Improvement:**
- Update runbooks based on learnings
- Automate manual steps
- Improve monitoring/alerting

---

## Useful Commands

```bash
# Bump version
npm version patch|minor|major

# Create release tag
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0

# Deploy to staging
vercel --env=preview

# Deploy to production
vercel --prod

# Rollback
pnpm run release:rollback

# Create GitHub release
gh release create v1.1.0 --notes-file release-notes.md

# Check deployment status
vercel list --prod

# Monitor logs
vercel logs --prod --follow
```

---

## Emergency Contacts

| Role | Name | Slack | Response Time |
|------|------|-------|---------------|
| Release Captain | (Weekly rotation) | @release-captain | Immediate |
| On-Call Engineer | (Weekly rotation) | @oncall | <15 min |
| Engineering Lead | TBD | @eng-lead | <30 min |
| CTO | TBD | @cto | <1 hour |

---

**Last Updated:** 2025-10-31  
**Next Review:** After every major release

**Questions?** Slack #releases or email eng@orca-mesh.io
