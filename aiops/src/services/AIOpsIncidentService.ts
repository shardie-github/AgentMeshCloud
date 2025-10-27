import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { config } from '../config';
import logger from '../utils/logger';
import { AIOpsIncident, AutoOptimizationJob } from '../types';

export class AIOpsIncidentService {
  private supabase: any;
  private openai: OpenAI;

  constructor() {
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  // Create new incident
  async createIncident(incident: Omit<AIOpsIncident, 'id' | 'createdAt' | 'updatedAt'>): Promise<AIOpsIncident> {
    try {
      const incidentId = this.generateIncidentId();
      
      const incidentData = {
        ...incident,
        incident_id: incidentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('aiops_incidents')
        .insert(incidentData)
        .select()
        .single();

      if (error) {
        logger.error('Error creating incident:', error);
        throw error;
      }

      // Start AI analysis
      this.analyzeIncidentAsync(data.id, incident);

      logger.info('Incident created', { id: data.id, incidentId });
      return data;
    } catch (error) {
      logger.error('Error creating incident:', error);
      throw error;
    }
  }

  // Analyze incident with AI
  private async analyzeIncidentAsync(incidentId: string, incident: Omit<AIOpsIncident, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      logger.info('Starting AI incident analysis', { incidentId });

      // Analyze root cause
      const rootCauseAnalysis = await this.analyzeRootCause(incident);
      
      // Generate resolution steps
      const resolutionSteps = await this.generateResolutionSteps(incident, rootCauseAnalysis);
      
      // Determine if auto-resolution is possible
      const autoResolvable = await this.canAutoResolve(incident, rootCauseAnalysis);
      
      // Generate AI insights
      const aiInsights = await this.generateAIInsights(incident, rootCauseAnalysis);

      // Update incident with AI analysis
      const updates = {
        root_cause: rootCauseAnalysis.rootCause,
        resolution_steps: resolutionSteps,
        auto_resolved: autoResolvable,
        ai_insights: aiInsights,
        status: autoResolvable ? 'resolved' : 'identified',
        updated_at: new Date().toISOString()
      };

      if (autoResolvable) {
        updates.resolved_at = new Date().toISOString();
      }

      await this.supabase
        .from('aiops_incidents')
        .update(updates)
        .eq('id', incidentId);

      logger.info('AI incident analysis completed', { 
        incidentId, 
        autoResolvable,
        rootCause: rootCauseAnalysis.rootCause
      });

    } catch (error) {
      logger.error('Error in AI incident analysis:', error);
      
      // Update incident status to indicate analysis failed
      try {
        await this.supabase
          .from('aiops_incidents')
          .update({ 
            status: 'open',
            updated_at: new Date().toISOString()
          })
          .eq('id', incidentId);
      } catch (updateError) {
        logger.error('Failed to update incident status after analysis error:', updateError);
      }
    }
  }

  // Analyze root cause using AI
  private async analyzeRootCause(incident: Omit<AIOpsIncident, 'id' | 'createdAt' | 'updatedAt'>): Promise<{
    rootCause: string;
    confidence: number;
    relatedIncidents: string[];
  }> {
    try {
      const prompt = `
Analyze the following incident and determine the root cause:

Title: ${incident.title}
Description: ${incident.description}
Severity: ${incident.severity}
Affected Services: ${incident.affectedServices.join(', ')}
Metrics: ${JSON.stringify(incident.metrics)}

Provide a JSON response with:
1. rootCause: A detailed explanation of the likely root cause
2. confidence: A score from 0 to 1 indicating confidence in the analysis
3. relatedIncidents: Array of similar incident patterns (if any)

Consider common causes like:
- Infrastructure issues (CPU, memory, disk, network)
- Application bugs or performance issues
- Configuration problems
- External service dependencies
- Data corruption or consistency issues
- Security incidents
- Resource exhaustion

Respond with only the JSON object, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert DevOps engineer and incident response specialist. Analyze incidents with precision and provide actionable root cause analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 800
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        rootCause: analysis.rootCause || 'Unable to determine root cause',
        confidence: analysis.confidence || 0.5,
        relatedIncidents: analysis.relatedIncidents || []
      };
    } catch (error) {
      logger.error('Error analyzing root cause:', error);
      return {
        rootCause: 'Analysis failed - manual investigation required',
        confidence: 0.1,
        relatedIncidents: []
      };
    }
  }

  // Generate resolution steps
  private async generateResolutionSteps(
    incident: Omit<AIOpsIncident, 'id' | 'createdAt' | 'updatedAt'>,
    rootCauseAnalysis: { rootCause: string; confidence: number }
  ): Promise<string[]> {
    try {
      const prompt = `
Based on the following incident and root cause analysis, provide step-by-step resolution instructions:

Incident: ${incident.title}
Description: ${incident.description}
Root Cause: ${rootCauseAnalysis.rootCause}
Affected Services: ${incident.affectedServices.join(', ')}
Severity: ${incident.severity}

Provide a JSON array of resolution steps. Each step should be:
1. Specific and actionable
2. Ordered by priority
3. Include verification steps
4. Consider rollback procedures

Format as: ["Step 1: ...", "Step 2: ...", ...]
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert incident response engineer. Provide clear, actionable resolution steps for system incidents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1000
      });

      const steps = JSON.parse(response.choices[0].message.content || '[]');
      return Array.isArray(steps) ? steps : ['Manual investigation required'];
    } catch (error) {
      logger.error('Error generating resolution steps:', error);
      return ['Manual investigation required'];
    }
  }

  // Determine if incident can be auto-resolved
  private async canAutoResolve(
    incident: Omit<AIOpsIncident, 'id' | 'createdAt' | 'updatedAt'>,
    rootCauseAnalysis: { rootCause: string; confidence: number }
  ): Promise<boolean> {
    try {
      // Simple heuristics for auto-resolution
      const autoResolvablePatterns = [
        'memory leak',
        'resource exhaustion',
        'configuration issue',
        'temporary network issue',
        'cache invalidation',
        'restart service'
      ];

      const rootCause = rootCauseAnalysis.rootCause.toLowerCase();
      const isAutoResolvable = autoResolvablePatterns.some(pattern => 
        rootCause.includes(pattern)
      );

      // Only auto-resolve if confidence is high and pattern matches
      return isAutoResolvable && rootCauseAnalysis.confidence > 0.7;
    } catch (error) {
      logger.error('Error determining auto-resolution capability:', error);
      return false;
    }
  }

  // Generate AI insights
  private async generateAIInsights(
    incident: Omit<AIOpsIncident, 'id' | 'createdAt' | 'updatedAt'>,
    rootCauseAnalysis: { rootCause: string; confidence: number }
  ): Promise<Record<string, any>> {
    try {
      const prompt = `
Analyze this incident and provide insights for prevention and improvement:

Incident: ${incident.title}
Root Cause: ${rootCauseAnalysis.rootCause}
Affected Services: ${incident.affectedServices.join(', ')}
Severity: ${incident.severity}

Provide a JSON object with:
1. preventionStrategies: Array of strategies to prevent similar incidents
2. monitoringImprovements: Suggestions for better monitoring/alerting
3. processImprovements: Process or procedure improvements
4. riskAssessment: Risk level and potential impact
5. lessonsLearned: Key takeaways from this incident

Respond with only the JSON object, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert in incident management and continuous improvement. Provide actionable insights for preventing and better managing incidents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 1200
      });

      const insights = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        ...insights,
        analysisTimestamp: new Date().toISOString(),
        confidence: rootCauseAnalysis.confidence
      };
    } catch (error) {
      logger.error('Error generating AI insights:', error);
      return {
        preventionStrategies: ['Implement better monitoring'],
        monitoringImprovements: ['Add more granular alerts'],
        processImprovements: ['Review incident response procedures'],
        riskAssessment: 'Medium',
        lessonsLearned: ['Manual analysis required'],
        analysisTimestamp: new Date().toISOString(),
        confidence: 0.1
      };
    }
  }

  // Get incident statistics
  async getIncidentStats(tenantId: string, timePeriod: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<{
    totalIncidents: number;
    resolvedIncidents: number;
    autoResolvedIncidents: number;
    averageResolutionTime: number;
    incidentsBySeverity: Record<string, number>;
    topAffectedServices: Array<{ service: string; count: number }>;
  }> {
    try {
      const timeFilter = this.getTimeFilter(timePeriod);
      
      const { data: incidents } = await this.supabase
        .from('aiops_incidents')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', timeFilter);

      if (!incidents) return this.getEmptyStats();

      const stats = {
        totalIncidents: incidents.length,
        resolvedIncidents: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
        autoResolvedIncidents: incidents.filter(i => i.auto_resolved).length,
        averageResolutionTime: 0,
        incidentsBySeverity: {} as Record<string, number>,
        topAffectedServices: [] as Array<{ service: string; count: number }>
      };

      // Calculate resolution time
      const resolvedIncidents = incidents.filter(i => i.resolved_at);
      if (resolvedIncidents.length > 0) {
        const totalResolutionTime = resolvedIncidents.reduce((sum, incident) => {
          const created = new Date(incident.created_at);
          const resolved = new Date(incident.resolved_at);
          return sum + (resolved.getTime() - created.getTime());
        }, 0);
        
        stats.averageResolutionTime = totalResolutionTime / resolvedIncidents.length / (1000 * 60); // minutes
      }

      // Count by severity
      incidents.forEach(incident => {
        stats.incidentsBySeverity[incident.severity] = 
          (stats.incidentsBySeverity[incident.severity] || 0) + 1;
      });

      // Top affected services
      const serviceCounts: Record<string, number> = {};
      incidents.forEach(incident => {
        incident.affected_services.forEach((service: string) => {
          serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
      });

      stats.topAffectedServices = Object.entries(serviceCounts)
        .map(([service, count]) => ({ service, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return stats;
    } catch (error) {
      logger.error('Error getting incident stats:', error);
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
      totalIncidents: 0,
      resolvedIncidents: 0,
      autoResolvedIncidents: 0,
      averageResolutionTime: 0,
      incidentsBySeverity: {},
      topAffectedServices: []
    };
  }

  private generateIncidentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `INC-${timestamp}-${random}`.toUpperCase();
  }
}

export default AIOpsIncidentService;
