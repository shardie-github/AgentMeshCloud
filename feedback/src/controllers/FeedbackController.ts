import { Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import SupabaseService from '../services/SupabaseService';
import AITriagerService from '../services/AITriagerService';
import logger from '../utils/logger';
import { FeedbackSubmission, ProcessedFeedback } from '../types';

export class FeedbackController {
  private supabaseService: SupabaseService;
  private aiTriagerService: AITriagerService;

  constructor() {
    this.supabaseService = new SupabaseService();
    this.aiTriagerService = new AITriagerService();
  }

  // Validation schemas
  private feedbackSubmissionSchema = Joi.object({
    tenantId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().optional(),
    sessionId: Joi.string().max(100).optional(),
    feedbackType: Joi.string().valid('bug', 'feature_request', 'ux_issue', 'performance', 'general', 'praise').required(),
    title: Joi.string().max(200).required(),
    description: Joi.string().min(10).max(5000).required(),
    context: Joi.object({
      page: Joi.string().optional(),
      feature: Joi.string().optional(),
      userJourney: Joi.string().optional(),
      timestamp: Joi.string().optional()
    }).optional(),
    metadata: Joi.object({
      browser: Joi.string().optional(),
      device: Joi.string().optional(),
      os: Joi.string().optional(),
      performanceMetrics: Joi.object().optional(),
      userAgent: Joi.string().optional(),
      screenResolution: Joi.string().optional(),
      viewportSize: Joi.string().optional()
    }).optional()
  });

  // Submit new feedback
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = this.feedbackSubmissionSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const feedbackData: FeedbackSubmission = value;
      logger.info('Received feedback submission', { 
        tenantId: feedbackData.tenantId,
        feedbackType: feedbackData.feedbackType 
      });

      // Create initial feedback record
      const feedbackRecord = {
        id: uuidv4(),
        tenant_id: feedbackData.tenantId,
        user_id: feedbackData.userId || null,
        session_id: feedbackData.sessionId || null,
        feedback_type: feedbackData.feedbackType,
        priority: 'medium', // Default priority, will be updated by AI triager
        status: 'new',
        title: feedbackData.title,
        description: feedbackData.description,
        context: feedbackData.context || {},
        metadata: feedbackData.metadata || {},
        themes: [],
        sentiment_score: null,
        urgency_score: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to database
      const savedFeedback = await this.supabaseService.createFeedback(feedbackRecord);

      // Start AI triaging process asynchronously
      this.processFeedbackAsync(savedFeedback.id, feedbackData);

      res.status(201).json({
        success: true,
        data: {
          id: savedFeedback.id,
          status: 'submitted',
          message: 'Feedback submitted successfully. AI analysis in progress.'
        }
      });

    } catch (error) {
      logger.error('Error submitting feedback:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to submit feedback'
      });
    }
  }

  // Process feedback asynchronously with AI triaging
  private async processFeedbackAsync(feedbackId: string, feedbackData: FeedbackSubmission): Promise<void> {
    try {
      logger.info('Starting async feedback processing', { feedbackId });

      // AI triaging
      const triagerResult = await this.aiTriagerService.triageFeedback(feedbackData);

      // Update feedback with AI analysis results
      const updates = {
        themes: triagerResult.themes,
        sentiment_score: triagerResult.sentimentScore,
        urgency_score: triagerResult.urgencyScore,
        priority: triagerResult.priority,
        status: 'triaged',
        assigned_to: triagerResult.suggestedAssignee || null,
        updated_at: new Date().toISOString()
      };

      await this.supabaseService.updateFeedback(feedbackId, updates);

      logger.info('Feedback processing completed', { 
        feedbackId,
        themes: triagerResult.themes,
        priority: triagerResult.priority
      });

    } catch (error) {
      logger.error('Error processing feedback asynchronously:', error);
      
      // Update feedback status to indicate processing failed
      try {
        await this.supabaseService.updateFeedback(feedbackId, {
          status: 'new',
          updated_at: new Date().toISOString()
        });
      } catch (updateError) {
        logger.error('Failed to update feedback status after processing error:', updateError);
      }
    }
  }

  // Get feedback by ID
  async getFeedbackById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const feedback = await this.supabaseService.getFeedbackById(id);
      
      if (!feedback || feedback.tenant_id !== tenantId) {
        res.status(404).json({
          success: false,
          error: 'Feedback not found'
        });
        return;
      }

      res.json({
        success: true,
        data: feedback
      });

    } catch (error) {
      logger.error('Error fetching feedback by ID:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get feedback by tenant with filters
  async getFeedbackByTenant(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const filters = req.query;

      const feedback = await this.supabaseService.getFeedbackByTenant(tenantId, filters);

      res.json({
        success: true,
        data: feedback,
        count: feedback.length
      });

    } catch (error) {
      logger.error('Error fetching feedback by tenant:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update feedback status
  async updateFeedbackStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, resolutionNotes, assignedTo } = req.body;

      const validStatuses = ['new', 'triaged', 'in_progress', 'resolved', 'closed', 'duplicate'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
        return;
      }

      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (resolutionNotes) {
        updates.resolution_notes = resolutionNotes;
      }

      if (assignedTo) {
        updates.assigned_to = assignedTo;
      }

      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }

      const updatedFeedback = await this.supabaseService.updateFeedback(id, updates);

      res.json({
        success: true,
        data: updatedFeedback
      });

    } catch (error) {
      logger.error('Error updating feedback status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get feedback analytics
  async getFeedbackAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { dateFrom, dateTo } = req.query;

      const analytics = await this.supabaseService.getFeedbackAnalytics(
        tenantId,
        dateFrom as string,
        dateTo as string
      );

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Error fetching feedback analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Batch process feedback
  async batchProcessFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { feedbackIds } = req.body;

      if (!Array.isArray(feedbackIds) || feedbackIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid feedback IDs array'
        });
        return;
      }

      // Get feedback records
      const feedbackRecords = await Promise.all(
        feedbackIds.map(id => this.supabaseService.getFeedbackById(id))
      );

      const validFeedback = feedbackRecords.filter(f => f !== null);
      
      if (validFeedback.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No valid feedback found'
        });
        return;
      }

      // Convert to FeedbackSubmission format for AI triaging
      const feedbackSubmissions: FeedbackSubmission[] = validFeedback.map(f => ({
        tenantId: f.tenant_id,
        userId: f.user_id,
        sessionId: f.session_id,
        feedbackType: f.feedback_type,
        title: f.title,
        description: f.description,
        context: f.context,
        metadata: f.metadata
      }));

      // Batch triage
      const triagerResults = await this.aiTriagerService.batchTriageFeedback(feedbackSubmissions);

      // Update feedback records
      const updatePromises = validFeedback.map((feedback, index) => {
        const triagerResult = triagerResults[index];
        if (!triagerResult) return Promise.resolve();

        return this.supabaseService.updateFeedback(feedback.id, {
          themes: triagerResult.themes,
          sentiment_score: triagerResult.sentimentScore,
          urgency_score: triagerResult.urgencyScore,
          priority: triagerResult.priority,
          status: 'triaged',
          assigned_to: triagerResult.suggestedAssignee || null,
          updated_at: new Date().toISOString()
        });
      });

      await Promise.all(updatePromises);

      res.json({
        success: true,
        data: {
          processed: validFeedback.length,
          results: triagerResults
        }
      });

    } catch (error) {
      logger.error('Error in batch processing:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Generate insights
  async generateInsights(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { dateFrom, dateTo } = req.query;

      // Get feedback data
      const feedback = await this.supabaseService.getFeedbackByTenant(tenantId, {
        dateFrom: dateFrom as string,
        dateTo: dateTo as string
      });

      if (feedback.length === 0) {
        res.json({
          success: true,
          data: {
            topThemes: [],
            sentimentTrend: [],
            priorityDistribution: {},
            recommendations: []
          }
        });
        return;
      }

      // Convert to ProcessedFeedback format
      const processedFeedback: ProcessedFeedback[] = feedback.map(f => ({
        id: f.id,
        tenantId: f.tenant_id,
        userId: f.user_id,
        sessionId: f.session_id,
        feedbackType: f.feedback_type,
        priority: f.priority,
        status: f.status,
        title: f.title,
        description: f.description,
        context: f.context,
        metadata: f.metadata,
        themes: f.themes || [],
        sentimentScore: f.sentiment_score,
        urgencyScore: f.urgency_score,
        assignedTo: f.assigned_to,
        resolutionNotes: f.resolution_notes,
        resolvedAt: f.resolved_at ? new Date(f.resolved_at) : undefined,
        createdAt: new Date(f.created_at),
        updatedAt: new Date(f.updated_at)
      }));

      // Generate insights
      const insights = await this.aiTriagerService.generateInsights(processedFeedback);

      res.json({
        success: true,
        data: insights
      });

    } catch (error) {
      logger.error('Error generating insights:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default FeedbackController;
