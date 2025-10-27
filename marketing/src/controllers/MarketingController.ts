import { Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { ReleaseReviewService } from '../services/ReleaseReviewService';

export class MarketingController {
  private releaseReviewService: ReleaseReviewService;

  constructor() {
    this.releaseReviewService = new ReleaseReviewService();
  }

  // Generate weekly release review report
  async generateWeeklyReport(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { weekStartDate } = req.body;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const startDate = weekStartDate ? new Date(weekStartDate) : new Date();
      startDate.setDate(startDate.getDate() - 7); // Default to previous week

      logger.info('Generating weekly release review report', { tenantId, startDate });

      const report = await this.releaseReviewService.generateWeeklyReport(tenantId, startDate);

      res.status(201).json({
        success: true,
        data: {
          reportId: report.id,
          message: 'Weekly release review report generated successfully',
          healthScore: report.overallHealthScore
        }
      });

    } catch (error) {
      logger.error('Error generating weekly report:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to generate weekly report'
      });
    }
  }

  // Get release review report
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, reportId } = req.params;

      if (!tenantId || !reportId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID and Report ID are required'
        });
        return;
      }

      const report = await this.releaseReviewService.getReport(reportId, tenantId);

      if (!report) {
        res.status(404).json({
          success: false,
          error: 'Report not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Error getting report:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get report'
      });
    }
  }

  // Get release review reports
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const result = await this.releaseReviewService.getReports(
        tenantId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Error getting reports:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get reports'
      });
    }
  }

  // Get marketing dashboard data
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Get recent reports for dashboard
      const { reports } = await this.releaseReviewService.getReports(tenantId, 5, 0);

      // Calculate dashboard metrics
      const totalReports = reports.length;
      const averageHealthScore = reports.length > 0 
        ? reports.reduce((sum, report) => sum + report.overallHealthScore, 0) / reports.length
        : 0;

      const recentTrends = reports.slice(0, 3).map(report => ({
        period: report.periodStart.toISOString().split('T')[0],
        healthScore: report.overallHealthScore,
        qaScore: report.qaSummary.qualityScore,
        finOpsScore: report.finOpsSummary.efficiencyScore,
        userSatisfaction: report.userFeedbackSummary.satisfactionScore,
        reliability: report.incidentSummary.reliabilityScore
      }));

      const dashboardData = {
        totalReports,
        averageHealthScore: Math.round(averageHealthScore * 100) / 100,
        recentTrends,
        lastReport: reports[0] || null,
        status: averageHealthScore > 80 ? 'healthy' : averageHealthScore > 60 ? 'warning' : 'critical'
      };

      res.status(200).json({
        success: true,
        data: dashboardData
      });

    } catch (error) {
      logger.error('Error getting dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get dashboard data'
      });
    }
  }

  // Health check
  async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'Marketing service is healthy',
      timestamp: new Date().toISOString(),
      service: 'marketing'
    });
  }
}

export default MarketingController;

  // Onboarding Copilot endpoints
  async createOnboardingSession(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { userId, userRole } = req.body;

      if (!tenantId || !userId || !userRole) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID, User ID, and User Role are required'
        });
        return;
      }

      const { OnboardingCopilotService } = await import('../services/OnboardingCopilotService');
      const onboardingService = new OnboardingCopilotService();

      const session = await onboardingService.createSession(tenantId, userId, userRole);

      res.status(201).json({
        success: true,
        data: session
      });

    } catch (error) {
      logger.error('Error creating onboarding session:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create onboarding session'
      });
    }
  }

  async getAIAssistance(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, sessionId } = req.params;
      const { query, context } = req.body;

      if (!tenantId || !sessionId || !query) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID, Session ID, and Query are required'
        });
        return;
      }

      const { OnboardingCopilotService } = await import('../services/OnboardingCopilotService');
      const onboardingService = new OnboardingCopilotService();

      const assistance = await onboardingService.getAIAssistance(sessionId, tenantId, query, context);

      res.status(200).json({
        success: true,
        data: assistance
      });

    } catch (error) {
      logger.error('Error getting AI assistance:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get AI assistance'
      });
    }
  }

  // Cognitive Impact Scorecard endpoints
  async generateMonthlyScorecard(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { month, year } = req.body;

      if (!tenantId || !month || !year) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID, Month, and Year are required'
        });
        return;
      }

      const { CognitiveImpactScorecardService } = await import('../services/CognitiveImpactScorecardService');
      const scorecardService = new CognitiveImpactScorecardService();

      const scorecard = await scorecardService.generateMonthlyScorecard(tenantId, month, year);

      res.status(201).json({
        success: true,
        data: {
          scorecardId: scorecard.id,
          overallScore: scorecard.overallScore,
          message: 'Monthly cognitive impact scorecard generated successfully'
        }
      });

    } catch (error) {
      logger.error('Error generating monthly scorecard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to generate monthly scorecard'
      });
    }
  }

  async getScorecard(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, scorecardId } = req.params;

      if (!tenantId || !scorecardId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID and Scorecard ID are required'
        });
        return;
      }

      const { CognitiveImpactScorecardService } = await import('../services/CognitiveImpactScorecardService');
      const scorecardService = new CognitiveImpactScorecardService();

      const scorecard = await scorecardService.getScorecard(scorecardId, tenantId);

      if (!scorecard) {
        res.status(404).json({
          success: false,
          error: 'Scorecard not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: scorecard
      });

    } catch (error) {
      logger.error('Error getting scorecard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get scorecard'
      });
    }
  }

  // Marketing Pipeline endpoints
  async generatePipelineOptimization(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const campaignData = req.body;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const { MarketingPipelineService } = await import('../services/MarketingPipelineService');
      const pipelineService = new MarketingPipelineService();

      const pipeline = await pipelineService.generatePipelineOptimization(tenantId, campaignData);

      res.status(201).json({
        success: true,
        data: {
          pipelineId: pipeline.id,
          message: 'Marketing pipeline optimization generated successfully',
          optimizationPotential: pipeline.conversionPredictions.optimizationPotential
        }
      });

    } catch (error) {
      logger.error('Error generating pipeline optimization:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to generate pipeline optimization'
      });
    }
  }

  async getPipeline(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, pipelineId } = req.params;

      if (!tenantId || !pipelineId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID and Pipeline ID are required'
        });
        return;
      }

      const { MarketingPipelineService } = await import('../services/MarketingPipelineService');
      const pipelineService = new MarketingPipelineService();

      const pipeline = await pipelineService.getPipeline(pipelineId, tenantId);

      if (!pipeline) {
        res.status(404).json({
          success: false,
          error: 'Pipeline not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: pipeline
      });

    } catch (error) {
      logger.error('Error getting pipeline:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get pipeline'
      });
    }
  }
}
