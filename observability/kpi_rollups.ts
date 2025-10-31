/**
 * KPI Rollups
 * Hourly aggregation of metrics into materialized views for dashboard performance
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CronJob } from 'cron';

interface KPIRollup {
  period_start: Date;
  period_end: Date;
  service: string;
  total_requests: number;
  error_count: number;
  error_rate: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p95_duration_ms: number;
  p99_duration_ms: number;
}

interface DailyKPI {
  date: string;
  service: string;
  requests: number;
  errors: number;
  error_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  uptime_percent: number;
}

export class KPIRollupEngine {
  private supabase: SupabaseClient;
  private hourlyJob: CronJob | null = null;
  private dailyJob: CronJob | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Start scheduled rollup jobs
   */
  start(): void {
    // Hourly rollups at minute 5 of every hour
    this.hourlyJob = new CronJob('5 * * * *', async () => {
      await this.performHourlyRollup();
    });

    // Daily rollups at 00:15 every day
    this.dailyJob = new CronJob('15 0 * * *', async () => {
      await this.performDailyRollup();
    });

    this.hourlyJob.start();
    this.dailyJob.start();

    console.log('📊 KPI Rollup Engine started');
  }

  /**
   * Perform hourly KPI aggregation
   */
  async performHourlyRollup(): Promise<void> {
    const now = new Date();
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);
    hourStart.setHours(hourStart.getHours() - 1);

    const hourEnd = new Date(hourStart);
    hourEnd.setHours(hourEnd.getHours() + 1);

    console.log(`🔄 Rolling up KPIs for ${hourStart.toISOString()} to ${hourEnd.toISOString()}`);

    try {
      // Call stored procedure for hourly rollup
      const { data, error } = await this.supabase.rpc('rollup_hourly_kpis', {
        p_period_start: hourStart.toISOString(),
        p_period_end: hourEnd.toISOString(),
      });

      if (error) {
        console.error('❌ Hourly rollup failed:', error);
        throw error;
      }

      console.log(`✅ Hourly rollup complete: ${data?.rows_inserted || 0} rows`);
    } catch (err) {
      console.error('Exception during hourly rollup:', err);
      throw err;
    }
  }

  /**
   * Perform daily KPI aggregation
   */
  async performDailyRollup(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    console.log(`🔄 Rolling up daily KPIs for ${yesterday.toISOString()}`);

    try {
      // Call stored procedure for daily rollup
      const { data, error } = await this.supabase.rpc('rollup_daily_kpis', {
        p_date: yesterday.toISOString().split('T')[0],
      });

      if (error) {
        console.error('❌ Daily rollup failed:', error);
        throw error;
      }

      console.log(`✅ Daily rollup complete: ${data?.rows_inserted || 0} rows`);

      // Refresh materialized views
      await this.refreshMaterializedViews();
    } catch (err) {
      console.error('Exception during daily rollup:', err);
      throw err;
    }
  }

  /**
   * Refresh materialized views for dashboards
   */
  private async refreshMaterializedViews(): Promise<void> {
    console.log('🔄 Refreshing materialized views...');

    try {
      await this.supabase.rpc('refresh_kpi_views');
      console.log('✅ Materialized views refreshed');
    } catch (err) {
      console.error('❌ Failed to refresh materialized views:', err);
    }
  }

  /**
   * Get latest KPIs for a service
   */
  async getLatestKPIs(service: string): Promise<DailyKPI | null> {
    const { data, error } = await this.supabase
      .from('mv_kpis_daily')
      .select('*')
      .eq('service', service)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Failed to fetch latest KPIs:', error);
      return null;
    }

    return data as DailyKPI;
  }

  /**
   * Get KPI trends over a time period
   */
  async getKPITrends(
    service: string,
    startDate: string,
    endDate: string
  ): Promise<DailyKPI[]> {
    const { data, error } = await this.supabase
      .from('mv_kpis_daily')
      .select('*')
      .eq('service', service)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch KPI trends:', error);
      return [];
    }

    return data as DailyKPI[];
  }

  /**
   * Perform ad-hoc rollup for a specific time range
   */
  async rollupRange(startTime: Date, endTime: Date): Promise<void> {
    console.log(`🔄 Ad-hoc rollup from ${startTime.toISOString()} to ${endTime.toISOString()}`);

    const { error } = await this.supabase.rpc('rollup_hourly_kpis', {
      p_period_start: startTime.toISOString(),
      p_period_end: endTime.toISOString(),
    });

    if (error) {
      console.error('❌ Ad-hoc rollup failed:', error);
      throw error;
    }

    console.log('✅ Ad-hoc rollup complete');
  }

  /**
   * Stop scheduled jobs
   */
  stop(): void {
    if (this.hourlyJob) {
      this.hourlyJob.stop();
    }
    if (this.dailyJob) {
      this.dailyJob.stop();
    }
    console.log('🛑 KPI Rollup Engine stopped');
  }
}

/**
 * Factory function
 */
export function createKPIRollupEngine(): KPIRollupEngine | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, KPI rollups disabled');
    return null;
  }

  return new KPIRollupEngine(supabaseUrl, supabaseKey);
}

export default KPIRollupEngine;
