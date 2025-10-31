/**
 * Insights Report Service
 * Generates weekly sentiment and pain points summary from feedback
 */

import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

export interface InsightsSummary {
  period_start: string;
  period_end: string;
  total_feedback: number;
  by_category: Record<string, number>;
  by_priority: Record<string, number>;
  by_sentiment: Record<string, number>;
  top_pain_points: PainPoint[];
  trends: Trend[];
  recommendations: string[];
}

export interface PainPoint {
  category: string;
  count: number;
  severity: number;
  examples: string[];
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change_percent: number;
  description: string;
}

export class InsightsReportService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Generate weekly insights report
   */
  async generateWeeklyReport(): Promise<InsightsSummary> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    logger.info('Generating weekly insights report', {
      period_start: weekAgo.toISOString(),
      period_end: now.toISOString(),
    });

    // Fetch feedback for the week
    const { data: feedback, error } = await this.supabase
      .from('feedback')
      .select('*')
      .gte('created_at', weekAgo.toISOString())
      .lte('created_at', now.toISOString());

    if (error || !feedback) {
      logger.error('Failed to fetch feedback', { error });
      throw new Error('Failed to fetch feedback');
    }

    // Calculate distributions
    const byCategory = this.groupBy(feedback, 'category');
    const byPriority = this.groupBy(feedback, 'priority');
    const bySentiment = this.groupBy(feedback, 'sentiment');

    // Identify pain points
    const painPoints = this.identifyPainPoints(feedback);

    // Calculate trends
    const trends = await this.calculateTrends(weekAgo, now);

    // Generate recommendations
    const recommendations = this.generateRecommendations(painPoints, trends, bySentiment);

    const summary: InsightsSummary = {
      period_start: weekAgo.toISOString(),
      period_end: now.toISOString(),
      total_feedback: feedback.length,
      by_category: byCategory,
      by_priority: byPriority,
      by_sentiment: bySentiment,
      top_pain_points: painPoints,
      trends,
      recommendations,
    };

    // Store report
    await this.storeReport(summary);

    logger.info('Weekly insights report generated', {
      total_feedback: summary.total_feedback,
      pain_points: painPoints.length,
    });

    return summary;
  }

  /**
   * Group feedback by field
   */
  private groupBy(feedback: any[], field: string): Record<string, number> {
    const groups: Record<string, number> = {};

    feedback.forEach((item) => {
      const value = item[field] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
    });

    return groups;
  }

  /**
   * Identify top pain points
   */
  private identifyPainPoints(feedback: any[]): PainPoint[] {
    // Group by category and count
    const painPointMap: Record<string, { count: number; examples: string[] }> = {};

    feedback
      .filter((f) => f.sentiment === 'negative' || f.priority === 'high' || f.priority === 'critical')
      .forEach((item) => {
        const category = item.category || 'other';
        if (!painPointMap[category]) {
          painPointMap[category] = { count: 0, examples: [] };
        }
        painPointMap[category].count++;
        if (painPointMap[category].examples.length < 3) {
          painPointMap[category].examples.push(item.content.substring(0, 100));
        }
      });

    // Convert to array and calculate severity
    const painPoints: PainPoint[] = Object.entries(painPointMap)
      .map(([category, data]) => ({
        category,
        count: data.count,
        severity: this.calculateSeverity(data.count, feedback.length),
        examples: data.examples,
      }))
      .sort((a, b) => b.severity - a.severity)
      .slice(0, 10);

    return painPoints;
  }

  /**
   * Calculate severity score (0-100)
   */
  private calculateSeverity(count: number, total: number): number {
    const percentage = (count / total) * 100;
    return Math.min(Math.round(percentage * 10), 100);
  }

  /**
   * Calculate trends compared to previous period
   */
  private async calculateTrends(currentStart: Date, currentEnd: Date): Promise<Trend[]> {
    const trends: Trend[] = [];

    // Previous week
    const previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousEnd = new Date(currentStart.getTime());

    // Fetch previous week data
    const { data: previousFeedback } = await this.supabase
      .from('feedback')
      .select('*')
      .gte('created_at', previousStart.toISOString())
      .lte('created_at', previousEnd.toISOString());

    const { data: currentFeedback } = await this.supabase
      .from('feedback')
      .select('*')
      .gte('created_at', currentStart.toISOString())
      .lte('created_at', currentEnd.toISOString());

    if (!previousFeedback || !currentFeedback) {
      return trends;
    }

    // Volume trend
    const volumeChange =
      ((currentFeedback.length - previousFeedback.length) / (previousFeedback.length || 1)) * 100;
    trends.push({
      metric: 'feedback_volume',
      direction: volumeChange > 5 ? 'up' : volumeChange < -5 ? 'down' : 'stable',
      change_percent: volumeChange,
      description: `Feedback volume ${Math.abs(volumeChange).toFixed(0)}% ${volumeChange > 0 ? 'increase' : 'decrease'}`,
    });

    // Sentiment trend
    const currentNegative = currentFeedback.filter((f) => f.sentiment === 'negative').length;
    const previousNegative = previousFeedback.filter((f) => f.sentiment === 'negative').length;
    const sentimentChange =
      ((currentNegative - previousNegative) / (previousNegative || 1)) * 100;

    trends.push({
      metric: 'negative_sentiment',
      direction: sentimentChange > 5 ? 'up' : sentimentChange < -5 ? 'down' : 'stable',
      change_percent: sentimentChange,
      description: `Negative feedback ${Math.abs(sentimentChange).toFixed(0)}% ${sentimentChange > 0 ? 'increase' : 'decrease'}`,
    });

    return trends;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    painPoints: PainPoint[],
    trends: Trend[],
    sentiment: Record<string, number>
  ): string[] {
    const recommendations: string[] = [];

    // Pain point recommendations
    if (painPoints.length > 0) {
      const topPain = painPoints[0];
      recommendations.push(
        `Address top pain point in ${topPain.category} category (${topPain.count} reports, severity: ${topPain.severity}/100)`
      );
    }

    // Sentiment recommendations
    const negativePercent =
      (sentiment.negative || 0) / (sentiment.positive + sentiment.neutral + sentiment.negative || 1);
    if (negativePercent > 0.3) {
      recommendations.push(
        `High negative sentiment (${(negativePercent * 100).toFixed(0)}%) - investigate root causes`
      );
    }

    // Trend recommendations
    const negativeTrend = trends.find((t) => t.metric === 'negative_sentiment');
    if (negativeTrend && negativeTrend.direction === 'up') {
      recommendations.push('Negative sentiment is trending up - prioritize customer experience improvements');
    }

    // Volume recommendations
    const volumeTrend = trends.find((t) => t.metric === 'feedback_volume');
    if (volumeTrend && volumeTrend.direction === 'up' && volumeTrend.change_percent > 50) {
      recommendations.push('Significant increase in feedback volume - may indicate emerging issues');
    }

    return recommendations;
  }

  /**
   * Store report in database
   */
  private async storeReport(summary: InsightsSummary): Promise<void> {
    const { error } = await this.supabase.from('insights_reports').insert({
      period_start: summary.period_start,
      period_end: summary.period_end,
      total_feedback: summary.total_feedback,
      by_category: summary.by_category,
      by_priority: summary.by_priority,
      by_sentiment: summary.by_sentiment,
      top_pain_points: summary.top_pain_points,
      trends: summary.trends,
      recommendations: summary.recommendations,
      created_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to store insights report', { error });
    }
  }

  /**
   * Email report to stakeholders
   */
  async emailReport(summary: InsightsSummary, recipients: string[]): Promise<void> {
    const emailBody = this.formatEmailBody(summary);

    logger.info('Sending insights report email', { recipients, total_feedback: summary.total_feedback });

    // TODO: Integrate with email service (SendGrid, SES, etc.)
    logger.info('Email report:', { emailBody });
  }

  /**
   * Format email body
   */
  private formatEmailBody(summary: InsightsSummary): string {
    return `
Weekly Insights Report
Period: ${summary.period_start} to ${summary.period_end}

📊 Summary:
- Total Feedback: ${summary.total_feedback}
- By Category: ${JSON.stringify(summary.by_category, null, 2)}
- By Priority: ${JSON.stringify(summary.by_priority, null, 2)}
- By Sentiment: ${JSON.stringify(summary.by_sentiment, null, 2)}

🔥 Top Pain Points:
${summary.top_pain_points
  .map(
    (p, i) =>
      `${i + 1}. ${p.category} (${p.count} reports, severity: ${p.severity}/100)\n   Examples: ${p.examples.join('; ')}`
  )
  .join('\n')}

📈 Trends:
${summary.trends.map((t) => `- ${t.description} (${t.direction})`).join('\n')}

💡 Recommendations:
${summary.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
    `.trim();
  }
}

export default InsightsReportService;
