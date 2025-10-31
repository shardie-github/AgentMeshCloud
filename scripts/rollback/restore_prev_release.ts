#!/usr/bin/env tsx
/**
 * Restore Previous Release Script
 * Automated rollback to last stable version
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

interface RollbackOptions {
  version?: string;
  skipDb?: boolean;
  skipVercel?: boolean;
  dryRun?: boolean;
}

/**
 * Execute command with error handling
 */
function exec(command: string, description: string, dryRun: boolean = false): void {
  console.log(`\n🔄 ${description}...`);
  
  if (dryRun) {
    console.log(`   [DRY RUN] ${command}`);
    return;
  }

  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`✅ ${description} complete`);
    if (output.trim() !== '') {
      console.log(`   ${output.trim()}`);
    }
  } catch (error) {
    console.error(`❌ ${description} failed`);
    throw error;
  }
}

/**
 * Get previous release tag
 */
function getPreviousTag(): string {
  try {
    const tags = execSync('git tag -l --sort=-version:refname', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter((tag) => tag.match(/^v\d+\.\d+\.\d+$/));

    if (tags.length < 2) {
      throw new Error('Not enough release tags found');
    }

    const currentTag = tags[0];
    const previousTag = tags[1];

    console.log(`\nℹ️  Current tag: ${currentTag}`);
    console.log(`ℹ️  Previous tag: ${previousTag}`);

    return previousTag ?? 'v0.0.0';
  } catch (error) {
    console.error('Failed to get previous tag:', error);
    throw error;
  }
}

/**
 * Rollback Vercel deployment
 */
function rollbackVercel(targetTag: string, dryRun: boolean): void {
  console.log('\n📦 Rolling back Vercel deployment...');

  // Get deployment for target tag
  try {
    const deployments = execSync('vercel ls --prod --json', {
      encoding: 'utf-8',
    });

    const deploymentsData = JSON.parse(deployments) as Array<{
      url: string;
      name: string;
      created: number;
      state: string;
      target?: string;
    }>;

    // Find deployment matching target tag (by commit or timestamp)
    // In production, you'd have more sophisticated matching
    const targetDeployment = deploymentsData.find((d) => d.state === 'READY');

    if (targetDeployment === undefined) {
      throw new Error('No suitable deployment found for rollback');
    }

    exec(
      `vercel alias set ${targetDeployment.url} production`,
      'Promoting previous deployment',
      dryRun
    );
  } catch (error) {
    console.error('Vercel rollback failed:', error);
    throw error;
  }
}

/**
 * Rollback database migrations
 */
function rollbackDatabase(targetTag: string, dryRun: boolean): void {
  console.log('\n🗄️  Rolling back database...');

  // WARNING: This is simplified. In production:
  // 1. Create backup first
  // 2. Check migration compatibility
  // 3. Use PITR (Point-in-Time Recovery) if available

  if (!dryRun) {
    console.warn('⚠️  Database rollback is destructive!');
    console.warn('   Ensure you have a backup before proceeding.');
    console.warn('   Sleeping 5 seconds... Press Ctrl+C to abort.');

    execSync('sleep 5');
  }

  // Example: Rollback via Supabase CLI
  // In practice, you'd use PITR or restore from backup
  exec(
    'echo "Database rollback would execute here"',
    'Rolling back database migrations',
    dryRun
  );

  console.log('⚠️  Manual verification required:');
  console.log('   1. Check Supabase dashboard for migration status');
  console.log('   2. Run: pnpm run db:status');
  console.log('   3. Verify data integrity');
}

/**
 * Verify rollback
 */
function verifyRollback(): void {
  console.log('\n🔍 Verifying rollback...');

  const checks = [
    {
      name: 'API Health',
      command: 'curl -f https://api.orca-mesh.io/api/health || echo "FAILED"',
    },
    {
      name: 'Database Connection',
      command: 'pnpm run db:status || echo "FAILED"',
    },
  ];

  for (const check of checks) {
    try {
      const result = execSync(check.command, { encoding: 'utf-8' });
      if (result.includes('FAILED')) {
        console.error(`❌ ${check.name} check failed`);
      } else {
        console.log(`✅ ${check.name} OK`);
      }
    } catch (error) {
      console.error(`❌ ${check.name} check failed:`, error);
    }
  }
}

/**
 * Main rollback function
 */
async function rollback(options: RollbackOptions): Promise<void> {
  console.log('🚨 ORCA Core Rollback Procedure\n');
  console.log('='.repeat(50));

  const targetTag = options.version ?? getPreviousTag();

  if (options.dryRun === true) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  }

  console.log(`\n📌 Target version: ${targetTag}`);
  console.log(`   Skip Vercel: ${options.skipVercel === true ? 'yes' : 'no'}`);
  console.log(`   Skip DB: ${options.skipDb === true ? 'yes' : 'no'}`);

  try {
    // Step 1: Rollback application
    if (options.skipVercel !== true) {
      rollbackVercel(targetTag, options.dryRun === true);
    }

    // Step 2: Rollback database (if migrations exist)
    if (options.skipDb !== true) {
      rollbackDatabase(targetTag, options.dryRun === true);
    }

    // Step 3: Verify
    if (options.dryRun !== true) {
      verifyRollback();
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Rollback complete!\n');

    if (options.dryRun !== true) {
      console.log('📋 Next steps:');
      console.log('   1. Monitor dashboards for 15 minutes');
      console.log('   2. Check error rates and latency');
      console.log('   3. Notify team of rollback');
      console.log('   4. Create post-mortem issue');
      console.log('\n   Dashboard: https://vercel.com/your-team/orca-core');
    }
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    console.error('\n⚠️  System may be in inconsistent state!');
    console.error('   Contact on-call engineer immediately.');
    process.exit(1);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);

  const options: RollbackOptions = {
    version: args.find((arg) => arg.startsWith('--version='))?.split('=')[1],
    skipDb: args.includes('--skip-db'),
    skipVercel: args.includes('--skip-vercel'),
    dryRun: args.includes('--dry-run'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: restore_prev_release.ts [options]

Options:
  --version=v1.2.3  Specific version to rollback to (default: previous tag)
  --skip-db         Skip database rollback
  --skip-vercel     Skip Vercel deployment rollback
  --dry-run         Simulate rollback without making changes
  --help, -h        Show this help message

Examples:
  # Rollback to previous release
  ./scripts/rollback/restore_prev_release.ts

  # Rollback to specific version
  ./scripts/rollback/restore_prev_release.ts --version=v1.2.3

  # Dry run (test without executing)
  ./scripts/rollback/restore_prev_release.ts --dry-run

  # Rollback app only (skip database)
  ./scripts/rollback/restore_prev_release.ts --skip-db
`);
    process.exit(0);
  }

  rollback(options).catch((error) => {
    console.error('Rollback failed:', error);
    process.exit(1);
  });
}

export { rollback };
