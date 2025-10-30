#!/usr/bin/env tsx
/**
 * Restore Latest Backup Script
 * Restores the most recent database backup
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';

function findLatestBackup(): string | null {
  try {
    const files = readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql') || f.endsWith('.dump'))
      .map(f => ({
        name: f,
        path: join(BACKUP_DIR, f),
        time: statSync(join(BACKUP_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      return null;
    }

    return files[0].path;
  } catch (error) {
    console.error('Error finding backups:', error);
    return null;
  }
}

function restoreBackup(backupPath: string): void {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL not set');
  }

  console.log(`🔄 Restoring backup: ${backupPath}`);
  
  try {
    // Drop existing connections
    console.log('📊 Terminating existing connections...');
    execSync(`psql "${dbUrl}" -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();"`, {
      stdio: 'inherit',
    });

    // Restore backup
    console.log('📥 Restoring database...');
    
    if (backupPath.endsWith('.sql')) {
      execSync(`psql "${dbUrl}" < "${backupPath}"`, {
        stdio: 'inherit',
      });
    } else {
      execSync(`pg_restore -d "${dbUrl}" "${backupPath}"`, {
        stdio: 'inherit',
      });
    }

    console.log('✅ Backup restored successfully');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  }
}

async function verifyRestore(): Promise<void> {
  console.log('🔍 Verifying restore...');
  
  const dbUrl = process.env.DATABASE_URL;
  const { Client } = await import('pg');
  
  const client = new Client({ connectionString: dbUrl });
  
  try {
    await client.connect();
    
    // Check if agents table exists
    const result = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_name = 'agents'
    `);
    
    if (result.rows[0].count === '0') {
      throw new Error('agents table not found after restore');
    }

    // Check row count
    const agentCount = await client.query('SELECT COUNT(*) FROM agents');
    console.log(`   Found ${agentCount.rows[0].count} agents`);

    console.log('✅ Restore verified');
  } finally {
    await client.end();
  }
}

async function main() {
  console.log('🗄️  ORCA Database Restore\n');

  // Find latest backup
  const backupPath = findLatestBackup();
  
  if (!backupPath) {
    console.error('❌ No backups found in', BACKUP_DIR);
    process.exit(1);
  }

  console.log(`📦 Latest backup: ${backupPath}\n`);

  // Confirm
  const confirmed = process.argv.includes('--yes') || process.argv.includes('-y');
  
  if (!confirmed) {
    console.log('⚠️  This will replace the current database!');
    console.log('   Run with --yes to confirm\n');
    process.exit(0);
  }

  // Restore
  try {
    restoreBackup(backupPath);
    await verifyRestore();
    console.log('\n✅ Database restored successfully!');
  } catch (error) {
    console.error('\n❌ Restore failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
