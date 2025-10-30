/**
 * Backup Restore Verification
 * Validates that backups can be successfully restored and data integrity maintained
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../src/common/logger.js';
import { secretsBridge } from '../src/security/secrets_bridge.js';

const execAsync = promisify(exec);

export interface RestoreVerificationResult {
  success: boolean;
  backupFile: string;
  restoreTime: number; // milliseconds
  recordCount: number;
  checksum: string;
  errors: string[];
}

/**
 * Verify backup can be restored successfully
 */
export async function verifyBackupRestore(
  backupFile: string
): Promise<RestoreVerificationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  logger.info('Starting backup restore verification', { backupFile });

  try {
    // 1. Create test database
    const testDb = `orca_restore_test_${Date.now()}`;
    logger.info('Creating test database', { testDb });

    await createTestDatabase(testDb);

    // 2. Restore backup to test database
    logger.info('Restoring backup to test database');
    await restoreBackup(backupFile, testDb);

    // 3. Verify data integrity
    logger.info('Verifying data integrity');
    const recordCount = await countRecords(testDb);
    const checksum = await calculateChecksum(testDb);

    // 4. Run validation queries
    logger.info('Running validation queries');
    const validationErrors = await runValidationQueries(testDb);
    errors.push(...validationErrors);

    // 5. Cleanup test database
    logger.info('Cleaning up test database');
    await dropTestDatabase(testDb);

    const restoreTime = Date.now() - startTime;

    logger.info('Backup restore verification completed', {
      success: errors.length === 0,
      restoreTime: `${restoreTime}ms`,
      recordCount,
    });

    return {
      success: errors.length === 0,
      backupFile,
      restoreTime,
      recordCount,
      checksum,
      errors,
    };
  } catch (err) {
    logger.error('Backup restore verification failed', { error: err });
    errors.push(err instanceof Error ? err.message : 'Unknown error');

    return {
      success: false,
      backupFile,
      restoreTime: Date.now() - startTime,
      recordCount: 0,
      checksum: '',
      errors,
    };
  }
}

/**
 * Create test database for restore
 */
async function createTestDatabase(dbName: string): Promise<void> {
  const dbHost = secretsBridge.get('DB_HOST', 'localhost');
  const dbUser = secretsBridge.get('DB_USER', 'postgres');

  const command = `psql -h ${dbHost} -U ${dbUser} -c "CREATE DATABASE ${dbName};"`;

  try {
    await execAsync(command);
    logger.info('Test database created', { dbName });
  } catch (err) {
    throw new Error(`Failed to create test database: ${err}`);
  }
}

/**
 * Restore backup to test database
 */
async function restoreBackup(backupFile: string, dbName: string): Promise<void> {
  const dbHost = secretsBridge.get('DB_HOST', 'localhost');
  const dbUser = secretsBridge.get('DB_USER', 'postgres');

  // Handle encrypted and compressed backups
  let command: string;

  if (backupFile.endsWith('.gpg')) {
    // Decrypt and restore
    command = `gpg --decrypt ${backupFile} | gunzip | pg_restore -h ${dbHost} -U ${dbUser} -d ${dbName} -v`;
  } else if (backupFile.endsWith('.gz')) {
    // Decompress and restore
    command = `gunzip -c ${backupFile} | pg_restore -h ${dbHost} -U ${dbUser} -d ${dbName} -v`;
  } else {
    // Direct restore
    command = `pg_restore -h ${dbHost} -U ${dbUser} -d ${dbName} -v ${backupFile}`;
  }

  try {
    await execAsync(command);
    logger.info('Backup restored successfully', { backupFile, dbName });
  } catch (err) {
    throw new Error(`Failed to restore backup: ${err}`);
  }
}

/**
 * Count total records in restored database
 */
async function countRecords(dbName: string): Promise<number> {
  const dbHost = secretsBridge.get('DB_HOST', 'localhost');
  const dbUser = secretsBridge.get('DB_USER', 'postgres');

  // Query to count records across all tables
  const query = `
    SELECT SUM(n_live_tup) as total_records
    FROM pg_stat_user_tables;
  `;

  const command = `psql -h ${dbHost} -U ${dbUser} -d ${dbName} -t -c "${query}"`;

  try {
    const { stdout } = await execAsync(command);
    const count = parseInt(stdout.trim(), 10);
    logger.info('Record count', { dbName, count });
    return count;
  } catch (err) {
    logger.error('Failed to count records', { error: err });
    return 0;
  }
}

/**
 * Calculate checksum of critical tables
 */
async function calculateChecksum(dbName: string): Promise<string> {
  const dbHost = secretsBridge.get('DB_HOST', 'localhost');
  const dbUser = secretsBridge.get('DB_USER', 'postgres');

  // Calculate MD5 checksum of critical tables
  const query = `
    SELECT md5(array_agg(md5((t.*)::text))::text)
    FROM (
      SELECT * FROM workflows ORDER BY id
    ) t;
  `;

  const command = `psql -h ${dbHost} -U ${dbUser} -d ${dbName} -t -c "${query}"`;

  try {
    const { stdout } = await execAsync(command);
    const checksum = stdout.trim();
    logger.info('Checksum calculated', { dbName, checksum: checksum.substring(0, 16) });
    return checksum;
  } catch (err) {
    logger.error('Failed to calculate checksum', { error: err });
    return '';
  }
}

/**
 * Run validation queries to verify data integrity
 */
async function runValidationQueries(dbName: string): Promise<string[]> {
  const errors: string[] = [];
  const dbHost = secretsBridge.get('DB_HOST', 'localhost');
  const dbUser = secretsBridge.get('DB_USER', 'postgres');

  const validations = [
    {
      name: 'Check workflows table exists',
      query: "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'workflows';",
      expected: '1',
    },
    {
      name: 'Check no null IDs in workflows',
      query: 'SELECT COUNT(*) FROM workflows WHERE id IS NULL;',
      expected: '0',
    },
    {
      name: 'Check referential integrity',
      query: `
        SELECT COUNT(*) FROM workflows w
        LEFT JOIN users u ON w.user_id = u.id
        WHERE w.user_id IS NOT NULL AND u.id IS NULL;
      `,
      expected: '0',
    },
  ];

  for (const validation of validations) {
    try {
      const command = `psql -h ${dbHost} -U ${dbUser} -d ${dbName} -t -c "${validation.query}"`;
      const { stdout } = await execAsync(command);
      const result = stdout.trim();

      if (result !== validation.expected) {
        errors.push(
          `${validation.name} failed: expected ${validation.expected}, got ${result}`
        );
      } else {
        logger.info('Validation passed', { name: validation.name });
      }
    } catch (err) {
      errors.push(`${validation.name} error: ${err}`);
    }
  }

  return errors;
}

/**
 * Drop test database
 */
async function dropTestDatabase(dbName: string): Promise<void> {
  const dbHost = secretsBridge.get('DB_HOST', 'localhost');
  const dbUser = secretsBridge.get('DB_USER', 'postgres');

  // Force close connections before dropping
  const closeConnections = `psql -h ${dbHost} -U ${dbUser} -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`;

  const dropDb = `psql -h ${dbHost} -U ${dbUser} -c "DROP DATABASE IF EXISTS ${dbName};"`;

  try {
    await execAsync(closeConnections);
    await execAsync(dropDb);
    logger.info('Test database dropped', { dbName });
  } catch (err) {
    logger.error('Failed to drop test database', { error: err });
  }
}

/**
 * Verify most recent backup
 */
export async function verifyLatestBackup(): Promise<RestoreVerificationResult> {
  const backupDir = secretsBridge.get('BACKUP_DIR', '/var/backups/orca');
  const environment = secretsBridge.get('ENVIRONMENT', 'production');

  logger.info('Finding latest backup', { backupDir, environment });

  try {
    // Find most recent backup file
    const { stdout } = await execAsync(
      `ls -t ${backupDir}/orca_${environment}_*.sql.gz* | head -n 1`
    );

    const latestBackup = stdout.trim();

    if (!latestBackup) {
      throw new Error('No backup files found');
    }

    logger.info('Latest backup found', { file: latestBackup });

    return await verifyBackupRestore(latestBackup);
  } catch (err) {
    logger.error('Failed to verify latest backup', { error: err });
    throw err;
  }
}

/**
 * Generate restore verification report
 */
export function generateVerificationReport(
  results: RestoreVerificationResult[]
): string {
  const total = results.length;
  const successful = results.filter((r) => r.success).length;
  const failed = total - successful;

  let report = '# Backup Restore Verification Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Backups Tested**: ${total}\n`;
  report += `- **Successful**: ${successful}\n`;
  report += `- **Failed**: ${failed}\n`;
  report += `- **Success Rate**: ${((successful / total) * 100).toFixed(1)}%\n\n`;

  report += `## Individual Results\n\n`;

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    report += `### ${status} ${result.backupFile}\n\n`;
    report += `- **Restore Time**: ${result.restoreTime}ms\n`;
    report += `- **Record Count**: ${result.recordCount}\n`;
    report += `- **Checksum**: ${result.checksum.substring(0, 16)}...\n`;

    if (result.errors.length > 0) {
      report += `- **Errors**:\n`;
      for (const error of result.errors) {
        report += `  - ${error}\n`;
      }
    }

    report += '\n';
  }

  return report;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      const result = await verifyLatestBackup();
      console.log('\n' + generateVerificationReport([result]));
      process.exit(result.success ? 0 : 1);
    } catch (err) {
      console.error('Verification failed:', err);
      process.exit(1);
    }
  })();
}
