/**
 * Dashboard Sync
 * Pushes metrics to external dashboards (Grafana, Looker, Tableau) via their APIs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios, { AxiosInstance } from 'axios';

interface DashboardConfig {
  type: 'grafana' | 'looker' | 'tableau' | 'datadog';
  url: string;
  apiKey: string;
  enabled: boolean;
}

interface MetricPayload {
  timestamp: string;
  service: string;
  metrics: Record<string, number>;
  tags?: Record<string, string>;
}

export class DashboardSyncEngine {
  private supabase: SupabaseClient;
  private grafana: AxiosInstance | null = null;
  private datadog: AxiosInstance | null = null;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeClients();
  }

  /**
   * Initialize external API clients
   */
  private initializeClients(): void {
    // Grafana
    if (process.env.GRAFANA_URL && process.env.GRAFANA_API_KEY) {
      this.grafana = axios.create({
        baseURL: process.env.GRAFANA_URL,
        headers: {
          Authorization: `Bearer ${process.env.GRAFANA_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('✅ Grafana client initialized');
    }

    // Datadog
    if (process.env.DATADOG_API_KEY && process.env.DATADOG_APP_KEY) {
      this.datadog = axios.create({
        baseURL: 'https://api.datadoghq.com/api/v1',
        headers: {
          'DD-API-KEY': process.env.DATADOG_API_KEY,
          'DD-APPLICATION-KEY': process.env.DATADOG_APP_KEY,
          'Content-Type': 'application/json',
        },
      });
      console.log('✅ Datadog client initialized');
    }
  }

  /**
   * Sync latest KPIs to all configured dashboards
   */
  async syncLatestKPIs(): Promise<void> {
    console.log('🔄 Syncing KPIs to dashboards...');

    // Fetch latest KPIs
    const { data, error } = await this.supabase
      .from('mv_kpis_daily')
      .select('*')
      .order('date', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      console.warn('No KPIs to sync');
      return;
    }

    const kpis = data[0];
    const payload: MetricPayload = {
      timestamp: new Date().toISOString(),
      service: kpis.service,
      metrics: {
        requests: kpis.requests,
        errors: kpis.errors,
        error_rate: kpis.error_rate,
        avg_latency_ms: kpis.avg_latency_ms,
        p95_latency_ms: kpis.p95_latency_ms,
        uptime_percent: kpis.uptime_percent,
      },
      tags: {
        service: kpis.service,
        environment: process.env.NODE_ENV || 'production',
      },
    };

    // Sync to each dashboard
    const results = await Promise.allSettled([
      this.syncToGrafana(payload),
      this.syncToDatadog(payload),
    ]);

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`✅ Dashboard sync complete: ${successful} succeeded, ${failed} failed`);
  }

  /**
   * Sync metrics to Grafana
   */
  private async syncToGrafana(payload: MetricPayload): Promise<void> {
    if (!this.grafana) return;

    try {
      // Grafana uses Prometheus format or InfluxDB line protocol
      const annotations = {
        time: new Date(payload.timestamp).getTime(),
        tags: Object.keys(payload.tags || {}).map((key) => `${key}:${payload.tags![key]}`),
        text: `KPI Update: ${payload.service}`,
      };

      await this.grafana.post('/api/annotations', annotations);
      console.log('✅ Synced to Grafana');
    } catch (err) {
      console.error('❌ Failed to sync to Grafana:', err);
      throw err;
    }
  }

  /**
   * Sync metrics to Datadog
   */
  private async syncToDatadog(payload: MetricPayload): Promise<void> {
    if (!this.datadog) return;

    try {
      const series = Object.entries(payload.metrics).map(([metric, value]) => ({
        metric: `orca.${payload.service}.${metric}`,
        points: [[Math.floor(Date.now() / 1000), value]],
        type: 'gauge',
        tags: Object.entries(payload.tags || {}).map(([k, v]) => `${k}:${v}`),
      }));

      await this.datadog.post('/series', { series });
      console.log('✅ Synced to Datadog');
    } catch (err) {
      console.error('❌ Failed to sync to Datadog:', err);
      throw err;
    }
  }

  /**
   * Create or update Grafana dashboard from template
   */
  async createGrafanaDashboard(dashboardJson: any): Promise<string | null> {
    if (!this.grafana) {
      console.warn('Grafana not configured');
      return null;
    }

    try {
      const response = await this.grafana.post('/api/dashboards/db', {
        dashboard: dashboardJson,
        overwrite: true,
        message: 'Auto-generated from Orca KPIs',
      });

      const dashboardUrl = `${process.env.GRAFANA_URL}/d/${response.data.uid}`;
      console.log(`✅ Grafana dashboard created: ${dashboardUrl}`);
      return dashboardUrl;
    } catch (err) {
      console.error('❌ Failed to create Grafana dashboard:', err);
      return null;
    }
  }

  /**
   * Push custom event to dashboards
   */
  async pushEvent(
    title: string,
    description: string,
    severity: 'info' | 'warning' | 'error' | 'critical'
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    const promises = [];

    // Grafana annotation
    if (this.grafana) {
      promises.push(
        this.grafana.post('/api/annotations', {
          time: Date.now(),
          tags: [severity, 'orca-event'],
          text: `${title}\n${description}`,
        })
      );
    }

    // Datadog event
    if (this.datadog) {
      promises.push(
        this.datadog.post('/events', {
          title,
          text: description,
          alert_type: severity,
          tags: ['source:orca', `severity:${severity}`],
        })
      );
    }

    await Promise.allSettled(promises);
    console.log(`📢 Event pushed to dashboards: ${title}`);
  }

  /**
   * Batch sync historical data
   */
  async syncHistoricalData(days: number = 7): Promise<void> {
    console.log(`🔄 Syncing ${days} days of historical data...`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await this.supabase
      .from('mv_kpis_daily')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (error || !data) {
      console.error('Failed to fetch historical data:', error);
      return;
    }

    console.log(`📊 Syncing ${data.length} historical records...`);

    for (const kpi of data) {
      const payload: MetricPayload = {
        timestamp: kpi.date,
        service: kpi.service,
        metrics: {
          requests: kpi.requests,
          errors: kpi.errors,
          error_rate: kpi.error_rate,
          avg_latency_ms: kpi.avg_latency_ms,
          p95_latency_ms: kpi.p95_latency_ms,
          uptime_percent: kpi.uptime_percent,
        },
        tags: {
          service: kpi.service,
          environment: process.env.NODE_ENV || 'production',
        },
      };

      await Promise.allSettled([this.syncToGrafana(payload), this.syncToDatadog(payload)]);
    }

    console.log('✅ Historical data sync complete');
  }
}

/**
 * Factory function
 */
export function createDashboardSyncEngine(): DashboardSyncEngine | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, dashboard sync disabled');
    return null;
  }

  return new DashboardSyncEngine(supabaseUrl, supabaseKey);
}

export default DashboardSyncEngine;
