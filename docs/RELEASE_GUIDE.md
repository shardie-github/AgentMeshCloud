# ORCA Release Guide

**Standard operating procedures for releasing new versions**

---

## Table of Contents

1. [Versioning](#versioning)
2. [Branch Policy](#branch-policy)
3. [Release Process](#release-process)
4. [Changelog](#changelog)
5. [Hotfixes](#hotfixes)
6. [Rollback](#rollback)

---

## Versioning

ORCA follows **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`

### Version Semantics

- **MAJOR** (1.x.x): Breaking changes, major features
- **MINOR** (x.1.x): New features, backwards compatible
- **PATCH** (x.x.1): Bug fixes, security patches

### Examples

```
1.0.0 → 1.0.1   (Bug fix)
1.0.1 → 1.1.0   (New feature)
1.1.0 → 2.0.0   (Breaking change)
```

### Pre-release Tags

- **alpha**: `1.1.0-alpha.1` - Internal testing
- **beta**: `1.1.0-beta.1` - External testing
- **rc**: `1.1.0-rc.1` - Release candidate

---

## Branch Policy

### Main Branches

- **`main`**: Production-ready code (protected)
- **`develop`**: Integration branch for next release
- **`release/v*`**: Release preparation branches

### Feature Branches

- **Pattern**: `feature/short-description`
- **Lifetime**: Temporary, merge to `develop`
- **Examples**: 
  - `feature/graphql-api`
  - `feature/multi-tenant-support`

### Hotfix Branches

- **Pattern**: `hotfix/v1.2.3`
- **Lifetime**: Temporary, merge to `main` and `develop`
- **Example**: `hotfix/v1.0.1`

### Branch Protection

- `main` requires:
  - Pull request review (2 approvals)
  - All CI checks passing
  - Up-to-date with base branch
  - No force pushes

---

## Release Process

### 1. Prepare Release

```bash
# From develop branch
git checkout develop
git pull origin develop

# Create release branch
git checkout -b release/v1.2.0

# Update version in package.json
npm version 1.2.0 --no-git-tag-version

# Update CHANGELOG.md (see below)
vim CHANGELOG.md
```

### 2. Testing

```bash
# Run full test suite
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run e2e

# Run resilience tests
tsx scripts/resilience_test.ts

# Run security audit
pnpm run security:audit
tsx scripts/deps_audit.ts

# Run health check
pnpm run doctor
```

### 3. Build & Verify

```bash
# Build production bundle
pnpm run build

# Test production build locally
NODE_ENV=production node dist/api/server.js

# Verify health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/status/readiness
```

### 4. Create Pull Request

```bash
# Push release branch
git add .
git commit -m "chore: prepare release v1.2.0"
git push origin release/v1.2.0

# Open PR: release/v1.2.0 → main
# Title: "Release v1.2.0"
# Include:
# - Changelog excerpt
# - Test results
# - Breaking changes (if any)
```

### 5. Merge & Tag

```bash
# After PR approval and merge
git checkout main
git pull origin main

# Create git tag
git tag -a v1.2.0 -m "Release v1.2.0"

# Push tag (triggers CI release workflow)
git push origin v1.2.0

# Merge back to develop
git checkout develop
git merge main
git push origin develop
```

### 6. GitHub Release

1. Go to: https://github.com/orca-mesh/orca-core/releases/new
2. Select tag: `v1.2.0`
3. Title: `ORCA v1.2.0`
4. Description: Copy from CHANGELOG.md
5. Attach build artifacts (if applicable)
6. Publish release

### 7. Post-Release

```bash
# Announce release
# - Blog post
# - Twitter/LinkedIn
# - Email newsletter

# Monitor production
# - Check error rates in Grafana
# - Review logs in Jaeger
# - Monitor SLOs

# Update documentation
# - Update docs.orca-mesh.io
# - Update example repos
```

---

## Changelog

### Format

Use [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
# Changelog

All notable changes to ORCA Core will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New feature X
- New API endpoint Y

### Changed
- Improved performance of trust scoring algorithm
- Updated dependency Z to v2.0

### Fixed
- Fixed bug where agents weren't discovered
- Fixed race condition in sync analyzer

### Security
- Patched CVE-2024-12345
- Added rate limiting to all public endpoints

## [1.2.0] - 2025-10-30

### Added
- GraphQL API support
- Multi-tenant isolation
- Advanced caching layer

### Changed
- Migrated from uuid v3 to crypto.randomUUID()
- Improved OTEL span propagation

### Fixed
- Fixed memory leak in job queue
- Fixed incorrect trust score calculation

## [1.1.0] - 2025-09-15

...
```

### Categories

- **Added**: New features
- **Changed**: Changes to existing features
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security patches

---

## Hotfixes

### When to Hotfix

- Critical bugs in production
- Security vulnerabilities
- Data corruption issues
- Service outages

### Hotfix Process

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/v1.1.1

# Make fix
# ... code changes ...

# Update version
npm version patch --no-git-tag-version

# Test thoroughly
pnpm run test
pnpm run e2e

# Commit
git add .
git commit -m "fix: critical bug in trust scoring"

# Push and create PR
git push origin hotfix/v1.1.1

# Create PR: hotfix/v1.1.1 → main
# After merge, tag immediately
git checkout main
git pull origin main
git tag -a v1.1.1 -m "Hotfix v1.1.1"
git push origin v1.1.1

# Merge to develop
git checkout develop
git merge main
git push origin develop
```

---

## Rollback

### Identify Issue

```bash
# Check health metrics
curl https://api.orca-mesh.io/health

# Check Grafana dashboards
# Check Jaeger traces for errors
# Review logs
```

### Rollback Procedure

**Option 1: Revert Deployment**

```bash
# Kubernetes
kubectl rollout undo deployment/orca-api

# Docker Swarm
docker service update --rollback orca-api

# ECS
aws ecs update-service --rollback
```

**Option 2: Revert Git Tag**

```bash
# Revert to previous version
git checkout v1.1.0
git tag -a v1.2.1 -m "Rollback to v1.1.0 due to critical bug"
git push origin v1.2.1

# Trigger deployment of v1.2.1
```

**Option 3: Database Rollback**

```bash
# Restore from backup
tsx scripts/restore_latest_backup.ts --yes

# Or restore specific backup
tsx scripts/restore_latest_backup.ts --file /backups/orca_2025-10-29.sql --yes
```

### Post-Rollback

1. **Verify**: Check all health endpoints
2. **Investigate**: Root cause analysis
3. **Document**: Update postmortem
4. **Fix**: Prepare new release with fix
5. **Test**: Extended testing before next release

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm run typecheck
      - run: pnpm run lint
      - run: pnpm run test
      - run: pnpm run build
      - run: docker build -t orca-core:${{ github.ref_name }} .
      - run: docker push orca-core:${{ github.ref_name }}
```

---

## Checklist

### Pre-Release

- [ ] All tests passing
- [ ] Security audit clean
- [ ] Dependencies up to date
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Documentation updated
- [ ] Migration scripts tested

### Release

- [ ] Release branch created
- [ ] PR approved and merged
- [ ] Git tag created and pushed
- [ ] GitHub release published
- [ ] Docker images published
- [ ] Deployment triggered

### Post-Release

- [ ] Production health verified
- [ ] Error rates normal
- [ ] Performance metrics stable
- [ ] Announcement published
- [ ] Support team notified

---

## Support

For release-related questions:
- **Email**: releases@orca-mesh.io
- **Slack**: #releases channel

---

**Release responsibly! 🚢**
