import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from '../config';
import logger from '../utils/logger';
import { CognitiveImpactScorecard } from '../types';

export class CognitiveImpactScorecardService {
  private supabase: any;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Generate monthly cognitive impact scorecard
  async generateMonthlyScorecard(tenantId: string, month: number, year: number): Promise<CognitiveImpactScorecard> {
    try {
      logger.info('Generating monthly cognitive impact scorecard', { tenantId, month, year });

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      // Gather data from various sources
      const [
        customerFeedbackData,
        aiModelData,
        featureAdoptionData,
        infrastructureData,
        costData,
        retentionData
      ] = await Promise.all([
        this.getCustomerFeedbackData(tenantId, startDate, endDate),
        this.getAIModelData(tenantId, startDate, endDate),
        this.getFeatureAdoptionData(tenantId, startDate, endDate),
        this.getInfrastructureData(tenantId, startDate, endDate),
        this.getCostData(tenantId, startDate, endDate),
        this.getRetentionData(tenantId, startDate, endDate)
      ]);

      // Calculate overall cognitive impact score
      const overallScore = this.calculateOverallScore({
        customerFeedback: customerFeedbackData,
        aiModel: aiModelData,
        featureAdoption: featureAdoptionData,
        infrastructure: infrastructureData,
        cost: costData,
        retention: retentionData
      });

      // Generate AI insights
      const insights = await this.generateScorecardInsights({
        customerFeedback: customerFeedbackData,
        aiModel: aiModelData,
        featureAdoption: featureAdoptionData,
        infrastructure: infrastructureData,
        cost: costData,
        retention: retentionData
      });

      const scorecard: CognitiveImpactScorecard = {
        id: this.generateScorecardId(),
        tenantId,
        period: `${year}-${month.toString().padStart(2, '0')}`,
        periodStart: startDate,
        periodEnd: endDate,
        overallScore,
        customerFeedbackSatisfaction: customerFeedbackData,
        aiModelAccuracy: aiModelData,
        featureAdoptionGrowth: featureAdoptionData,
        infrastructureEfficiency: infrastructureData,
        costReduction: costData,
        retentionByCohort: retentionData,
        insights,
        recommendations: await this.generateRecommendations(insights),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save scorecard
      await this.saveScorecard(scorecard);

      logger.info('Monthly cognitive impact scorecard generated', {
        tenantId,
        scorecardId: scorecard.id,
        overallScore
      });

      return scorecard;
    } catch (error) {
      logger.error('Error generating monthly scorecard:', error);
      throw error;
    }
  }

  // Get customer feedback satisfaction data
  private async getCustomerFeedbackData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    satisfactionScore: number;
    previousMonthScore: number;
    changePercentage: number;
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    averageResponseTime: number;
    topIssues: Array<{ issue: string; count: number }>;
  }> {
    try {
      const { data: feedback } = await this.supabase
        .from('product_feedback')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!feedback || feedback.length === 0) {
        return {
          satisfactionScore: 0,
          previousMonthScore: 0,
          changePercentage: 0,
          totalFeedback: 0,
          positiveFeedback: 0,
          negativeFeedback: 0,
          averageResponseTime: 0,
          topIssues: []
        };
      }

      const sentimentScores = feedback
        .filter(f => f.sentiment_score !== null)
        .map(f => f.sentiment_score);
      
      const satisfactionScore = sentimentScores.length > 0 
        ? (sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length + 1) * 50
        : 0;

      const positiveFeedback = feedback.filter(f => f.sentiment_score > 0.3).length;
      const negativeFeedback = feedback.filter(f => f.sentiment_score < -0.3).length;

      // Get previous month data for comparison
      const prevStartDate = new Date(startDate);
      prevStartDate.setMonth(prevStartDate.getMonth() - 1);
      const prevEndDate = new Date(endDate);
      prevEndDate.setMonth(prevEndDate.getMonth() - 1);

      const { data: prevFeedback } = await this.supabase
        .from('product_feedback')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', prevStartDate.toISOString())
        .lte('created_at', prevEndDate.toISOString());

      const prevSatisfactionScore = prevFeedback && prevFeedback.length > 0
        ? (prevFeedback
            .filter(f => f.sentiment_score !== null)
            .map(f => f.sentiment_score)
            .reduce((sum, score) => sum + score, 0) / prevFeedback.length + 1) * 50
        : 0;

      const changePercentage = prevSatisfactionScore > 0 
        ? ((satisfactionScore - prevSatisfactionScore) / prevSatisfactionScore) * 100
        : 0;

      // Extract top issues
      const issueCounts: Record<string, number> = {};
      feedback.forEach(f => {
        if (f.themes) {
          f.themes.forEach((theme: string) => {
            issueCounts[theme] = (issueCounts[theme] || 0) + 1;
          });
        }
      });

      const topIssues = Object.entries(issueCounts)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        satisfactionScore: Math.round(satisfactionScore * 100) / 100,
        previousMonthScore: Math.round(prevSatisfactionScore * 100) / 100,
        changePercentage: Math.round(changePercentage * 100) / 100,
        totalFeedback: feedback.length,
        positiveFeedback,
        negativeFeedback,
        averageResponseTime: 24, // Mock data
        topIssues
      };
    } catch (error) {
      logger.error('Error getting customer feedback data:', error);
      return {
        satisfactionScore: 0,
        previousMonthScore: 0,
        changePercentage: 0,
        totalFeedback: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        averageResponseTime: 0,
        topIssues: []
      };
    }
  }

  // Get AI model accuracy data
  private async getAIModelData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    accuracyScore: number;
    previousMonthAccuracy: number;
    changePercentage: number;
    totalPredictions: number;
    correctPredictions: number;
    modelVersion: string;
    trainingDataSize: number;
    performanceMetrics: Record<string, number>;
  }> {
    try {
      // Mock AI model data - in real implementation, this would come from model monitoring
      const accuracyScore = 85 + Math.random() * 10; // 85-95%
      const previousMonthAccuracy = accuracyScore - (Math.random() * 5 - 2.5); // ±2.5% change
      const changePercentage = ((accuracyScore - previousMonthAccuracy) / previousMonthAccuracy) * 100;

      return {
        accuracyScore: Math.round(accuracyScore * 100) / 100,
        previousMonthAccuracy: Math.round(previousMonthAccuracy * 100) / 100,
        changePercentage: Math.round(changePercentage * 100) / 100,
        totalPredictions: Math.floor(Math.random() * 10000) + 5000,
        correctPredictions: Math.floor(accuracyScore / 100 * (Math.random() * 10000 + 5000)),
        modelVersion: 'v2.1.3',
        trainingDataSize: Math.floor(Math.random() * 1000000) + 500000,
        performanceMetrics: {
          precision: 0.87 + Math.random() * 0.1,
          recall: 0.82 + Math.random() * 0.1,
          f1Score: 0.84 + Math.random() * 0.1,
          latency: 150 + Math.random() * 100
        }
      };
    } catch (error) {
      logger.error('Error getting AI model data:', error);
      return {
        accuracyScore: 0,
        previousMonthAccuracy: 0,
        changePercentage: 0,
        totalPredictions: 0,
        correctPredictions: 0,
        modelVersion: 'unknown',
        trainingDataSize: 0,
        performanceMetrics: {}
      };
    }
  }

  // Get feature adoption growth data
  private async getFeatureAdoptionData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    adoptionRate: number;
    previousMonthRate: number;
    changePercentage: number;
    totalUsers: number;
    activeUsers: number;
    newFeatures: number;
    featureUsageStats: Array<{ feature: string; users: number; usage: number }>;
  }> {
    try {
      // Mock feature adoption data
      const adoptionRate = 30 + Math.random() * 20; // 30-50%
      const previousMonthRate = adoptionRate - (Math.random() * 10 - 5); // ±5% change
      const changePercentage = ((adoptionRate - previousMonthRate) / previousMonthRate) * 100;

      const totalUsers = Math.floor(Math.random() * 1000) + 500;
      const activeUsers = Math.floor(totalUsers * (adoptionRate / 100));

      return {
        adoptionRate: Math.round(adoptionRate * 100) / 100,
        previousMonthRate: Math.round(previousMonthRate * 100) / 100,
        changePercentage: Math.round(changePercentage * 100) / 100,
        totalUsers,
        activeUsers,
        newFeatures: Math.floor(Math.random() * 5) + 2,
        featureUsageStats: [
          { feature: 'AI Chat', users: Math.floor(activeUsers * 0.8), usage: 85 + Math.random() * 10 },
          { feature: 'Analytics', users: Math.floor(activeUsers * 0.6), usage: 70 + Math.random() * 15 },
          { feature: 'Automation', users: Math.floor(activeUsers * 0.4), usage: 60 + Math.random() * 20 },
          { feature: 'Integrations', users: Math.floor(activeUsers * 0.3), usage: 50 + Math.random() * 25 }
        ]
      };
    } catch (error) {
      logger.error('Error getting feature adoption data:', error);
      return {
        adoptionRate: 0,
        previousMonthRate: 0,
        changePercentage: 0,
        totalUsers: 0,
        activeUsers: 0,
        newFeatures: 0,
        featureUsageStats: []
      };
    }
  }

  // Get infrastructure efficiency data
  private async getInfrastructureData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    efficiencyScore: number;
    previousMonthScore: number;
    changePercentage: number;
    uptime: number;
    responseTime: number;
    throughput: number;
    resourceUtilization: Record<string, number>;
    carbonFootprint: number;
  }> {
    try {
      // Mock infrastructure data
      const efficiencyScore = 80 + Math.random() * 15; // 80-95%
      const previousMonthScore = efficiencyScore - (Math.random() * 8 - 4); // ±4% change
      const changePercentage = ((efficiencyScore - previousMonthScore) / previousMonthScore) * 100;

      return {
        efficiencyScore: Math.round(efficiencyScore * 100) / 100,
        previousMonthScore: Math.round(previousMonthScore * 100) / 100,
        changePercentage: Math.round(changePercentage * 100) / 100,
        uptime: 99.5 + Math.random() * 0.4, // 99.5-99.9%
        responseTime: 100 + Math.random() * 50, // 100-150ms
        throughput: 1000 + Math.random() * 500, // 1000-1500 req/s
        resourceUtilization: {
          cpu: 60 + Math.random() * 20,
          memory: 70 + Math.random() * 15,
          storage: 45 + Math.random() * 25,
          network: 30 + Math.random() * 20
        },
        carbonFootprint: 50 + Math.random() * 20 // kg CO2
      };
    } catch (error) {
      logger.error('Error getting infrastructure data:', error);
      return {
        efficiencyScore: 0,
        previousMonthScore: 0,
        changePercentage: 0,
        uptime: 0,
        responseTime: 0,
        throughput: 0,
        resourceUtilization: {},
        carbonFootprint: 0
      };
    }
  }

  // Get cost reduction data
  private async getCostData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalCost: number;
    previousMonthCost: number;
    costReduction: number;
    costReductionPercentage: number;
    costPerUser: number;
    costPerTransaction: number;
    optimizationSavings: number;
  }> {
    try {
      // Mock cost data
      const totalCost = 10000 + Math.random() * 5000; // $10k-15k
      const previousMonthCost = totalCost + (Math.random() * 2000 - 1000); // ±$1k change
      const costReduction = Math.max(0, previousMonthCost - totalCost);
      const costReductionPercentage = previousMonthCost > 0 ? (costReduction / previousMonthCost) * 100 : 0;

      return {
        totalCost: Math.round(totalCost * 100) / 100,
        previousMonthCost: Math.round(previousMonthCost * 100) / 100,
        costReduction: Math.round(costReduction * 100) / 100,
        costReductionPercentage: Math.round(costReductionPercentage * 100) / 100,
        costPerUser: Math.round((totalCost / 1000) * 100) / 100, // Mock user count
        costPerTransaction: Math.round((totalCost / 10000) * 100) / 100, // Mock transaction count
        optimizationSavings: Math.round(costReduction * 0.3 * 100) / 100 // 30% of reduction from optimization
      };
    } catch (error) {
      logger.error('Error getting cost data:', error);
      return {
        totalCost: 0,
        previousMonthCost: 0,
        costReduction: 0,
        costReductionPercentage: 0,
        costPerUser: 0,
        costPerTransaction: 0,
        optimizationSavings: 0
      };
    }
  }

  // Get retention data by cohort
  private async getRetentionData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    overallRetention: number;
    previousMonthRetention: number;
    changePercentage: number;
    cohortRetention: Array<{ cohort: string; retentionRate: number; userCount: number }>;
    churnRate: number;
    lifetimeValue: number;
  }> {
    try {
      // Mock retention data
      const overallRetention = 85 + Math.random() * 10; // 85-95%
      const previousMonthRetention = overallRetention - (Math.random() * 6 - 3); // ±3% change
      const changePercentage = ((overallRetention - previousMonthRetention) / previousMonthRetention) * 100;

      const cohortRetention = [
        { cohort: 'Week 1', retentionRate: 95 + Math.random() * 3, userCount: 100 },
        { cohort: 'Week 2', retentionRate: 90 + Math.random() * 5, userCount: 85 },
        { cohort: 'Week 3', retentionRate: 85 + Math.random() * 5, userCount: 70 },
        { cohort: 'Week 4', retentionRate: 80 + Math.random() * 8, userCount: 60 },
        { cohort: 'Month 2', retentionRate: 75 + Math.random() * 10, userCount: 45 },
        { cohort: 'Month 3', retentionRate: 70 + Math.random() * 10, userCount: 35 }
      ];

      return {
        overallRetention: Math.round(overallRetention * 100) / 100,
        previousMonthRetention: Math.round(previousMonthRetention * 100) / 100,
        changePercentage: Math.round(changePercentage * 100) / 100,
        cohortRetention,
        churnRate: Math.round((100 - overallRetention) * 100) / 100,
        lifetimeValue: Math.round((500 + Math.random() * 300) * 100) / 100 // $500-800
      };
    } catch (error) {
      logger.error('Error getting retention data:', error);
      return {
        overallRetention: 0,
        previousMonthRetention: 0,
        changePercentage: 0,
        cohortRetention: [],
        churnRate: 0,
        lifetimeValue: 0
      };
    }
  }

  // Calculate overall cognitive impact score
  private calculateOverallScore(data: any): number {
    const weights = {
      customerFeedback: 0.25,
      aiModel: 0.20,
      featureAdoption: 0.20,
      infrastructure: 0.15,
      cost: 0.10,
      retention: 0.10
    };

    const scores = {
      customerFeedback: data.customerFeedback.satisfactionScore,
      aiModel: data.aiModel.accuracyScore,
      featureAdoption: data.featureAdoption.adoptionRate,
      infrastructure: data.infrastructure.efficiencyScore,
      cost: Math.max(0, 100 - data.cost.costReductionPercentage), // Invert cost reduction for score
      retention: data.retention.overallRetention
    };

    const overallScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      return sum + (scores[key as keyof typeof scores] * weight);
    }, 0);

    return Math.round(overallScore * 100) / 100;
  }

  // Generate AI insights for scorecard
  private async generateScorecardInsights(data: any): Promise<{
    keyFindings: string[];
    trends: string[];
    recommendations: string[];
    riskFactors: string[];
    opportunities: string[];
  }> {
    try {
      const prompt = `
Analyze the following monthly cognitive impact data and provide insights:

Customer Feedback:
- Satisfaction Score: ${data.customerFeedback.satisfactionScore}% (${data.customerFeedback.changePercentage > 0 ? '+' : ''}${data.customerFeedback.changePercentage}%)
- Total Feedback: ${data.customerFeedback.totalFeedback}
- Positive: ${data.customerFeedback.positiveFeedback}, Negative: ${data.customerFeedback.negativeFeedback}

AI Model Performance:
- Accuracy: ${data.aiModel.accuracyScore}% (${data.aiModel.changePercentage > 0 ? '+' : ''}${data.aiModel.changePercentage}%)
- Total Predictions: ${data.aiModel.totalPredictions}
- Model Version: ${data.aiModel.modelVersion}

Feature Adoption:
- Adoption Rate: ${data.featureAdoption.adoptionRate}% (${data.featureAdoption.changePercentage > 0 ? '+' : ''}${data.featureAdoption.changePercentage}%)
- Total Users: ${data.featureAdoption.totalUsers}
- Active Users: ${data.featureAdoption.activeUsers}

Infrastructure:
- Efficiency Score: ${data.infrastructure.efficiencyScore}% (${data.infrastructure.changePercentage > 0 ? '+' : ''}${data.infrastructure.changePercentage}%)
- Uptime: ${data.infrastructure.uptime}%
- Response Time: ${data.infrastructure.responseTime}ms

Cost Optimization:
- Total Cost: $${data.cost.totalCost}
- Cost Reduction: $${data.cost.costReduction} (${data.cost.costReductionPercentage}%)
- Cost Per User: $${data.cost.costPerUser}

Retention:
- Overall Retention: ${data.retention.overallRetention}% (${data.retention.changePercentage > 0 ? '+' : ''}${data.retention.changePercentage}%)
- Churn Rate: ${data.retention.churnRate}%
- Lifetime Value: $${data.retention.lifetimeValue}

Provide a JSON response with:
1. keyFindings: Array of 3-5 key findings
2. trends: Array of 3-5 trends observed
3. recommendations: Array of 3-5 actionable recommendations
4. riskFactors: Array of 3-5 potential risk factors
5. opportunities: Array of 3-5 growth opportunities

Respond with only the JSON object, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert business analyst and product strategist. Analyze cognitive impact data and provide actionable insights for continuous improvement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 2000
      });

      const insights = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        keyFindings: insights.keyFindings || ['Analysis incomplete'],
        trends: insights.trends || ['No trends identified'],
        recommendations: insights.recommendations || ['Continue monitoring'],
        riskFactors: insights.riskFactors || ['No risks identified'],
        opportunities: insights.opportunities || ['No opportunities identified']
      };
    } catch (error) {
      logger.error('Error generating scorecard insights:', error);
      return {
        keyFindings: ['AI analysis failed'],
        trends: ['Unable to identify trends'],
        recommendations: ['Manual review required'],
        riskFactors: ['Unable to assess risks'],
        opportunities: ['Unable to identify opportunities']
      };
    }
  }

  // Generate recommendations based on insights
  private async generateRecommendations(insights: any): Promise<Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    timeline: string;
  }>> {
    try {
      const recommendations: Array<{
        category: string;
        priority: string;
        title: string;
        description: string;
        impact: string;
        effort: string;
        timeline: string;
      }> = [];

      // Generate recommendations based on insights
      if (insights.recommendations && insights.recommendations.length > 0) {
        insights.recommendations.forEach((rec: string, index: number) => {
          recommendations.push({
            category: 'Strategic',
            priority: index < 2 ? 'High' : 'Medium',
            title: `Strategic Initiative ${index + 1}`,
            description: rec,
            impact: 'High',
            effort: 'Medium',
            timeline: '1-3 months'
          });
        });
      }

      if (insights.opportunities && insights.opportunities.length > 0) {
        insights.opportunities.forEach((opp: string, index: number) => {
          recommendations.push({
            category: 'Growth',
            priority: 'Medium',
            title: `Growth Opportunity ${index + 1}`,
            description: opp,
            impact: 'Medium',
            effort: 'Low',
            timeline: '2-4 weeks'
          });
        });
      }

      // Add default recommendations if none generated
      if (recommendations.length === 0) {
        recommendations.push({
          category: 'General',
          priority: 'Medium',
          title: 'Continue monitoring',
          description: 'Continue monitoring all metrics and maintain current performance',
          impact: 'Low',
          effort: 'Low',
          timeline: 'Ongoing'
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [{
        category: 'General',
        priority: 'Medium',
        title: 'Manual review required',
        description: 'Unable to generate automated recommendations',
        impact: 'Unknown',
        effort: 'Unknown',
        timeline: 'TBD'
      }];
    }
  }

  // Save scorecard to database
  private async saveScorecard(scorecard: CognitiveImpactScorecard): Promise<void> {
    try {
      const scorecardData = {
        id: scorecard.id,
        tenant_id: scorecard.tenantId,
        period: scorecard.period,
        period_start: scorecard.periodStart.toISOString(),
        period_end: scorecard.periodEnd.toISOString(),
        overall_score: scorecard.overallScore,
        customer_feedback_satisfaction: scorecard.customerFeedbackSatisfaction,
        ai_model_accuracy: scorecard.aiModelAccuracy,
        feature_adoption_growth: scorecard.featureAdoptionGrowth,
        infrastructure_efficiency: scorecard.infrastructureEfficiency,
        cost_reduction: scorecard.costReduction,
        retention_by_cohort: scorecard.retentionByCohort,
        insights: scorecard.insights,
        recommendations: scorecard.recommendations,
        created_at: scorecard.createdAt.toISOString(),
        updated_at: scorecard.updatedAt.toISOString()
      };

      const { error } = await this.supabase
        .from('cognitive_impact_scorecards')
        .insert(scorecardData);

      if (error) {
        logger.error('Error saving scorecard:', error);
        throw error;
      }

      logger.info('Scorecard saved successfully', { scorecardId: scorecard.id });
    } catch (error) {
      logger.error('Error saving scorecard:', error);
      throw error;
    }
  }

  // Generate scorecard ID
  private generateScorecardId(): string {
    return `scorecard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get scorecard by ID
  async getScorecard(scorecardId: string, tenantId: string): Promise<CognitiveImpactScorecard | null> {
    try {
      const { data, error } = await this.supabase
        .from('cognitive_impact_scorecards')
        .select('*')
        .eq('id', scorecardId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        tenantId: data.tenant_id,
        period: data.period,
        periodStart: new Date(data.period_start),
        periodEnd: new Date(data.period_end),
        overallScore: data.overall_score,
        customerFeedbackSatisfaction: data.customer_feedback_satisfaction,
        aiModelAccuracy: data.ai_model_accuracy,
        featureAdoptionGrowth: data.feature_adoption_growth,
        infrastructureEfficiency: data.infrastructure_efficiency,
        costReduction: data.cost_reduction,
        retentionByCohort: data.retention_by_cohort,
        insights: data.insights,
        recommendations: data.recommendations,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      logger.error('Error getting scorecard:', error);
      return null;
    }
  }

  // Get scorecards by tenant
  async getScorecards(tenantId: string, limit: number = 10, offset: number = 0): Promise<{
    scorecards: CognitiveImpactScorecard[];
    total: number;
  }> {
    try {
      const { data: scorecards, error } = await this.supabase
        .from('cognitive_impact_scorecards')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error getting scorecards:', error);
        throw error;
      }

      const formattedScorecards = (scorecards || []).map(scorecard => ({
        id: scorecard.id,
        tenantId: scorecard.tenant_id,
        period: scorecard.period,
        periodStart: new Date(scorecard.period_start),
        periodEnd: new Date(scorecard.period_end),
        overallScore: scorecard.overall_score,
        customerFeedbackSatisfaction: scorecard.customer_feedback_satisfaction,
        aiModelAccuracy: scorecard.ai_model_accuracy,
        featureAdoptionGrowth: scorecard.feature_adoption_growth,
        infrastructureEfficiency: scorecard.infrastructure_efficiency,
        costReduction: scorecard.cost_reduction,
        retentionByCohort: scorecard.retention_by_cohort,
        insights: scorecard.insights,
        recommendations: scorecard.recommendations,
        createdAt: new Date(scorecard.created_at),
        updatedAt: new Date(scorecard.updated_at)
      }));

      // Get total count
      const { count } = await this.supabase
        .from('cognitive_impact_scorecards')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      return {
        scorecards: formattedScorecards,
        total: count || 0
      };
    } catch (error) {
      logger.error('Error getting scorecards:', error);
      throw error;
    }
  }
}

export default CognitiveImpactScorecardService;
