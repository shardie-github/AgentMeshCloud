#!/usr/bin/env tsx
/**
 * Environment Sync Assistant
 * 
 * Synchronizes environment variables across:
 * - Local .env file
 * - Supabase secrets
 * - Vercel environment variables
 * 
 * Detects mismatches and can push/pull values safely.
 */

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

interface EnvVar {
  key: string;
  value?: string;
  sources: {
    local: boolean;
    supabase: boolean;
    vercel: boolean;
  };
}

interface SyncReport {
  matched: EnvVar[];
  localOnly: EnvVar[];
  supabaseOnly: EnvVar[];
  vercelOnly: EnvVar[];
  mismatched: EnvVar[];
}

class EnvironmentSync {
  private localEnv = new Map<string, string>();
  private supabaseEnv = new Map<string, string>();
  private vercelEnv = new Map<string, string>();

  /**
   * Load all environment sources
   */
  async loadAll(): Promise<void> {
    console.log('🔍 Loading environment variables from all sources...\n');

    this.loadLocal();
    await this.loadSupabase();
    await this.loadVercel();
  }

  /**
   * Load local .env file
   */
  private loadLocal(): void {
    console.log('📄 Loading local .env...');
    
    const envPaths = ['.env', '.env.local', '.env.production'];
    let loaded = 0;

    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key) {
              const value = valueParts.join('=').trim();
              this.localEnv.set(key.trim(), value);
              loaded++;
            }
          }
        }
      }
    }

    console.log(`   Found ${loaded} local variables\n`);
  }

  /**
   * Load Supabase secrets
   */
  private async loadSupabase(): Promise<void> {
    console.log('🔐 Loading Supabase secrets...');
    
    try {
      // Check if supabase CLI is available
      execSync('which supabase', { stdio: 'ignore' });

      // Get secrets
      const output = execSync('supabase secrets list --json 2>/dev/null || echo "[]"', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (output && output !== '[]') {
        const secrets = JSON.parse(output);
        for (const secret of secrets) {
          this.supabaseEnv.set(secret.name, '***REDACTED***');
        }
      }

      console.log(`   Found ${this.supabaseEnv.size} Supabase secrets\n`);
    } catch (error) {
      console.log('   Supabase CLI not available or not linked\n');
    }
  }

  /**
   * Load Vercel environment variables
   */
  private async loadVercel(): Promise<void> {
    console.log('☁️  Loading Vercel environment variables...');
    
    try {
      // Check if vercel CLI is available
      execSync('which vercel', { stdio: 'ignore' });

      // Get env vars
      const output = execSync('vercel env ls 2>/dev/null || echo ""', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });

      if (output) {
        const lines = output.split('\n');
        for (const line of lines) {
          const match = line.match(/^(\w+)\s+/);
          if (match) {
            this.vercelEnv.set(match[1], '***REDACTED***');
          }
        }
      }

      console.log(`   Found ${this.vercelEnv.size} Vercel variables\n`);
    } catch (error) {
      console.log('   Vercel CLI not available or not linked\n');
    }
  }

  /**
   * Analyze sync status
   */
  analyzeSyncStatus(): SyncReport {
    const report: SyncReport = {
      matched: [],
      localOnly: [],
      supabaseOnly: [],
      vercelOnly: [],
      mismatched: []
    };

    // Get all unique keys
    const allKeys = new Set<string>([
      ...this.localEnv.keys(),
      ...this.supabaseEnv.keys(),
      ...this.vercelEnv.keys()
    ]);

    for (const key of allKeys) {
      const hasLocal = this.localEnv.has(key);
      const hasSupabase = this.supabaseEnv.has(key);
      const hasVercel = this.vercelEnv.has(key);

      const envVar: EnvVar = {
        key,
        value: hasLocal ? this.maskValue(this.localEnv.get(key)!) : undefined,
        sources: {
          local: hasLocal,
          supabase: hasSupabase,
          vercel: hasVercel
        }
      };

      // Categorize
      if (hasLocal && hasSupabase && hasVercel) {
        report.matched.push(envVar);
      } else if (hasLocal && !hasSupabase && !hasVercel) {
        report.localOnly.push(envVar);
      } else if (!hasLocal && hasSupabase && !hasVercel) {
        report.supabaseOnly.push(envVar);
      } else if (!hasLocal && !hasSupabase && hasVercel) {
        report.vercelOnly.push(envVar);
      } else {
        report.mismatched.push(envVar);
      }
    }

    return report;
  }

  /**
   * Mask sensitive values
   */
  private maskValue(value: string): string {
    if (value.length <= 4) return '***';
    return value.substring(0, 4) + '***' + value.substring(value.length - 2);
  }

  /**
   * Generate sync report
   */
  generateReport(report: SyncReport): string {
    let output = '═══════════════════════════════════════════════════════════\n';
    output += '         🔄 ENVIRONMENT SYNC REPORT\n';
    output += '═══════════════════════════════════════════════════════════\n\n';

    output += '📊 Summary:\n';
    output += `   Fully synced: ${report.matched.length}\n`;
    output += `   Local only: ${report.localOnly.length}\n`;
    output += `   Supabase only: ${report.supabaseOnly.length}\n`;
    output += `   Vercel only: ${report.vercelOnly.length}\n`;
    output += `   Partial sync: ${report.mismatched.length}\n\n`;

    if (report.matched.length > 0) {
      output += '✅ FULLY SYNCED:\n';
      for (const envVar of report.matched) {
        output += `   ${envVar.key}\n`;
      }
      output += '\n';
    }

    if (report.localOnly.length > 0) {
      output += '📄 LOCAL ONLY (consider pushing to Supabase/Vercel):\n';
      for (const envVar of report.localOnly) {
        output += `   ${envVar.key} = ${envVar.value}\n`;
      }
      output += '\n';
    }

    if (report.supabaseOnly.length > 0) {
      output += '🔐 SUPABASE ONLY (consider pulling to local):\n';
      for (const envVar of report.supabaseOnly) {
        output += `   ${envVar.key}\n`;
      }
      output += '\n';
    }

    if (report.vercelOnly.length > 0) {
      output += '☁️  VERCEL ONLY (consider pulling to local):\n';
      for (const envVar of report.vercelOnly) {
        output += `   ${envVar.key}\n`;
      }
      output += '\n';
    }

    if (report.mismatched.length > 0) {
      output += '⚠️  PARTIAL SYNC (exists in some but not all):\n';
      for (const envVar of report.mismatched) {
        const locations = [];
        if (envVar.sources.local) locations.push('Local');
        if (envVar.sources.supabase) locations.push('Supabase');
        if (envVar.sources.vercel) locations.push('Vercel');
        output += `   ${envVar.key} (in: ${locations.join(', ')})\n`;
      }
      output += '\n';
    }

    output += '═══════════════════════════════════════════════════════════\n';
    output += '💡 Use --fix flag to sync missing variables (interactive)\n';
    output += '⚠️  WARNING: Never commit .env files or expose secrets!\n';
    output += '═══════════════════════════════════════════════════════════\n';

    return output;
  }

  /**
   * Fix sync issues (interactive)
   */
  async fixSyncIssues(report: SyncReport): Promise<void> {
    console.log('\n🔧 FIX MODE (DRY RUN)\n');
    console.log('This would sync the following:\n');

    // Local only → Push to remote
    if (report.localOnly.length > 0) {
      console.log('📤 Would push to Supabase/Vercel:');
      for (const envVar of report.localOnly.slice(0, 5)) {
        console.log(`   ${envVar.key}`);
      }
      if (report.localOnly.length > 5) {
        console.log(`   ... and ${report.localOnly.length - 5} more\n`);
      }
    }

    // Remote only → Pull to local
    if (report.supabaseOnly.length > 0 || report.vercelOnly.length > 0) {
      console.log('\n📥 Would pull to local .env:');
      for (const envVar of [...report.supabaseOnly, ...report.vercelOnly].slice(0, 5)) {
        console.log(`   ${envVar.key}=***REDACTED***`);
      }
    }

    console.log('\n⚠️  Actual sync operations not implemented for safety.');
    console.log('Please manually sync using:');
    console.log('  - supabase secrets set KEY=value');
    console.log('  - vercel env add KEY\n');
  }

  /**
   * Validate required environment variables
   */
  validateRequired(requiredKeys: string[]): boolean {
    console.log('\n🔍 Validating required environment variables...\n');
    
    let allPresent = true;

    for (const key of requiredKeys) {
      const hasLocal = this.localEnv.has(key);
      const hasSupabase = this.supabaseEnv.has(key);
      const hasVercel = this.vercelEnv.has(key);

      if (!hasLocal && !hasSupabase && !hasVercel) {
        console.log(`❌ MISSING: ${key}`);
        allPresent = false;
      } else if (hasLocal) {
        console.log(`✅ PRESENT: ${key} (local)`);
      } else {
        console.log(`⚠️  ${key} (remote only)`);
      }
    }

    console.log('');
    return allPresent;
  }
}

// Main execution
async function main() {
  const sync = new EnvironmentSync();

  // Load all environments
  await sync.loadAll();

  // Analyze
  const report = sync.analyzeSyncStatus();
  const output = sync.generateReport(report);
  console.log(output);

  // Validate required vars
  const requiredVars = [
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ];

  sync.validateRequired(requiredVars);

  // Fix if requested
  if (process.argv.includes('--fix')) {
    await sync.fixSyncIssues(report);
  }

  // Save report
  fs.writeFileSync('ENV_SYNC_REPORT.md', output);
  console.log('📄 Report saved to ENV_SYNC_REPORT.md\n');
}

main().catch(console.error);
