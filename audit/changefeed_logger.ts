/**
 * Changefeed Logger
 * Listens to Supabase realtime and logs changes to audit table
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';

export interface AuditLog {
  timestamp: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changed_fields?: string[];
  user_id?: string;
  ip_address?: string;
  has_pii: boolean;
  metadata?: Record<string, any>;
}

export class ChangefeedLogger {
  private supabase: SupabaseClient;
  private channels: RealtimeChannel[] = [];
  private piiFields = new Set([
    'email',
    'phone',
    'ssn',
    'credit_card',
    'password',
    'api_key',
    'secret',
    'token',
  ]);

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Start listening to changes on specified tables
   */
  async startMonitoring(tables: string[]): Promise<void> {
    console.log(`👂 Starting changefeed monitoring for tables: ${tables.join(', ')}`);

    for (const table of tables) {
      const channel = this.supabase
        .channel(`audit_${table}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events
            schema: 'public',
            table: table,
          },
          (payload) => this.handleChange(table, payload)
        )
        .subscribe();

      this.channels.push(channel);
    }

    console.log(`✅ Monitoring ${tables.length} tables`);
  }

  /**
   * Handle a change event
   */
  private async handleChange(tableName: string, payload: any): Promise<void> {
    const operation = payload.eventType.toUpperCase() as 'INSERT' | 'UPDATE' | 'DELETE';
    const oldRecord = payload.old;
    const newRecord = payload.new;

    // Determine record ID
    const recordId = newRecord?.id || oldRecord?.id || 'unknown';

    // Check for PII
    const hasPII = this.checkForPII(newRecord || oldRecord);

    // Calculate changed fields for UPDATE
    let changedFields: string[] | undefined;
    if (operation === 'UPDATE' && oldRecord && newRecord) {
      changedFields = Object.keys(newRecord).filter(
        (key) => JSON.stringify(oldRecord[key]) !== JSON.stringify(newRecord[key])
      );
    }

    // Create audit log
    const auditLog: AuditLog = {
      timestamp: new Date().toISOString(),
      table_name: tableName,
      operation,
      record_id: recordId,
      old_values: operation === 'UPDATE' || operation === 'DELETE' ? oldRecord : undefined,
      new_values: operation === 'INSERT' || operation === 'UPDATE' ? newRecord : undefined,
      changed_fields: changedFields,
      user_id: this.extractUserId(newRecord || oldRecord),
      has_pii: hasPII,
      metadata: {
        event_time: payload.commit_timestamp,
      },
    };

    // Log the change
    await this.logChange(auditLog);

    // If PII is involved, trigger special handling
    if (hasPII) {
      await this.handlePIIChange(auditLog);
    }
  }

  /**
   * Check if record contains PII
   */
  private checkForPII(record: any): boolean {
    if (!record) return false;

    const keys = Object.keys(record);
    return keys.some((key) => {
      const lowerKey = key.toLowerCase();
      return Array.from(this.piiFields).some((piiField) => lowerKey.includes(piiField));
    });
  }

  /**
   * Extract user ID from record
   */
  private extractUserId(record: any): string | undefined {
    return record?.user_id || record?.owner_id || record?.created_by;
  }

  /**
   * Log change to audit table
   */
  private async logChange(auditLog: AuditLog): Promise<void> {
    const { error } = await this.supabase.from('audit_logs').insert({
      timestamp: auditLog.timestamp,
      table_name: auditLog.table_name,
      operation: auditLog.operation,
      record_id: auditLog.record_id,
      old_values: auditLog.old_values,
      new_values: auditLog.new_values,
      changed_fields: auditLog.changed_fields,
      user_id: auditLog.user_id,
      has_pii: auditLog.has_pii,
      metadata: auditLog.metadata,
    });

    if (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Handle PII-flagged changes
   */
  private async handlePIIChange(auditLog: AuditLog): Promise<void> {
    console.log(`🔒 PII-flagged change detected: ${auditLog.table_name} ${auditLog.operation}`);

    // Insert into PII audit table for compliance
    await this.supabase.from('pii_audit_logs').insert({
      timestamp: auditLog.timestamp,
      table_name: auditLog.table_name,
      operation: auditLog.operation,
      record_id: auditLog.record_id,
      user_id: auditLog.user_id,
      metadata: auditLog.metadata,
    });

    // Trigger alert if DELETE operation on PII
    if (auditLog.operation === 'DELETE') {
      await this.supabase.from('audit_alerts').insert({
        timestamp: auditLog.timestamp,
        alert_type: 'pii_deletion',
        severity: 'high',
        description: `PII data deleted from ${auditLog.table_name}`,
        audit_log_id: auditLog.record_id,
      });
    }
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    console.log('🛑 Stopping changefeed monitoring...');

    for (const channel of this.channels) {
      await this.supabase.removeChannel(channel);
    }

    this.channels = [];
    console.log('✅ Monitoring stopped');
  }

  /**
   * Get audit logs for a specific record
   */
  async getAuditTrail(tableName: string, recordId: string): Promise<AuditLog[]> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', tableName)
      .eq('record_id', recordId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to fetch audit trail:', error);
      return [];
    }

    return data as AuditLog[];
  }

  /**
   * Get recent audit logs
   */
  async getRecentAudits(limit: number = 100): Promise<AuditLog[]> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent audits:', error);
      return [];
    }

    return data as AuditLog[];
  }

  /**
   * Get audit statistics
   */
  async getStatistics(): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_audit_stats');

    if (error) {
      console.error('Failed to get audit statistics:', error);
      return null;
    }

    return data;
  }
}

/**
 * Factory function
 */
export function createChangefeedLogger(): ChangefeedLogger | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, changefeed logger disabled');
    return null;
  }

  return new ChangefeedLogger(supabaseUrl, supabaseKey);
}

export default ChangefeedLogger;
