/**
 * Schema Migration Safety Guard
 * Detects unsafe migration operations before deployment
 */

import { readFileSync } from 'node:fs';
import { glob } from 'glob';
import { logger } from '../src/common/logger.js';

interface MigrationIssue {
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  line?: number;
  suggestion?: string;
}

interface MigrationCheck {
  file: string;
  safe: boolean;
  issues: MigrationIssue[];
}

// Unsafe operations that cause downtime
const UNSAFE_PATTERNS = [
  {
    pattern: /ALTER TABLE .+ ADD COLUMN .+ NOT NULL(?! DEFAULT)/i,
    rule: 'no-add-column-not-null',
    message: 'Adding NOT NULL column without DEFAULT causes table lock',
    severity: 'error' as const,
    suggestion: 'Add DEFAULT value or make nullable, then backfill, then add constraint',
  },
  {
    pattern: /ALTER TABLE .+ ALTER COLUMN .+ TYPE/i,
    rule: 'no-alter-column-type',
    message: 'Changing column type requires table rewrite (locks table)',
    severity: 'error' as const,
    suggestion: 'Create new column, backfill, swap, drop old',
  },
  {
    pattern: /DROP COLUMN/i,
    rule: 'no-drop-column',
    message: 'Dropping column can break running code',
    severity: 'error' as const,
    suggestion: 'Deploy code that stops using column first, then drop in next release',
  },
  {
    pattern: /RENAME COLUMN/i,
    rule: 'no-rename-column',
    message: 'Renaming column breaks running code',
    severity: 'error' as const,
    suggestion: 'Add new column, backfill, update code, drop old',
  },
  {
    pattern: /DROP TABLE/i,
    rule: 'no-drop-table',
    message: 'Dropping table breaks running code',
    severity: 'error' as const,
    suggestion: 'Ensure no code references table, then drop',
  },
  {
    pattern: /CREATE UNIQUE INDEX(?! CONCURRENTLY)/i,
    rule: 'require-concurrent-index',
    message: 'Creating index without CONCURRENTLY locks table',
    severity: 'error' as const,
    suggestion: 'Use CREATE INDEX CONCURRENTLY',
  },
  {
    pattern: /ADD CONSTRAINT .+ FOREIGN KEY/i,
    rule: 'no-add-fk-constraint',
    message: 'Adding foreign key requires full table scan',
    severity: 'warning' as const,
    suggestion: 'Add NOT VALID first, then VALIDATE CONSTRAINT separately',
  },
  {
    pattern: /ADD CONSTRAINT .+ CHECK/i,
    rule: 'no-add-check-constraint',
    message: 'Adding CHECK constraint requires full table scan',
    severity: 'warning' as const,
    suggestion: 'Add NOT VALID first, then VALIDATE CONSTRAINT separately',
  },
];

/**
 * Check migration file for unsafe operations
 */
export function checkMigration(filePath: string, content: string): MigrationCheck {
  const issues: MigrationIssue[] = [];

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNumber = i + 1;

    for (const { pattern, rule, message, severity, suggestion } of UNSAFE_PATTERNS) {
      if (pattern.test(line)) {
        issues.push({
          severity,
          rule,
          message,
          line: lineNumber,
          suggestion,
        });
      }
    }
  }

  // Check for transactions
  const hasTransaction = /BEGIN;/i.test(content) || /START TRANSACTION/i.test(content);
  if (!hasTransaction && issues.some(i => i.severity === 'error')) {
    issues.push({
      severity: 'warning',
      rule: 'require-transaction',
      message: 'Migration should be wrapped in transaction for rollback safety',
      suggestion: 'Add BEGIN; at start and COMMIT; at end',
    });
  }

  const safe = issues.filter(i => i.severity === 'error').length === 0;

  return {
    file: filePath,
    safe,
    issues,
  };
}

/**
 * Check all pending migrations
 */
export async function checkAllMigrations(migrationsDir: string = 'supabase/migrations'): Promise<{
  safe: boolean;
  checks: MigrationCheck[];
}> {
  logger.info('Checking migrations for unsafe operations', { dir: migrationsDir });

  const files = await glob(`${migrationsDir}/**/*.sql`);
  const checks: MigrationCheck[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf-8');
      const check = checkMigration(file, content);
      checks.push(check);

      if (!check.safe) {
        logger.error('Unsafe migration detected', {
          file,
          errors: check.issues.filter(i => i.severity === 'error').length,
        });
      }
    } catch (err) {
      logger.error('Failed to check migration', { file, error: err });
      checks.push({
        file,
        safe: false,
        issues: [{
          severity: 'error',
          rule: 'check-failed',
          message: err instanceof Error ? err.message : 'Unknown error',
        }],
      });
    }
  }

  const safe = checks.every(c => c.safe);

  logger.info('Migration check complete', {
    total: checks.length,
    safe: checks.filter(c => c.safe).length,
    unsafe: checks.filter(c => !c.safe).length,
  });

  return { safe, checks };
}

/**
 * Generate report
 */
export function generateReport(checks: MigrationCheck[]): string {
  let report = '# Migration Safety Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n\n`;

  const unsafe = checks.filter(c => !c.safe);
  const safeCount = checks.filter(c => c.safe).length;

  if (unsafe.length === 0) {
    report += '✅ **All migrations are safe**\n\n';
    report += `Checked ${checks.length} migration(s), no unsafe operations found.\n`;
    return report;
  }

  report += `❌ **${unsafe.length} unsafe migration(s) detected**\n\n`;
  report += `- **Total Checked**: ${checks.length}\n`;
  report += `- **Safe**: ${safeCount}\n`;
  report += `- **Unsafe**: ${unsafe.length}\n\n`;

  report += `## Unsafe Migrations\n\n`;

  for (const check of unsafe) {
    report += `### 📄 ${check.file}\n\n`;

    const errors = check.issues.filter(i => i.severity === 'error');
    const warnings = check.issues.filter(i => i.severity === 'warning');

    if (errors.length > 0) {
      report += `**Errors** (${errors.length}):\n\n`;
      for (const issue of errors) {
        report += `- **[${issue.rule}]** Line ${issue.line || 'N/A'}: ${issue.message}\n`;
        if (issue.suggestion) {
          report += `  - 💡 **Suggestion**: ${issue.suggestion}\n`;
        }
      }
      report += '\n';
    }

    if (warnings.length > 0) {
      report += `**Warnings** (${warnings.length}):\n\n`;
      for (const issue of warnings) {
        report += `- **[${issue.rule}]** Line ${issue.line || 'N/A'}: ${issue.message}\n`;
        if (issue.suggestion) {
          report += `  - 💡 **Suggestion**: ${issue.suggestion}\n`;
        }
      }
      report += '\n';
    }
  }

  report += `## Safe Migration Patterns\n\n`;
  report += `### Adding Columns\n`;
  report += `\`\`\`sql\n`;
  report += `-- Safe: Nullable column\n`;
  report += `ALTER TABLE users ADD COLUMN nickname TEXT;\n\n`;
  report += `-- Safe: With DEFAULT\n`;
  report += `ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';\n`;
  report += `\`\`\`\n\n`;

  report += `### Creating Indexes\n`;
  report += `\`\`\`sql\n`;
  report += `-- Safe: Concurrent index creation\n`;
  report += `CREATE INDEX CONCURRENTLY idx_users_email ON users(email);\n`;
  report += `\`\`\`\n\n`;

  report += `### Changing Column Types\n`;
  report += `\`\`\`sql\n`;
  report += `-- Safe: Create new column, backfill, swap\n`;
  report += `ALTER TABLE users ADD COLUMN email_v2 VARCHAR(255);\n`;
  report += `UPDATE users SET email_v2 = email::VARCHAR(255);\n`;
  report += `ALTER TABLE users DROP COLUMN email;\n`;
  report += `ALTER TABLE users RENAME COLUMN email_v2 TO email;\n`;
  report += `\`\`\`\n\n`;

  return report;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const { safe, checks } = await checkAllMigrations();
    const report = generateReport(checks);
    console.log(report);
    process.exit(safe ? 0 : 1);
  })();
}
