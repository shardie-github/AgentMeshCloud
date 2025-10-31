/**
 * Capacity Forecasting Engine
 * Predicts resource thresholds 30/90 days ahead using time series analysis
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ForecastResult {
  metric: string;
  current_value: number;
  forecast_30d: number;
  forecast_90d: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  alert_threshold: number;
  breach_probability_30d: number;
  breach_probability_90d: number;
  recommended_actions: string[];
}

export interface CapacityAlert {
  metric: string;
  alert_type: 'threshold_breach' | 'rapid_growth' | 'capacity_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  forecast: ForecastResult;
}

export class CapacityForecaster {
  private supabase: SupabaseClient;

  // Forecasting parameters
  private readonly ALPHA = 0.3; // Exponential smoothing parameter
  private readonly BETA = 0.1; // Trend smoothing parameter
  private readonly CAPACITY_WARNING_THRESHOLD = 0.8; // 80% of threshold
  private readonly CRITICAL_THRESHOLD = 0.95; // 95% of threshold

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate forecasts for all critical metrics
   */
  async generateForecasts(): Promise<ForecastResult[]> {
    console.log('📈 Generating capacity forecasts...');

    const metrics = [
      'request_rate',
      'error_rate',
      'p95_latency_ms',
      'db_connections',
      'db_size_gb',
      'memory_usage_percent',
      'cpu_usage_percent',
    ];

    const forecasts: ForecastResult[] = [];

    for (const metric of metrics) {
      try {
        const forecast = await this.forecastMetric(metric);
        forecasts.push(forecast);
      } catch (error) {
        console.error(`Failed to forecast ${metric}:`, error);
      }
    }

    // Store forecasts
    await this.storeForecasts(forecasts);

    // Generate alerts
    const alerts = this.generateAlerts(forecasts);
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
    }

    console.log(`✅ Generated ${forecasts.length} forecasts, ${alerts.length} alerts`);

    return forecasts;
  }

  /**
   * Forecast a single metric using exponential smoothing
   */
  private async forecastMetric(metricName: string): Promise<ForecastResult> {
    // Fetch historical data (90 days)
    const { data, error } = await this.supabase
      .from('telemetry_metrics')
      .select('timestamp, value')
      .eq('metric_name', metricName)
      .gte('timestamp', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: true });

    if (error || !data || data.length === 0) {
      throw new Error(`No data for metric: ${metricName}`);
    }

    // Aggregate daily averages
    const dailyValues = this.aggregateDaily(data);

    // Apply exponential smoothing
    const { level, trend } = this.exponentialSmoothing(dailyValues);

    // Forecast 30 and 90 days ahead
    const forecast30d = level + 30 * trend;
    const forecast90d = level + 90 * trend;

    // Calculate confidence intervals (simplified)
    const stddev = this.calculateStdDev(dailyValues);
    const confidenceLow = forecast90d - 1.96 * stddev;
    const confidenceHigh = forecast90d + 1.96 * stddev;

    // Get threshold for this metric
    const threshold = await this.getMetricThreshold(metricName);

    // Calculate breach probability
    const breachProb30d = this.calculateBreachProbability(forecast30d, threshold, stddev);
    const breachProb90d = this.calculateBreachProbability(forecast90d, threshold, stddev);

    // Determine trend
    const trendDirection: 'increasing' | 'decreasing' | 'stable' =
      trend > 0.1 ? 'increasing' : trend < -0.1 ? 'decreasing' : 'stable';

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      metricName,
      dailyValues[dailyValues.length - 1],
      forecast30d,
      forecast90d,
      threshold,
      breachProb90d
    );

    return {
      metric: metricName,
      current_value: dailyValues[dailyValues.length - 1],
      forecast_30d: forecast30d,
      forecast_90d: forecast90d,
      confidence_interval_low: Math.max(0, confidenceLow),
      confidence_interval_high: confidenceHigh,
      trend: trendDirection,
      alert_threshold: threshold,
      breach_probability_30d: breachProb30d,
      breach_probability_90d: breachProb90d,
      recommended_actions: recommendations,
    };
  }

  /**
   * Aggregate data into daily averages
   */
  private aggregateDaily(data: any[]): number[] {
    const dailyMap = new Map<string, number[]>();

    data.forEach((point) => {
      const date = point.timestamp.split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, []);
      }
      dailyMap.get(date)!.push(point.value);
    });

    // Calculate daily averages
    return Array.from(dailyMap.values()).map(
      (values) => values.reduce((sum, v) => sum + v, 0) / values.length
    );
  }

  /**
   * Double exponential smoothing (Holt's method)
   */
  private exponentialSmoothing(values: number[]): { level: number; trend: number } {
    if (values.length < 2) {
      return { level: values[0] || 0, trend: 0 };
    }

    let level = values[0];
    let trend = values[1] - values[0];

    for (let i = 1; i < values.length; i++) {
      const prevLevel = level;
      level = this.ALPHA * values[i] + (1 - this.ALPHA) * (level + trend);
      trend = this.BETA * (level - prevLevel) + (1 - this.BETA) * trend;
    }

    return { level, trend };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate probability of breaching threshold
   */
  private calculateBreachProbability(
    forecast: number,
    threshold: number,
    stddev: number
  ): number {
    if (stddev === 0) return forecast > threshold ? 1.0 : 0.0;

    // Z-score
    const z = (threshold - forecast) / stddev;

    // Approximate cumulative distribution function
    const probability = 1 - this.normalCDF(z);

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Approximate normal CDF
   */
  private normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const p =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  /**
   * Get threshold for metric
   */
  private async getMetricThreshold(metricName: string): Promise<number> {
    const { data } = await this.supabase
      .from('metric_thresholds')
      .select('threshold')
      .eq('metric_name', metricName)
      .single();

    return data?.threshold || this.getDefaultThreshold(metricName);
  }

  /**
   * Get default threshold if not configured
   */
  private getDefaultThreshold(metricName: string): number {
    const defaults: Record<string, number> = {
      request_rate: 10000,
      error_rate: 0.01,
      p95_latency_ms: 500,
      db_connections: 80,
      db_size_gb: 100,
      memory_usage_percent: 85,
      cpu_usage_percent: 85,
    };

    return defaults[metricName] || 100;
  }

  /**
   * Generate recommendations based on forecast
   */
  private generateRecommendations(
    metric: string,
    current: number,
    forecast30d: number,
    forecast90d: number,
    threshold: number,
    breachProb: number
  ): string[] {
    const recommendations: string[] = [];

    if (breachProb > 0.7) {
      recommendations.push(`HIGH RISK: ${(breachProb * 100).toFixed(0)}% probability of breaching threshold in 90 days`);
    }

    if (forecast90d > threshold) {
      const exceedPercent = ((forecast90d - threshold) / threshold) * 100;
      recommendations.push(
        `Projected to exceed threshold by ${exceedPercent.toFixed(0)}% in 90 days`
      );
    }

    // Metric-specific recommendations
    if (metric === 'db_connections' && forecast30d > threshold * 0.8) {
      recommendations.push('Consider implementing connection pooling or scaling database');
    }

    if (metric === 'db_size_gb' && forecast90d > threshold) {
      recommendations.push('Implement data archival strategy or upgrade storage tier');
    }

    if (metric === 'error_rate' && forecast30d > current * 1.5) {
      recommendations.push('Error rate trending up - investigate root causes');
    }

    if (metric === 'p95_latency_ms' && forecast30d > threshold) {
      recommendations.push('Performance degradation predicted - optimize queries and add caching');
    }

    if (recommendations.length === 0) {
      recommendations.push('No immediate action required - metrics within acceptable range');
    }

    return recommendations;
  }

  /**
   * Generate alerts from forecasts
   */
  private generateAlerts(forecasts: ForecastResult[]): CapacityAlert[] {
    const alerts: CapacityAlert[] = [];

    forecasts.forEach((forecast) => {
      // Critical: Already at or above threshold
      if (forecast.current_value >= forecast.alert_threshold * this.CRITICAL_THRESHOLD) {
        alerts.push({
          metric: forecast.metric,
          alert_type: 'threshold_breach',
          severity: 'critical',
          message: `${forecast.metric} is at ${((forecast.current_value / forecast.alert_threshold) * 100).toFixed(0)}% of threshold`,
          forecast,
        });
      }
      // High: Will breach in 30 days
      else if (forecast.breach_probability_30d > 0.5) {
        alerts.push({
          metric: forecast.metric,
          alert_type: 'capacity_warning',
          severity: 'high',
          message: `${forecast.metric} has ${(forecast.breach_probability_30d * 100).toFixed(0)}% chance of breaching threshold in 30 days`,
          forecast,
        });
      }
      // Medium: Rapid growth
      else if (forecast.trend === 'increasing' && forecast.forecast_30d > forecast.current_value * 1.5) {
        alerts.push({
          metric: forecast.metric,
          alert_type: 'rapid_growth',
          severity: 'medium',
          message: `${forecast.metric} growing rapidly - projected ${(((forecast.forecast_30d - forecast.current_value) / forecast.current_value) * 100).toFixed(0)}% increase in 30 days`,
          forecast,
        });
      }
    });

    return alerts;
  }

  /**
   * Store forecasts in database
   */
  private async storeForecasts(forecasts: ForecastResult[]): Promise<void> {
    const { error } = await this.supabase.from('capacity_forecasts').insert(
      forecasts.map((f) => ({
        timestamp: new Date().toISOString(),
        metric: f.metric,
        current_value: f.current_value,
        forecast_30d: f.forecast_30d,
        forecast_90d: f.forecast_90d,
        confidence_interval_low: f.confidence_interval_low,
        confidence_interval_high: f.confidence_interval_high,
        trend: f.trend,
        alert_threshold: f.alert_threshold,
        breach_probability_30d: f.breach_probability_30d,
        breach_probability_90d: f.breach_probability_90d,
        recommended_actions: f.recommended_actions,
      }))
    );

    if (error) {
      console.error('Failed to store forecasts:', error);
    }
  }

  /**
   * Store alerts
   */
  private async storeAlerts(alerts: CapacityAlert[]): Promise<void> {
    const { error } = await this.supabase.from('capacity_alerts').insert(
      alerts.map((a) => ({
        timestamp: new Date().toISOString(),
        metric: a.metric,
        alert_type: a.alert_type,
        severity: a.severity,
        message: a.message,
        forecast_data: a.forecast,
        acknowledged: false,
      }))
    );

    if (error) {
      console.error('Failed to store alerts:', error);
    }
  }

  /**
   * Update alert thresholds dynamically
   */
  async updateAlertThresholds(): Promise<void> {
    console.log('🔄 Updating alert thresholds based on forecasts...');

    const { data: forecasts } = await this.supabase
      .from('capacity_forecasts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);

    if (!forecasts) return;

    // Group by metric
    const byMetric = new Map<string, any[]>();
    forecasts.forEach((f) => {
      if (!byMetric.has(f.metric)) {
        byMetric.set(f.metric, []);
      }
      byMetric.get(f.metric)!.push(f);
    });

    // Update thresholds
    for (const [metric, forecasts] of byMetric) {
      const latestForecast = forecasts[0];

      // If consistently breaching, recommend increasing threshold
      const breachingCount = forecasts.filter(
        (f) => f.current_value > f.alert_threshold * 0.9
      ).length;

      if (breachingCount > forecasts.length * 0.7) {
        const newThreshold = latestForecast.alert_threshold * 1.2;
        console.log(
          `Recommending threshold increase for ${metric}: ${latestForecast.alert_threshold} -> ${newThreshold}`
        );
      }
    }

    console.log('✅ Alert threshold update complete');
  }
}

/**
 * Factory function
 */
export function createCapacityForecaster(): CapacityForecaster | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, capacity forecasting disabled');
    return null;
  }

  return new CapacityForecaster(supabaseUrl, supabaseKey);
}

export default CapacityForecaster;
