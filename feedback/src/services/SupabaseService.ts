import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';

export class SupabaseService {
  private client: SupabaseClient;
  private serviceClient: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.anonKey);
    this.serviceClient = createClient(
      config.supabase.url, 
      config.supabase.serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  // Get the public client for user operations
  getClient(): SupabaseClient {
    return this.client;
  }

  // Get the service client for admin operations
  getServiceClient(): SupabaseClient {
    return this.serviceClient;
  }

  // Feedback operations
  async createFeedback(feedback: any) {
    try {
      const { data, error } = await this.serviceClient
        .from('product_feedback')
        .insert(feedback)
        .select()
        .single();

      if (error) {
        logger.error('Error creating feedback:', error);
        throw error;
      }

      logger.info('Feedback created successfully:', { id: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create feedback:', error);
      throw error;
    }
  }

  async updateFeedback(id: string, updates: any) {
    try {
      const { data, error } = await this.serviceClient
        .from('product_feedback')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating feedback:', error);
        throw error;
      }

      logger.info('Feedback updated successfully:', { id });
      return data;
    } catch (error) {
      logger.error('Failed to update feedback:', error);
      throw error;
    }
  }

  async getFeedbackById(id: string) {
    try {
      const { data, error } = await this.serviceClient
        .from('product_feedback')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error fetching feedback:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to fetch feedback:', error);
      throw error;
    }
  }

  async getFeedbackByTenant(tenantId: string, filters?: any) {
    try {
      let query = this.serviceClient
        .from('product_feedback')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters) {
        if (filters.feedbackType) {
          query = query.eq('feedback_type', filters.feedbackType);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.priority) {
          query = query.eq('priority', filters.priority);
        }
        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching feedback by tenant:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to fetch feedback by tenant:', error);
      throw error;
    }
  }

  async searchSimilarFeedback(tenantId: string, embedding: number[], limit = 5) {
    try {
      const { data, error } = await this.serviceClient.rpc('match_feedback_embeddings', {
        query_embedding: embedding,
        match_threshold: config.feedback.similarityThreshold,
        match_count: limit,
        tenant_id: tenantId
      });

      if (error) {
        logger.error('Error searching similar feedback:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to search similar feedback:', error);
      throw error;
    }
  }

  // Growth signals operations
  async createGrowthSignal(signal: any) {
    try {
      const { data, error } = await this.serviceClient
        .from('growth_signals')
        .insert(signal)
        .select()
        .single();

      if (error) {
        logger.error('Error creating growth signal:', error);
        throw error;
      }

      logger.info('Growth signal created successfully:', { id: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create growth signal:', error);
      throw error;
    }
  }

  async getGrowthSignals(tenantId: string, filters?: any) {
    try {
      let query = this.serviceClient
        .from('growth_signals')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters) {
        if (filters.signalType) {
          query = query.eq('signal_type', filters.signalType);
        }
        if (filters.timePeriod) {
          query = query.eq('time_period', filters.timePeriod);
        }
        if (filters.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('created_at', filters.dateTo);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching growth signals:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to fetch growth signals:', error);
      throw error;
    }
  }

  // Referral credits operations
  async createReferralCredit(credit: any) {
    try {
      const { data, error } = await this.serviceClient
        .from('referral_credits')
        .insert(credit)
        .select()
        .single();

      if (error) {
        logger.error('Error creating referral credit:', error);
        throw error;
      }

      logger.info('Referral credit created successfully:', { id: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create referral credit:', error);
      throw error;
    }
  }

  async getReferralCredits(tenantId: string, filters?: any) {
    try {
      let query = this.serviceClient
        .from('referral_credits')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters) {
        if (filters.referrerUserId) {
          query = query.eq('referrer_user_id', filters.referrerUserId);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.referralCode) {
          query = query.eq('referral_code', filters.referralCode);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching referral credits:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to fetch referral credits:', error);
      throw error;
    }
  }

  // AIOps incidents operations
  async createIncident(incident: any) {
    try {
      const { data, error } = await this.serviceClient
        .from('aiops_incidents')
        .insert(incident)
        .select()
        .single();

      if (error) {
        logger.error('Error creating incident:', error);
        throw error;
      }

      logger.info('Incident created successfully:', { id: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create incident:', error);
      throw error;
    }
  }

  async updateIncident(id: string, updates: any) {
    try {
      const { data, error } = await this.serviceClient
        .from('aiops_incidents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating incident:', error);
        throw error;
      }

      logger.info('Incident updated successfully:', { id });
      return data;
    } catch (error) {
      logger.error('Failed to update incident:', error);
      throw error;
    }
  }

  async getIncidents(tenantId: string, filters?: any) {
    try {
      let query = this.serviceClient
        .from('aiops_incidents')
        .select('*')
        .eq('tenant_id', tenantId);

      if (filters) {
        if (filters.severity) {
          query = query.eq('severity', filters.severity);
        }
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.autoResolved !== undefined) {
          query = query.eq('auto_resolved', filters.autoResolved);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching incidents:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Failed to fetch incidents:', error);
      throw error;
    }
  }

  // Analytics operations
  async getFeedbackAnalytics(tenantId: string, dateFrom?: string, dateTo?: string) {
    try {
      let query = this.serviceClient
        .from('product_feedback')
        .select('*')
        .eq('tenant_id', tenantId);

      if (dateFrom) {
        query = query.gte('created_at', dateFrom);
      }
      if (dateTo) {
        query = query.lte('created_at', dateTo);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching feedback analytics:', error);
        throw error;
      }

      // Process analytics data
      const analytics = {
        totalFeedback: data.length,
        feedbackByType: {},
        feedbackByPriority: {},
        feedbackByStatus: {},
        averageSentiment: 0,
        topThemes: [],
        resolutionTime: {
          average: 0,
          median: 0,
          p95: 0
        },
        userSatisfaction: {
          average: 0,
          distribution: {}
        }
      };

      // Calculate analytics
      data.forEach(feedback => {
        // Count by type
        analytics.feedbackByType[feedback.feedback_type] = 
          (analytics.feedbackByType[feedback.feedback_type] || 0) + 1;
        
        // Count by priority
        analytics.feedbackByPriority[feedback.priority] = 
          (analytics.feedbackByPriority[feedback.priority] || 0) + 1;
        
        // Count by status
        analytics.feedbackByStatus[feedback.status] = 
          (analytics.feedbackByStatus[feedback.status] || 0) + 1;
      });

      // Calculate average sentiment
      const sentimentScores = data
        .filter(f => f.sentiment_score !== null)
        .map(f => f.sentiment_score);
      
      if (sentimentScores.length > 0) {
        analytics.averageSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
      }

      return analytics;
    } catch (error) {
      logger.error('Failed to fetch feedback analytics:', error);
      throw error;
    }
  }
}

export default SupabaseService;
