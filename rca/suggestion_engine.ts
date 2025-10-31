/**
 * Suggestion Engine
 * Recommends mitigation playbooks based on similar past incidents
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { EmbeddingIndexer } from './embedding_index';

export interface MitigationSuggestion {
  incident_id: string;
  incident_title: string;
  similarity_score: number;
  root_cause: string;
  resolution: string;
  preventive_actions: string[];
  time_to_resolve_minutes: number;
  relevance_score: number;
}

export interface PlaybookRecommendation {
  query: string;
  suggestions: MitigationSuggestion[];
  confidence: number;
  recommended_playbook?: string;
  immediate_actions: string[];
}

export class SuggestionEngine {
  private supabase: SupabaseClient;
  private embeddingIndexer: EmbeddingIndexer;

  constructor(supabaseUrl: string, supabaseKey: string, embeddingIndexer: EmbeddingIndexer) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.embeddingIndexer = embeddingIndexer;
  }

  /**
   * Get mitigation suggestions for a new incident/anomaly
   */
  async getSuggestions(description: string, context?: any): Promise<PlaybookRecommendation> {
    console.log(`🔍 Getting suggestions for: ${description.substring(0, 100)}...`);

    // Search for similar incidents
    const similarIncidents = await this.embeddingIndexer.searchSimilar(description, 10);

    if (similarIncidents.length === 0) {
      console.log('No similar incidents found');
      return {
        query: description,
        suggestions: [],
        confidence: 0,
        immediate_actions: ['Create new incident postmortem after resolution'],
      };
    }

    // Fetch full incident details
    const suggestions: MitigationSuggestion[] = [];

    for (const similar of similarIncidents) {
      const { data: incident } = await this.supabase
        .from('incidents')
        .select('*')
        .eq('id', similar.incident_id)
        .single();

      if (incident) {
        const timeToResolve = incident.resolved_at
          ? (new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / 60000
          : 0;

        suggestions.push({
          incident_id: incident.id,
          incident_title: incident.title,
          similarity_score: similar.similarity,
          root_cause: incident.root_cause,
          resolution: incident.resolution,
          preventive_actions: incident.preventive_actions || [],
          time_to_resolve_minutes: timeToResolve,
          relevance_score: this.calculateRelevanceScore(incident, context, similar.similarity),
        });
      }
    }

    // Sort by relevance
    suggestions.sort((a, b) => b.relevance_score - a.relevance_score);

    // Calculate confidence
    const confidence = this.calculateConfidence(suggestions);

    // Generate immediate actions
    const immediateActions = this.generateImmediateActions(suggestions);

    // Recommend playbook
    const recommendedPlaybook = this.recommendPlaybook(suggestions);

    return {
      query: description,
      suggestions: suggestions.slice(0, 5), // Top 5
      confidence,
      recommended_playbook: recommendedPlaybook,
      immediate_actions: immediateActions,
    };
  }

  /**
   * Calculate relevance score combining similarity and context
   */
  private calculateRelevanceScore(
    incident: any,
    context: any | undefined,
    similarityScore: number
  ): number {
    let score = similarityScore * 100; // Base score from similarity

    // Boost if same severity
    if (context?.severity && incident.severity === context.severity) {
      score += 10;
    }

    // Boost if same affected services
    if (context?.affected_services) {
      const commonServices = incident.affected_services?.filter((s: string) =>
        context.affected_services.includes(s)
      );
      if (commonServices && commonServices.length > 0) {
        score += commonServices.length * 5;
      }
    }

    // Boost recent incidents
    const daysAgo = (Date.now() - new Date(incident.started_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 30) {
      score += 10;
    } else if (daysAgo < 90) {
      score += 5;
    }

    // Boost if quick resolution
    if (incident.resolved_at) {
      const timeToResolve =
        (new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) /
        60000;
      if (timeToResolve < 60) {
        score += 10; // Resolved in < 1 hour
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Calculate overall confidence in suggestions
   */
  private calculateConfidence(suggestions: MitigationSuggestion[]): number {
    if (suggestions.length === 0) return 0;

    // Average of top 3 relevance scores
    const topScores = suggestions.slice(0, 3).map((s) => s.relevance_score);
    const avgScore = topScores.reduce((sum, s) => sum + s, 0) / topScores.length;

    // Boost if multiple high-scoring suggestions
    const highScoreCount = suggestions.filter((s) => s.relevance_score > 70).length;
    const diversityBoost = Math.min(highScoreCount * 5, 20);

    return Math.min(avgScore + diversityBoost, 100);
  }

  /**
   * Generate immediate action items
   */
  private generateImmediateActions(suggestions: MitigationSuggestion[]): string[] {
    if (suggestions.length === 0) {
      return [
        'Gather incident details and symptoms',
        'Check system health dashboards',
        'Review recent deployments',
        'Contact on-call engineer',
      ];
    }

    const actions = new Set<string>();

    // Extract common resolution steps
    suggestions.slice(0, 3).forEach((suggestion) => {
      // Parse resolution for action verbs
      const resolution = suggestion.resolution.toLowerCase();

      if (resolution.includes('restart')) {
        actions.add('Consider restarting affected service');
      }
      if (resolution.includes('rollback')) {
        actions.add('Check if recent deployment needs rollback');
      }
      if (resolution.includes('scale') || resolution.includes('capacity')) {
        actions.add('Review capacity and consider scaling resources');
      }
      if (resolution.includes('cache')) {
        actions.add('Clear cache or restart caching layer');
      }
      if (resolution.includes('database') || resolution.includes('query')) {
        actions.add('Check database performance and slow queries');
      }
      if (resolution.includes('network')) {
        actions.add('Verify network connectivity and firewall rules');
      }
    });

    // Add generic actions
    actions.add(`Review similar incident: ${suggestions[0].incident_title}`);
    actions.add('Follow incident response playbook');

    return Array.from(actions).slice(0, 6);
  }

  /**
   * Recommend specific playbook based on patterns
   */
  private recommendPlaybook(suggestions: MitigationSuggestion[]): string | undefined {
    if (suggestions.length === 0) return undefined;

    // Analyze root causes to recommend playbook
    const rootCauses = suggestions.map((s) => s.root_cause.toLowerCase());

    if (rootCauses.some((rc) => rc.includes('database') || rc.includes('query'))) {
      return 'database-performance-playbook';
    }

    if (rootCauses.some((rc) => rc.includes('deployment') || rc.includes('release'))) {
      return 'rollback-playbook';
    }

    if (rootCauses.some((rc) => rc.includes('capacity') || rc.includes('scale'))) {
      return 'scaling-playbook';
    }

    if (rootCauses.some((rc) => rc.includes('memory') || rc.includes('oom'))) {
      return 'memory-leak-playbook';
    }

    if (rootCauses.some((rc) => rc.includes('network') || rc.includes('timeout'))) {
      return 'network-troubleshooting-playbook';
    }

    if (rootCauses.some((rc) => rc.includes('auth') || rc.includes('permission'))) {
      return 'auth-troubleshooting-playbook';
    }

    return 'general-incident-response-playbook';
  }

  /**
   * Get suggestion for anomaly detected by anomaly detector
   */
  async getSuggestionForAnomaly(anomaly: any): Promise<PlaybookRecommendation> {
    const description = `${anomaly.anomaly_type} detected for ${anomaly.metric_name} on ${anomaly.service}: ${anomaly.description}`;

    const context = {
      severity: anomaly.severity,
      affected_services: [anomaly.service],
      metric: anomaly.metric_name,
    };

    return this.getSuggestions(description, context);
  }

  /**
   * Learn from resolved incident (feedback loop)
   */
  async learnFromResolution(incidentId: string, wasHelpful: boolean, feedback?: string): Promise<void> {
    console.log(`📚 Learning from resolution: ${incidentId} (helpful: ${wasHelpful})`);

    await this.supabase.from('suggestion_feedback').insert({
      incident_id: incidentId,
      was_helpful: wasHelpful,
      feedback: feedback,
      created_at: new Date().toISOString(),
    });

    // TODO: Use feedback to improve relevance scoring
  }

  /**
   * Get suggestion statistics
   */
  async getStatistics(): Promise<any> {
    const { data: stats } = await this.supabase.rpc('get_suggestion_stats');
    return stats;
  }
}

/**
 * Factory function
 */
export function createSuggestionEngine(): SuggestionEngine | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, suggestion engine disabled');
    return null;
  }

  const embeddingIndexer = new EmbeddingIndexer(
    supabaseUrl,
    supabaseKey,
    process.env.OPENAI_API_KEY
  );

  return new SuggestionEngine(supabaseUrl, supabaseKey, embeddingIndexer);
}

export default SuggestionEngine;
