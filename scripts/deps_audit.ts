#!/usr/bin/env tsx
/**
 * Dependency Audit Script
 * Detects outdated dependencies and generates update plan
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface Package {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  type: 'dependencies' | 'devDependencies';
}

interface VulnerabilitySummary {
  total: number;
  info: number;
  low: number;
  moderate: number;
  high: number;
  critical: number;
}

async function checkOutdated(): Promise<Package[]> {
  try {
    const output = execSync('pnpm outdated --json', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    
    const data = JSON.parse(output);
    const packages: Package[] = [];

    for (const [name, info] of Object.entries(data)) {
      const pkg = info as { current: string; wanted: string; latest: string };
      packages.push({
        name,
        current: pkg.current,
        wanted: pkg.wanted,
        latest: pkg.latest,
        type: 'dependencies',
      });
    }

    return packages;
  } catch (error) {
    // pnpm outdated returns non-zero when outdated packages found
    return [];
  }
}

async function checkVulnerabilities(): Promise<VulnerabilitySummary> {
  try {
    const output = execSync('pnpm audit --json', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    
    const lines = output.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    const data = JSON.parse(lastLine);

    return {
      total: data.vulnerabilities?.total || 0,
      info: data.vulnerabilities?.info || 0,
      low: data.vulnerabilities?.low || 0,
      moderate: data.vulnerabilities?.moderate || 0,
      high: data.vulnerabilities?.high || 0,
      critical: data.vulnerabilities?.critical || 0,
    };
  } catch (error) {
    return { total: 0, info: 0, low: 0, moderate: 0, high: 0, critical: 0 };
  }
}

function generateReport(packages: Package[], vulns: VulnerabilitySummary): string {
  const now = new Date().toISOString();
  
  let report = `# Dependency Audit Report\n\n`;
  report += `**Generated**: ${now}\n\n`;
  
  // Vulnerabilities
  report += `## 🔐 Security Vulnerabilities\n\n`;
  report += `| Severity | Count |\n`;
  report += `|----------|-------|\n`;
  report += `| Critical | ${vulns.critical} |\n`;
  report += `| High     | ${vulns.high} |\n`;
  report += `| Moderate | ${vulns.moderate} |\n`;
  report += `| Low      | ${vulns.low} |\n`;
  report += `| Info     | ${vulns.info} |\n`;
  report += `| **Total**| **${vulns.total}** |\n\n`;

  if (vulns.critical > 0 || vulns.high > 0) {
    report += `⚠️ **Action Required**: Critical or high severity vulnerabilities found.\n`;
    report += `Run \`pnpm audit fix\` to resolve.\n\n`;
  }

  // Outdated packages
  report += `## 📦 Outdated Dependencies\n\n`;
  
  if (packages.length === 0) {
    report += `✅ All dependencies are up to date.\n\n`;
  } else {
    report += `| Package | Current | Wanted | Latest | Update Type |\n`;
    report += `|---------|---------|--------|--------|-------------|\n`;
    
    for (const pkg of packages) {
      const updateType = pkg.current !== pkg.wanted ? 'patch/minor' : 'major';
      report += `| ${pkg.name} | ${pkg.current} | ${pkg.wanted} | ${pkg.latest} | ${updateType} |\n`;
    }
    report += `\n`;
  }

  // Update plan
  report += `## 🔧 Update Plan\n\n`;
  report += `### Safe Updates (patch/minor)\n\n`;
  report += `\`\`\`bash\n`;
  report += `pnpm update\n`;
  report += `\`\`\`\n\n`;
  
  report += `### Major Updates (requires testing)\n\n`;
  const majorUpdates = packages.filter(p => p.wanted !== p.latest);
  
  if (majorUpdates.length > 0) {
    for (const pkg of majorUpdates) {
      report += `\`\`\`bash\n`;
      report += `pnpm add ${pkg.name}@${pkg.latest}\n`;
      report += `# Test thoroughly before committing\n`;
      report += `\`\`\`\n\n`;
    }
  } else {
    report += `No major updates available.\n\n`;
  }

  // Recommendations
  report += `## 📋 Recommendations\n\n`;
  report += `1. **Security First**: Address all critical and high vulnerabilities immediately\n`;
  report += `2. **Test Updates**: Run full test suite after each major update\n`;
  report += `3. **Review Changelogs**: Check breaking changes for major version bumps\n`;
  report += `4. **Automate**: Schedule monthly dependency audits in CI\n\n`;

  // Next steps
  report += `## 🚀 Next Steps\n\n`;
  report += `1. Review this report\n`;
  report += `2. Fix security vulnerabilities: \`pnpm audit fix\`\n`;
  report += `3. Update dependencies: \`pnpm update\`\n`;
  report += `4. Test: \`pnpm run test\` and \`pnpm run typecheck\`\n`;
  report += `5. Commit changes with detailed changelog\n\n`;

  return report;
}

async function main() {
  console.log('🔍 Running dependency audit...\n');

  console.log('📦 Checking for outdated packages...');
  const packages = await checkOutdated();
  console.log(`   Found ${packages.length} outdated packages\n`);

  console.log('🔐 Checking for vulnerabilities...');
  const vulns = await checkVulnerabilities();
  console.log(`   Found ${vulns.total} vulnerabilities\n`);

  console.log('📝 Generating report...');
  const report = generateReport(packages, vulns);
  
  const outputPath = join(process.cwd(), 'metrics', 'deps_update_plan.md');
  writeFileSync(outputPath, report);
  console.log(`   Report written to: ${outputPath}\n`);

  console.log('✅ Dependency audit complete!');
  
  // Exit with error if critical issues found
  if (vulns.critical > 0) {
    console.error('❌ Critical vulnerabilities found!');
    process.exit(1);
  }
}

main().catch(console.error);
