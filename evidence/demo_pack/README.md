# ORCA Demo Evidence Pack

This directory contains sanitized, synthetic data exports for sales demonstrations and investor presentations.

## Contents

### Data Files
- `agents_export.json` - Synthetic agent inventory (10 agents)
- `incidents_export.json` - 30 days of simulated incidents
- `kpi_history.json` - Daily KPI metrics (30 days)
- `aiops_actions.json` - AI-Ops automation examples
- `policy_violations.json` - Policy violation and resolution logs
- `trust_score_trend.json` - Trust Score historical trend

### Reports
- `executive_summary.pdf` - One-page overview for C-level
- `roi_calculation.pdf` - Detailed ROI analysis
- `compliance_report.pdf` - SOC 2, ISO 27001 evidence

### Screenshots
- `dashboard_overview.png` - Main dashboard
- `agent_registry.png` - Agent inventory view
- `incidents_panel.png` - Incident management
- `roi_widget.png` - ROI calculator
- `aiops_actions.png` - AI-Ops automation panel

### Video Assets
- `demo_walkthrough_720p.mp4` - 7-minute guided tour
- `feature_highlights_1min.mp4` - Quick feature overview

## Usage

### For Sales Demos
1. Import data: `tsx scripts/import_demo_pack.ts`
2. Set demo mode: `export DEMO_MODE=true`
3. Start platform: `pnpm run orca:dev`
4. Access demo tenant: Demo Tenant ID in environment

### For Investor Presentations
- Use `executive_summary.pdf` for pitch decks
- Show `roi_calculation.pdf` for traction metrics
- Include screenshots in presentations

### For Customer POCs
- Use as baseline for comparison
- Show before/after using real customer data
- Demonstrate ROI methodology

## Data Privacy

⚠️ **IMPORTANT:** All data in this pack is **synthetic** and **non-PII**.

- No real company names (except "Acme Corporation" as demo)
- No real email addresses or phone numbers
- No actual API keys or credentials
- Obfuscated IP addresses and hostnames
- Randomized timestamps (relative to demo date)

This data is safe for:
- Public presentations
- Investor pitches
- Sales demos
- Marketing materials

## Regenerating Demo Data

To create fresh demo data:

```bash
DEMO_MODE=true tsx src/demo/synth_seed.ts
tsx scripts/export_demo_pack.ts --output=evidence/demo_pack
```

## Export Format

All JSON exports follow this structure:

```json
{
  "version": "1.0",
  "generated_at": "2025-10-31T00:00:00Z",
  "demo_mode": true,
  "tenant_id": "demo_tenant_001",
  "data": [
    // ... records
  ]
}
```

## License

This demo data is proprietary to ORCA Platform.
Not for redistribution without permission.

---

**Last Updated:** 2025-10-31  
**Maintained By:** Sales Engineering Team
