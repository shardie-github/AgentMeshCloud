# Release Notes: ORCA v{{VERSION}}

**Release Date:** {{DATE}}  
**Release Type:** {{TYPE}} (Major | Minor | Patch | RC)  
**Git Tag:** `v{{VERSION}}`  
**Previous Version:** `v{{PREV_VERSION}}`

---

## 🎯 Release Summary

{{SUMMARY}}

---

## ✨ What's New

### Features

{{#each features}}
- **{{title}}** - {{description}} ([#{{pr}}]({{pr_url}}))
{{/each}}

### Enhancements

{{#each enhancements}}
- {{description}} ([#{{pr}}]({{pr_url}}))
{{/each}}

---

## 🐛 Bug Fixes

{{#each fixes}}
- {{description}} ([#{{pr}}]({{pr_url}}))
{{/each}}

---

## 🔒 Security

{{#each security}}
- **[{{severity}}]** {{description}} ([#{{pr}}]({{pr_url}}))
{{/each}}

---

## ⚡ Performance

{{#each performance}}
- {{description}} - **{{improvement}}** ([#{{pr}}]({{pr_url}}))
{{/each}}

---

## 📚 Documentation

{{#each docs}}
- {{description}} ([#{{pr}}]({{pr_url}}))
{{/each}}

---

## 🔧 Infrastructure

{{#each infrastructure}}
- {{description}} ([#{{pr}}]({{pr_url}}))
{{/each}}

---

## ⚠️ Breaking Changes

{{#if breaking_changes}}
{{#each breaking_changes}}
### {{title}}

**What changed:** {{description}}

**Migration:**
```{{lang}}
{{migration_code}}
```

**Impact:** {{impact}}
{{/each}}
{{else}}
None.
{{/if}}

---

## 📦 Dependencies

### Added

{{#each deps_added}}
- `{{name}}@{{version}}` - {{reason}}
{{/each}}

### Updated

{{#each deps_updated}}
- `{{name}}`: `{{old_version}}` → `{{new_version}}` - {{reason}}
{{/each}}

### Removed

{{#each deps_removed}}
- `{{name}}` - {{reason}}
{{/each}}

---

## 🧪 Quality Gates

### Test Coverage

- **Unit Tests:** {{unit_tests_count}} passed
- **Integration Tests:** {{integration_tests_count}} passed
- **E2E Tests:** {{e2e_tests_count}} passed
- **Coverage:** {{coverage_percent}}%

### Performance Benchmarks

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| p95 Latency | < 500ms | {{p95_latency}}ms | {{p95_status}} |
| Error Rate | < 1% | {{error_rate}}% | {{error_status}} |
| Throughput | > 100 req/s | {{throughput}} req/s | {{throughput_status}} |
| Uptime | > 99.9% | {{uptime}}% | {{uptime_status}} |

### Security Scans

| Scan | Status | Details |
|------|--------|---------|
| CodeQL | {{codeql_status}} | {{codeql_issues}} issues |
| Dependency Audit | {{deps_status}} | {{deps_issues}} vulnerabilities |
| Secret Scanning | {{secrets_status}} | {{secrets_issues}} secrets exposed |
| OPA Policy | {{opa_status}} | {{opa_issues}} violations |

### Frontend Quality

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Lighthouse Performance | ≥ 90 | {{lighthouse_perf}} | {{perf_status}} |
| Lighthouse A11y | ≥ 95 | {{lighthouse_a11y}} | {{a11y_status}} |
| Lighthouse SEO | ≥ 95 | {{lighthouse_seo}} | {{seo_status}} |
| Visual Regression | 0 diffs | {{visual_diffs}} | {{visual_status}} |

---

## 🚀 Deployment

### Environments

| Environment | Version | Deployed At | Status |
|-------------|---------|-------------|--------|
| **Production** | `v{{VERSION}}` | {{prod_deployed_at}} | 🟢 Live |
| **Staging** | `v{{VERSION}}` | {{staging_deployed_at}} | 🟢 Live |
| **Development** | `main` | Continuous | 🟡 Active |

### Canary Deployment

- **Strategy:** Blue/Green with Canary Promotion
- **Promotion:** 1% → 5% → 25% → 100%
- **Duration:** {{canary_duration}} minutes
- **Rollbacks:** {{rollback_count}}

---

## 📊 Impact

### Availability

- **Uptime SLO:** 99.9% (target: 99.9%)
- **Incident Count:** {{incident_count}}
- **Mean Time to Recovery:** {{mttr}} minutes

### Performance

- **p50 Latency:** {{p50_latency}}ms ({{p50_improvement}} improvement)
- **p95 Latency:** {{p95_latency}}ms ({{p95_improvement}} improvement)
- **p99 Latency:** {{p99_latency}}ms ({{p99_improvement}} improvement)

### Trust Score

- **TS (Trust Score):** {{trust_score}}/100 ({{ts_change}} from last release)
- **RA$ (Risk Avoided):** ${{risk_avoided}}
- **Sync Freshness:** {{sync_freshness}}%
- **Drift Rate:** {{drift_rate}}%

---

## 🔗 Links

- **GitHub Release:** [v{{VERSION}}]({{github_release_url}})
- **Evidence Pack:** [Download]({{evidence_pack_url}})
- **Changelog:** [CHANGELOG.md]({{changelog_url}})
- **Documentation:** [docs.orca-mesh.io/releases/v{{VERSION}}]({{docs_url}})
- **Migration Guide:** [MIGRATION.md]({{migration_url}}) (if breaking changes)

---

## 👥 Contributors

{{#each contributors}}
- [@{{username}}]({{profile_url}}) ({{contribution_count}} contributions)
{{/each}}

---

## 📝 Notes

{{additional_notes}}

---

## 🆘 Support

If you encounter issues with this release:

1. **Check the documentation:** [docs.orca-mesh.io](https://docs.orca-mesh.io)
2. **Search existing issues:** [GitHub Issues]({{issues_url}})
3. **Open a new issue:** [Report a Bug]({{new_issue_url}})
4. **Contact support:** [support@orca-mesh.io](mailto:support@orca-mesh.io)

---

**Full Changelog:** [v{{PREV_VERSION}}...v{{VERSION}}]({{compare_url}})
