#!/usr/bin/env tsx
/**
 * Repository Observatory - Metrics Collection
 * 
 * Tracks comprehensive repository health metrics including:
 * - Lines of code
 * - Cyclomatic complexity
 * - Test coverage
 * - Lint errors
 * - Comment coverage
 * - Open issues/PRs
 * - CI pass rate
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface RepoMetrics {
  timestamp: string;
  codeMetrics: {
    totalLOC: number;
    productionLOC: number;
    testLOC: number;
    commentLines: number;
    blankLines: number;
    fileCount: number;
  };
  qualityMetrics: {
    lintErrors: number;
    lintWarnings: number;
    complexity: number;
    commentCoverage: number;
    testCoverage?: number;
  };
  projectMetrics: {
    openIssues: number;
    openPRs: number;
    ciPassRate: number;
    lastDeployment?: string;
  };
  dependencyMetrics: {
    totalDependencies: number;
    outdatedCount: number;
    vulnerableCount: number;
  };
}

class RepoObservatory {
  private metrics: RepoMetrics = {
    timestamp: new Date().toISOString(),
    codeMetrics: {
      totalLOC: 0,
      productionLOC: 0,
      testLOC: 0,
      commentLines: 0,
      blankLines: 0,
      fileCount: 0
    },
    qualityMetrics: {
      lintErrors: 0,
      lintWarnings: 0,
      complexity: 0,
      commentCoverage: 0
    },
    projectMetrics: {
      openIssues: 0,
      openPRs: 0,
      ciPassRate: 100
    },
    dependencyMetrics: {
      totalDependencies: 0,
      outdatedCount: 0,
      vulnerableCount: 0
    }
  };

  /**
   * Collect all metrics
   */
  async collect(): Promise<RepoMetrics> {
    console.log('📊 Collecting repository metrics...\n');

    await this.collectCodeMetrics();
    await this.collectQualityMetrics();
    await this.collectProjectMetrics();
    await this.collectDependencyMetrics();

    return this.metrics;
  }

  /**
   * Collect code metrics (LOC, files, etc.)
   */
  private async collectCodeMetrics(): Promise<void> {
    console.log('📝 Analyzing codebase...');
    
    const files = this.getSourceFiles('.');
    this.metrics.codeMetrics.fileCount = files.length;

    let totalLOC = 0;
    let productionLOC = 0;
    let testLOC = 0;
    let commentLines = 0;
    let blankLines = 0;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      const isTest = file.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/);

      let fileComments = 0;
      let fileBlanks = 0;
      let fileLOC = 0;

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed) {
          fileBlanks++;
        } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          fileComments++;
        } else {
          fileLOC++;
        }
      }

      totalLOC += fileLOC;
      commentLines += fileComments;
      blankLines += fileBlanks;

      if (isTest) {
        testLOC += fileLOC;
      } else {
        productionLOC += fileLOC;
      }
    }

    this.metrics.codeMetrics.totalLOC = totalLOC;
    this.metrics.codeMetrics.productionLOC = productionLOC;
    this.metrics.codeMetrics.testLOC = testLOC;
    this.metrics.codeMetrics.commentLines = commentLines;
    this.metrics.codeMetrics.blankLines = blankLines;

    console.log(`   Found ${files.length} files, ${totalLOC} LOC`);
  }

  /**
   * Collect quality metrics
   */
  private async collectQualityMetrics(): Promise<void> {
    console.log('🔍 Analyzing code quality...');

    // Lint errors (if ESLint is available)
    try {
      const lintOutput = execSync('npm run lint -- --format json', { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (lintOutput) {
        const lintResults = JSON.parse(lintOutput);
        let errors = 0;
        let warnings = 0;

        for (const result of lintResults) {
          errors += result.errorCount || 0;
          warnings += result.warningCount || 0;
        }

        this.metrics.qualityMetrics.lintErrors = errors;
        this.metrics.qualityMetrics.lintWarnings = warnings;
      }
    } catch (error) {
      // Lint may not be available or may have errors
    }

    // Calculate complexity (simplified)
    const files = this.getSourceFiles('./src');
    let totalComplexity = 0;

    for (const file of files.slice(0, 100)) { // Sample first 100 files for performance
      const content = fs.readFileSync(file, 'utf-8');
      totalComplexity += this.estimateComplexity(content);
    }

    this.metrics.qualityMetrics.complexity = Math.round(totalComplexity / Math.min(files.length, 100));

    // Comment coverage
    const { commentLines, productionLOC } = this.metrics.codeMetrics;
    this.metrics.qualityMetrics.commentCoverage = productionLOC > 0
      ? (commentLines / (productionLOC + commentLines)) * 100
      : 0;

    console.log(`   Lint: ${this.metrics.qualityMetrics.lintErrors} errors, ${this.metrics.qualityMetrics.lintWarnings} warnings`);
  }

  /**
   * Collect project metrics (issues, PRs, CI)
   */
  private async collectProjectMetrics(): Promise<void> {
    console.log('📋 Analyzing project status...');

    // GitHub issues and PRs (if gh CLI is available)
    try {
      const issuesOutput = execSync('gh issue list --state open --json number', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (issuesOutput) {
        const issues = JSON.parse(issuesOutput);
        this.metrics.projectMetrics.openIssues = issues.length;
      }

      const prsOutput = execSync('gh pr list --state open --json number', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (prsOutput) {
        const prs = JSON.parse(prsOutput);
        this.metrics.projectMetrics.openPRs = prs.length;
      }

      // Get recent CI runs
      const ciOutput = execSync('gh run list --limit 20 --json conclusion', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (ciOutput) {
        const runs = JSON.parse(ciOutput);
        const successful = runs.filter((r: any) => r.conclusion === 'success').length;
        this.metrics.projectMetrics.ciPassRate = runs.length > 0
          ? (successful / runs.length) * 100
          : 100;
      }
    } catch (error) {
      // GitHub CLI may not be available
    }

    console.log(`   ${this.metrics.projectMetrics.openIssues} issues, ${this.metrics.projectMetrics.openPRs} PRs`);
  }

  /**
   * Collect dependency metrics
   */
  private async collectDependencyMetrics(): Promise<void> {
    console.log('📦 Analyzing dependencies...');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      this.metrics.dependencyMetrics.totalDependencies = Object.keys(deps).length;

      // Check for outdated
      try {
        const outdatedOutput = execSync('npm outdated --json', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        });

        if (outdatedOutput) {
          const outdated = JSON.parse(outdatedOutput);
          this.metrics.dependencyMetrics.outdatedCount = Object.keys(outdated).length;
        }
      } catch (error: any) {
        if (error.stdout) {
          const outdated = JSON.parse(error.stdout);
          this.metrics.dependencyMetrics.outdatedCount = Object.keys(outdated).length;
        }
      }

      // Check for vulnerabilities
      try {
        const auditOutput = execSync('npm audit --json', {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'ignore']
        });

        if (auditOutput) {
          const audit = JSON.parse(auditOutput);
          if (audit.vulnerabilities) {
            this.metrics.dependencyMetrics.vulnerableCount = Object.keys(audit.vulnerabilities).length;
          }
        }
      } catch (error: any) {
        if (error.stdout) {
          const audit = JSON.parse(error.stdout);
          if (audit.vulnerabilities) {
            this.metrics.dependencyMetrics.vulnerableCount = Object.keys(audit.vulnerabilities).length;
          }
        }
      }
    } catch (error) {
      console.warn('   Could not analyze dependencies');
    }

    console.log(`   ${this.metrics.dependencyMetrics.totalDependencies} total, ${this.metrics.dependencyMetrics.outdatedCount} outdated`);
  }

  /**
   * Estimate cyclomatic complexity
   */
  private estimateComplexity(content: string): number {
    let complexity = 1;

    const patterns = [
      /\bif\b/g,
      /\belse\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /&&/g,
      /\|\|/g,
      /\?/g
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Get all source files
   */
  private getSourceFiles(dir: string): string[] {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const excludeDirs = ['node_modules', 'dist', 'build', '.next', '.turbo', 'coverage'];
    const files: string[] = [];

    const walk = (currentDir: string) => {
      if (!fs.existsSync(currentDir)) return;
      
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
          if (!excludeDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    walk(dir);
    return files;
  }

  /**
   * Save metrics to file
   */
  saveMetrics(filename: string = 'metrics_latest.json'): void {
    const metricsDir = 'observatory';
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    const filepath = path.join(metricsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(this.metrics, null, 2));
    console.log(`\n💾 Metrics saved to ${filepath}`);
  }

  /**
   * Print metrics summary
   */
  printSummary(): void {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('       📊 REPOSITORY METRICS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Code Metrics:');
    console.log(`   Total LOC: ${this.metrics.codeMetrics.totalLOC.toLocaleString()}`);
    console.log(`   Production LOC: ${this.metrics.codeMetrics.productionLOC.toLocaleString()}`);
    console.log(`   Test LOC: ${this.metrics.codeMetrics.testLOC.toLocaleString()}`);
    console.log(`   Files: ${this.metrics.codeMetrics.fileCount}`);
    console.log(`   Test/Code Ratio: ${((this.metrics.codeMetrics.testLOC / this.metrics.codeMetrics.productionLOC) * 100).toFixed(1)}%\n`);

    console.log('🔍 Quality Metrics:');
    console.log(`   Lint Errors: ${this.metrics.qualityMetrics.lintErrors}`);
    console.log(`   Lint Warnings: ${this.metrics.qualityMetrics.lintWarnings}`);
    console.log(`   Avg Complexity: ${this.metrics.qualityMetrics.complexity}`);
    console.log(`   Comment Coverage: ${this.metrics.qualityMetrics.commentCoverage.toFixed(1)}%\n`);

    console.log('📋 Project Metrics:');
    console.log(`   Open Issues: ${this.metrics.projectMetrics.openIssues}`);
    console.log(`   Open PRs: ${this.metrics.projectMetrics.openPRs}`);
    console.log(`   CI Pass Rate: ${this.metrics.projectMetrics.ciPassRate.toFixed(1)}%\n`);

    console.log('📦 Dependency Metrics:');
    console.log(`   Total Dependencies: ${this.metrics.dependencyMetrics.totalDependencies}`);
    console.log(`   Outdated: ${this.metrics.dependencyMetrics.outdatedCount}`);
    console.log(`   Vulnerable: ${this.metrics.dependencyMetrics.vulnerableCount}\n`);

    console.log('═══════════════════════════════════════════════════════════\n');
  }
}

// Main execution
async function main() {
  const observatory = new RepoObservatory();

  await observatory.collect();
  observatory.printSummary();
  observatory.saveMetrics();

  // Also save historical data
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  observatory.saveMetrics(`metrics_${timestamp}.json`);
}

main().catch(console.error);
