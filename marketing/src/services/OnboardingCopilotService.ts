import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from '../config';
import logger from '../utils/logger';
import { OnboardingSession, AIAssistance } from '../types';

export class OnboardingCopilotService {
  private supabase: any;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Create new onboarding session
  async createSession(tenantId: string, userId: string, userRole: string): Promise<OnboardingSession> {
    try {
      const sessionId = this.generateSessionId();
      
      const sessionData = {
        id: sessionId,
        tenant_id: tenantId,
        user_id: userId,
        user_role: userRole,
        status: 'active',
        current_step: 1,
        total_steps: 10,
        progress_percentage: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('onboarding_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating onboarding session:', error);
        throw error;
      }

      logger.info('Onboarding session created', { sessionId, tenantId, userId });
      return this.formatSession(data);
    } catch (error) {
      logger.error('Error creating onboarding session:', error);
      throw error;
    }
  }

  // Get session by ID
  async getSession(sessionId: string, tenantId: string): Promise<OnboardingSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('onboarding_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !data) {
        return null;
      }

      return this.formatSession(data);
    } catch (error) {
      logger.error('Error getting session:', error);
      return null;
    }
  }

  // Update session progress
  async updateProgress(sessionId: string, tenantId: string, step: number, completed: boolean): Promise<OnboardingSession | null> {
    try {
      const progressPercentage = Math.round((step / 10) * 100);
      
      const updateData = {
        current_step: step,
        progress_percentage: progressPercentage,
        status: completed ? 'completed' : 'active',
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('onboarding_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating session progress:', error);
        throw error;
      }

      logger.info('Session progress updated', { sessionId, step, progressPercentage });
      return this.formatSession(data);
    } catch (error) {
      logger.error('Error updating session progress:', error);
      return null;
    }
  }

  // Get AI assistance for user query
  async getAIAssistance(sessionId: string, tenantId: string, query: string, context?: any): Promise<AIAssistance> {
    try {
      // Get session context
      const session = await this.getSession(sessionId, tenantId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Generate AI response
      const response = await this.generateAIResponse(query, session, context);

      // Save assistance record
      const assistanceId = this.generateAssistanceId();
      const assistanceData = {
        id: assistanceId,
        session_id: sessionId,
        tenant_id: tenantId,
        user_query: query,
        ai_response: response.content,
        response_type: response.type,
        confidence_score: response.confidence,
        created_at: new Date().toISOString()
      };

      await this.supabase
        .from('ai_assistance')
        .insert(assistanceData);

      logger.info('AI assistance provided', { sessionId, assistanceId, responseType: response.type });

      return {
        id: assistanceId,
        sessionId,
        query,
        response: response.content,
        type: response.type,
        confidence: response.confidence,
        suggestions: response.suggestions,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Error getting AI assistance:', error);
      throw error;
    }
  }

  // Generate AI response
  private async generateAIResponse(query: string, session: OnboardingSession, context?: any): Promise<{
    content: string;
    type: string;
    confidence: number;
    suggestions: string[];
  }> {
    try {
      const prompt = `
You are an AI onboarding assistant for AgentMesh Cloud. Help the user with their query.

User Context:
- Current Step: ${session.currentStep}/${session.totalSteps}
- Progress: ${session.progressPercentage}%
- User Role: ${session.userRole}
- Session Status: ${session.status}

User Query: ${query}

Additional Context: ${context ? JSON.stringify(context) : 'None'}

Provide a helpful response that:
1. Directly answers the user's question
2. Provides relevant guidance for their current onboarding step
3. Suggests next actions if appropriate
4. Is encouraging and supportive

Respond in JSON format with:
- content: The main response text
- type: "guidance", "tutorial", "troubleshooting", or "general"
- confidence: A number between 0 and 1
- suggestions: Array of 2-3 suggested next steps

Be concise but helpful. Focus on practical guidance.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI onboarding assistant for AgentMesh Cloud. Provide clear, actionable guidance to users during their onboarding process.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        content: aiResponse.content || 'I apologize, but I need more information to help you effectively.',
        type: aiResponse.type || 'general',
        confidence: aiResponse.confidence || 0.5,
        suggestions: aiResponse.suggestions || ['Continue with the next step', 'Ask for more specific help']
      };
    } catch (error) {
      logger.error('Error generating AI response:', error);
      return {
        content: 'I apologize, but I encountered an error while processing your request. Please try again or contact support.',
        type: 'general',
        confidence: 0.1,
        suggestions: ['Try rephrasing your question', 'Contact support for assistance']
      };
    }
  }

  // Get session statistics
  async getSessionStats(tenantId: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    averageCompletionTime: number;
    commonIssues: Array<{ issue: string; count: number }>;
    userSatisfaction: number;
  }> {
    try {
      const { data: sessions } = await this.supabase
        .from('onboarding_sessions')
        .select('*')
        .eq('tenant_id', tenantId);

      const { data: assistance } = await this.supabase
        .from('ai_assistance')
        .select('*')
        .eq('tenant_id', tenantId);

      if (!sessions || !assistance) {
        return {
          totalSessions: 0,
          activeSessions: 0,
          completedSessions: 0,
          averageCompletionTime: 0,
          commonIssues: [],
          userSatisfaction: 0
        };
      }

      const totalSessions = sessions.length;
      const activeSessions = sessions.filter(s => s.status === 'active').length;
      const completedSessions = sessions.filter(s => s.status === 'completed').length;

      // Calculate average completion time
      const completedSessionsWithTime = sessions.filter(s => s.status === 'completed' && s.completed_at);
      const averageCompletionTime = completedSessionsWithTime.length > 0
        ? completedSessionsWithTime.reduce((sum, session) => {
            const created = new Date(session.created_at);
            const completed = new Date(session.completed_at);
            return sum + (completed.getTime() - created.getTime());
          }, 0) / completedSessionsWithTime.length / (1000 * 60 * 60) // hours
        : 0;

      // Analyze common issues from assistance queries
      const issueCounts: Record<string, number> = {};
      assistance.forEach(a => {
        const query = a.user_query.toLowerCase();
        if (query.includes('error') || query.includes('problem')) {
          issueCounts['Technical Issues'] = (issueCounts['Technical Issues'] || 0) + 1;
        } else if (query.includes('how') || query.includes('tutorial')) {
          issueCounts['How-to Questions'] = (issueCounts['How-to Questions'] || 0) + 1;
        } else if (query.includes('feature') || query.includes('capability')) {
          issueCounts['Feature Questions'] = (issueCounts['Feature Questions'] || 0) + 1;
        }
      });

      const commonIssues = Object.entries(issueCounts)
        .map(([issue, count]) => ({ issue, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Mock user satisfaction score
      const userSatisfaction = Math.min(95, Math.max(70, 85 + (completedSessions / totalSessions) * 10));

      return {
        totalSessions,
        activeSessions,
        completedSessions,
        averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
        commonIssues,
        userSatisfaction: Math.round(userSatisfaction)
      };
    } catch (error) {
      logger.error('Error getting session stats:', error);
      return {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        averageCompletionTime: 0,
        commonIssues: [],
        userSatisfaction: 0
      };
    }
  }

  // Format session data
  private formatSession(data: any): OnboardingSession {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      userId: data.user_id,
      userRole: data.user_role,
      status: data.status,
      currentStep: data.current_step,
      totalSteps: data.total_steps,
      progressPercentage: data.progress_percentage,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // Generate session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate assistance ID
  private generateAssistanceId(): string {
    return `assist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default OnboardingCopilotService;
