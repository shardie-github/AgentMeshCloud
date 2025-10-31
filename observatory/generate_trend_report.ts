#!/usr/bin/env tsx
/**
 * Trend Report Generator
 * 
 * Analyzes historical metrics data and generates trend reports
 * with week-over-week deltas and ASCII sparkline charts.
 */

import fs from 'fs';
import path from 'path';

interface RepoMetrics {
  timestamp: string;
  codeMetrics: any;
  qualityMetrics: any;
  projectMetrics: any;
  dependencyMetrics: any;
}

interface TrendData {
  metric: string;
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
  trend: 'up' | 'down' | 'stable';
  sparkline: string;
}

class TrendReportGenerator {
  private historicalData: RepoMetrics[] = [];

  /**
   * Load historical metrics
   */
  loadHistoricalData(dir: string = 'observatory'): void {
    if (!fs.existsSync(dir)) {
      console.warn(`Directory ${dir} not found`);
      return;
    }

    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('metrics_') && f.endsWith('.json'))
      .sort()
      .reverse();

    for (const file of files.slice(0, 30)) { // Load last 30 data points
      const filepath = path.join(dir, file);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      this.historicalData.push(data);
    }

    console.log(`📊 Loaded ${this.historicalData.length} historical data points\n`);
  }

  /**
   * Generate trend report
   */
  generateReport(): string {
    if (this.historicalData.length < 2) {
      return '⚠️  Insufficient historical data for trend analysis. Run metrics collection at least twice.';
    }

    const current = this.historicalData[0];
    const previous = this.historicalData[1];

    let report = '# 📈 Repository Trend Report\n\n';
    report += `> Generated: ${new Date().toLocaleString()}\n`;
    report += `> Comparing: ${new Date(previous.timestamp).toLocaleDateString()} → ${new Date(current.timestamp).toLocaleDateString()}\n\n`;

    // Code metrics trends
    report += '## 📝 Code Metrics Trends\n\n';
    report += this.generateSection([
      {
        label: 'Total LOC',
        current: current.codeMetrics.totalLOC,
        previous: previous.codeMetrics.totalLOC,
        field: 'totalLOC'
      },
      {
        label: 'Production LOC',
        current: current.codeMetrics.productionLOC,
        previous: previous.codeMetrics.productionLOC,
        field: 'productionLOC'
      },
      {
        label: 'Test LOC',
        current: current.codeMetrics.testLOC,
        previous: previous.codeMetrics.testLOC,
        field: 'testLOC'
      },
      {
        label: 'File Count',
        current: current.codeMetrics.fileCount,
        previous: previous.codeMetrics.fileCount,
        field: 'fileCount'
      }
    ]);

    // Quality metrics trends
    report += '\n## 🔍 Quality Metrics Trends\n\n';
    report += this.generateSection([
      {
        label: 'Lint Errors',
        current: current.qualityMetrics.lintErrors,
        previous: previous.qualityMetrics.lintErrors,
        field: 'lintErrors',
        inverse: true // Lower is better
      },
      {
        label: 'Lint Warnings',
        current: current.qualityMetrics.lintWarnings,
        previous: previous.qualityMetrics.lintWarnings,
        field: 'lintWarnings',
        inverse: true
      },
      {
        label: 'Avg Complexity',
        current: current.qualityMetrics.complexity,
        previous: previous.qualityMetrics.complexity,
        field: 'complexity',
        inverse: true
      },
      {
        label: 'Comment Coverage',
        current: current.qualityMetrics.commentCoverage,
        previous: previous.qualityMetrics.commentCoverage,
        field: 'commentCoverage',
        suffix: '%'
      }
    ]);

    // Project metrics trends
    report += '\n## 📋 Project Metrics Trends\n\n';
    report += this.generateSection([
      {
        label: 'Open Issues',
        current: current.projectMetrics.openIssues,
        previous: previous.projectMetrics.openIssues,
        field: 'openIssues',
        inverse: true
      },
      {
        label: 'Open PRs',
        current: current.projectMetrics.openPRs,
        previous: previous.projectMetrics.openPRs,
        field: 'openPRs',
        inverse: true
      },
      {
        label: 'CI Pass Rate',
        current: current.projectMetrics.ciPassRate,
        previous: previous.projectMetrics.ciPassRate,
        field: 'ciPassRate',
        suffix: '%'
      }
    ]);

    // Dependency metrics trends
    report += '\n## 📦 Dependency Metrics Trends\n\n';
    report += this.generateSection([
      {
        label: 'Total Dependencies',
        current: current.dependencyMetrics.totalDependencies,
        previous: previous.dependencyMetrics.totalDependencies,
        field: 'totalDependencies'
      },
      {
        label: 'Outdated',
        current: current.dependencyMetrics.outdatedCount,
        previous: previous.dependencyMetrics.outdatedCount,
        field: 'outdatedCount',
        inverse: true
      },
      {
        label: 'Vulnerable',
        current: current.dependencyMetrics.vulnerableCount,
        previous: previous.dependencyMetrics.vulnerableCount,
        field: 'vulnerableCount',
        inverse: true
      }
    ]);

    // Sparklines
    report += '\n## 📊 Historical Trends (Last 30 Days)\n\n';
    report += this.generateSparklines();

    // Health Score
    report += '\n## 🏆 Repository Health Score\n\n';
    report += this.calculateHealthScore(current);

    // Recommendations
    report += '\n## 💡 Recommendations\n\n';
    report += this.generateRecommendations(current, previous);

    return report;
  }

  /**
   * Generate trend section
   */
  private generateSection(metrics: Array<{
    label: string;
    current: number;
    previous: number;
    field: string;
    inverse?: boolean;
    suffix?: string;
  }>): string {
    let section = '| Metric | Current | Previous | Change | Trend |\n';
    section += '|--------|---------|----------|--------|-------|\n';

    for (const metric of metrics) {
      const delta = metric.current - metric.previous;
      const deltaPercent = metric.previous !== 0
        ? ((delta / metric.previous) * 100).toFixed(1)
        : '∞';

      let trend = '→';
      let trendColor = '⚪';

      if (delta > 0) {
        trend = '↑';
        trendColor = metric.inverse ? '🔴' : '🟢';
      } else if (delta < 0) {
        trend = '↓';
        trendColor = metric.inverse ? '🟢' : '🔴';
      }

      const suffix = metric.suffix || '';
      const currentFormatted = metric.current.toFixed(suffix === '%' ? 1 : 0);
      const previousFormatted = metric.previous.toFixed(suffix === '%' ? 1 : 0);
      const deltaFormatted = (delta > 0 ? '+' : '') + delta.toFixed(suffix === '%' ? 1 : 0);

      section += `| ${metric.label} | ${currentFormatted}${suffix} | ${previousFormatted}${suffix} | ${deltaFormatted}${suffix} (${deltaPercent}%) | ${trendColor} ${trend} |\n`;
    }

    return section;
  }

  /**
   * Generate sparklines for key metrics
   */
  private generateSparklines(): string {
    if (this.historicalData.length < 3) {
      return '*Need more data points for sparklines*\n';
    }

    const sparklines: string[] = [];

    // LOC sparkline
    const locData = this.historicalData.reverse().map(d => d.codeMetrics.totalLOC);
    sparklines.push(`**Total LOC:** ${this.createSparkline(locData)}`);

    // Lint errors sparkline
    const lintData = this.historicalData.map(d => d.qualityMetrics.lintErrors);
    sparklines.push(`**Lint Errors:** ${this.createSparkline(lintData)}`);

    // Open issues sparkline
    const issuesData = this.historicalData.map(d => d.projectMetrics.openIssues);
    sparklines.push(`**Open Issues:** ${this.createSparkline(issuesData)}`);

    // CI pass rate sparkline
    const ciData = this.historicalData.map(d => d.projectMetrics.ciPassRate);
    sparklines.push(`**CI Pass Rate:** ${this.createSparkline(ciData)}`);

    return sparklines.join('\n\n') + '\n';
  }

  /**
   * Create ASCII sparkline
   */
  private createSparkline(data: number[]): string {
    if (data.length === 0) return '';

    const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) return chars[4].repeat(data.length);

    return data.map(value => {
      const normalized = (value - min) / range;
      const index = Math.floor(normalized * (chars.length - 1));
      return chars[index];
    }).join('');
  }

  /**
   * Calculate repository health score
   */
  private calculateHealthScore(metrics: RepoMetrics): string {
    let score = 100;
    const reasons: string[] = [];

    // Deduct for lint errors
    if (metrics.qualityMetrics.lintErrors > 0) {
      const deduction = Math.min(metrics.qualityMetrics.lintErrors * 2, 30);
      score -= deduction;
      reasons.push(`-${deduction} (${metrics.qualityMetrics.lintErrors} lint errors)`);
    }

    // Deduct for vulnerabilities
    if (metrics.dependencyMetrics.vulnerableCount > 0) {
      const deduction = Math.min(metrics.dependencyMetrics.vulnerableCount * 5, 25);
      score -= deduction;
      reasons.push(`-${deduction} (${metrics.dependencyMetrics.vulnerableCount} vulnerabilities)`);
    }

    // Deduct for low test coverage
    const testRatio = metrics.codeMetrics.testLOC / metrics.codeMetrics.productionLOC;
    if (testRatio < 0.5) {
      const deduction = 15;
      score -= deduction;
      reasons.push(`-${deduction} (low test coverage)`);
    }

    // Deduct for low CI pass rate
    if (metrics.projectMetrics.ciPassRate < 90) {
      const deduction = 10;
      score -= deduction;
      reasons.push(`-${deduction} (CI pass rate below 90%)`);
    }

    // Bonus for good comment coverage
    if (metrics.qualityMetrics.commentCoverage > 25) {
      score += 5;
      reasons.push('+5 (good comment coverage)');
    }

    score = Math.max(0, Math.min(100, score));

    let rating = '';
    if (score >= 90) rating = '🌟 Excellent';
    else if (score >= 80) rating = '🟢 Good';
    else if (score >= 70) rating = '🟡 Fair';
    else if (score >= 60) rating = '🟠 Needs Improvement';
    else rating = '🔴 Critical';

    let output = `**Score: ${score}/100** - ${rating}\n\n`;
    output += '### Score Breakdown\n\n';
    output += reasons.map(r => `- ${r}`).join('\n');
    output += '\n';

    return output;
  }

  /**
   * Generate recommendations based on trends
   */
  private generateRecommendations(current: RepoMetrics, previous: RepoMetrics): string {
    const recommendations: string[] = [];

    // Lint errors
    if (current.qualityMetrics.lintErrors > previous.qualityMetrics.lintErrors) {
      recommendations.push('🔴 **Lint errors increased** - Run `npm run ai:lint` to identify and fix issues');
    }

    // Vulnerabilities
    if (current.dependencyMetrics.vulnerableCount > 0) {
      recommendations.push('🔴 **Security vulnerabilities detected** - Run `npm run deps:monitor --github` to track and fix');
    }

    // Outdated dependencies
    if (current.dependencyMetrics.outdatedCount > 10) {
      recommendations.push('🟡 **Many outdated dependencies** - Schedule dependency updates');
    }

    // Low test coverage
    const testRatio = current.codeMetrics.testLOC / current.codeMetrics.productionLOC;
    if (testRatio < 0.5) {
      recommendations.push('🟡 **Low test coverage** - Consider adding more tests');
    }

    // CI pass rate
    if (current.projectMetrics.ciPassRate < 90) {
      recommendations.push('🟠 **CI pass rate below 90%** - Investigate failing builds');
    }

    // Open issues/PRs
    if (current.projectMetrics.openIssues > 20) {
      recommendations.push('📋 **Many open issues** - Consider triaging and closing stale issues');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ **Repository is in great shape!** - Keep up the good work');
    }

    return recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n') + '\n';
  }

  /**
   * Save report to file
   */
  saveReport(content: string, filename: string = 'trend_report.md'): void {
    const filepath = path.join('observatory', filename);
    fs.writeFileSync(filepath, content);
    console.log(`✅ Trend report saved to ${filepath}`);
  }
}

// Main execution
async function main() {
  const generator = new TrendReportGenerator();

  generator.loadHistoricalData();
  const report = generator.generateReport();

  console.log(report);
  generator.saveReport(report);
}

main().catch(console.error);
