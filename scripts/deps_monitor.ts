#!/usr/bin/env tsx
/**
 * Dependency & Vulnerability Drift Monitor
 * 
 * Scans for outdated and vulnerable dependencies, creates or updates
 * a single "Dependency Drift" GitHub issue with severity labels.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface DependencyIssue {
  name: string;
  current: string;
  latest?: string;
  wanted?: string;
  type: 'outdated' | 'vulnerable';
  severity?: 'low' | 'moderate' | 'high' | 'critical';
  advisory?: string;
  cve?: string;
}

interface MonitorReport {
  outdated: DependencyIssue[];
  vulnerable: DependencyIssue[];
  timestamp: string;
  summary: {
    totalOutdated: number;
    totalVulnerable: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
  };
}

class DependencyMonitor {
  private report: MonitorReport = {
    outdated: [],
    vulnerable: [],
    timestamp: new Date().toISOString(),
    summary: {
      totalOutdated: 0,
      totalVulnerable: 0,
      criticalVulnerabilities: 0,
      highVulnerabilities: 0
    }
  };

  /**
   * Run full dependency scan
   */
  async scan(): Promise<MonitorReport> {
    console.log('🔍 Scanning dependencies for drift and vulnerabilities...\n');

    await this.scanOutdated();
    await this.scanVulnerabilities();

    this.report.summary.totalOutdated = this.report.outdated.length;
    this.report.summary.totalVulnerable = this.report.vulnerable.length;
    this.report.summary.criticalVulnerabilities = this.report.vulnerable.filter(
      v => v.severity === 'critical'
    ).length;
    this.report.summary.highVulnerabilities = this.report.vulnerable.filter(
      v => v.severity === 'high'
    ).length;

    return this.report;
  }

  /**
   * Scan for outdated dependencies
   */
  private async scanOutdated(): Promise<void> {
    try {
      console.log('📦 Checking for outdated packages...');
      
      // Use npm outdated
      const output = execSync('npm outdated --json', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (output) {
        const outdated = JSON.parse(output);
        
        for (const [name, info] of Object.entries(outdated)) {
          const pkg = info as any;
          this.report.outdated.push({
            name,
            current: pkg.current,
            latest: pkg.latest,
            wanted: pkg.wanted,
            type: 'outdated'
          });
        }
      }

      console.log(`   Found ${this.report.outdated.length} outdated packages\n`);
    } catch (error: any) {
      // npm outdated exits with 1 when packages are outdated
      if (error.stdout) {
        try {
          const outdated = JSON.parse(error.stdout);
          for (const [name, info] of Object.entries(outdated)) {
            const pkg = info as any;
            this.report.outdated.push({
              name,
              current: pkg.current,
              latest: pkg.latest,
              wanted: pkg.wanted,
              type: 'outdated'
            });
          }
          console.log(`   Found ${this.report.outdated.length} outdated packages\n`);
        } catch (parseError) {
          console.warn('   Could not parse outdated packages');
        }
      }
    }
  }

  /**
   * Scan for vulnerabilities
   */
  private async scanVulnerabilities(): Promise<void> {
    try {
      console.log('🔒 Checking for security vulnerabilities...');
      
      const output = execSync('npm audit --json', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (output) {
        const audit = JSON.parse(output);
        
        if (audit.vulnerabilities) {
          for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
            const v = vuln as any;
            
            this.report.vulnerable.push({
              name,
              current: v.range || 'unknown',
              type: 'vulnerable',
              severity: v.severity,
              advisory: v.via?.[0]?.title || 'No details available',
              cve: v.via?.[0]?.cve || undefined
            });
          }
        }
      }

      console.log(`   Found ${this.report.vulnerable.length} vulnerabilities\n`);
    } catch (error: any) {
      // npm audit exits with 1 when vulnerabilities found
      if (error.stdout) {
        try {
          const audit = JSON.parse(error.stdout);
          
          if (audit.vulnerabilities) {
            for (const [name, vuln] of Object.entries(audit.vulnerabilities)) {
              const v = vuln as any;
              
              this.report.vulnerable.push({
                name,
                current: v.range || 'unknown',
                type: 'vulnerable',
                severity: v.severity,
                advisory: v.via?.[0]?.title || 'No details available',
                cve: v.via?.[0]?.cve || undefined
              });
            }
          }
          
          console.log(`   Found ${this.report.vulnerable.length} vulnerabilities\n`);
        } catch (parseError) {
          console.warn('   Could not parse audit results');
        }
      }
    }
  }

  /**
   * Generate markdown report
   */
  generateMarkdown(): string {
    const { outdated, vulnerable, summary, timestamp } = this.report;

    let md = '# 📦 Dependency Drift Report\n\n';
    md += `> Generated: ${new Date(timestamp).toLocaleString()}\n\n`;

    // Summary
    md += '## 📊 Summary\n\n';
    md += `- **Outdated Packages:** ${summary.totalOutdated}\n`;
    md += `- **Vulnerable Packages:** ${summary.totalVulnerable}\n`;
    md += `- **Critical Vulnerabilities:** ${summary.criticalVulnerabilities} 🔴\n`;
    md += `- **High Vulnerabilities:** ${summary.highVulnerabilities} 🟠\n\n`;

    // Priority: Critical & High Vulnerabilities
    const criticalVulns = vulnerable.filter(v => v.severity === 'critical');
    const highVulns = vulnerable.filter(v => v.severity === 'high');

    if (criticalVulns.length > 0) {
      md += '## 🔴 Critical Vulnerabilities (Action Required)\n\n';
      for (const vuln of criticalVulns) {
        md += `### ${vuln.name}\n`;
        md += `- **Severity:** CRITICAL\n`;
        md += `- **Current:** ${vuln.current}\n`;
        md += `- **Issue:** ${vuln.advisory}\n`;
        if (vuln.cve) md += `- **CVE:** ${vuln.cve}\n`;
        md += `- **Action:** Update immediately\n\n`;
      }
    }

    if (highVulns.length > 0) {
      md += '## 🟠 High Severity Vulnerabilities\n\n';
      for (const vuln of highVulns) {
        md += `### ${vuln.name}\n`;
        md += `- **Severity:** HIGH\n`;
        md += `- **Current:** ${vuln.current}\n`;
        md += `- **Issue:** ${vuln.advisory}\n`;
        if (vuln.cve) md += `- **CVE:** ${vuln.cve}\n`;
        md += `- **Action:** Update soon\n\n`;
      }
    }

    // Other vulnerabilities
    const otherVulns = vulnerable.filter(
      v => v.severity !== 'critical' && v.severity !== 'high'
    );

    if (otherVulns.length > 0) {
      md += '## 🟡 Other Vulnerabilities\n\n';
      md += '<details><summary>Click to expand</summary>\n\n';
      for (const vuln of otherVulns) {
        md += `- **${vuln.name}** (${vuln.severity}): ${vuln.advisory}\n`;
      }
      md += '\n</details>\n\n';
    }

    // Outdated packages
    if (outdated.length > 0) {
      md += '## 📦 Outdated Packages\n\n';
      
      // Major version updates
      const majorUpdates = outdated.filter(o => {
        if (!o.latest || !o.current) return false;
        const currentMajor = o.current.split('.')[0];
        const latestMajor = o.latest.split('.')[0];
        return currentMajor !== latestMajor;
      });

      if (majorUpdates.length > 0) {
        md += '### Major Version Updates Available\n\n';
        md += '| Package | Current | Latest | Change |\n';
        md += '|---------|---------|--------|--------|\n';
        for (const pkg of majorUpdates.slice(0, 20)) {
          md += `| ${pkg.name} | ${pkg.current} | ${pkg.latest} | 🔴 Major |\n`;
        }
        md += '\n';
      }

      // Minor/patch updates
      const minorUpdates = outdated.filter(o => {
        if (!o.latest || !o.current) return false;
        const currentMajor = o.current.split('.')[0];
        const latestMajor = o.latest.split('.')[0];
        return currentMajor === latestMajor;
      });

      if (minorUpdates.length > 0) {
        md += '<details><summary>Minor/Patch Updates</summary>\n\n';
        md += '| Package | Current | Latest |\n';
        md += '|---------|---------|--------|\n';
        for (const pkg of minorUpdates.slice(0, 30)) {
          md += `| ${pkg.name} | ${pkg.current} | ${pkg.latest} |\n`;
        }
        md += '\n</details>\n\n';
      }
    }

    // Recommendations
    md += '## 💡 Recommended Actions\n\n';
    
    if (summary.criticalVulnerabilities > 0) {
      md += '1. **URGENT:** Address critical vulnerabilities immediately\n';
    }
    if (summary.highVulnerabilities > 0) {
      md += '2. **HIGH:** Update high-severity vulnerable packages this week\n';
    }
    if (outdated.length > 10) {
      md += '3. **MODERATE:** Review and update outdated packages in next sprint\n';
    }
    if (summary.totalOutdated === 0 && summary.totalVulnerable === 0) {
      md += '✅ All dependencies are up to date and secure!\n';
    }

    md += '\n---\n\n';
    md += '*This report is automatically generated weekly by the Dependency Monitor.*\n';

    return md;
  }

  /**
   * Get severity label
   */
  getSeverityLabel(): string {
    const { criticalVulnerabilities, highVulnerabilities } = this.report.summary;
    
    if (criticalVulnerabilities > 0) return 'severity: critical';
    if (highVulnerabilities > 0) return 'severity: high';
    if (this.report.summary.totalVulnerable > 0) return 'severity: medium';
    if (this.report.summary.totalOutdated > 5) return 'maintenance';
    return 'dependencies';
  }

  /**
   * Create or update GitHub issue
   */
  async createOrUpdateIssue(): Promise<void> {
    const markdown = this.generateMarkdown();
    const issueTitle = '📦 Dependency Drift Report';
    const label = this.getSeverityLabel();

    // Check if issue already exists
    try {
      const existingIssues = execSync(
        `gh issue list --label "dependency-drift" --state open --json number,title`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
      );

      const issues = JSON.parse(existingIssues);
      const existingIssue = issues.find((i: any) => i.title === issueTitle);

      if (existingIssue) {
        // Update existing issue
        console.log(`📝 Updating existing issue #${existingIssue.number}...`);
        
        const tempFile = '/tmp/dependency-report.md';
        fs.writeFileSync(tempFile, markdown);
        
        execSync(
          `gh issue edit ${existingIssue.number} --body-file "${tempFile}" --add-label "${label}"`,
          { stdio: 'inherit' }
        );
        
        fs.unlinkSync(tempFile);
        console.log(`✅ Updated issue #${existingIssue.number}`);
      } else {
        // Create new issue
        console.log('📝 Creating new dependency drift issue...');
        
        const tempFile = '/tmp/dependency-report.md';
        fs.writeFileSync(tempFile, markdown);
        
        execSync(
          `gh issue create --title "${issueTitle}" --body-file "${tempFile}" --label "dependency-drift,${label}"`,
          { stdio: 'inherit' }
        );
        
        fs.unlinkSync(tempFile);
        console.log('✅ Created new issue');
      }
    } catch (error) {
      console.error('Failed to create/update GitHub issue. Make sure gh CLI is installed and authenticated.');
      console.log('\n📄 Report content:\n');
      console.log(markdown);
    }
  }

  /**
   * Print console report
   */
  printReport(): void {
    const { summary } = this.report;

    console.log('═══════════════════════════════════════════════════════════');
    console.log('       📦 DEPENDENCY DRIFT REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 Summary:');
    console.log(`   Outdated packages: ${summary.totalOutdated}`);
    console.log(`   Vulnerable packages: ${summary.totalVulnerable}`);
    console.log(`   🔴 Critical: ${summary.criticalVulnerabilities}`);
    console.log(`   🟠 High: ${summary.highVulnerabilities}\n`);

    if (summary.criticalVulnerabilities > 0) {
      console.log('🔴 CRITICAL VULNERABILITIES FOUND - ACTION REQUIRED!');
    } else if (summary.highVulnerabilities > 0) {
      console.log('🟠 HIGH SEVERITY VULNERABILITIES - UPDATE SOON');
    } else if (summary.totalVulnerable > 0) {
      console.log('🟡 Some vulnerabilities detected - review recommended');
    } else if (summary.totalOutdated > 0) {
      console.log('📦 Some packages are outdated - consider updating');
    } else {
      console.log('✅ All dependencies are up to date and secure!');
    }

    console.log('\n═══════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  const monitor = new DependencyMonitor();

  // Run scan
  await monitor.scan();
  
  // Print report
  monitor.printReport();

  // Save report to file
  const markdown = monitor.generateMarkdown();
  fs.writeFileSync('DEPENDENCY_REPORT.md', markdown);
  console.log('📄 Report saved to DEPENDENCY_REPORT.md\n');

  // Create/update GitHub issue if --github flag
  if (process.argv.includes('--github')) {
    await monitor.createOrUpdateIssue();
  }
}

main().catch(console.error);
