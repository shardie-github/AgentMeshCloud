#!/usr/bin/env tsx

/**
 * EMC (Expand/Migrate/Contract) Migration Script
 * 
 * This script implements the EMC pattern for online-safe database migrations:
 * 1. Expand: Add nullable/new columns, views; dual-write if needed
 * 2. Migrate: Backfill script (idempotent) with chunking + retry/backoff
 * 3. Contract: Remove old columns after verification window
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

interface MigrationStep {
  id: string;
  type: 'expand' | 'migrate' | 'contract';
  description: string;
  sql: string;
  rollbackSql?: string;
  dependencies?: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

interface EMCConfig {
  chunkSize: number;
  maxRetries: number;
  retryDelayMs: number;
  verificationWindowDays: number;
  dryRun: boolean;
}

class EMCMigrator {
  private prisma: PrismaClient;
  private supabase: any;
  private config: EMCConfig;
  private steps: MigrationStep[] = [];

  constructor(config: Partial<EMCConfig> = {}) {
    this.config = {
      chunkSize: 1000,
      maxRetries: 3,
      retryDelayMs: 1000,
      verificationWindowDays: 7,
      dryRun: false,
      ...config,
    };

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  /**
   * Detect pending EMC steps by analyzing migration files
   */
  async detectPendingSteps(): Promise<MigrationStep[]> {
    const migrationDir = path.join(process.cwd(), 'prisma', 'migrations');
    const files = await fs.readdir(migrationDir);
    
    const steps: MigrationStep[] = [];
    
    for (const file of files) {
      if (!file.endsWith('.sql')) continue;
      
      const content = await fs.readFile(path.join(migrationDir, file), 'utf-8');
      const lines = content.split('\n');
      
      // Look for EMC comments
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('-- EMC:')) {
          const type = line.split(':')[1]?.trim() as 'expand' | 'migrate' | 'contract';
          const description = lines[i + 1]?.replace('--', '').trim() || '';
          
          // Extract SQL block
          let sql = '';
          let j = i + 2;
          while (j < lines.length && !lines[j].startsWith('-- EMC:')) {
            if (!lines[j].startsWith('--')) {
              sql += lines[j] + '\n';
            }
            j++;
          }
          
          steps.push({
            id: `${file}-${type}-${i}`,
            type,
            description,
            sql: sql.trim(),
            status: 'pending',
          });
        }
      }
    }
    
    return steps;
  }

  /**
   * Execute a single migration step
   */
  async executeStep(step: MigrationStep): Promise<void> {
    console.log(`🔄 Executing ${step.type}: ${step.description}`);
    
    step.status = 'running';
    step.startedAt = new Date();
    
    try {
      if (this.config.dryRun) {
        console.log(`[DRY RUN] Would execute: ${step.sql}`);
        step.status = 'completed';
        step.completedAt = new Date();
        return;
      }

      switch (step.type) {
        case 'expand':
          await this.executeExpand(step);
          break;
        case 'migrate':
          await this.executeMigrate(step);
          break;
        case 'contract':
          await this.executeContract(step);
          break;
      }
      
      step.status = 'completed';
      step.completedAt = new Date();
      console.log(`✅ Completed ${step.type}: ${step.description}`);
      
    } catch (error) {
      step.status = 'failed';
      step.error = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed ${step.type}: ${step.description}`, error);
      throw error;
    }
  }

  /**
   * Execute expand step (add columns, views, etc.)
   */
  private async executeExpand(step: MigrationStep): Promise<void> {
    // Execute the SQL directly
    await this.prisma.$executeRawUnsafe(step.sql);
    
    // Log the change
    await this.logMigrationStep(step, 'expand');
  }

  /**
   * Execute migrate step (backfill data)
   */
  private async executeMigrate(step: MigrationStep): Promise<void> {
    // Parse the SQL to extract table and column information
    const tableMatch = step.sql.match(/UPDATE\s+(\w+)/i);
    if (!tableMatch) {
      throw new Error('Invalid migrate SQL: must contain UPDATE statement');
    }
    
    const tableName = tableMatch[1];
    
    // Get total count for progress tracking
    const countResult = await this.prisma.$queryRawUnsafe(
      `SELECT COUNT(*) as count FROM ${tableName}`
    ) as any[];
    const totalCount = parseInt(countResult[0].count);
    
    console.log(`📊 Backfilling ${totalCount} records in ${tableName}`);
    
    let processed = 0;
    let offset = 0;
    
    while (offset < totalCount) {
      const chunkSql = step.sql.replace(
        /LIMIT\s+\d+/i,
        `LIMIT ${this.config.chunkSize} OFFSET ${offset}`
      );
      
      try {
        await this.prisma.$executeRawUnsafe(chunkSql);
        processed += this.config.chunkSize;
        offset += this.config.chunkSize;
        
        const progress = Math.min(100, (processed / totalCount) * 100);
        console.log(`📈 Progress: ${progress.toFixed(1)}% (${processed}/${totalCount})`);
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error processing chunk at offset ${offset}:`, error);
        
        // Retry logic
        let retries = 0;
        while (retries < this.config.maxRetries) {
          try {
            await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs * (retries + 1)));
            await this.prisma.$executeRawUnsafe(chunkSql);
            console.log(`✅ Retry ${retries + 1} successful for offset ${offset}`);
            break;
          } catch (retryError) {
            retries++;
            if (retries === this.config.maxRetries) {
              throw new Error(`Failed to process chunk after ${this.config.maxRetries} retries: ${retryError}`);
            }
          }
        }
      }
    }
    
    await this.logMigrationStep(step, 'migrate', { totalCount, processed });
  }

  /**
   * Execute contract step (remove old columns)
   */
  private async executeContract(step: MigrationStep): Promise<void> {
    // Verify the verification window has passed
    const verificationDate = new Date();
    verificationDate.setDate(verificationDate.getDate() - this.config.verificationWindowDays);
    
    const lastMigration = await this.prisma.$queryRawUnsafe(
      `SELECT created_at FROM _prisma_migrations 
       WHERE migration_name LIKE '%${step.id.split('-')[0]}%' 
       ORDER BY created_at DESC LIMIT 1`
    ) as any[];
    
    if (lastMigration.length > 0) {
      const migrationDate = new Date(lastMigration[0].created_at);
      if (migrationDate > verificationDate) {
        throw new Error(`Contract step too early: verification window not met (${this.config.verificationWindowDays} days)`);
      }
    }
    
    // Execute the SQL
    await this.prisma.$executeRawUnsafe(step.sql);
    
    await this.logMigrationStep(step, 'contract');
  }

  /**
   * Log migration step execution
   */
  private async logMigrationStep(
    step: MigrationStep, 
    phase: string, 
    metadata?: any
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          entityType: 'migration',
          entityId: step.id,
          action: `${phase}_${step.type}`,
          changes: {
            step: step.description,
            phase,
            metadata: metadata || {},
            timestamp: new Date().toISOString(),
          },
          tenantId: 'system', // System-level migration
        },
      });
    } catch (error) {
      console.warn('Failed to log migration step:', error);
    }
  }

  /**
   * Run all pending EMC steps
   */
  async run(): Promise<void> {
    console.log('🚀 Starting EMC Migration Process');
    console.log(`Configuration:`, this.config);
    
    try {
      // Detect pending steps
      this.steps = await this.detectPendingSteps();
      
      if (this.steps.length === 0) {
        console.log('✅ No pending EMC steps found');
        return;
      }
      
      console.log(`📋 Found ${this.steps.length} pending EMC steps`);
      
      // Group steps by type and execute in order
      const expandSteps = this.steps.filter(s => s.type === 'expand');
      const migrateSteps = this.steps.filter(s => s.type === 'migrate');
      const contractSteps = this.steps.filter(s => s.type === 'contract');
      
      // Execute expand steps first
      for (const step of expandSteps) {
        await this.executeStep(step);
      }
      
      // Execute migrate steps
      for (const step of migrateSteps) {
        await this.executeStep(step);
      }
      
      // Execute contract steps (if verification window has passed)
      for (const step of contractSteps) {
        try {
          await this.executeStep(step);
        } catch (error) {
          if (error.message.includes('verification window not met')) {
            console.log(`⏳ Skipping contract step ${step.id}: verification window not met`);
            continue;
          }
          throw error;
        }
      }
      
      // Generate summary
      await this.generateSummary();
      
    } catch (error) {
      console.error('❌ EMC Migration failed:', error);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Generate migration summary
   */
  private async generateSummary(): Promise<void> {
    const summary = {
      timestamp: new Date().toISOString(),
      totalSteps: this.steps.length,
      completed: this.steps.filter(s => s.status === 'completed').length,
      failed: this.steps.filter(s => s.status === 'failed').length,
      steps: this.steps.map(step => ({
        id: step.id,
        type: step.type,
        description: step.description,
        status: step.status,
        duration: step.completedAt && step.startedAt 
          ? step.completedAt.getTime() - step.startedAt.getTime()
          : null,
        error: step.error,
      })),
    };
    
    console.log('\n📊 EMC Migration Summary:');
    console.log(`Total Steps: ${summary.totalSteps}`);
    console.log(`Completed: ${summary.completed}`);
    console.log(`Failed: ${summary.failed}`);
    
    if (summary.failed > 0) {
      console.log('\n❌ Failed Steps:');
      summary.steps
        .filter(s => s.status === 'failed')
        .forEach(step => {
          console.log(`  - ${step.id}: ${step.error}`);
        });
    }
    
    // Save summary to file
    const summaryPath = path.join(process.cwd(), 'emc-migration-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n💾 Summary saved to: ${summaryPath}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const chunkSize = parseInt(args.find(arg => arg.startsWith('--chunk-size='))?.split('=')[1] || '1000');
  
  const config: Partial<EMCConfig> = {
    dryRun,
    chunkSize,
  };
  
  const migrator = new EMCMigrator(config);
  
  try {
    await migrator.run();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { EMCMigrator, MigrationStep, EMCConfig };
