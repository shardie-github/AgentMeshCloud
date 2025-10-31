# 🤖 AI-Assisted Maintenance & Observatory Layer

> Complete guide to ORCA/AgentMesh's intelligent automation system

## Overview

This comprehensive AI-assisted maintenance layer keeps the repository healthy, secure, and well-documented through intelligent automation. It combines static analysis, AI-powered insights, and continuous monitoring to provide:

- **Smart Linting**: Refactor suggestions and anti-pattern detection
- **Dependency Monitoring**: Automatic vulnerability and drift tracking
- **Code Documentation**: Automated comment generation and coverage
- **Repository Observatory**: Trend analysis and health scoring
- **AI Explainer**: Code understanding for new developers
- **Environment Sync**: Cross-platform configuration management

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Optional: Enable AI features
export OPENAI_API_KEY=sk-proj-...
```

### Basic Commands

```bash
# Run full maintenance suite
npm run maintenance:full

# Individual tools
npm run ai:lint                    # Refactor suggestions
npm run ai:dead-code              # Dead code detection
npm run deps:monitor              # Dependency health
npm run comment:check             # Documentation coverage
npm run observatory:collect       # Metrics collection
npm run env:sync                  # Environment validation
```

## 📦 Components

### 1. Smart Lint & Refactor Engine

**Location**: `scripts/ai_lint/`

**Tools**:
- `suggest_refactor.ts` - Detects anti-patterns, complexity issues, code smells
- `detect_dead_code.ts` - Finds unused exports, imports, variables
- `summarize_diff.ts` - Generates PR summaries

**Usage**:
```bash
npm run ai:lint               # Basic scan
npm run ai:lint:verbose       # Show all issues
npm run ai:lint:strict        # Exit with error on high-severity
npm run ai:dead-code          # Find unused code
npm run ai:summarize          # Generate PR summary
```

**Documentation**: [AI_LINT_GUIDE.md](./AI_LINT_GUIDE.md)

### 2. Dependency & Vulnerability Monitor

**Location**: `scripts/deps_monitor.ts`

**Features**:
- Scans npm packages for outdated versions
- Detects security vulnerabilities
- Creates/updates GitHub issues automatically
- Categorizes by severity (critical, high, medium, low)

**Usage**:
```bash
npm run deps:monitor              # Generate report
npm run deps:monitor:github       # Create/update GitHub issue
```

**Workflow**: `.github/workflows/deps-monitor.yml` (runs weekly)

### 3. Code Comment Enhancer

**Location**: `scripts/comment_enhancer.ts`

**Features**:
- Analyzes JSDoc coverage
- Auto-generates missing comments
- Provides templates with TODOs
- Tracks coverage metrics

**Usage**:
```bash
npm run comment:check             # Check coverage
npm run comment:enhance           # Add missing comments
npm run comment:enhance:dry       # Preview only
```

**Documentation**: [CODE_COMMENT_STYLE.md](./CODE_COMMENT_STYLE.md)

### 4. Repository Observatory

**Location**: `observatory/`

**Components**:
- `repo_metrics.ts` - Collects LOC, complexity, coverage
- `generate_trend_report.ts` - Generates trend analysis
- `metrics_schema.json` - Schema definition

**Metrics Tracked**:
- Lines of code (production, test, comments)
- Code quality (lint errors, complexity)
- Project health (issues, PRs, CI pass rate)
- Dependency status

**Usage**:
```bash
npm run observatory:collect       # Collect metrics
npm run observatory:trends        # Generate trends
npm run observatory:full          # Both
```

**Workflow**: `.github/workflows/observatory.yml` (weekly)

### 5. AI Code Explainer

**Location**: `scripts/ai_explain/`

**Tools**:
- `explain_code.ts` - Explains any code file
- `explain_endpoint.ts` - Documents API endpoints

**Features**:
- Purpose and functionality description
- Export/import analysis
- Complexity assessment
- API touchpoint detection
- Flow diagrams
- AI-enhanced explanations (optional)

**Usage**:
```bash
npm run ai:explain src/api/server.ts
npm run ai:explain:api src/api/routes/workflows.ts

# With AI
OPENAI_API_KEY=sk-... npm run ai:explain src/file.ts --save
```

**Documentation**: [AI_EXPLAINER.md](./AI_EXPLAINER.md)

### 6. Environment Sync Assistant

**Location**: `scripts/env_sync.ts`

**Features**:
- Compares local .env, Supabase secrets, Vercel env vars
- Detects drift and mismatches
- Validates required variables
- Provides sync recommendations

**Usage**:
```bash
npm run env:sync                  # Check sync status
npm run env:sync:fix              # Preview fixes (dry-run)
```

**Documentation**: [ENV_SYNC_GUIDE.md](./ENV_SYNC_GUIDE.md)

## 🔄 CI/CD Integration

### Automated Workflows

**1. AI Maintenance** (`.github/workflows/ai-maintenance.yml`)
- Runs on PRs and weekly
- AI lint analysis
- Comment coverage check
- Environment validation
- Uploads combined report

**2. Dependency Monitor** (`.github/workflows/deps-monitor.yml`)
- Weekly dependency scan
- Security audit
- GitHub issue creation/update
- Artifact uploads

**3. Repository Observatory** (`.github/workflows/observatory.yml`)
- Weekly metrics collection
- Trend report generation
- Health score calculation
- Metrics committed to repo

### Artifacts

All workflows upload artifacts:
- `AI_MAINTENANCE_REPORT.md`
- `DEPENDENCY_REPORT.md`
- `HEALTH_REPORT.md`
- `METRICS_DASHBOARD.md`

## 📊 Understanding the Reports

### Refactor Report

```
═══════════════════════════════════════════════════════════
          🎯 REFACTOR SUGGESTION REPORT
═══════════════════════════════════════════════════════════

📊 Summary:
   Total issues found: 23
   🔴 High severity: 3    <- Fix immediately
   🟡 Medium severity: 12  <- Fix this sprint
   🟢 Low severity: 8      <- Backlog

🔴 HIGH SEVERITY ISSUES:
   Deep nesting, long functions, god classes

🟡 MEDIUM SEVERITY ISSUES:
   Large files, long parameter lists

🟢 LOW SEVERITY ISSUES:
   TODO comments, magic numbers
```

### Dependency Report

```
📦 Dependency Drift Report

## 📊 Summary
- Outdated Packages: 12
- Vulnerable Packages: 3
- Critical Vulnerabilities: 1 🔴
- High Vulnerabilities: 2 🟠

## 🔴 Critical Vulnerabilities (Action Required)
Immediate action needed

## 📦 Outdated Packages
Major and minor updates available
```

### Observatory Trends

```
# 📈 Repository Trend Report

## 📝 Code Metrics Trends
| Metric | Current | Previous | Change | Trend |
|--------|---------|----------|--------|-------|
| Total LOC | 45,230 | 44,100 | +1,130 | 🟢 ↑ |
| Test LOC | 12,450 | 11,980 | +470 | 🟢 ↑ |

## 🏆 Repository Health Score
Score: 87/100 - 🟢 Good

- +5 (good comment coverage)
- -10 (CI pass rate below 90%)
```

## 🎯 Best Practices

### Daily Development

```bash
# Before committing
npm run ai:lint

# Before pushing
npm run ai:lint:strict
npm run comment:check
```

### Weekly Maintenance

```bash
# Run full maintenance
npm run maintenance:full

# Review reports
cat observatory/trend_report.md
cat DEPENDENCY_REPORT.md
```

### Monthly Health Check

1. Review all open maintenance issues
2. Check health score trends
3. Address critical/high severity items
4. Update dependencies
5. Improve documentation coverage

### New Developer Onboarding

```bash
# Generate onboarding doc
npm run ai:explain src/index.ts > ONBOARDING.md
npm run ai:explain src/api/server.ts >> ONBOARDING.md

# Document all routes
for file in src/api/routes/*.ts; do
  npm run ai:explain:api "$file" --save
done
```

## 🔧 Configuration

### Customize Thresholds

Edit `scripts/ai_lint/suggest_refactor.ts`:
```typescript
const COMPLEXITY_THRESHOLD = 15;
const LOC_THRESHOLD = 300;
const MAX_PARAMS = 4;
```

### Required Environment Variables

Add to `scripts/env_sync.ts`:
```typescript
const requiredVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'YOUR_CUSTOM_VAR'
];
```

### Enable AI Features

```bash
# Optional: for enhanced AI-powered analysis
export OPENAI_API_KEY=sk-proj-...

# Verify
echo $OPENAI_API_KEY
```

## 📈 Metrics Dashboard

Track these key metrics over time:

### Code Health
- Total LOC (production vs. test)
- Cyclomatic complexity
- Comment coverage %
- Lint errors/warnings

### Project Health
- Open issues
- Open PRs
- CI pass rate
- Last deployment

### Dependency Health
- Total dependencies
- Outdated count
- Vulnerable count
- Security score

### Quality Trends
- Week-over-week deltas
- Health score (0-100)
- Sparkline visualizations
- Regression alerts

## 🚨 Troubleshooting

### "tsx command not found"

```bash
npm install
# or
npm install -g tsx
```

### "No files found"

Ensure you're in project root:
```bash
cd /path/to/workspace
npm run ai:lint
```

### "OpenAI API failed"

Tools automatically fall back to AST mode. To fix:
```bash
export OPENAI_API_KEY=sk-proj-...
```

### "Permission denied"

Make scripts executable:
```bash
chmod +x scripts/**/*.ts
```

## 📚 Documentation

Comprehensive guides available:

- [AI Lint Guide](./AI_LINT_GUIDE.md) - Refactoring and code quality
- [Code Comment Style](./CODE_COMMENT_STYLE.md) - Documentation standards
- [AI Explainer](./AI_EXPLAINER.md) - Code understanding tools
- [Environment Sync](./ENV_SYNC_GUIDE.md) - Config management

## 🎓 Examples

### Example 1: Pre-commit Hook

```bash
#!/bin/sh
# .husky/pre-commit

npm run ai:lint:strict || {
  echo "Fix high-severity issues or use --no-verify"
  exit 1
}

npm run comment:check
```

### Example 2: Weekly Report Script

```bash
#!/bin/bash
# weekly-report.sh

echo "# Weekly Maintenance Report" > WEEKLY_REPORT.md
echo "$(date)" >> WEEKLY_REPORT.md

npm run ai:lint >> WEEKLY_REPORT.md
npm run deps:monitor >> WEEKLY_REPORT.md
npm run observatory:trends >> WEEKLY_REPORT.md

cat WEEKLY_REPORT.md | mail -s "Weekly Report" team@example.com
```

### Example 3: PR Template

```markdown
## Changes
${AI_SUMMARY}

## Code Quality
- [ ] AI lint passed
- [ ] No dead code
- [ ] Comment coverage > 90%
- [ ] No new vulnerabilities

## Generated Reports
See workflow artifacts for:
- AI maintenance report
- Dependency analysis
- Trend charts
```

## 🏆 Success Metrics

After implementing this system:

### Code Quality
- ✅ 90%+ comment coverage
- ✅ <5 high-severity lint issues
- ✅ Zero critical vulnerabilities
- ✅ Complexity trends improving

### Developer Experience
- ✅ Faster onboarding (AI explainer)
- ✅ Better code reviews (automated summaries)
- ✅ Clear refactoring guidance
- ✅ Self-documenting code

### Operations
- ✅ Automated dependency monitoring
- ✅ Weekly health reports
- ✅ No environment drift issues
- ✅ Continuous improvement tracking

## 🔮 Future Enhancements

Planned features:

1. **Machine Learning**: Learn from accepted refactorings
2. **Visual Dashboards**: Web UI for metrics
3. **Integration Tests**: Auto-generate test suggestions
4. **Performance Profiling**: Detect performance regressions
5. **Security Scanning**: Beyond dependencies
6. **Architecture Analysis**: Detect architectural anti-patterns

## 🤝 Contributing

To add new maintenance tools:

1. Create script in appropriate directory
2. Add npm script to `package.json`
3. Update relevant workflow
4. Add documentation
5. Test thoroughly

## 📞 Support

For issues or questions:
1. Check documentation above
2. Review troubleshooting section
3. Search GitHub issues
4. Contact platform team

---

## 🎉 Getting Started Checklist

- [ ] Install dependencies: `npm install`
- [ ] Run first scan: `npm run maintenance:full`
- [ ] Review reports in artifacts/
- [ ] Set up pre-commit hooks
- [ ] Enable AI features (optional)
- [ ] Configure CI workflows
- [ ] Review weekly reports
- [ ] Celebrate automated maintenance! 🎊

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-31  
**Maintained by**: ORCA Platform Team

🚀 **Ready for Enterprise Launch** - Your codebase is now self-documenting, self-monitoring, and investor-ready!
