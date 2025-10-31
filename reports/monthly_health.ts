/**
 * Monthly Health Report Generator
 * Merges KPIs, feedback, cost, and uptime into comprehensive health report
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface MonthlyHealthReport {
  period: {
    start: string;
    end: string;
    month: string;
    year: number;
  };
  summary: {
    overall_health_score: number;
    uptime_percent: number;
    total_requests: number;
    error_rate: number;
    avg_latency_ms: number;
  };
  kpis: {
    requests: number;
    errors: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    unique_users: number;
    active_tenants: number;
  };
  feedback: {
    total_feedback: number;
    positive_percent: number;
    negative_percent: number;
    top_pain_points: string[];
    top_features_requested: string[];
  };
  costs: {
    total_cost_usd: number;
    cost_per_request_usd: number;
    cost_breakdown: Record<string, number>;
    month_over_month_change_percent: number;
  };
  incidents: {
    total_incidents: number;
    by_severity: Record<string, number>;
    mean_time_to_resolve_minutes: number;
    top_root_causes: string[];
  };
  capacity: {
    current_utilization_percent: number;
    forecast_90d: Record<string, number>;
    scaling_recommendations: string[];
  };
  recommendations: string[];
}

export class MonthlyHealthReportGenerator {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate monthly health report
   */
  async generateReport(month?: string, year?: number): Promise<MonthlyHealthReport> {
    // Default to last month
    const now = new Date();
    const targetMonth = month || (now.getMonth()).toString().padStart(2, '0');
    const targetYear = year || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

    const periodStart = new Date(targetYear, parseInt(targetMonth) - 1, 1);
    const periodEnd = new Date(targetYear, parseInt(targetMonth), 0, 23, 59, 59);

    console.log(`📊 Generating monthly health report for ${targetMonth}/${targetYear}...`);

    // Gather data from all sources
    const [kpis, feedback, costs, incidents, capacity] = await Promise.all([
      this.gatherKPIs(periodStart, periodEnd),
      this.gatherFeedback(periodStart, periodEnd),
      this.gatherCosts(periodStart, periodEnd),
      this.gatherIncidents(periodStart, periodEnd),
      this.gatherCapacity(),
    ]);

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(kpis, feedback, incidents);

    // Generate recommendations
    const recommendations = this.generateRecommendations(kpis, feedback, costs, incidents, capacity);

    const report: MonthlyHealthReport = {
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        month: targetMonth,
        year: targetYear,
      },
      summary: {
        overall_health_score: healthScore,
        uptime_percent: kpis.uptime_percent,
        total_requests: kpis.total_requests,
        error_rate: kpis.error_rate,
        avg_latency_ms: kpis.avg_latency_ms,
      },
      kpis: {
        requests: kpis.total_requests,
        errors: kpis.total_errors,
        p95_latency_ms: kpis.p95_latency_ms,
        p99_latency_ms: kpis.p99_latency_ms,
        unique_users: kpis.unique_users,
        active_tenants: kpis.active_tenants,
      },
      feedback,
      costs,
      incidents,
      capacity,
      recommendations,
    };

    // Store report
    await this.storeReport(report);

    console.log(`✅ Monthly health report generated (health score: ${healthScore}/100)`);

    return report;
  }

  /**
   * Gather KPI data
   */
  private async gatherKPIs(start: Date, end: Date): Promise<any> {
    const { data } = await this.supabase
      .from('mv_kpis_daily')
      .select('*')
      .gte('date', start.toISOString().split('T')[0])
      .lte('date', end.toISOString().split('T')[0]);

    if (!data || data.length === 0) {
      return this.getDefaultKPIs();
    }

    // Aggregate metrics
    const totalRequests = data.reduce((sum, d) => sum + d.requests, 0);
    const totalErrors = data.reduce((sum, d) => sum + d.errors, 0);
    const avgLatency = data.reduce((sum, d) => sum + d.avg_latency_ms, 0) / data.length;
    const avgP95 = data.reduce((sum, d) => sum + d.p95_latency_ms, 0) / data.length;
    const avgP99 = data.reduce((sum, d) => sum + d.p99_latency_ms, 0) / data.length;
    const avgUptime = data.reduce((sum, d) => sum + d.uptime_percent, 0) / data.length;

    return {
      total_requests: totalRequests,
      total_errors: totalErrors,
      error_rate: totalErrors / (totalRequests || 1),
      avg_latency_ms: avgLatency,
      p95_latency_ms: avgP95,
      p99_latency_ms: avgP99,
      uptime_percent: avgUptime,
      unique_users: 0, // TODO: Calculate from user sessions
      active_tenants: 0, // TODO: Calculate from tenant activity
    };
  }

  /**
   * Gather feedback data
   */
  private async gatherFeedback(start: Date, end: Date): Promise<any> {
    const { data } = await this.supabase
      .from('feedback')
      .select('*')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (!data || data.length === 0) {
      return {
        total_feedback: 0,
        positive_percent: 0,
        negative_percent: 0,
        top_pain_points: [],
        top_features_requested: [],
      };
    }

    const positiveCount = data.filter((f) => f.sentiment === 'positive').length;
    const negativeCount = data.filter((f) => f.sentiment === 'negative').length;

    // Extract top pain points
    const painPoints = data
      .filter((f) => f.category === 'bug' || f.sentiment === 'negative')
      .map((f) => f.content.substring(0, 100));

    // Extract feature requests
    const features = data
      .filter((f) => f.category === 'feature')
      .map((f) => f.content.substring(0, 100));

    return {
      total_feedback: data.length,
      positive_percent: (positiveCount / data.length) * 100,
      negative_percent: (negativeCount / data.length) * 100,
      top_pain_points: painPoints.slice(0, 5),
      top_features_requested: features.slice(0, 5),
    };
  }

  /**
   * Gather cost data
   */
  private async gatherCosts(start: Date, end: Date): Promise<any> {
    const { data } = await this.supabase
      .from('cost_analyses')
      .select('*')
      .gte('timestamp', start.toISOString())
      .lte('timestamp', end.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    if (!data || data.length === 0) {
      return {
        total_cost_usd: 0,
        cost_per_request_usd: 0,
        cost_breakdown: {},
        month_over_month_change_percent: 0,
      };
    }

    const latestCost = data[0];

    return {
      total_cost_usd: latestCost.current_monthly_cost_usd,
      cost_per_request_usd: 0, // TODO: Calculate
      cost_breakdown: {
        database: latestCost.current_monthly_cost_usd * 0.4,
        compute: latestCost.current_monthly_cost_usd * 0.3,
        storage: latestCost.current_monthly_cost_usd * 0.2,
        network: latestCost.current_monthly_cost_usd * 0.1,
      },
      month_over_month_change_percent: 0, // TODO: Calculate from previous month
    };
  }

  /**
   * Gather incident data
   */
  private async gatherIncidents(start: Date, end: Date): Promise<any> {
    const { data } = await this.supabase
      .from('incidents')
      .select('*')
      .gte('started_at', start.toISOString())
      .lte('started_at', end.toISOString());

    if (!data || data.length === 0) {
      return {
        total_incidents: 0,
        by_severity: {},
        mean_time_to_resolve_minutes: 0,
        top_root_causes: [],
      };
    }

    // Group by severity
    const bySeverity: Record<string, number> = {};
    data.forEach((inc) => {
      bySeverity[inc.severity] = (bySeverity[inc.severity] || 0) + 1;
    });

    // Calculate MTTR
    const resolvedIncidents = data.filter((inc) => inc.resolved_at);
    const totalResolutionTime = resolvedIncidents.reduce((sum, inc) => {
      const duration =
        new Date(inc.resolved_at).getTime() - new Date(inc.started_at).getTime();
      return sum + duration;
    }, 0);
    const mttr = resolvedIncidents.length > 0 ? totalResolutionTime / resolvedIncidents.length / 60000 : 0;

    // Extract root causes
    const rootCauses = data.map((inc) => inc.root_cause);

    return {
      total_incidents: data.length,
      by_severity: bySeverity,
      mean_time_to_resolve_minutes: mttr,
      top_root_causes: rootCauses.slice(0, 5),
    };
  }

  /**
   * Gather capacity data
   */
  private async gatherCapacity(): Promise<any> {
    const { data } = await this.supabase
      .from('capacity_forecasts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (!data || data.length === 0) {
      return {
        current_utilization_percent: 0,
        forecast_90d: {},
        scaling_recommendations: [],
      };
    }

    const forecast90d: Record<string, number> = {};
    const recommendations: string[] = [];

    data.forEach((f) => {
      forecast90d[f.metric] = f.forecast_90d;

      if (f.breach_probability_90d > 0.5) {
        recommendations.push(
          `Scale ${f.metric} - ${(f.breach_probability_90d * 100).toFixed(0)}% breach risk`
        );
      }
    });

    return {
      current_utilization_percent: 65, // TODO: Calculate actual
      forecast_90d,
      scaling_recommendations: recommendations.slice(0, 3),
    };
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateHealthScore(kpis: any, feedback: any, incidents: any): number {
    let score = 100;

    // Deduct for uptime < 99.9%
    if (kpis.uptime_percent < 99.9) {
      score -= (99.9 - kpis.uptime_percent) * 10;
    }

    // Deduct for high error rate
    if (kpis.error_rate > 0.01) {
      score -= (kpis.error_rate - 0.01) * 1000;
    }

    // Deduct for negative feedback
    if (feedback.negative_percent > 20) {
      score -= (feedback.negative_percent - 20) * 0.5;
    }

    // Deduct for critical incidents
    const criticalIncidents = incidents.by_severity?.critical || 0;
    score -= criticalIncidents * 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    kpis: any,
    feedback: any,
    costs: any,
    incidents: any,
    capacity: any
  ): string[] {
    const recommendations: string[] = [];

    if (kpis.uptime_percent < 99.9) {
      recommendations.push(
        `Improve uptime from ${kpis.uptime_percent.toFixed(2)}% to 99.9% SLA target`
      );
    }

    if (kpis.error_rate > 0.01) {
      recommendations.push(`Reduce error rate from ${(kpis.error_rate * 100).toFixed(2)}% to <1%`);
    }

    if (feedback.negative_percent > 20) {
      recommendations.push(
        `Address customer satisfaction - ${feedback.negative_percent.toFixed(0)}% negative feedback`
      );
    }

    if (costs.month_over_month_change_percent > 20) {
      recommendations.push(`Investigate cost increase of ${costs.month_over_month_change_percent.toFixed(0)}%`);
    }

    if (incidents.total_incidents > 5) {
      recommendations.push(`Reduce incident frequency - ${incidents.total_incidents} incidents this month`);
    }

    // Add capacity recommendations
    recommendations.push(...capacity.scaling_recommendations);

    return recommendations;
  }

  /**
   * Store report
   */
  private async storeReport(report: MonthlyHealthReport): Promise<void> {
    const { error } = await this.supabase.from('monthly_health_reports').insert({
      period_start: report.period.start,
      period_end: report.period.end,
      month: report.period.month,
      year: report.period.year,
      overall_health_score: report.summary.overall_health_score,
      report_data: report,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to store monthly health report:', error);
    }
  }

  /**
   * Get default KPIs when no data available
   */
  private getDefaultKPIs(): any {
    return {
      total_requests: 0,
      total_errors: 0,
      error_rate: 0,
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      p99_latency_ms: 0,
      uptime_percent: 100,
      unique_users: 0,
      active_tenants: 0,
    };
  }
}

/**
 * Factory function
 */
export function createMonthlyHealthReportGenerator(): MonthlyHealthReportGenerator | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, monthly health report generator disabled');
    return null;
  }

  return new MonthlyHealthReportGenerator(supabaseUrl, supabaseKey);
}

export default MonthlyHealthReportGenerator;
