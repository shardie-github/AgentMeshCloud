#!/usr/bin/env tsx
/**
 * BugBot Triage - Automated Issue Triage
 * Analyzes CI failures and creates/updates GitHub issues
 * No paid API required - uses static analysis
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

interface TriageIssue {
  title: string;
  body: string;
  labels: string[];
  assignees: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface TestFailure {
  testName: string;
  file: string;
  error: string;
  stack?: string;
}

interface LintError {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Parse test output to extract failures
 */
function parseTestFailures(testOutput: string): TestFailure[] {
  const failures: TestFailure[] = [];
  const lines = testOutput.split('\n');

  let currentTest: Partial<TestFailure> = {};
  let inStackTrace = false;
  let stackLines: string[] = [];

  for (const line of lines) {
    // Match test failure lines (common patterns)
    const testMatch = line.match(/(?:FAIL|✕|×)\s+(.+?)\s+›\s+(.+)/);
    if (testMatch !== null) {
      if (Object.keys(currentTest).length > 0) {
        failures.push(currentTest as TestFailure);
      }
      currentTest = {
        file: testMatch[1],
        testName: testMatch[2],
        error: '',
      };
      stackLines = [];
      inStackTrace = false;
      continue;
    }

    // Match error messages
    const errorMatch = line.match(/(?:Error|Expected|Received):\s*(.+)/);
    if (errorMatch !== null && currentTest.testName !== undefined) {
      currentTest.error = (currentTest.error ?? '') + errorMatch[1] + '\n';
      continue;
    }

    // Detect stack trace start
    if (line.trim().startsWith('at ')) {
      inStackTrace = true;
    }

    if (inStackTrace) {
      stackLines.push(line.trim());
    }
  }

  if (Object.keys(currentTest).length > 0) {
    currentTest.stack = stackLines.join('\n');
    failures.push(currentTest as TestFailure);
  }

  return failures;
}

/**
 * Parse ESLint output to extract errors
 */
function parseLintErrors(lintOutput: string): LintError[] {
  const errors: LintError[] = [];

  try {
    // Try parsing as JSON first (ESLint JSON format)
    const jsonOutput = JSON.parse(lintOutput) as Array<{
      filePath: string;
      messages: Array<{
        line: number;
        column: number;
        ruleId: string;
        message: string;
        severity: number;
      }>;
    }>;

    for (const fileResult of jsonOutput) {
      for (const msg of fileResult.messages) {
        errors.push({
          file: fileResult.filePath,
          line: msg.line,
          column: msg.column,
          rule: msg.ruleId,
          message: msg.message,
          severity: msg.severity === 2 ? 'error' : 'warning',
        });
      }
    }
  } catch {
    // Fall back to parsing text output
    const lines = lintOutput.split('\n');
    for (const line of lines) {
      const match = line.match(/(.+):(\d+):(\d+):\s+(error|warning)\s+(.+?)\s+(.+)/);
      if (match !== null) {
        errors.push({
          file: match[1],
          line: parseInt(match[2], 10),
          column: parseInt(match[3], 10),
          severity: match[4] as 'error' | 'warning',
          message: match[5],
          rule: match[6],
        });
      }
    }
  }

  return errors;
}

/**
 * Determine file owners from CODEOWNERS
 */
function getFileOwners(filePath: string): string[] {
  try {
    const codeownersPath = resolve(process.cwd(), 'CODEOWNERS');
    const codeowners = readFileSync(codeownersPath, 'utf-8');
    const lines = codeowners.split('\n');

    const owners: string[] = [];
    for (const line of lines) {
      if (line.trim().startsWith('#') || line.trim() === '') {
        continue;
      }

      const [pattern, ...ownerList] = line.trim().split(/\s+/);
      if (pattern !== undefined && filePath.includes(pattern.replace('*', ''))) {
        owners.push(...ownerList.map((o) => o.replace('@', '')));
      }
    }

    return [...new Set(owners)];
  } catch {
    return [];
  }
}

/**
 * Categorize failure and assign labels
 */
function categorizeFailure(failure: TestFailure | LintError): {
  area: string[];
  type: string;
  priority: TriageIssue['priority'];
} {
  const file =
    'file' in failure ? failure.file : 'testName' in failure ? failure.testName : '';

  const areas: string[] = [];
  let type = 'type/bug';
  let priority: TriageIssue['priority'] = 'medium';

  // Determine area based on file path
  if (file.includes('registry')) {
    areas.push('area/registry');
  }
  if (file.includes('uadsi') || file.includes('trust')) {
    areas.push('area/trust');
  }
  if (file.includes('policy')) {
    areas.push('area/policy');
  }
  if (file.includes('api')) {
    areas.push('area/api');
  }
  if (file.includes('telemetry')) {
    areas.push('area/telemetry');
  }
  if (file.includes('security')) {
    areas.push('area/security');
    priority = 'high';
  }
  if (file.includes('database') || file.includes('supabase')) {
    areas.push('area/database');
  }

  // Determine priority based on error content
  const errorContent =
    'error' in failure ? failure.error : 'message' in failure ? failure.message : '';

  if (
    errorContent.toLowerCase().includes('security') ||
    errorContent.toLowerCase().includes('vulnerability')
  ) {
    priority = 'critical';
    type = 'type/security';
  } else if (
    errorContent.toLowerCase().includes('crash') ||
    errorContent.toLowerCase().includes('fatal')
  ) {
    priority = 'critical';
  } else if (
    errorContent.toLowerCase().includes('performance') ||
    errorContent.toLowerCase().includes('timeout')
  ) {
    priority = 'high';
    type = 'type/performance';
  }

  return { area: areas, type, priority };
}

/**
 * Create issue body from test failures
 */
function createTestFailureIssue(failures: TestFailure[]): TriageIssue {
  const firstFailure = failures[0];
  if (firstFailure === undefined) {
    throw new Error('No failures provided');
  }

  const { area, type, priority } = categorizeFailure(firstFailure);
  const owners = getFileOwners(firstFailure.file);

  const body = `## Test Failure Report

**Automatically generated by BugBot**

### Summary
${failures.length} test(s) failed in the latest CI run.

### Failed Tests

${failures
  .map(
    (f, idx) => `
#### ${idx + 1}. ${f.testName}

**File:** \`${f.file}\`

**Error:**
\`\`\`
${f.error}
\`\`\`

${
  f.stack !== undefined && f.stack !== ''
    ? `
**Stack Trace:**
\`\`\`
${f.stack}
\`\`\`
`
    : ''
}
`
  )
  .join('\n')}

### Suggested Owners
${owners.length > 0 ? owners.map((o) => `@${o}`).join(', ') : 'No specific owners identified'}

### Next Steps
- [ ] Investigate root cause
- [ ] Add regression test
- [ ] Update documentation if needed
- [ ] Consider if this requires hotfix

---
*This issue was automatically created by BugBot. For questions, see [SUPPORT.md](./SUPPORT.md).*
`;

  return {
    title: `[BugBot] Test Failure: ${firstFailure.testName}`,
    body,
    labels: ['status/triage', type, `priority/${priority}`, ...area, 'automation'],
    assignees: owners.slice(0, 3), // GitHub limits assignees
    priority,
  };
}

/**
 * Create issue body from lint errors
 */
function createLintErrorIssue(errors: LintError[]): TriageIssue {
  const errorCount = errors.filter((e) => e.severity === 'error').length;
  const warningCount = errors.filter((e) => e.severity === 'warning').length;

  const firstError = errors.find((e) => e.severity === 'error') ?? errors[0];
  if (firstError === undefined) {
    throw new Error('No errors provided');
  }

  const { area, priority } = categorizeFailure(firstError);
  const owners = getFileOwners(firstError.file);

  const body = `## Lint Errors Report

**Automatically generated by BugBot**

### Summary
- **Errors:** ${errorCount}
- **Warnings:** ${warningCount}

### Top Errors

${errors
  .filter((e) => e.severity === 'error')
  .slice(0, 10)
  .map(
    (e, idx) => `
${idx + 1}. **${e.file}:${e.line}:${e.column}**
   - Rule: \`${e.rule}\`
   - Message: ${e.message}
`
  )
  .join('\n')}

${errorCount > 10 ? `\n*...and ${errorCount - 10} more errors*\n` : ''}

### Suggested Owners
${owners.length > 0 ? owners.map((o) => `@${o}`).join(', ') : 'No specific owners identified'}

### Next Steps
- [ ] Fix lint errors
- [ ] Run \`pnpm run lint --fix\` to auto-fix
- [ ] Update ESLint rules if needed
- [ ] Consider adding to lint-staged

---
*This issue was automatically created by BugBot. For questions, see [SUPPORT.md](./SUPPORT.md).*
`;

  return {
    title: `[BugBot] Lint Errors: ${errorCount} error(s) in ${new Set(errors.map((e) => e.file)).size} file(s)`,
    body,
    labels: ['status/triage', 'type/chore', `priority/${priority}`, ...area, 'automation'],
    assignees: owners.slice(0, 3),
    priority,
  };
}

/**
 * Main triage function
 */
export async function triageFailures(
  testOutput?: string,
  lintOutput?: string
): Promise<TriageIssue[]> {
  const issues: TriageIssue[] = [];

  if (testOutput !== undefined && testOutput.trim() !== '') {
    const testFailures = parseTestFailures(testOutput);
    if (testFailures.length > 0) {
      issues.push(createTestFailureIssue(testFailures));
    }
  }

  if (lintOutput !== undefined && lintOutput.trim() !== '') {
    const lintErrors = parseLintErrors(lintOutput);
    const criticalErrors = lintErrors.filter((e) => e.severity === 'error');
    if (criticalErrors.length > 0) {
      issues.push(createLintErrorIssue(criticalErrors));
    }
  }

  return issues;
}

// CLI execution
if (require.main === module) {
  const testOutputFile = process.argv[2];
  const lintOutputFile = process.argv[3];

  let testOutput: string | undefined;
  let lintOutput: string | undefined;

  if (testOutputFile !== undefined) {
    testOutput = readFileSync(testOutputFile, 'utf-8');
  }

  if (lintOutputFile !== undefined) {
    lintOutput = readFileSync(lintOutputFile, 'utf-8');
  }

  triageFailures(testOutput, lintOutput)
    .then((issues) => {
      console.log(JSON.stringify(issues, null, 2));
    })
    .catch((error) => {
      console.error('Triage failed:', error);
      process.exit(1);
    });
}
