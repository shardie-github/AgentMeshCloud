/**
 * Retention Enforcer
 * Automatically enforces retention windows per compliance policy
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CronJob } from 'cron';

export interface RetentionPolicy {
  table_name: string;
  retention_days: number;
  archive_before_delete: boolean;
  archive_destination?: string;
  timestamp_column: string;
}

export interface RetentionReport {
  table_name: string;
  records_evaluated: number;
  records_archived: number;
  records_deleted: number;
  bytes_freed: number;
}

export class RetentionEnforcer {
  private supabase: SupabaseClient;
  private policies: Map<string, RetentionPolicy> = new Map();
  private cronJob: CronJob | null = null;

  // Default retention policies
  private readonly DEFAULT_POLICIES: RetentionPolicy[] = [
    {
      table_name: 'audit_logs',
      retention_days: 90,
      archive_before_delete: true,
      archive_destination: 's3://audit-archive',
      timestamp_column: 'timestamp',
    },
    {
      table_name: 'pii_audit_logs',
      retention_days: 365, // 1 year for compliance
      archive_before_delete: true,
      archive_destination: 's3://pii-audit-archive',
      timestamp_column: 'timestamp',
    },
    {
      table_name: 'telemetry_traces',
      retention_days: 30,
      archive_before_delete: false,
      timestamp_column: 'timestamp',
    },
    {
      table_name: 'telemetry_metrics',
      retention_days: 90,
      archive_before_delete: true,
      archive_destination: 's3://metrics-archive',
      timestamp_column: 'timestamp',
    },
    {
      table_name: 'feedback',
      retention_days: 730, // 2 years
      archive_before_delete: true,
      archive_destination: 's3://feedback-archive',
      timestamp_column: 'created_at',
    },
    {
      table_name: 'incidents',
      retention_days: 1825, // 5 years
      archive_before_delete: true,
      archive_destination: 's3://incident-archive',
      timestamp_column: 'started_at',
    },
  ];

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.loadPolicies();
  }

  /**
   * Load retention policies
   */
  private loadPolicies(): void {
    this.DEFAULT_POLICIES.forEach((policy) => {
      this.policies.set(policy.table_name, policy);
    });

    console.log(`✅ Loaded ${this.policies.size} retention policies`);
  }

  /**
   * Start scheduled enforcement
   */
  start(): void {
    // Run daily at 2 AM
    this.cronJob = new CronJob('0 2 * * *', async () => {
      await this.enforceRetention();
    });

    this.cronJob.start();
    console.log('📅 Retention enforcer scheduled (daily at 2 AM)');
  }

  /**
   * Stop scheduled enforcement
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    console.log('🛑 Retention enforcer stopped');
  }

  /**
   * Enforce retention for all tables
   */
  async enforceRetention(): Promise<RetentionReport[]> {
    console.log('🔄 Starting retention enforcement...');

    const reports: RetentionReport[] = [];

    for (const [tableName, policy] of this.policies) {
      try {
        const report = await this.enforceTableRetention(policy);
        reports.push(report);
      } catch (error) {
        console.error(`Failed to enforce retention for ${tableName}:`, error);
      }
    }

    // Store enforcement report
    await this.storeReport(reports);

    const totalDeleted = reports.reduce((sum, r) => sum + r.records_deleted, 0);
    const totalArchived = reports.reduce((sum, r) => sum + r.records_archived, 0);

    console.log(`✅ Retention enforcement complete: ${totalArchived} archived, ${totalDeleted} deleted`);

    return reports;
  }

  /**
   * Enforce retention for a single table
   */
  private async enforceTableRetention(policy: RetentionPolicy): Promise<RetentionReport> {
    console.log(`🔍 Enforcing retention for ${policy.table_name} (${policy.retention_days} days)`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retention_days);

    // Find records to delete
    const { data: expiredRecords, error: fetchError } = await this.supabase
      .from(policy.table_name)
      .select('id, *')
      .lt(policy.timestamp_column, cutoffDate.toISOString());

    if (fetchError || !expiredRecords || expiredRecords.length === 0) {
      return {
        table_name: policy.table_name,
        records_evaluated: 0,
        records_archived: 0,
        records_deleted: 0,
        bytes_freed: 0,
      };
    }

    const recordIds = expiredRecords.map((r) => r.id);

    let archivedCount = 0;
    if (policy.archive_before_delete) {
      archivedCount = await this.archiveRecords(policy, expiredRecords);
    }

    // Delete records
    const { error: deleteError } = await this.supabase
      .from(policy.table_name)
      .delete()
      .in('id', recordIds);

    if (deleteError) {
      console.error(`Failed to delete expired records from ${policy.table_name}:`, deleteError);
      return {
        table_name: policy.table_name,
        records_evaluated: expiredRecords.length,
        records_archived: archivedCount,
        records_deleted: 0,
        bytes_freed: 0,
      };
    }

    // Estimate bytes freed (rough estimate)
    const bytesFreed = expiredRecords.length * 1024; // Assume 1KB per record

    console.log(`✅ ${policy.table_name}: ${expiredRecords.length} records deleted, ${archivedCount} archived`);

    return {
      table_name: policy.table_name,
      records_evaluated: expiredRecords.length,
      records_archived: archivedCount,
      records_deleted: expiredRecords.length,
      bytes_freed: bytesFreed,
    };
  }

  /**
   * Archive records before deletion
   */
  private async archiveRecords(policy: RetentionPolicy, records: any[]): Promise<number> {
    console.log(`📦 Archiving ${records.length} records from ${policy.table_name}...`);

    // Store in archive table
    const archiveTableName = `${policy.table_name}_archive`;

    try {
      const { error } = await this.supabase.from(archiveTableName).insert(
        records.map((r) => ({
          ...r,
          archived_at: new Date().toISOString(),
          original_id: r.id,
        }))
      );

      if (error) {
        console.error(`Failed to archive records to ${archiveTableName}:`, error);
        return 0;
      }

      return records.length;
    } catch (error) {
      console.error(`Exception during archive:`, error);
      return 0;
    }
  }

  /**
   * Store enforcement report
   */
  private async storeReport(reports: RetentionReport[]): Promise<void> {
    const { error } = await this.supabase.from('retention_reports').insert({
      timestamp: new Date().toISOString(),
      reports: reports,
      total_records_deleted: reports.reduce((sum, r) => sum + r.records_deleted, 0),
      total_records_archived: reports.reduce((sum, r) => sum + r.records_archived, 0),
      total_bytes_freed: reports.reduce((sum, r) => sum + r.bytes_freed, 0),
    });

    if (error) {
      console.error('Failed to store retention report:', error);
    }
  }

  /**
   * Get retention statistics
   */
  async getStatistics(): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_retention_stats');

    if (error) {
      console.error('Failed to get retention statistics:', error);
      return null;
    }

    return data;
  }

  /**
   * Add or update retention policy
   */
  addPolicy(policy: RetentionPolicy): void {
    this.policies.set(policy.table_name, policy);
    console.log(`✅ Added retention policy for ${policy.table_name}`);
  }

  /**
   * Remove retention policy
   */
  removePolicy(tableName: string): void {
    this.policies.delete(tableName);
    console.log(`✅ Removed retention policy for ${tableName}`);
  }

  /**
   * Get all policies
   */
  getPolicies(): RetentionPolicy[] {
    return Array.from(this.policies.values());
  }
}

/**
 * Factory function
 */
export function createRetentionEnforcer(): RetentionEnforcer | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, retention enforcer disabled');
    return null;
  }

  return new RetentionEnforcer(supabaseUrl, supabaseKey);
}

export default RetentionEnforcer;
