# ORCA Alignment Tools - Quick Start

## Running Alignment Checks

### Full Alignment Scan
\`\`\`bash
npm run align:scan
\`\`\`

This runs:
1. **Inventory Scan** - Discovers all components
2. **Wiring Check** - Verifies integrations
3. **Report Generation** - Creates `INTEGRATION_REPORT.md`

### Individual Commands

\`\`\`bash
# Just inventory
tsx alignment/inventory_scan.ts

# Just wiring check
tsx alignment/wiring_check.ts

# Just report
tsx alignment/generate_report.ts
\`\`\`

## Generating Catalogs

\`\`\`bash
# Generate all catalogs
npm run catalog:gen

# Check for drift
npm run catalog:check
\`\`\`

## Policy Coverage

\`\`\`bash
# Check route protection
npm run policy:coverage
\`\`\`

## KPI & ROI

\`\`\`bash
# Test translator
tsx kpi/translator.ts

# Start API server and test endpoint
curl -X POST http://localhost:3000/kpi/roi \
  -H "Content-Type: application/json" \
  -d '{"kpi_values":{"trust_score":85},"tenant_tier":"pro"}'
\`\`\`

## CI Pipeline Locally

\`\`\`bash
# Run all CI checks
npm run align:scan && \
npm run catalog:gen && \
npm run catalog:check && \
npm run policy:coverage && \
npm run typecheck && \
npm run lint
\`\`\`

## Demo Mode

\`\`\`bash
# Enable demo mode
export DEMO_MODE=true

# Start server
npm run dev

# Data will be synthetic (no PII)
\`\`\`

## Performance Tests

\`\`\`bash
# Install k6 first
# Ubuntu: sudo snap install k6
# Mac: brew install k6

# Run smoke test
npm run perf:test
\`\`\`

## Common Issues

### "Catalog drift detected"
**Fix**: Run `npm run catalog:gen` and commit changes

### "Policy coverage < 100%"
**Fix**: Add OPA policy or mark route as public in `policy_coverage.ts`

### "Wiring check failed"
**Fix**: Review `alignment/wiring_report.json` for specific issues

## Output Files

- `alignment/inventory.json` - Component inventory
- `alignment/wiring_report.json` - Integration issues
- `alignment/INTEGRATION_REPORT.md` - Human-readable summary
- `catalog/*.registry.json` - Schema/API/event/policy/dependency catalogs

## Next Steps

1. Review `INTEGRATION_REPORT.md`
2. Address red issues (if any)
3. Ticket yellow issues with owners
4. Commit catalog updates
5. Push to trigger CI

For full details, see [HOLISTIC_ALIGNMENT_SUMMARY.md](../HOLISTIC_ALIGNMENT_SUMMARY.md)
