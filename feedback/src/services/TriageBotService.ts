/**
 * Triage Bot Service
 * Auto-classifies and labels feedback/issues using NLP and heuristics
 */

import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../utils/logger';

export interface FeedbackItem {
  id: string;
  user_id: string;
  content: string;
  type?: string;
  category?: string;
  sentiment?: string;
  priority?: string;
  labels?: string[];
  created_at: string;
}

export interface TriageResult {
  category: 'ops' | 'ux' | 'bug' | 'feature' | 'performance' | 'security' | 'other';
  priority: 'low' | 'medium' | 'high' | 'critical';
  sentiment: 'positive' | 'neutral' | 'negative';
  labels: string[];
  confidence: number;
  reasoning: string;
}

export class TriageBotService {
  private supabase: SupabaseClient;

  // Keywords for classification
  private readonly CATEGORY_KEYWORDS = {
    ops: ['down', 'outage', 'unavailable', 'crash', 'timeout', 'latency', 'slow', 'error', '500', '503'],
    ux: ['confusing', 'unclear', 'hard to', 'difficult', 'ui', 'interface', 'design', 'usability'],
    bug: ['bug', 'broken', 'not working', 'issue', 'problem', 'incorrect', 'wrong', 'fails'],
    feature: ['request', 'add', 'enhancement', 'would be nice', 'suggestion', 'could you', 'wish'],
    performance: ['slow', 'laggy', 'performance', 'speed', 'optimize', 'faster', 'loading'],
    security: ['security', 'vulnerability', 'exploit', 'hack', 'breach', 'unsafe', 'permission'],
  };

  private readonly SENTIMENT_KEYWORDS = {
    positive: ['great', 'love', 'excellent', 'amazing', 'wonderful', 'fantastic', 'helpful', 'thank'],
    negative: ['hate', 'terrible', 'awful', 'frustrated', 'angry', 'disappointed', 'poor', 'worst'],
  };

  private readonly PRIORITY_KEYWORDS = {
    critical: ['critical', 'urgent', 'blocker', 'production down', 'cannot work', 'emergency'],
    high: ['important', 'serious', 'major', 'blocking', 'unable to', 'cannot'],
    medium: ['should', 'would like', 'improvement', 'moderate'],
  };

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Triage a single feedback item
   */
  async triageFeedback(feedbackId: string): Promise<TriageResult> {
    // Fetch feedback
    const { data: feedback, error } = await this.supabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (error || !feedback) {
      throw new Error(`Feedback not found: ${feedbackId}`);
    }

    const content = feedback.content.toLowerCase();

    // Classify
    const category = this.classifyCategory(content);
    const priority = this.classifyPriority(content);
    const sentiment = this.classifySentiment(content);
    const labels = this.extractLabels(content, category);

    const result: TriageResult = {
      category,
      priority,
      sentiment,
      labels,
      confidence: this.calculateConfidence(content, category, priority),
      reasoning: this.generateReasoning(category, priority, sentiment),
    };

    // Update feedback with triage results
    await this.supabase
      .from('feedback')
      .update({
        category: result.category,
        priority: result.priority,
        sentiment: result.sentiment,
        labels: result.labels,
        triaged_at: new Date().toISOString(),
        triage_confidence: result.confidence,
      })
      .eq('id', feedbackId);

    logger.info('Feedback triaged', { feedbackId, result });

    return result;
  }

  /**
   * Batch triage untriaged feedback
   */
  async triageUntriaged(limit: number = 100): Promise<number> {
    // Fetch untriaged feedback
    const { data: feedbackItems, error } = await this.supabase
      .from('feedback')
      .select('id')
      .is('triaged_at', null)
      .limit(limit);

    if (error || !feedbackItems) {
      logger.error('Failed to fetch untriaged feedback', { error });
      return 0;
    }

    logger.info(`Triaging ${feedbackItems.length} feedback items...`);

    let successCount = 0;
    for (const item of feedbackItems) {
      try {
        await this.triageFeedback(item.id);
        successCount++;
      } catch (err) {
        logger.error('Failed to triage feedback', { feedbackId: item.id, error: err });
      }
    }

    logger.info(`Triage complete: ${successCount}/${feedbackItems.length} succeeded`);
    return successCount;
  }

  /**
   * Classify category using keyword matching
   */
  private classifyCategory(content: string): TriageResult['category'] {
    const scores: Record<string, number> = {};

    for (const [category, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
      scores[category] = keywords.filter((keyword) => content.includes(keyword)).length;
    }

    // Find category with highest score
    const topCategory = Object.entries(scores).reduce((max, [cat, score]) =>
      score > max.score ? { category: cat, score } : max
    , { category: 'other', score: 0 });

    return topCategory.category as TriageResult['category'];
  }

  /**
   * Classify priority
   */
  private classifyPriority(content: string): TriageResult['priority'] {
    for (const [priority, keywords] of Object.entries(this.PRIORITY_KEYWORDS)) {
      if (keywords.some((keyword) => content.includes(keyword))) {
        return priority as TriageResult['priority'];
      }
    }

    // Default to low
    return 'low';
  }

  /**
   * Classify sentiment
   */
  private classifySentiment(content: string): TriageResult['sentiment'] {
    const positiveCount = this.SENTIMENT_KEYWORDS.positive.filter((kw) => content.includes(kw)).length;
    const negativeCount = this.SENTIMENT_KEYWORDS.negative.filter((kw) => content.includes(kw)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract relevant labels
   */
  private extractLabels(content: string, category: string): string[] {
    const labels: Set<string> = new Set([category]);

    // Add component labels
    if (content.includes('api')) labels.add('api');
    if (content.includes('ui') || content.includes('frontend')) labels.add('frontend');
    if (content.includes('database') || content.includes('db')) labels.add('database');
    if (content.includes('auth')) labels.add('authentication');
    if (content.includes('billing') || content.includes('payment')) labels.add('billing');

    return Array.from(labels);
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(content: string, category: string, priority: string): number {
    const keywords = this.CATEGORY_KEYWORDS[category as keyof typeof this.CATEGORY_KEYWORDS] || [];
    const matches = keywords.filter((kw) => content.includes(kw)).length;

    // Base confidence on keyword matches
    const baseConfidence = Math.min(matches * 0.2, 0.8);

    // Boost if content is detailed (more words)
    const wordCount = content.split(/\s+/).length;
    const detailBonus = Math.min(wordCount / 100, 0.2);

    return Math.min(baseConfidence + detailBonus, 1.0);
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    category: string,
    priority: string,
    sentiment: string
  ): string {
    return `Classified as ${category} with ${priority} priority based on keyword analysis. Sentiment: ${sentiment}.`;
  }

  /**
   * Get triage statistics
   */
  async getTriageStats(): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_triage_stats');

    if (error) {
      logger.error('Failed to get triage stats', { error });
      return null;
    }

    return data;
  }
}

export default TriageBotService;
