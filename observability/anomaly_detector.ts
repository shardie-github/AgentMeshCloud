/**
 * Anomaly Detector
 * Detects drift, SLA breaches, and KPI regressions using statistical analysis
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';

interface Anomaly {
  timestamp: Date;
  service: string;
  metric_name: string;
  anomaly_type: 'drift' | 'sla_breach' | 'regression' | 'spike';
  severity: 'low' | 'medium' | 'high' | 'critical';
  current_value: number;
  expected_value: number;
  deviation_percent: number;
  description: string;
  metadata?: Record<string, any>;
}

interface MetricThreshold {
  metric_name: string;
  error_rate_threshold: number;
  latency_p95_threshold_ms: number;
  latency_p99_threshold_ms: number;
  uptime_threshold_percent: number;
}

interface StatisticalBaseline {
  metric: string;
  mean: number;
  stddev: number;
  p50: number;
  p95: number;
  p99: number;
  sample_count: number;
}

export class AnomalyDetector extends EventEmitter {
  private supabase: SupabaseClient;
  private baselines: Map<string, StatisticalBaseline> = new Map();
  private thresholds: Map<string, MetricThreshold> = new Map();

  // Statistical parameters
  private readonly Z_SCORE_THRESHOLD = 3; // 3 standard deviations
  private readonly REGRESSION_THRESHOLD_PERCENT = 20; // 20% worse than baseline
  private readonly SPIKE_THRESHOLD_PERCENT = 200; // 200% above baseline

  constructor(supabaseUrl: string, supabaseKey: string) {
    super();
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Initialize baselines from historical data
   */
  async initializeBaselines(lookbackDays: number = 7): Promise<void> {
    console.log(`🔍 Calculating baselines from last ${lookbackDays} days...`);

    const { data, error } = await this.supabase.rpc('calculate_metric_baselines', {
      p_lookback_days: lookbackDays,
    });

    if (error) {
      console.error('Failed to calculate baselines:', error);
      return;
    }

    if (data && Array.isArray(data)) {
      data.forEach((baseline: any) => {
        const key = `${baseline.service}.${baseline.metric}`;
        this.baselines.set(key, {
          metric: baseline.metric,
          mean: baseline.mean,
          stddev: baseline.stddev,
          p50: baseline.p50,
          p95: baseline.p95,
          p99: baseline.p99,
          sample_count: baseline.sample_count,
        });
      });
    }

    console.log(`✅ Loaded ${this.baselines.size} metric baselines`);
  }

  /**
   * Load SLA thresholds from configuration
   */
  async loadThresholds(): Promise<void> {
    const { data, error } = await this.supabase
      .from('sla_thresholds')
      .select('*')
      .eq('active', true);

    if (error) {
      console.error('Failed to load SLA thresholds:', error);
      return;
    }

    if (data) {
      data.forEach((threshold: any) => {
        this.thresholds.set(threshold.metric_name, {
          metric_name: threshold.metric_name,
          error_rate_threshold: threshold.error_rate_threshold,
          latency_p95_threshold_ms: threshold.latency_p95_threshold_ms,
          latency_p99_threshold_ms: threshold.latency_p99_threshold_ms,
          uptime_threshold_percent: threshold.uptime_threshold_percent,
        });
      });
    }

    console.log(`✅ Loaded ${this.thresholds.size} SLA thresholds`);
  }

  /**
   * Detect anomalies in recent metrics
   */
  async detectAnomalies(minutesBack: number = 5): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    const now = new Date();
    const startTime = new Date(now.getTime() - minutesBack * 60000);

    // Fetch recent metrics
    const { data, error } = await this.supabase
      .from('telemetry_metrics')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Failed to fetch recent metrics:', error);
      return anomalies;
    }

    if (!data || data.length === 0) {
      return anomalies;
    }

    // Group by service and metric
    const metricGroups = new Map<string, any[]>();
    data.forEach((metric: any) => {
      const key = `${metric.service}.${metric.metric_name}`;
      if (!metricGroups.has(key)) {
        metricGroups.set(key, []);
      }
      metricGroups.get(key)!.push(metric);
    });

    // Analyze each group
    for (const [key, metrics] of metricGroups) {
      const baseline = this.baselines.get(key);
      if (!baseline) continue;

      const latestMetric = metrics[0];
      const service = latestMetric.service;
      const metricName = latestMetric.metric_name;

      // Check for drift (Z-score based)
      const driftAnomaly = this.detectDrift(service, metricName, latestMetric.value, baseline);
      if (driftAnomaly) {
        anomalies.push(driftAnomaly);
      }

      // Check for regression
      const regressionAnomaly = this.detectRegression(
        service,
        metricName,
        latestMetric.value,
        baseline
      );
      if (regressionAnomaly) {
        anomalies.push(regressionAnomaly);
      }

      // Check for spike
      const spikeAnomaly = this.detectSpike(service, metricName, latestMetric.value, baseline);
      if (spikeAnomaly) {
        anomalies.push(spikeAnomaly);
      }
    }

    // Check SLA breaches
    const slaBreaches = await this.detectSLABreaches();
    anomalies.push(...slaBreaches);

    // Store anomalies
    if (anomalies.length > 0) {
      await this.storeAnomalies(anomalies);
      anomalies.forEach((anomaly) => this.emit('anomaly_detected', anomaly));
    }

    return anomalies;
  }

  /**
   * Detect drift using Z-score
   */
  private detectDrift(
    service: string,
    metricName: string,
    currentValue: number,
    baseline: StatisticalBaseline
  ): Anomaly | null {
    if (baseline.stddev === 0) return null;

    const zScore = Math.abs((currentValue - baseline.mean) / baseline.stddev);

    if (zScore > this.Z_SCORE_THRESHOLD) {
      const deviationPercent = ((currentValue - baseline.mean) / baseline.mean) * 100;

      return {
        timestamp: new Date(),
        service,
        metric_name: metricName,
        anomaly_type: 'drift',
        severity: zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium',
        current_value: currentValue,
        expected_value: baseline.mean,
        deviation_percent: deviationPercent,
        description: `Metric drifted ${deviationPercent.toFixed(1)}% from baseline (Z-score: ${zScore.toFixed(2)})`,
        metadata: { z_score: zScore, baseline_stddev: baseline.stddev },
      };
    }

    return null;
  }

  /**
   * Detect regression (performance degradation)
   */
  private detectRegression(
    service: string,
    metricName: string,
    currentValue: number,
    baseline: StatisticalBaseline
  ): Anomaly | null {
    // For latency metrics, higher is worse
    if (metricName.includes('latency') || metricName.includes('duration')) {
      const increase = ((currentValue - baseline.p95) / baseline.p95) * 100;

      if (increase > this.REGRESSION_THRESHOLD_PERCENT) {
        return {
          timestamp: new Date(),
          service,
          metric_name: metricName,
          anomaly_type: 'regression',
          severity: increase > 50 ? 'critical' : increase > 30 ? 'high' : 'medium',
          current_value: currentValue,
          expected_value: baseline.p95,
          deviation_percent: increase,
          description: `Performance regression: ${metricName} increased ${increase.toFixed(1)}% above p95 baseline`,
        };
      }
    }

    // For error rate, higher is worse
    if (metricName.includes('error')) {
      const increase = ((currentValue - baseline.mean) / baseline.mean) * 100;

      if (increase > this.REGRESSION_THRESHOLD_PERCENT) {
        return {
          timestamp: new Date(),
          service,
          metric_name: metricName,
          anomaly_type: 'regression',
          severity: increase > 100 ? 'critical' : increase > 50 ? 'high' : 'medium',
          current_value: currentValue,
          expected_value: baseline.mean,
          deviation_percent: increase,
          description: `Error rate increased ${increase.toFixed(1)}% above baseline`,
        };
      }
    }

    return null;
  }

  /**
   * Detect traffic/load spikes
   */
  private detectSpike(
    service: string,
    metricName: string,
    currentValue: number,
    baseline: StatisticalBaseline
  ): Anomaly | null {
    if (metricName.includes('request') || metricName.includes('traffic')) {
      const increase = ((currentValue - baseline.mean) / baseline.mean) * 100;

      if (increase > this.SPIKE_THRESHOLD_PERCENT) {
        return {
          timestamp: new Date(),
          service,
          metric_name: metricName,
          anomaly_type: 'spike',
          severity: increase > 500 ? 'critical' : increase > 300 ? 'high' : 'medium',
          current_value: currentValue,
          expected_value: baseline.mean,
          deviation_percent: increase,
          description: `Traffic spike: ${metricName} is ${increase.toFixed(0)}% above baseline`,
        };
      }
    }

    return null;
  }

  /**
   * Detect SLA breaches
   */
  private async detectSLABreaches(): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Check latest KPIs against thresholds
    const { data, error } = await this.supabase
      .from('mv_kpis_daily')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    if (error || !data) return anomalies;

    for (const kpi of data) {
      // Error rate breach
      if (kpi.error_rate > 0.01) {
        // > 1%
        anomalies.push({
          timestamp: new Date(),
          service: kpi.service,
          metric_name: 'error_rate',
          anomaly_type: 'sla_breach',
          severity: kpi.error_rate > 0.05 ? 'critical' : 'high',
          current_value: kpi.error_rate,
          expected_value: 0.01,
          deviation_percent: ((kpi.error_rate - 0.01) / 0.01) * 100,
          description: `SLA breach: Error rate ${(kpi.error_rate * 100).toFixed(2)}% exceeds 1% threshold`,
        });
      }

      // Uptime breach
      if (kpi.uptime_percent < 99.9) {
        anomalies.push({
          timestamp: new Date(),
          service: kpi.service,
          metric_name: 'uptime',
          anomaly_type: 'sla_breach',
          severity: kpi.uptime_percent < 99.0 ? 'critical' : 'high',
          current_value: kpi.uptime_percent,
          expected_value: 99.9,
          deviation_percent: ((99.9 - kpi.uptime_percent) / 99.9) * 100,
          description: `SLA breach: Uptime ${kpi.uptime_percent.toFixed(2)}% below 99.9% threshold`,
        });
      }
    }

    return anomalies;
  }

  /**
   * Store detected anomalies
   */
  private async storeAnomalies(anomalies: Anomaly[]): Promise<void> {
    const { error } = await this.supabase.from('anomalies').insert(
      anomalies.map((a) => ({
        timestamp: a.timestamp.toISOString(),
        service: a.service,
        metric_name: a.metric_name,
        anomaly_type: a.anomaly_type,
        severity: a.severity,
        current_value: a.current_value,
        expected_value: a.expected_value,
        deviation_percent: a.deviation_percent,
        description: a.description,
        metadata: a.metadata || {},
        acknowledged: false,
      }))
    );

    if (error) {
      console.error('Failed to store anomalies:', error);
    }
  }
}

/**
 * Factory function
 */
export async function createAnomalyDetector(): Promise<AnomalyDetector | null> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, anomaly detection disabled');
    return null;
  }

  const detector = new AnomalyDetector(supabaseUrl, supabaseKey);
  await detector.initializeBaselines();
  await detector.loadThresholds();

  return detector;
}

export default AnomalyDetector;
