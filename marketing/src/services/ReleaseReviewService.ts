import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from '../config';
import logger from '../utils/logger';
import { ReleaseReviewReport } from '../types';

export class ReleaseReviewService {
  private supabase: any;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Generate weekly release review report
  async generateWeeklyReport(tenantId: string, weekStartDate: Date): Promise<ReleaseReviewReport> {
    try {
      logger.info('Generating weekly release review report', { tenantId, weekStartDate });

      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 7);

      // Gather data from various sources
      const [qaData, finOpsData, userFeedbackData, incidentData, optimizationData] = await Promise.all([
        this.getQAData(tenantId, weekStartDate, weekEndDate),
        this.getFinOpsData(tenantId, weekStartDate, weekEndDate),
        this.getUserFeedbackData(tenantId, weekStartDate, weekEndDate),
        this.getIncidentData(tenantId, weekStartDate, weekEndDate),
        this.getOptimizationData(tenantId, weekStartDate, weekEndDate)
      ]);

      // Generate AI-powered insights
      const insights = await this.generateInsights({
        qa: qaData,
        finOps: finOpsData,
        userFeedback: userFeedbackData,
        incidents: incidentData,
        optimizations: optimizationData
      });

      // Create report
      const report: ReleaseReviewReport = {
        id: this.generateReportId(),
        tenantId,
        reportType: 'weekly',
        periodStart: weekStartDate,
        periodEnd: weekEndDate,
        qaSummary: qaData,
        finOpsSummary: finOpsData,
        userFeedbackSummary: userFeedbackData,
        incidentSummary: incidentData,
        optimizationSummary: optimizationData,
        aiInsights: insights,
        recommendations: await this.generateRecommendations(insights),
        overallHealthScore: this.calculateOverallHealthScore(qaData, finOpsData, userFeedbackData, incidentData),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save report to database
      await this.saveReport(report);

      logger.info('Weekly release review report generated', { 
        tenantId, 
        reportId: report.id,
        healthScore: report.overallHealthScore
      });

      return report;
    } catch (error) {
      logger.error('Error generating weekly report:', error);
      throw error;
    }
  }

  // Get QA data for the period
  private async getQAData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalTests: number;
    passedTests: number;
    failedTests: number;
    testCoverage: number;
    criticalBugs: number;
    regressionBugs: number;
    performanceTests: number;
    securityTests: number;
    testExecutionTime: number;
    qualityScore: number;
  }> {
    try {
      // In a real implementation, this would query your QA system
      // For now, return mock data
      const totalTests = Math.floor(Math.random() * 1000) + 500;
      const passedTests = Math.floor(totalTests * (0.85 + Math.random() * 0.1));
      const failedTests = totalTests - passedTests;
      
      return {
        totalTests,
        passedTests,
        failedTests,
        testCoverage: 75 + Math.random() * 20,
        criticalBugs: Math.floor(Math.random() * 5),
        regressionBugs: Math.floor(Math.random() * 10),
        performanceTests: Math.floor(totalTests * 0.2),
        securityTests: Math.floor(totalTests * 0.15),
        testExecutionTime: 120 + Math.random() * 60,
        qualityScore: (passedTests / totalTests) * 100
      };
    } catch (error) {
      logger.error('Error getting QA data:', error);
      return {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        testCoverage: 0,
        criticalBugs: 0,
        regressionBugs: 0,
        performanceTests: 0,
        securityTests: 0,
        testExecutionTime: 0,
        qualityScore: 0
      };
    }
  }

  // Get FinOps data for the period
  private async getFinOpsData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalCost: number;
    costPerUser: number;
    infrastructureCost: number;
    thirdPartyCost: number;
    costTrend: string;
    budgetVariance: number;
    costOptimization: number;
    resourceUtilization: number;
    carbonFootprint: number;
    efficiencyScore: number;
  }> {
    try {
      // In a real implementation, this would query your FinOps system
      const totalCost = 5000 + Math.random() * 2000;
      const userCount = 100 + Math.random() * 50;
      
      return {
        totalCost,
        costPerUser: totalCost / userCount,
        infrastructureCost: totalCost * 0.6,
        thirdPartyCost: totalCost * 0.4,
        costTrend: Math.random() > 0.5 ? 'decreasing' : 'increasing',
        budgetVariance: -5 + Math.random() * 10,
        costOptimization: 10 + Math.random() * 20,
        resourceUtilization: 70 + Math.random() * 20,
        carbonFootprint: 100 + Math.random() * 50,
        efficiencyScore: 80 + Math.random() * 15
      };
    } catch (error) {
      logger.error('Error getting FinOps data:', error);
      return {
        totalCost: 0,
        costPerUser: 0,
        infrastructureCost: 0,
        thirdPartyCost: 0,
        costTrend: 'stable',
        budgetVariance: 0,
        costOptimization: 0,
        resourceUtilization: 0,
        carbonFootprint: 0,
        efficiencyScore: 0
      };
    }
  }

  // Generate report ID
  private generateReportId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `RR-${timestamp}-${random}`.toUpperCase();
  }

  // Calculate overall health score
  private calculateOverallHealthScore(qa: any, finOps: any, userFeedback: any, incidents: any): number {
    try {
      let score = 100;

      // QA score (25% weight)
      score -= (100 - qa.qualityScore) * 0.25;

      // FinOps score (20% weight)
      score -= (100 - finOps.efficiencyScore) * 0.20;

      // User satisfaction score (25% weight)
      score -= (100 - userFeedback.satisfactionScore) * 0.25;

      // Reliability score (30% weight)
      score -= (100 - incidents.reliabilityScore) * 0.30;

      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      logger.error('Error calculating health score:', error);
      return 50; // Default neutral score
    }
  }

  // Save report to database
  private async saveReport(report: ReleaseReviewReport): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('release_review_reports')
        .insert({
          id: report.id,
          tenant_id: report.tenantId,
          report_type: report.reportType,
          period_start: report.periodStart,
          period_end: report.periodEnd,
          qa_summary: report.qaSummary,
          finops_summary: report.finOpsSummary,
          user_feedback_summary: report.userFeedbackSummary,
          incident_summary: report.incidentSummary,
          optimization_summary: report.optimizationSummary,
          ai_insights: report.aiInsights,
          recommendations: report.recommendations,
          overall_health_score: report.overallHealthScore,
          created_at: report.createdAt,
          updated_at: report.updatedAt
        });

      if (error) {
        logger.error('Error saving report:', error);
        throw error;
      }

      logger.info('Report saved to database', { reportId: report.id });
    } catch (error) {
      logger.error('Error saving report:', error);
      throw error;
    }
  }
}

export default ReleaseReviewService;

  // Get user feedback data for the period
  private async getUserFeedbackData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalFeedback: number;
    averageSentiment: number;
    positiveFeedback: number;
    negativeFeedback: number;
    neutralFeedback: number;
    topIssues: Array<{ issue: string; count: number }>;
    featureRequests: number;
    bugReports: number;
    satisfactionScore: number;
    responseTime: number;
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
          totalFeedback: 0,
          averageSentiment: 0,
          positiveFeedback: 0,
          negativeFeedback: 0,
          neutralFeedback: 0,
          topIssues: [],
          featureRequests: 0,
          bugReports: 0,
          satisfactionScore: 0,
          responseTime: 0
        };
      }

      const sentimentScores = feedback
        .filter(f => f.sentiment_score !== null)
        .map(f => f.sentiment_score);
      
      const averageSentiment = sentimentScores.length > 0 
        ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
        : 0;

      const positiveFeedback = feedback.filter(f => f.sentiment_score > 0.3).length;
      const negativeFeedback = feedback.filter(f => f.sentiment_score < -0.3).length;
      const neutralFeedback = feedback.length - positiveFeedback - negativeFeedback;

      // Extract top issues from themes
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

      const featureRequests = feedback.filter(f => f.feedback_type === 'feature_request').length;
      const bugReports = feedback.filter(f => f.feedback_type === 'bug_report').length;

      return {
        totalFeedback: feedback.length,
        averageSentiment,
        positiveFeedback,
        negativeFeedback,
        neutralFeedback,
        topIssues,
        featureRequests,
        bugReports,
        satisfactionScore: (averageSentiment + 1) * 50, // Convert to 0-100 scale
        responseTime: 24 // Average response time in hours
      };
    } catch (error) {
      logger.error('Error getting user feedback data:', error);
      return {
        totalFeedback: 0,
        averageSentiment: 0,
        positiveFeedback: 0,
        negativeFeedback: 0,
        neutralFeedback: 0,
        topIssues: [],
        featureRequests: 0,
        bugReports: 0,
        satisfactionScore: 0,
        responseTime: 0
      };
    }
  }

  // Get incident data for the period
  private async getIncidentData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalIncidents: number;
    criticalIncidents: number;
    resolvedIncidents: number;
    averageResolutionTime: number;
    autoResolvedIncidents: number;
    incidentsBySeverity: Record<string, number>;
    topAffectedServices: Array<{ service: string; count: number }>;
    uptime: number;
    reliabilityScore: number;
  }> {
    try {
      const { data: incidents } = await this.supabase
        .from('aiops_incidents')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!incidents || incidents.length === 0) {
        return {
          totalIncidents: 0,
          criticalIncidents: 0,
          resolvedIncidents: 0,
          averageResolutionTime: 0,
          autoResolvedIncidents: 0,
          incidentsBySeverity: {},
          topAffectedServices: [],
          uptime: 100,
          reliabilityScore: 100
        };
      }

      const criticalIncidents = incidents.filter(i => i.severity === 'critical').length;
      const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
      const autoResolvedIncidents = incidents.filter(i => i.auto_resolved).length;

      // Calculate average resolution time
      const resolvedIncidentsWithTime = incidents.filter(i => i.resolved_at);
      const averageResolutionTime = resolvedIncidentsWithTime.length > 0
        ? resolvedIncidentsWithTime.reduce((sum, incident) => {
            const created = new Date(incident.created_at);
            const resolved = new Date(incident.resolved_at);
            return sum + (resolved.getTime() - created.getTime());
          }, 0) / resolvedIncidentsWithTime.length / (1000 * 60) // minutes
        : 0;

      // Count by severity
      const incidentsBySeverity: Record<string, number> = {};
      incidents.forEach(incident => {
        incidentsBySeverity[incident.severity] = (incidentsBySeverity[incident.severity] || 0) + 1;
      });

      // Top affected services
      const serviceCounts: Record<string, number> = {};
      incidents.forEach(incident => {
        incident.affected_services.forEach((service: string) => {
          serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
      });

      const topAffectedServices = Object.entries(serviceCounts)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const uptime = Math.max(0, 100 - (criticalIncidents * 5)); // Simple uptime calculation
      const reliabilityScore = Math.max(0, 100 - (criticalIncidents * 10) - (averageResolutionTime / 10));

      return {
        totalIncidents: incidents.length,
        criticalIncidents,
        resolvedIncidents,
        averageResolutionTime,
        autoResolvedIncidents,
        incidentsBySeverity,
        topAffectedServices,
        uptime,
        reliabilityScore
      };
    } catch (error) {
      logger.error('Error getting incident data:', error);
      return {
        totalIncidents: 0,
        criticalIncidents: 0,
        resolvedIncidents: 0,
        averageResolutionTime: 0,
        autoResolvedIncidents: 0,
        incidentsBySeverity: {},
        topAffectedServices: [],
        uptime: 100,
        reliabilityScore: 100
      };
    }
  }

  // Get optimization data for the period
  private async getOptimizationData(tenantId: string, startDate: Date, endDate: Date): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    autoOptimizedJobs: number;
    averageProcessingTime: number;
    performanceImprovements: number;
    costSavings: number;
    efficiencyGains: number;
    optimizationScore: number;
  }> {
    try {
      const { data: jobs } = await this.supabase
        .from('auto_optimization_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!jobs || jobs.length === 0) {
        return {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          autoOptimizedJobs: 0,
          averageProcessingTime: 0,
          performanceImprovements: 0,
          costSavings: 0,
          efficiencyGains: 0,
          optimizationScore: 0
        };
      }

      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const failedJobs = jobs.filter(j => j.status === 'failed').length;
      const autoOptimizedJobs = jobs.filter(j => j.auto_optimized).length;

      // Calculate average processing time
      const completedJobsWithTime = jobs.filter(j => j.completed_at);
      const averageProcessingTime = completedJobsWithTime.length > 0
        ? completedJobsWithTime.reduce((sum, job) => {
            const created = new Date(job.created_at);
            const completed = new Date(job.completed_at);
            return sum + (completed.getTime() - created.getTime());
          }, 0) / completedJobsWithTime.length / (1000 * 60) // minutes
        : 0;

      // Mock performance improvements and cost savings
      const performanceImprovements = completedJobs * (5 + Math.random() * 10);
      const costSavings = completedJobs * (100 + Math.random() * 200);
      const efficiencyGains = completedJobs * (2 + Math.random() * 5);

      const optimizationScore = completedJobs > 0 ? (completedJobs / jobs.length) * 100 : 0;

      return {
        totalJobs: jobs.length,
        completedJobs,
        failedJobs,
        autoOptimizedJobs,
        averageProcessingTime,
        performanceImprovements,
        costSavings,
        efficiencyGains,
        optimizationScore
      };
    } catch (error) {
      logger.error('Error getting optimization data:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        autoOptimizedJobs: 0,
        averageProcessingTime: 0,
        performanceImprovements: 0,
        costSavings: 0,
        efficiencyGains: 0,
        optimizationScore: 0
      };
    }
  }

  // Generate AI insights
  private async generateInsights(data: any): Promise<{
    keyFindings: string[];
    trends: string[];
    risks: string[];
    opportunities: string[];
    performanceAnalysis: string;
    costAnalysis: string;
    userSatisfactionAnalysis: string;
    reliabilityAnalysis: string;
  }> {
    try {
      const prompt = `
Analyze the following weekly release data and provide insights:

QA Summary:
- Total Tests: ${data.qa.totalTests}
- Passed Tests: ${data.qa.passedTests}
- Failed Tests: ${data.qa.failedTests}
- Test Coverage: ${data.qa.testCoverage}%
- Critical Bugs: ${data.qa.criticalBugs}
- Quality Score: ${data.qa.qualityScore}%

FinOps Summary:
- Total Cost: $${data.finOps.totalCost}
- Cost Per User: $${data.finOps.costPerUser}
- Cost Trend: ${data.finOps.costTrend}
- Budget Variance: ${data.finOps.budgetVariance}%
- Efficiency Score: ${data.finOps.efficiencyScore}%

User Feedback Summary:
- Total Feedback: ${data.userFeedback.totalFeedback}
- Average Sentiment: ${data.userFeedback.averageSentiment}
- Satisfaction Score: ${data.userFeedback.satisfactionScore}%
- Top Issues: ${data.userFeedback.topIssues.map(i => i.issue).join(', ')}

Incident Summary:
- Total Incidents: ${data.incidents.totalIncidents}
- Critical Incidents: ${data.incidents.criticalIncidents}
- Uptime: ${data.incidents.uptime}%
- Reliability Score: ${data.incidents.reliabilityScore}%

Optimization Summary:
- Total Jobs: ${data.optimizations.totalJobs}
- Completed Jobs: ${data.optimizations.completedJobs}
- Performance Improvements: ${data.optimizations.performanceImprovements}%
- Cost Savings: $${data.optimizations.costSavings}

Provide a JSON response with:
1. keyFindings: Array of 3-5 key findings
2. trends: Array of 3-5 trends observed
3. risks: Array of 3-5 potential risks
4. opportunities: Array of 3-5 opportunities for improvement
5. performanceAnalysis: Brief analysis of performance metrics
6. costAnalysis: Brief analysis of cost metrics
7. userSatisfactionAnalysis: Brief analysis of user satisfaction
8. reliabilityAnalysis: Brief analysis of system reliability

Respond with only the JSON object, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert DevOps engineer and product manager. Analyze release data and provide actionable insights for continuous improvement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1500
      });

      const insights = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        keyFindings: insights.keyFindings || ['Analysis incomplete'],
        trends: insights.trends || ['No trends identified'],
        risks: insights.risks || ['No risks identified'],
        opportunities: insights.opportunities || ['No opportunities identified'],
        performanceAnalysis: insights.performanceAnalysis || 'Performance analysis unavailable',
        costAnalysis: insights.costAnalysis || 'Cost analysis unavailable',
        userSatisfactionAnalysis: insights.userSatisfactionAnalysis || 'User satisfaction analysis unavailable',
        reliabilityAnalysis: insights.reliabilityAnalysis || 'Reliability analysis unavailable'
      };
    } catch (error) {
      logger.error('Error generating insights:', error);
      return {
        keyFindings: ['AI analysis failed'],
        trends: ['Unable to identify trends'],
        risks: ['Unable to assess risks'],
        opportunities: ['Unable to identify opportunities'],
        performanceAnalysis: 'Performance analysis failed',
        costAnalysis: 'Cost analysis failed',
        userSatisfactionAnalysis: 'User satisfaction analysis failed',
        reliabilityAnalysis: 'Reliability analysis failed'
      };
    }
  }

  // Generate recommendations
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
      if (insights.risks && insights.risks.length > 0) {
        insights.risks.forEach((risk: string, index: number) => {
          recommendations.push({
            category: 'Risk Mitigation',
            priority: 'High',
            title: `Address: ${risk}`,
            description: `Mitigate the identified risk: ${risk}`,
            impact: 'High',
            effort: 'Medium',
            timeline: '1-2 weeks'
          });
        });
      }

      if (insights.opportunities && insights.opportunities.length > 0) {
        insights.opportunities.forEach((opportunity: string, index: number) => {
          recommendations.push({
            category: 'Improvement',
            priority: 'Medium',
            title: `Pursue: ${opportunity}`,
            description: `Take advantage of the opportunity: ${opportunity}`,
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
          description: 'Continue monitoring system health and user feedback',
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

  // Get report by ID
  async getReport(reportId: string, tenantId: string): Promise<ReleaseReviewReport | null> {
    try {
      const { data: report, error } = await this.supabase
        .from('release_review_reports')
        .select('*')
        .eq('id', reportId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !report) {
        return null;
      }

      return {
        id: report.id,
        tenantId: report.tenant_id,
        reportType: report.report_type,
        periodStart: new Date(report.period_start),
        periodEnd: new Date(report.period_end),
        qaSummary: report.qa_summary,
        finOpsSummary: report.finops_summary,
        userFeedbackSummary: report.user_feedback_summary,
        incidentSummary: report.incident_summary,
        optimizationSummary: report.optimization_summary,
        aiInsights: report.ai_insights,
        recommendations: report.recommendations,
        overallHealthScore: report.overall_health_score,
        createdAt: new Date(report.created_at),
        updatedAt: new Date(report.updated_at)
      };
    } catch (error) {
      logger.error('Error getting report:', error);
      return null;
    }
  }

  // Get reports by tenant
  async getReports(tenantId: string, limit: number = 10, offset: number = 0): Promise<{
    reports: ReleaseReviewReport[];
    total: number;
  }> {
    try {
      const { data: reports, error } = await this.supabase
        .from('release_review_reports')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error getting reports:', error);
        throw error;
      }

      const formattedReports = (reports || []).map(report => ({
        id: report.id,
        tenantId: report.tenant_id,
        reportType: report.report_type,
        periodStart: new Date(report.period_start),
        periodEnd: new Date(report.period_end),
        qaSummary: report.qa_summary,
        finOpsSummary: report.finops_summary,
        userFeedbackSummary: report.user_feedback_summary,
        incidentSummary: report.incident_summary,
        optimizationSummary: report.optimization_summary,
        aiInsights: report.ai_insights,
        recommendations: report.recommendations,
        overallHealthScore: report.overall_health_score,
        createdAt: new Date(report.created_at),
        updatedAt: new Date(report.updated_at)
      }));

      // Get total count
      const { count } = await this.supabase
        .from('release_review_reports')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      return {
        reports: formattedReports,
        total: count || 0
      };
    } catch (error) {
      logger.error('Error getting reports:', error);
      throw error;
    }
  }
}
