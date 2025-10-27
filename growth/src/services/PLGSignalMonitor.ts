import { createClient } from '@supabase/supabase-js';
import PostHog from 'posthog-node';
import { config } from '../config';
import logger from '../utils/logger';
import { GrowthSignal, ReferralCredit } from '../types';

export class PLGSignalMonitor {
  private supabase: any;
  private posthog: PostHog;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.posthog = new PostHog(config.external.posthogApiKey, {
      host: config.external.posthogHost
    });
  }

  // Track engagement signals
  async trackEngagementSignal(tenantId: string, userId: string, event: string, properties: any = {}) {
    try {
      const signal: GrowthSignal = {
        tenantId,
        signalType: 'engagement',
        metricName: event,
        metricValue: 1,
        timePeriod: 'daily',
        userSegment: properties.userSegment || 'default',
        metadata: {
          ...properties,
          timestamp: new Date().toISOString()
        }
      };

      await this.supabase
        .from('growth_signals')
        .insert(signal);

      // Also track in PostHog
      this.posthog.capture({
        distinctId: userId,
        event: event,
        properties: {
          tenantId,
          ...properties
        }
      });

      logger.info('Engagement signal tracked', { tenantId, userId, event });
    } catch (error) {
      logger.error('Error tracking engagement signal:', error);
    }
  }

  // Track retention signals
  async trackRetentionSignal(tenantId: string, userId: string, cohortId: string, retentionRate: number) {
    try {
      const signal: GrowthSignal = {
        tenantId,
        signalType: 'retention',
        metricName: 'retention_rate',
        metricValue: retentionRate,
        timePeriod: 'weekly',
        cohortId,
        userSegment: 'active',
        metadata: {
          userId,
          timestamp: new Date().toISOString()
        }
      };

      await this.supabase
        .from('growth_signals')
        .insert(signal);

      logger.info('Retention signal tracked', { tenantId, userId, cohortId, retentionRate });
    } catch (error) {
      logger.error('Error tracking retention signal:', error);
    }
  }

  // Track revenue signals
  async trackRevenueSignal(tenantId: string, userId: string, amount: number, currency: string = 'USD') {
    try {
      const signal: GrowthSignal = {
        tenantId,
        signalType: 'revenue',
        metricName: 'revenue',
        metricValue: amount,
        timePeriod: 'daily',
        userSegment: 'paying',
        metadata: {
          userId,
          currency,
          timestamp: new Date().toISOString()
        }
      };

      await this.supabase
        .from('growth_signals')
        .insert(signal);

      // Track in PostHog
      this.posthog.capture({
        distinctId: userId,
        event: 'revenue_generated',
        properties: {
          tenantId,
          amount,
          currency
        }
      });

      logger.info('Revenue signal tracked', { tenantId, userId, amount, currency });
    } catch (error) {
      logger.error('Error tracking revenue signal:', error);
    }
  }

  // Track feature adoption signals
  async trackFeatureAdoptionSignal(tenantId: string, userId: string, featureName: string, adoptionRate: number) {
    try {
      const signal: GrowthSignal = {
        tenantId,
        signalType: 'feature_adoption',
        metricName: featureName,
        metricValue: adoptionRate,
        timePeriod: 'weekly',
        userSegment: 'feature_users',
        metadata: {
          userId,
          featureName,
          timestamp: new Date().toISOString()
        }
      };

      await this.supabase
        .from('growth_signals')
        .insert(signal);

      logger.info('Feature adoption signal tracked', { tenantId, userId, featureName, adoptionRate });
    } catch (error) {
      logger.error('Error tracking feature adoption signal:', error);
    }
  }

  // Analyze growth potential
  async analyzeGrowthPotential(tenantId: string): Promise<{
    engagementScore: number;
    retentionScore: number;
    revenueScore: number;
    featureAdoptionScore: number;
    overallScore: number;
    recommendations: string[];
  }> {
    try {
      // Get recent signals
      const { data: signals } = await this.supabase
        .from('growth_signals')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (!signals || signals.length === 0) {
        return {
          engagementScore: 0,
          retentionScore: 0,
          revenueScore: 0,
          featureAdoptionScore: 0,
          overallScore: 0,
          recommendations: ['Start tracking user engagement and feature usage']
        };
      }

      // Calculate scores
      const engagementScore = this.calculateEngagementScore(signals);
      const retentionScore = this.calculateRetentionScore(signals);
      const revenueScore = this.calculateRevenueScore(signals);
      const featureAdoptionScore = this.calculateFeatureAdoptionScore(signals);

      const overallScore = (engagementScore + retentionScore + revenueScore + featureAdoptionScore) / 4;

      // Generate recommendations
      const recommendations = this.generateGrowthRecommendations({
        engagementScore,
        retentionScore,
        revenueScore,
        featureAdoptionScore,
        overallScore
      });

      return {
        engagementScore,
        retentionScore,
        revenueScore,
        featureAdoptionScore,
        overallScore,
        recommendations
      };
    } catch (error) {
      logger.error('Error analyzing growth potential:', error);
      throw error;
    }
  }

  private calculateEngagementScore(signals: any[]): number {
    const engagementSignals = signals.filter(s => s.signal_type === 'engagement');
    if (engagementSignals.length === 0) return 0;

    const totalEngagement = engagementSignals.reduce((sum, s) => sum + s.metric_value, 0);
    const days = Math.ceil((Date.now() - new Date(engagementSignals[0].created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(totalEngagement / days, 10) / 10; // Normalize to 0-1
  }

  private calculateRetentionScore(signals: any[]): number {
    const retentionSignals = signals.filter(s => s.signal_type === 'retention');
    if (retentionSignals.length === 0) return 0;

    const avgRetention = retentionSignals.reduce((sum, s) => sum + s.metric_value, 0) / retentionSignals.length;
    return Math.min(avgRetention, 1); // Already 0-1
  }

  private calculateRevenueScore(signals: any[]): number {
    const revenueSignals = signals.filter(s => s.signal_type === 'revenue');
    if (revenueSignals.length === 0) return 0;

    const totalRevenue = revenueSignals.reduce((sum, s) => sum + s.metric_value, 0);
    // Normalize based on expected revenue (adjust threshold as needed)
    return Math.min(totalRevenue / 1000, 1); // Assuming $1000 is good monthly revenue
  }

  private calculateFeatureAdoptionScore(signals: any[]): number {
    const featureSignals = signals.filter(s => s.signal_type === 'feature_adoption');
    if (featureSignals.length === 0) return 0;

    const avgAdoption = featureSignals.reduce((sum, s) => sum + s.metric_value, 0) / featureSignals.length;
    return Math.min(avgAdoption, 1); // Already 0-1
  }

  private generateGrowthRecommendations(scores: {
    engagementScore: number;
    retentionScore: number;
    revenueScore: number;
    featureAdoptionScore: number;
    overallScore: number;
  }): string[] {
    const recommendations: string[] = [];

    if (scores.engagementScore < 0.3) {
      recommendations.push('Improve user engagement through better onboarding and feature discovery');
    }

    if (scores.retentionScore < 0.5) {
      recommendations.push('Focus on user retention with personalized experiences and value delivery');
    }

    if (scores.revenueScore < 0.2) {
      recommendations.push('Implement revenue optimization strategies and pricing experiments');
    }

    if (scores.featureAdoptionScore < 0.4) {
      recommendations.push('Increase feature adoption through better UX and user education');
    }

    if (scores.overallScore > 0.8) {
      recommendations.push('Consider scaling up marketing and expanding to new markets');
    }

    return recommendations;
  }

  // Get growth metrics for dashboard
  async getGrowthMetrics(tenantId: string, timePeriod: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    try {
      const { data: signals } = await this.supabase
        .from('growth_signals')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('time_period', timePeriod)
        .order('created_at', { ascending: false });

      if (!signals) return null;

      const metrics = {
        totalSignals: signals.length,
        engagement: signals.filter(s => s.signal_type === 'engagement').length,
        retention: signals.filter(s => s.signal_type === 'retention').length,
        revenue: signals.filter(s => s.signal_type === 'revenue').length,
        featureAdoption: signals.filter(s => s.signal_type === 'feature_adoption').length,
        totalRevenue: signals
          .filter(s => s.signal_type === 'revenue')
          .reduce((sum, s) => sum + s.metric_value, 0),
        avgRetention: signals
          .filter(s => s.signal_type === 'retention')
          .reduce((sum, s) => sum + s.metric_value, 0) / 
          Math.max(signals.filter(s => s.signal_type === 'retention').length, 1)
      };

      return metrics;
    } catch (error) {
      logger.error('Error getting growth metrics:', error);
      throw error;
    }
  }
}

export default PLGSignalMonitor;
