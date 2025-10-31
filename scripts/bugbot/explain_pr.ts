#!/usr/bin/env tsx
/**
 * BugBot PR Explainer - Static Analysis PR Summary
 * Generates PR review summaries without AI APIs
 * Analyzes diffs, complexity, and risk areas
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface PRSummary {
  overview: string;
  changes: {
    filesChanged: number;
    additions: number;
    deletions: number;
    netChange: number;
  };
  riskAreas: string[];
  publicAPIChanges: string[];
  breakingChanges: string[];
  testCoverage: {
    hasTests: boolean;
    testFiles: string[];
  };
  complexity: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'very high';
    factors: string[];
  };
  recommendations: string[];
}

/**
 * Get git diff statistics
 */
function getDiffStats(baseBranch: string = 'main'): PRSummary['changes'] {
  try {
    const diffStat = execSync(`git diff --stat ${baseBranch}...HEAD`, {
      encoding: 'utf-8',
    });

    let additions = 0;
    let deletions = 0;
    let filesChanged = 0;

    const lines = diffStat.split('\n');
    for (const line of lines) {
      const match = line.match(/(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/);
      if (match !== null) {
        filesChanged = parseInt(match[1], 10);
        additions = match[2] !== undefined ? parseInt(match[2], 10) : 0;
        deletions = match[3] !== undefined ? parseInt(match[3], 10) : 0;
      }
    }

    return {
      filesChanged,
      additions,
      deletions,
      netChange: additions - deletions,
    };
  } catch (error) {
    console.warn('Failed to get diff stats:', error);
    return { filesChanged: 0, additions: 0, deletions: 0, netChange: 0 };
  }
}

/**
 * Get list of changed files
 */
function getChangedFiles(baseBranch: string = 'main'): string[] {
  try {
    const output = execSync(`git diff --name-only ${baseBranch}...HEAD`, {
      encoding: 'utf-8',
    });
    return output.split('\n').filter((f) => f.trim() !== '');
  } catch (error) {
    console.warn('Failed to get changed files:', error);
    return [];
  }
}

/**
 * Analyze public API changes
 */
function analyzePublicAPIChanges(changedFiles: string[]): string[] {
  const changes: string[] = [];

  for (const file of changedFiles) {
    if (!file.endsWith('.ts') && !file.endsWith('.tsx')) {
      continue;
    }

    try {
      const content = readFileSync(file, 'utf-8');
      const exports = content.match(/export\s+(function|class|interface|type|const)\s+(\w+)/g);

      if (exports !== null && exports.length > 0) {
        changes.push(`${file}: ${exports.length} exported symbol(s)`);
      }
    } catch {
      // File might be deleted or inaccessible
      continue;
    }
  }

  return changes;
}

/**
 * Detect potential breaking changes
 */
function detectBreakingChanges(changedFiles: string[]): string[] {
  const breaking: string[] = [];

  for (const file of changedFiles) {
    try {
      const diff = execSync(`git diff main...HEAD -- ${file}`, {
        encoding: 'utf-8',
      });

      // Check for removed exports
      if (diff.includes('-export') && !diff.includes('+export')) {
        breaking.push(`${file}: Removed exports detected`);
      }

      // Check for signature changes
      if (diff.match(/-\s*(function|class|interface)/)) {
        breaking.push(`${file}: Function/class/interface signature may have changed`);
      }

      // Check for schema changes
      if (file.includes('schema') || file.includes('.prisma') || file.endsWith('.sql')) {
        breaking.push(`${file}: Database schema change detected`);
      }
    } catch {
      continue;
    }
  }

  return breaking;
}

/**
 * Identify risk areas
 */
function identifyRiskAreas(changedFiles: string[]): string[] {
  const risks: string[] = [];

  const criticalPaths = [
    { pattern: /security/, risk: 'Security-related changes require thorough review' },
    { pattern: /auth/, risk: 'Authentication changes - verify RBAC and policies' },
    { pattern: /policy/, risk: 'Policy engine changes - test all policy scenarios' },
    { pattern: /database|migration|schema/, risk: 'Database changes - verify migrations and rollback' },
    { pattern: /api\//, risk: 'API changes - check backwards compatibility' },
    { pattern: /uadsi|trust/, risk: 'Trust scoring changes - validate algorithm correctness' },
  ];

  for (const file of changedFiles) {
    for (const { pattern, risk } of criticalPaths) {
      if (pattern.test(file) && !risks.includes(risk)) {
        risks.push(risk);
      }
    }
  }

  // Check for large diffs
  const stats = getDiffStats();
  if (stats.filesChanged > 50) {
    risks.push('Large number of files changed - consider breaking into smaller PRs');
  }

  if (stats.additions + stats.deletions > 1000) {
    risks.push('Large diff size - review carefully for unintended changes');
  }

  return risks;
}

/**
 * Check test coverage
 */
function checkTestCoverage(changedFiles: string[]): PRSummary['testCoverage'] {
  const testFiles = changedFiles.filter(
    (f) => f.includes('.test.') || f.includes('.spec.') || f.includes('/tests/')
  );

  const sourceFiles = changedFiles.filter(
    (f) =>
      (f.endsWith('.ts') || f.endsWith('.tsx')) &&
      !f.includes('.test.') &&
      !f.includes('.spec.') &&
      !f.includes('/tests/')
  );

  return {
    hasTests: testFiles.length > 0,
    testFiles,
  };
}

/**
 * Calculate complexity score
 */
function calculateComplexity(changedFiles: string[], stats: PRSummary['changes']): PRSummary['complexity'] {
  let score = 0;
  const factors: string[] = [];

  // File count factor
  if (stats.filesChanged > 50) {
    score += 30;
    factors.push(`${stats.filesChanged} files changed`);
  } else if (stats.filesChanged > 20) {
    score += 20;
    factors.push(`${stats.filesChanged} files changed`);
  } else if (stats.filesChanged > 10) {
    score += 10;
    factors.push(`${stats.filesChanged} files changed`);
  }

  // Diff size factor
  const totalChanges = stats.additions + stats.deletions;
  if (totalChanges > 2000) {
    score += 30;
    factors.push(`${totalChanges} lines changed`);
  } else if (totalChanges > 1000) {
    score += 20;
    factors.push(`${totalChanges} lines changed`);
  } else if (totalChanges > 500) {
    score += 10;
    factors.push(`${totalChanges} lines changed`);
  }

  // Critical file changes
  const criticalFiles = changedFiles.filter(
    (f) =>
      f.includes('security') ||
      f.includes('auth') ||
      f.includes('policy') ||
      f.includes('migration')
  );
  if (criticalFiles.length > 0) {
    score += 20;
    factors.push(`${criticalFiles.length} critical file(s)`);
  }

  // No tests
  const testCov = checkTestCoverage(changedFiles);
  if (!testCov.hasTests && changedFiles.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'))) {
    score += 15;
    factors.push('No test files included');
  }

  let level: PRSummary['complexity']['level'];
  if (score >= 60) {
    level = 'very high';
  } else if (score >= 40) {
    level = 'high';
  } else if (score >= 20) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return { score, level, factors };
}

/**
 * Generate recommendations
 */
function generateRecommendations(summary: Partial<PRSummary>): string[] {
  const recommendations: string[] = [];

  if (summary.complexity?.level === 'very high' || summary.complexity?.level === 'high') {
    recommendations.push('Consider breaking this PR into smaller, focused changes');
  }

  if (summary.testCoverage !== undefined && !summary.testCoverage.hasTests) {
    recommendations.push('Add test coverage for the changes');
  }

  if ((summary.breakingChanges?.length ?? 0) > 0) {
    recommendations.push('Document breaking changes and provide migration guide');
  }

  if ((summary.publicAPIChanges?.length ?? 0) > 0) {
    recommendations.push('Ensure all public APIs have JSDoc comments');
    recommendations.push('Update API documentation');
  }

  if ((summary.riskAreas?.length ?? 0) > 3) {
    recommendations.push('High-risk changes detected - request multiple reviewers');
  }

  const stats = summary.changes;
  if (stats !== undefined && stats.deletions > stats.additions * 2) {
    recommendations.push('Significant code deletion - verify no functionality loss');
  }

  return recommendations;
}

/**
 * Generate PR summary
 */
export function generatePRSummary(baseBranch: string = 'main'): PRSummary {
  const stats = getDiffStats(baseBranch);
  const changedFiles = getChangedFiles(baseBranch);
  const publicAPIChanges = analyzePublicAPIChanges(changedFiles);
  const breakingChanges = detectBreakingChanges(changedFiles);
  const riskAreas = identifyRiskAreas(changedFiles);
  const testCoverage = checkTestCoverage(changedFiles);
  const complexity = calculateComplexity(changedFiles, stats);

  const summary: Partial<PRSummary> = {
    changes: stats,
    publicAPIChanges,
    breakingChanges,
    riskAreas,
    testCoverage,
    complexity,
  };

  const recommendations = generateRecommendations(summary);

  const overview = `This PR changes ${stats.filesChanged} file(s) with ${stats.additions} addition(s) and ${stats.deletions} deletion(s). Complexity: ${complexity.level}.`;

  return {
    overview,
    changes: stats,
    riskAreas,
    publicAPIChanges,
    breakingChanges,
    testCoverage,
    complexity,
    recommendations,
  };
}

/**
 * Format PR summary as markdown
 */
export function formatPRSummary(summary: PRSummary): string {
  return `## 🤖 BugBot PR Analysis

### Overview
${summary.overview}

### Changes Summary
- **Files Changed:** ${summary.changes.filesChanged}
- **Additions:** +${summary.changes.additions}
- **Deletions:** -${summary.changes.deletions}
- **Net Change:** ${summary.changes.netChange > 0 ? '+' : ''}${summary.changes.netChange}

### Complexity Analysis
- **Score:** ${summary.complexity.score}/100
- **Level:** ${summary.complexity.level.toUpperCase()}
${summary.complexity.factors.length > 0 ? `- **Factors:**\n${summary.complexity.factors.map((f) => `  - ${f}`).join('\n')}` : ''}

${
  summary.breakingChanges.length > 0
    ? `
### ⚠️ Breaking Changes Detected
${summary.breakingChanges.map((bc) => `- ${bc}`).join('\n')}
`
    : ''
}

${
  summary.publicAPIChanges.length > 0
    ? `
### 📦 Public API Changes
${summary.publicAPIChanges.map((api) => `- ${api}`).join('\n')}
`
    : ''
}

${
  summary.riskAreas.length > 0
    ? `
### 🔍 Risk Areas
${summary.riskAreas.map((risk) => `- ${risk}`).join('\n')}
`
    : ''
}

### 🧪 Test Coverage
- **Has Tests:** ${summary.testCoverage.hasTests ? '✅ Yes' : '❌ No'}
${summary.testCoverage.testFiles.length > 0 ? `- **Test Files:** ${summary.testCoverage.testFiles.length}` : ''}

${
  summary.recommendations.length > 0
    ? `
### 💡 Recommendations
${summary.recommendations.map((rec) => `- ${rec}`).join('\n')}
`
    : ''
}

---
*This analysis was automatically generated by BugBot using static code analysis.*
*For AI-enhanced insights, ensure \`OPENAI_API_KEY\` is configured.*
`;
}

// CLI execution
if (require.main === module) {
  const baseBranch = process.argv[2] ?? 'main';

  try {
    const summary = generatePRSummary(baseBranch);
    console.log(formatPRSummary(summary));
  } catch (error) {
    console.error('Failed to generate PR summary:', error);
    process.exit(1);
  }
}
