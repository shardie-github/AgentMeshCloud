import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from '../config';
import logger from '../utils/logger';
import { AutoOptimizationJob, ReleaseReviewReport } from '../types';

export class AutoOptimizationService {
  private supabase: any;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Analyze release for optimization opportunities
  async analyzeRelease(tenantId: string, releaseData: {
    version: string;
    deploymentId: string;
    performanceMetrics: Record<string, number>;
    codeMetrics: Record<string, number>;
    errorRates: Record<string, number>;
    userFeedback: any[];
  }): Promise<AutoOptimizationJob> {
    try {
      logger.info('Starting release analysis', { tenantId, version: releaseData.version });

      const jobId = this.generateJobId();
      
      // Create optimization job record
      const jobData = {
        id: jobId,
        tenant_id: tenantId,
        job_type: 'release_analysis',
        status: 'running',
        input_data: releaseData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: job, error } = await this.supabase
        .from('auto_optimization_jobs')
        .insert(jobData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating optimization job:', error);
        throw error;
      }

      // Start analysis asynchronously
      this.performAnalysisAsync(jobId, releaseData);

      return job;
    } catch (error) {
      logger.error('Error analyzing release:', error);
      throw error;
    }
  }

  // Perform analysis asynchronously
  private async performAnalysisAsync(jobId: string, releaseData: any): Promise<void> {
    try {
      logger.info('Starting release analysis', { jobId });

      // Analyze performance metrics
      const performanceAnalysis = await this.analyzePerformance(releaseData.performanceMetrics);
      
      // Analyze code quality
      const codeAnalysis = await this.analyzeCodeQuality(releaseData.codeMetrics);
      
      // Analyze error patterns
      const errorAnalysis = await this.analyzeErrors(releaseData.errorRates);
      
      // Analyze user feedback
      const feedbackAnalysis = await this.analyzeUserFeedback(releaseData.userFeedback);
      
      // Generate optimization recommendations
      const recommendations = await this.generateRecommendations({
        performance: performanceAnalysis,
        code: codeAnalysis,
        errors: errorAnalysis,
        feedback: feedbackAnalysis
      });

      // Determine if auto-optimization is possible
      const autoOptimizable = this.canAutoOptimize(recommendations);

      // Update job with results
      const updates = {
        status: autoOptimizable ? 'completed' : 'requires_manual_review',
        output_data: {
          performanceAnalysis,
          codeAnalysis,
          errorAnalysis,
          feedbackAnalysis,
          recommendations,
          autoOptimizable
        },
        updated_at: new Date().toISOString()
      };

      if (autoOptimizable) {
        updates.completed_at = new Date().toISOString();
      }

      await this.supabase
        .from('auto_optimization_jobs')
        .update(updates)
        .eq('id', jobId);

      logger.info('Release analysis completed', { 
        jobId, 
        autoOptimizable,
        recommendationCount: recommendations.length
      });

    } catch (error) {
      logger.error('Error in release analysis:', error);
      
      // Update job status to indicate failure
      try {
        await this.supabase
          .from('auto_optimization_jobs')
          .update({ 
            status: 'failed',
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
      } catch (updateError) {
        logger.error('Failed to update job status after analysis error:', updateError);
      }
    }
  }

  // Analyze performance metrics
  private async analyzePerformance(metrics: Record<string, number>): Promise<{
    issues: Array<{ metric: string; value: number; threshold: number; severity: string }>;
    trends: Array<{ metric: string; trend: string; change: number }>;
    recommendations: string[];
  }> {
    try {
      const thresholds = {
        responseTime: 1000, // ms
        throughput: 100, // requests/second
        errorRate: 0.01, // 1%
        cpuUsage: 80, // percentage
        memoryUsage: 85, // percentage
        diskUsage: 90 // percentage
      };

      const issues: Array<{ metric: string; value: number; threshold: number; severity: string }> = [];
      const trends: Array<{ metric: string; trend: string; change: number }> = [];
      const recommendations: string[] = [];

      // Check for threshold violations
      Object.entries(metrics).forEach(([metric, value]) => {
        const threshold = thresholds[metric as keyof typeof thresholds];
        if (threshold && value > threshold) {
          const severity = value > threshold * 1.5 ? 'critical' : 'warning';
          issues.push({ metric, value, threshold, severity });
        }
      });

      // Analyze trends (simplified - in real implementation, compare with historical data)
      Object.entries(metrics).forEach(([metric, value]) => {
        const threshold = thresholds[metric as keyof typeof thresholds];
        if (threshold) {
          const change = ((value - threshold) / threshold) * 100;
          const trend = change > 0 ? 'increasing' : 'decreasing';
          trends.push({ metric, trend, change: Math.abs(change) });
        }
      });

      // Generate recommendations based on issues
      if (issues.some(i => i.metric === 'responseTime' && i.severity === 'critical')) {
        recommendations.push('Consider implementing caching or database query optimization');
      }
      if (issues.some(i => i.metric === 'cpuUsage' && i.severity === 'critical')) {
        recommendations.push('Scale horizontally or optimize CPU-intensive operations');
      }
      if (issues.some(i => i.metric === 'memoryUsage' && i.severity === 'critical')) {
        recommendations.push('Investigate memory leaks or increase memory allocation');
      }

      return { issues, trends, recommendations };
    } catch (error) {
      logger.error('Error analyzing performance:', error);
      return { issues: [], trends: [], recommendations: ['Performance analysis failed'] };
    }
  }

  // Analyze code quality metrics
  private async analyzeCodeQuality(metrics: Record<string, number>): Promise<{
    issues: Array<{ metric: string; value: number; threshold: number; severity: string }>;
    recommendations: string[];
  }> {
    try {
      const thresholds = {
        cyclomaticComplexity: 10,
        codeDuplication: 5, // percentage
        testCoverage: 80, // percentage
        technicalDebt: 100, // minutes
        maintainabilityIndex: 70 // 0-100 scale
      };

      const issues: Array<{ metric: string; value: number; threshold: number; severity: string }> = [];
      const recommendations: string[] = [];

      // Check for threshold violations
      Object.entries(metrics).forEach(([metric, value]) => {
        const threshold = thresholds[metric as keyof typeof thresholds];
        if (threshold) {
          const isViolation = metric === 'maintainabilityIndex' ? value < threshold : value > threshold;
          if (isViolation) {
            const severity = metric === 'maintainabilityIndex' 
              ? (value < threshold * 0.7 ? 'critical' : 'warning')
              : (value > threshold * 1.5 ? 'critical' : 'warning');
            issues.push({ metric, value, threshold, severity });
          }
        }
      });

      // Generate recommendations
      if (issues.some(i => i.metric === 'cyclomaticComplexity' && i.severity === 'critical')) {
        recommendations.push('Refactor complex functions to reduce cyclomatic complexity');
      }
      if (issues.some(i => i.metric === 'codeDuplication' && i.severity === 'critical')) {
        recommendations.push('Extract common code into reusable functions or components');
      }
      if (issues.some(i => i.metric === 'testCoverage' && i.severity === 'critical')) {
        recommendations.push('Increase test coverage by adding unit and integration tests');
      }

      return { issues, recommendations };
    } catch (error) {
      logger.error('Error analyzing code quality:', error);
      return { issues: [], recommendations: ['Code quality analysis failed'] };
    }
  }

  // Analyze error patterns
  private async analyzeErrors(errorRates: Record<string, number>): Promise<{
    criticalErrors: Array<{ service: string; rate: number; threshold: number }>;
    errorTrends: Array<{ service: string; trend: string; change: number }>;
    recommendations: string[];
  }> {
    try {
      const errorThreshold = 0.05; // 5%
      const criticalErrors: Array<{ service: string; rate: number; threshold: number }> = [];
      const errorTrends: Array<{ service: string; trend: string; change: number }> = [];
      const recommendations: string[] = [];

      // Identify critical error rates
      Object.entries(errorRates).forEach(([service, rate]) => {
        if (rate > errorThreshold) {
          criticalErrors.push({ service, rate, threshold: errorThreshold });
        }
      });

      // Analyze trends (simplified)
      Object.entries(errorRates).forEach(([service, rate]) => {
        const change = ((rate - errorThreshold) / errorThreshold) * 100;
        const trend = change > 0 ? 'increasing' : 'decreasing';
        errorTrends.push({ service, trend, change: Math.abs(change) });
      });

      // Generate recommendations
      if (criticalErrors.length > 0) {
        recommendations.push('Implement circuit breakers for services with high error rates');
        recommendations.push('Add retry logic with exponential backoff');
        recommendations.push('Review error handling and logging for better debugging');
      }

      return { criticalErrors, errorTrends, recommendations };
    } catch (error) {
      logger.error('Error analyzing errors:', error);
      return { criticalErrors: [], errorTrends: [], recommendations: ['Error analysis failed'] };
    }
  }

  // Analyze user feedback
  private async analyzeUserFeedback(feedback: any[]): Promise<{
    sentimentScore: number;
    commonIssues: Array<{ issue: string; count: number }>;
    recommendations: string[];
  }> {
    try {
      if (!feedback || feedback.length === 0) {
        return { sentimentScore: 0, commonIssues: [], recommendations: [] };
      }

      // Calculate average sentiment
      const sentimentScores = feedback
        .filter(f => f.sentimentScore !== undefined)
        .map(f => f.sentimentScore);
      
      const sentimentScore = sentimentScores.length > 0 
        ? sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length
        : 0;

      // Extract common issues from themes
      const issueCounts: Record<string, number> = {};
      feedback.forEach(f => {
        if (f.themes) {
          f.themes.forEach((theme: string) => {
            issueCounts[theme] = (issueCounts[theme] || 0) + 1;
          });
        }
      });

      const commonIssues = Object.entries(issueCounts)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Generate recommendations based on sentiment and issues
      const recommendations: string[] = [];
      
      if (sentimentScore < -0.3) {
        recommendations.push('Address negative user sentiment with immediate improvements');
      }
      
      if (commonIssues.some(i => i.issue.toLowerCase().includes('performance'))) {
        recommendations.push('Focus on performance improvements based on user feedback');
      }
      
      if (commonIssues.some(i => i.issue.toLowerCase().includes('bug'))) {
        recommendations.push('Prioritize bug fixes based on user reports');
      }

      return { sentimentScore, commonIssues, recommendations };
    } catch (error) {
      logger.error('Error analyzing user feedback:', error);
      return { sentimentScore: 0, commonIssues: [], recommendations: ['Feedback analysis failed'] };
    }
  }

  // Generate optimization recommendations
  private async generateRecommendations(analysis: any): Promise<Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    impact: string;
    effort: string;
    autoOptimizable: boolean;
  }>> {
    try {
      const recommendations: Array<{
        category: string;
        priority: string;
        title: string;
        description: string;
        impact: string;
        effort: string;
        autoOptimizable: boolean;
      }> = [];

      // Performance recommendations
      if (analysis.performance.issues.length > 0) {
        analysis.performance.issues.forEach((issue: any) => {
          recommendations.push({
            category: 'Performance',
            priority: issue.severity === 'critical' ? 'High' : 'Medium',
            title: `Optimize ${issue.metric}`,
            description: `Current value: ${issue.value}, Threshold: ${issue.threshold}`,
            impact: issue.severity === 'critical' ? 'High' : 'Medium',
            effort: 'Medium',
            autoOptimizable: false
          });
        });
      }

      // Code quality recommendations
      if (analysis.code.issues.length > 0) {
        analysis.code.issues.forEach((issue: any) => {
          recommendations.push({
            category: 'Code Quality',
            priority: issue.severity === 'critical' ? 'High' : 'Medium',
            title: `Improve ${issue.metric}`,
            description: `Current value: ${issue.value}, Threshold: ${issue.threshold}`,
            impact: 'Medium',
            effort: 'High',
            autoOptimizable: false
          });
        });
      }

      // Error handling recommendations
      if (analysis.errors.criticalErrors.length > 0) {
        analysis.errors.criticalErrors.forEach((error: any) => {
          recommendations.push({
            category: 'Error Handling',
            priority: 'High',
            title: `Fix ${error.service} error rate`,
            description: `Current rate: ${(error.rate * 100).toFixed(2)}%, Threshold: ${(error.threshold * 100).toFixed(2)}%`,
            impact: 'High',
            effort: 'Medium',
            autoOptimizable: false
          });
        });
      }

      // User feedback recommendations
      if (analysis.feedback.sentimentScore < -0.3) {
        recommendations.push({
          category: 'User Experience',
          priority: 'High',
          title: 'Address negative user sentiment',
          description: `Current sentiment score: ${analysis.feedback.sentimentScore.toFixed(2)}`,
          impact: 'High',
          effort: 'High',
          autoOptimizable: false
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
        autoOptimizable: false
      }];
    }
  }

  // Determine if auto-optimization is possible
  private canAutoOptimize(recommendations: any[]): boolean {
    // Simple heuristic - auto-optimize if all recommendations are low effort and high impact
    return recommendations.every(rec => 
      rec.effort === 'Low' && rec.impact === 'High' && rec.autoOptimizable
    );
  }

  // Generate job ID
  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `OPT-${timestamp}-${random}`.toUpperCase();
  }

  // Get optimization job statistics
  async getOptimizationStats(tenantId: string, timePeriod: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    autoOptimizedJobs: number;
    averageProcessingTime: number;
    jobsByType: Record<string, number>;
  }> {
    try {
      const timeFilter = this.getTimeFilter(timePeriod);
      
      const { data: jobs } = await this.supabase
        .from('auto_optimization_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', timeFilter);

      if (!jobs) return this.getEmptyStats();

      const stats = {
        totalJobs: jobs.length,
        completedJobs: jobs.filter(j => j.status === 'completed').length,
        failedJobs: jobs.filter(j => j.status === 'failed').length,
        autoOptimizedJobs: jobs.filter(j => j.auto_optimized).length,
        averageProcessingTime: 0,
        jobsByType: {} as Record<string, number>
      };

      // Calculate average processing time
      const completedJobs = jobs.filter(j => j.completed_at);
      if (completedJobs.length > 0) {
        const totalProcessingTime = completedJobs.reduce((sum, job) => {
          const created = new Date(job.created_at);
          const completed = new Date(job.completed_at);
          return sum + (completed.getTime() - created.getTime());
        }, 0);
        
        stats.averageProcessingTime = totalProcessingTime / completedJobs.length / (1000 * 60); // minutes
      }

      // Count by job type
      jobs.forEach(job => {
        stats.jobsByType[job.job_type] = (stats.jobsByType[job.job_type] || 0) + 1;
      });

      return stats;
    } catch (error) {
      logger.error('Error getting optimization stats:', error);
      throw error;
    }
  }

  private getTimeFilter(timePeriod: string): string {
    const now = new Date();
    switch (timePeriod) {
      case 'daily':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case 'weekly':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case 'monthly':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  private getEmptyStats() {
    return {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      autoOptimizedJobs: 0,
      averageProcessingTime: 0,
      jobsByType: {}
    };
  }
}

export default AutoOptimizationService;
