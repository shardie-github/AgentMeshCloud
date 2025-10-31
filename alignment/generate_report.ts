#!/usr/bin/env tsx
/**
 * Integration Report Generator
 * Generates human-readable INTEGRATION_REPORT.md from inventory and wiring checks
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { Inventory } from './inventory_scan';
import type { WiringReport, WiringIssue } from './wiring_check';

const WORKSPACE = process.cwd();

interface OwnershipMap {
  ownership: Record<string, { owner: string; backup?: string; domain: string }>;
  teams: Record<string, { lead: string; slack: string }>;
}

async function loadData() {
  const inventoryPath = path.join(WORKSPACE, 'alignment/inventory.json');
  const wiringPath = path.join(WORKSPACE, 'alignment/wiring_report.json');
  const ownershipPath = path.join(WORKSPACE, 'alignment/ownership_map.yaml');
  
  const [inventoryContent, wiringContent, ownershipContent] = await Promise.all([
    fs.readFile(inventoryPath, 'utf-8'),
    fs.readFile(wiringPath, 'utf-8'),
    fs.readFile(ownershipPath, 'utf-8')
  ]);
  
  return {
    inventory: JSON.parse(inventoryContent) as Inventory,
    wiring: JSON.parse(wiringContent) as WiringReport,
    ownership: yaml.load(ownershipContent) as OwnershipMap
  };
}

function generateMarkdown(inventory: Inventory, wiring: WiringReport, ownership: OwnershipMap): string {
  const md: string[] = [];
  
  md.push('# ORCA System Integration Report');
  md.push('');
  md.push(`**Generated:** ${new Date().toISOString()}`);
  md.push(`**Status:** ${wiring.summary.red === 0 ? '✅ GREEN' : wiring.summary.red < 5 ? '🟡 YELLOW' : '🔴 RED'}`);
  md.push('');
  md.push('---');
  md.push('');
  
  // Executive Summary
  md.push('## Executive Summary');
  md.push('');
  md.push(`This report provides a comprehensive integration audit of the ORCA AgentMesh system.`);
  md.push(`The system consists of **${inventory.summary.totalItems} components** across ${inventory.summary.services} services.`);
  md.push('');
  
  if (wiring.summary.red === 0) {
    md.push('✅ **All critical checks passed.** System is well-integrated and production-ready.');
  } else if (wiring.summary.red < 5) {
    md.push(`🟡 **${wiring.summary.red} critical issues** require attention before production deployment.`);
  } else {
    md.push(`🔴 **${wiring.summary.red} critical issues** detected. System requires significant remediation.`);
  }
  md.push('');
  md.push('---');
  md.push('');
  
  // System Inventory
  md.push('## System Inventory');
  md.push('');
  md.push('| Component Type | Count | Status |');
  md.push('|----------------|-------|--------|');
  md.push(`| Services | ${inventory.summary.services} | ${inventory.summary.services > 0 ? '✅' : '⚠️'} |`);
  md.push(`| API Routes | ${inventory.summary.routes} | ${inventory.summary.routes > 0 ? '✅' : '⚠️'} |`);
  md.push(`| Database Tables | ${inventory.summary.tables} | ${inventory.summary.tables > 0 ? '✅' : '⚠️'} |`);
  md.push(`| Policies (OPA/YAML) | ${inventory.summary.policies} | ${inventory.summary.policies > 0 ? '✅' : '⚠️'} |`);
  md.push(`| Feature Flags | ${inventory.summary.flags} | ${inventory.summary.flags >= 0 ? '✅' : '⚠️'} |`);
  md.push(`| Scheduled Jobs | ${inventory.summary.jobs} | ${inventory.summary.jobs >= 0 ? '✅' : '⚠️'} |`);
  md.push('');
  md.push('---');
  md.push('');
  
  // Integration Issues
  md.push('## Integration Issues');
  md.push('');
  md.push(`**Total Issues:** ${wiring.summary.total} (🔴 ${wiring.summary.red} critical, 🟡 ${wiring.summary.yellow} warnings, 🟢 ${wiring.summary.green} info)`);
  md.push('');
  
  // Group issues by severity
  const redIssues = wiring.issues.filter(i => i.severity === 'red');
  const yellowIssues = wiring.issues.filter(i => i.severity === 'yellow');
  
  if (redIssues.length > 0) {
    md.push('### 🔴 Critical Issues (Must Fix)');
    md.push('');
    redIssues.forEach((issue, idx) => {
      md.push(`#### ${idx + 1}. ${issue.item}`);
      md.push('');
      md.push(`**Category:** ${issue.category}`);
      md.push(`**Description:** ${issue.description}`);
      if (issue.location) {
        md.push(`**Location:** \`${issue.location}\``);
      }
      if (issue.suggestedFix) {
        md.push(`**Fix:** ${issue.suggestedFix}`);
      }
      
      // Try to assign owner
      const owner = findOwner(issue.location || issue.item, ownership);
      if (owner) {
        md.push(`**Owner:** ${owner.owner} (${owner.domain})`);
        const team = ownership.teams[owner.owner.replace('@', '')];
        if (team) {
          md.push(`**Contact:** ${team.slack}`);
        }
      }
      md.push('');
    });
    md.push('---');
    md.push('');
  }
  
  if (yellowIssues.length > 0) {
    md.push('### 🟡 Warnings (Should Fix)');
    md.push('');
    md.push('| Item | Category | Description | Owner |');
    md.push('|------|----------|-------------|-------|');
    
    yellowIssues.slice(0, 20).forEach(issue => {
      const owner = findOwner(issue.location || issue.item, ownership);
      const ownerStr = owner ? owner.owner : 'unassigned';
      const itemName = issue.item.length > 50 ? issue.item.substring(0, 47) + '...' : issue.item;
      const desc = issue.description.length > 60 ? issue.description.substring(0, 57) + '...' : issue.description;
      md.push(`| ${itemName} | ${issue.category} | ${desc} | ${ownerStr} |`);
    });
    
    if (yellowIssues.length > 20) {
      md.push('');
      md.push(`*... and ${yellowIssues.length - 20} more warnings. See full JSON report.*`);
    }
    md.push('');
    md.push('---');
    md.push('');
  }
  
  // Call Graph Status
  md.push('## Integration Call Graphs');
  md.push('');
  md.push('### API ↔ Database');
  md.push('');
  const apiDbMissing = wiring.callGraphs.apiToDb.missing.length;
  md.push(`- **Status:** ${apiDbMissing === 0 ? '✅ Connected' : `⚠️ ${apiDbMissing} missing connections`}`);
  if (apiDbMissing > 0) {
    md.push(`- **Missing:** ${wiring.callGraphs.apiToDb.missing.slice(0, 5).join(', ')}`);
  }
  md.push('');
  
  md.push('### API ↔ Telemetry');
  md.push('');
  const apiTelemetryMissing = wiring.callGraphs.apiToTelemetry.missing.length;
  md.push(`- **Status:** ${apiTelemetryMissing === 0 ? '✅ Connected' : `⚠️ ${apiTelemetryMissing} routes missing telemetry`}`);
  md.push('');
  
  md.push('---');
  md.push('');
  
  // Ownership Gaps
  md.push('## Ownership & Accountability');
  md.push('');
  md.push(`Total teams: ${Object.keys(ownership.teams).length}`);
  md.push('');
  
  const unassignedIssues = wiring.issues.filter(issue => {
    return !findOwner(issue.location || issue.item, ownership);
  });
  
  if (unassignedIssues.length > 0) {
    md.push(`⚠️ **${unassignedIssues.length} issues** have no assigned owner.`);
    md.push('');
  } else {
    md.push('✅ All issues have assigned owners.');
    md.push('');
  }
  
  // Team breakdown
  md.push('### Issues by Team');
  md.push('');
  const issuesByTeam = new Map<string, number>();
  
  wiring.issues.forEach(issue => {
    const owner = findOwner(issue.location || issue.item, ownership);
    if (owner) {
      const count = issuesByTeam.get(owner.owner) || 0;
      issuesByTeam.set(owner.owner, count + 1);
    }
  });
  
  md.push('| Team | Issues | Contact |');
  md.push('|------|--------|---------|');
  
  Array.from(issuesByTeam.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([team, count]) => {
      const teamInfo = ownership.teams[team.replace('@', '')];
      const contact = teamInfo ? teamInfo.slack : 'unknown';
      md.push(`| ${team} | ${count} | ${contact} |`);
    });
  
  md.push('');
  md.push('---');
  md.push('');
  
  // Recommendations
  md.push('## Recommendations & Next Steps');
  md.push('');
  
  if (redIssues.length > 0) {
    md.push('### Immediate Actions Required:');
    md.push('');
    md.push('1. **Fix Critical Issues:** Address all 🔴 red issues listed above before deployment');
    md.push('2. **Policy Coverage:** Ensure 100% route coverage with OPA policies or RBAC');
    md.push('3. **Telemetry Gaps:** Add instrumentation to all critical API routes');
    md.push('');
  }
  
  md.push('### Short-term Improvements:');
  md.push('');
  md.push('1. **Dead Code Cleanup:** Remove orphaned exports and unused code');
  md.push('2. **Schema Consolidation:** Merge duplicate type definitions');
  md.push('3. **Documentation:** Address TODOs and FIXMEs in codebase');
  md.push('');
  
  md.push('### Long-term Goals:');
  md.push('');
  md.push('1. **Catalog Automation:** Keep schema/API catalogs synchronized via CI');
  md.push('2. **Testing Coverage:** Expand contract tests and integration tests');
  md.push('3. **Observability:** Enhance distributed tracing coverage');
  md.push('');
  
  md.push('---');
  md.push('');
  
  // Appendix
  md.push('## Appendix');
  md.push('');
  md.push('### Generated Reports');
  md.push('');
  md.push('- `alignment/inventory.json` - Full system inventory');
  md.push('- `alignment/wiring_report.json` - Detailed wiring analysis');
  md.push('- `alignment/ownership_map.yaml` - Team ownership mapping');
  md.push('');
  
  md.push('### Regenerate This Report');
  md.push('');
  md.push('```bash');
  md.push('npm run align:scan');
  md.push('```');
  md.push('');
  
  md.push('---');
  md.push('');
  md.push('*Report generated by ORCA Alignment Tools*');
  md.push('');
  
  return md.join('\n');
}

function findOwner(location: string, ownership: OwnershipMap): { owner: string; domain: string } | null {
  // Try exact match first
  for (const [pattern, info] of Object.entries(ownership.ownership)) {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(location)) {
      return { owner: info.owner, domain: info.domain };
    }
  }
  
  // Try prefix match
  for (const [pattern, info] of Object.entries(ownership.ownership)) {
    const prefix = pattern.replace(/\*\*$/, '').replace(/\*$/, '');
    if (location.startsWith(prefix)) {
      return { owner: info.owner, domain: info.domain };
    }
  }
  
  return null;
}

async function main() {
  console.log('📝 Generating integration report...\n');
  
  const data = await loadData();
  const markdown = generateMarkdown(data.inventory, data.wiring, data.ownership);
  
  const outputPath = path.join(WORKSPACE, 'alignment/INTEGRATION_REPORT.md');
  await fs.writeFile(outputPath, markdown);
  
  console.log('✅ Integration report generated!\n');
  console.log(`📄 Report saved to: ${outputPath}\n`);
  
  // Print quick summary
  console.log('Quick Summary:');
  console.log(`  Total Components: ${data.inventory.summary.totalItems}`);
  console.log(`  🔴 Critical Issues: ${data.wiring.summary.red}`);
  console.log(`  🟡 Warnings: ${data.wiring.summary.yellow}`);
  console.log('');
  
  if (data.wiring.summary.red > 0) {
    console.log('⚠️  Action required: Fix critical issues before deployment');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { generateMarkdown, findOwner };
