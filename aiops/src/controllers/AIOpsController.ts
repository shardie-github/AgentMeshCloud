import { Request, Response } from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import AIOpsIncidentService from '../services/AIOpsIncidentService';
import AutoOptimizationService from '../services/AutoOptimizationService';

export class AIOpsController {
  private incidentService: AIOpsIncidentService;
  private optimizationService: AutoOptimizationService;

  // Validation schemas
  private incidentSchema = Joi.object({
    tenantId: Joi.string().uuid().required(),
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
    affectedServices: Joi.array().items(Joi.string()).min(1).required(),
    metrics: Joi.object().pattern(Joi.string(), Joi.number()).required(),
    source: Joi.string().valid('monitoring', 'user_report', 'automated', 'manual').required(),
    tags: Joi.array().items(Joi.string()).optional()
  });

  private optimizationSchema = Joi.object({
    tenantId: Joi.string().uuid().required(),
    version: Joi.string().required(),
    deploymentId: Joi.string().required(),
    performanceMetrics: Joi.object().pattern(Joi.string(), Joi.number()).required(),
    codeMetrics: Joi.object().pattern(Joi.string(), Joi.number()).required(),
    errorRates: Joi.object().pattern(Joi.string(), Joi.number()).required(),
    userFeedback: Joi.array().items(Joi.object()).required()
  });

  constructor() {
    this.incidentService = new AIOpsIncidentService();
    this.optimizationService = new AutoOptimizationService();
  }

  // Create new incident
  async createIncident(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = this.incidentSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const incidentData = value;
      logger.info('Creating incident', { tenantId: incidentData.tenantId, title: incidentData.title });

      // Create incident
      const incident = await this.incidentService.createIncident({
        id: uuidv4(),
        tenantId: incidentData.tenantId,
        title: incidentData.title,
        description: incidentData.description,
        severity: incidentData.severity,
        affectedServices: incidentData.affectedServices,
        metrics: incidentData.metrics,
        source: incidentData.source,
        tags: incidentData.tags || [],
        status: 'open',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json({
        success: true,
        data: {
          id: incident.id,
          incidentId: incident.incident_id,
          status: 'created',
          message: 'Incident created successfully. AI analysis in progress.'
        }
      });

    } catch (error) {
      logger.error('Error creating incident:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to create incident'
      });
    }
  }

  // Get incident by ID
  async getIncident(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing tenantId query parameter'
        });
        return;
      }

      const { data: incident, error } = await this.incidentService.supabase
        .from('aiops_incidents')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !incident) {
        res.status(404).json({
          success: false,
          error: 'Incident not found'
        });
        return;
      }

      res.json({
        success: true,
        data: incident
      });

    } catch (error) {
      logger.error('Error getting incident:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get incident'
      });
    }
  }

  // Get incidents by tenant
  async getIncidents(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { status, severity, limit = '50', offset = '0' } = req.query;

      let query = this.incidentService.supabase
        .from('aiops_incidents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (severity) {
        query = query.eq('severity', severity);
      }

      const { data: incidents, error } = await query;

      if (error) {
        logger.error('Error getting incidents:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to get incidents'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          incidents: incidents || [],
          total: incidents?.length || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });

    } catch (error) {
      logger.error('Error getting incidents:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get incidents'
      });
    }
  }

  // Update incident status
  async updateIncidentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, resolutionNotes } = req.body;

      if (!status || !['open', 'identified', 'resolved', 'closed'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Must be one of: open, identified, resolved, closed'
        });
        return;
      }

      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
      }

      if (resolutionNotes) {
        updates.resolution_notes = resolutionNotes;
      }

      const { data, error } = await this.incidentService.supabase
        .from('aiops_incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating incident status:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to update incident status'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: data.id,
          status: data.status,
          message: 'Incident status updated successfully'
        }
      });

    } catch (error) {
      logger.error('Error updating incident status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update incident status'
      });
    }
  }

  // Get incident statistics
  async getIncidentStats(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { timePeriod = 'monthly' } = req.query;

      const stats = await this.incidentService.getIncidentStats(
        tenantId,
        timePeriod as 'daily' | 'weekly' | 'monthly'
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting incident stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get incident statistics'
      });
    }
  }

  // Analyze release for optimization
  async analyzeRelease(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const { error, value } = this.optimizationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.details.map(d => d.message)
        });
        return;
      }

      const releaseData = value;
      logger.info('Analyzing release', { tenantId: releaseData.tenantId, version: releaseData.version });

      // Start optimization analysis
      const job = await this.optimizationService.analyzeRelease(
        releaseData.tenantId,
        releaseData
      );

      res.status(201).json({
        success: true,
        data: {
          jobId: job.id,
          status: 'running',
          message: 'Release analysis started. Results will be available shortly.'
        }
      });

    } catch (error) {
      logger.error('Error analyzing release:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to analyze release'
      });
    }
  }

  // Get optimization job by ID
  async getOptimizationJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Missing tenantId query parameter'
        });
        return;
      }

      const { data: job, error } = await this.optimizationService.supabase
        .from('auto_optimization_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !job) {
        res.status(404).json({
          success: false,
          error: 'Optimization job not found'
        });
        return;
      }

      res.json({
        success: true,
        data: job
      });

    } catch (error) {
      logger.error('Error getting optimization job:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get optimization job'
      });
    }
  }

  // Get optimization jobs by tenant
  async getOptimizationJobs(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { status, jobType, limit = '50', offset = '0' } = req.query;

      let query = this.optimizationService.supabase
        .from('auto_optimization_jobs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

      if (status) {
        query = query.eq('status', status);
      }

      if (jobType) {
        query = query.eq('job_type', jobType);
      }

      const { data: jobs, error } = await query;

      if (error) {
        logger.error('Error getting optimization jobs:', error);
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to get optimization jobs'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          jobs: jobs || [],
          total: jobs?.length || 0,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });

    } catch (error) {
      logger.error('Error getting optimization jobs:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get optimization jobs'
      });
    }
  }

  // Get optimization statistics
  async getOptimizationStats(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { timePeriod = 'monthly' } = req.query;

      const stats = await this.optimizationService.getOptimizationStats(
        tenantId,
        timePeriod as 'daily' | 'weekly' | 'monthly'
      );

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error getting optimization stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get optimization statistics'
      });
    }
  }

  // Get AIOps dashboard data
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.params;
      const { timePeriod = 'monthly' } = req.query;

      // Get both incident and optimization stats
      const [incidentStats, optimizationStats] = await Promise.all([
        this.incidentService.getIncidentStats(tenantId, timePeriod as 'daily' | 'weekly' | 'monthly'),
        this.optimizationService.getOptimizationStats(tenantId, timePeriod as 'daily' | 'weekly' | 'monthly')
      ]);

      // Calculate overall health score
      const healthScore = this.calculateHealthScore(incidentStats, optimizationStats);

      res.json({
        success: true,
        data: {
          healthScore,
          incidents: incidentStats,
          optimizations: optimizationStats,
          timePeriod,
          lastUpdated: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get dashboard data'
      });
    }
  }

  // Calculate overall health score
  private calculateHealthScore(incidentStats: any, optimizationStats: any): number {
    try {
      let score = 100;

      // Deduct points for incidents
      if (incidentStats.totalIncidents > 0) {
        const resolutionRate = incidentStats.resolvedIncidents / incidentStats.totalIncidents;
        score -= (1 - resolutionRate) * 30; // Up to 30 points for unresolved incidents
      }

      // Deduct points for failed optimizations
      if (optimizationStats.totalJobs > 0) {
        const successRate = optimizationStats.completedJobs / optimizationStats.totalJobs;
        score -= (1 - successRate) * 20; // Up to 20 points for failed optimizations
      }

      // Deduct points for high average resolution time
      if (incidentStats.averageResolutionTime > 60) { // More than 1 hour
        score -= Math.min(20, (incidentStats.averageResolutionTime - 60) / 10); // Up to 20 points
      }

      return Math.max(0, Math.min(100, Math.round(score)));
    } catch (error) {
      logger.error('Error calculating health score:', error);
      return 50; // Default neutral score
    }
  }
}

export default AIOpsController;
