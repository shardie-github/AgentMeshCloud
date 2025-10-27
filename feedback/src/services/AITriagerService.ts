import OpenAI from 'openai';
import { config } from '../config';
import logger from '../utils/logger';
import { FeedbackSubmission, FeedbackTriagerResult, ProcessedFeedback } from '../types';

export class AITriagerService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  async triageFeedback(feedback: FeedbackSubmission): Promise<FeedbackTriagerResult> {
    try {
      logger.info('Starting AI triaging for feedback', { 
        tenantId: feedback.tenantId,
        feedbackType: feedback.feedbackType 
      });

      // Generate embedding for similarity search
      const embedding = await this.generateEmbedding(
        `${feedback.title} ${feedback.description}`
      );

      // Analyze sentiment and urgency
      const analysis = await this.analyzeFeedback(feedback);

      // Extract themes
      const themes = await this.extractThemes(feedback);

      // Determine priority based on analysis
      const priority = this.determinePriority(analysis, feedback.feedbackType);

      // Find similar feedback
      const similarFeedback = await this.findSimilarFeedback(feedback, embedding);

      const result: FeedbackTriagerResult = {
        themes,
        sentimentScore: analysis.sentiment,
        urgencyScore: analysis.urgency,
        priority,
        confidence: analysis.confidence,
        suggestedAssignee: analysis.suggestedAssignee,
        similarFeedback: similarFeedback.map(f => f.id)
      };

      logger.info('AI triaging completed', { 
        tenantId: feedback.tenantId,
        themes: result.themes,
        priority: result.priority,
        confidence: result.confidence
      });

      return result;
    } catch (error) {
      logger.error('Error in AI triaging:', error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: config.openai.embeddingModel,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  private async analyzeFeedback(feedback: FeedbackSubmission): Promise<{
    sentiment: number;
    urgency: number;
    confidence: number;
    suggestedAssignee?: string;
  }> {
    try {
      const prompt = `
Analyze the following user feedback and provide insights:

Title: ${feedback.title}
Description: ${feedback.description}
Type: ${feedback.feedbackType}
Context: ${JSON.stringify(feedback.context || {})}

Please analyze and respond with a JSON object containing:
1. sentiment: A score from -1 (very negative) to 1 (very positive)
2. urgency: A score from 0 (not urgent) to 1 (very urgent)
3. confidence: A score from 0 to 1 indicating confidence in the analysis
4. suggestedAssignee: The team/department that should handle this (optional)

Consider the following factors:
- Sentiment: Overall emotional tone and satisfaction level
- Urgency: How quickly this needs to be addressed
- Type: Bug reports are typically more urgent than feature requests
- Context: User journey and feature context
- Language: Strong emotional language indicates higher urgency

Respond with only the JSON object, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert product manager and customer success specialist. Analyze user feedback with precision and provide actionable insights.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        sentiment: analysis.sentiment || 0,
        urgency: analysis.urgency || 0.5,
        confidence: analysis.confidence || 0.7,
        suggestedAssignee: analysis.suggestedAssignee
      };
    } catch (error) {
      logger.error('Error analyzing feedback:', error);
      // Return default values if analysis fails
      return {
        sentiment: 0,
        urgency: 0.5,
        confidence: 0.5
      };
    }
  }

  private async extractThemes(feedback: FeedbackSubmission): Promise<string[]> {
    try {
      const prompt = `
Extract key themes and topics from this user feedback:

Title: ${feedback.title}
Description: ${feedback.description}
Type: ${feedback.feedbackType}

Extract 3-5 key themes that categorize this feedback. Themes should be:
- Specific and actionable
- Relevant to product development
- Broad enough to group similar feedback
- Use lowercase with underscores (e.g., "ui_navigation", "performance_issues", "feature_request")

Examples of good themes:
- ui_navigation
- performance_issues
- feature_request
- bug_report
- user_onboarding
- data_export
- mobile_experience
- api_integration

Respond with only a JSON array of theme strings, no additional text.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at categorizing and tagging user feedback. Extract meaningful themes that help with product development and customer success.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 200
      });

      const themes = JSON.parse(response.choices[0].message.content || '[]');
      
      // Validate and limit themes
      const validThemes = Array.isArray(themes) 
        ? themes.slice(0, config.triager.maxThemesPerFeedback)
        : [];

      return validThemes.filter(theme => 
        typeof theme === 'string' && 
        theme.length > 0 && 
        theme.length < 50
      );
    } catch (error) {
      logger.error('Error extracting themes:', error);
      // Return default themes based on feedback type
      return this.getDefaultThemes(feedback.feedbackType);
    }
  }

  private getDefaultThemes(feedbackType: string): string[] {
    const defaultThemes: Record<string, string[]> = {
      bug: ['bug_report', 'technical_issue'],
      feature_request: ['feature_request', 'enhancement'],
      ux_issue: ['user_experience', 'ui_issue'],
      performance: ['performance_issue', 'optimization'],
      general: ['general_feedback', 'support'],
      praise: ['positive_feedback', 'appreciation']
    };

    return defaultThemes[feedbackType] || ['general_feedback'];
  }

  private determinePriority(
    analysis: { sentiment: number; urgency: number; confidence: number },
    feedbackType: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const { urgency, sentiment, confidence } = analysis;

    // Critical: High urgency, low sentiment, high confidence
    if (urgency >= 0.8 && sentiment <= -0.5 && confidence >= 0.7) {
      return 'critical';
    }

    // High: High urgency OR very negative sentiment
    if (urgency >= 0.7 || sentiment <= -0.7) {
      return 'high';
    }

    // Medium: Moderate urgency or negative sentiment
    if (urgency >= 0.4 || sentiment <= -0.2) {
      return 'medium';
    }

    // Low: Everything else
    return 'low';
  }

  private async findSimilarFeedback(
    feedback: FeedbackSubmission,
    embedding: number[]
  ): Promise<Array<{ id: string; similarity: number }>> {
    try {
      // This would typically use the SupabaseService to search for similar feedback
      // For now, return empty array as placeholder
      logger.info('Similar feedback search not implemented yet');
      return [];
    } catch (error) {
      logger.error('Error finding similar feedback:', error);
      return [];
    }
  }

  async batchTriageFeedback(feedbackList: FeedbackSubmission[]): Promise<FeedbackTriagerResult[]> {
    try {
      logger.info('Starting batch triaging', { count: feedbackList.length });

      const results = await Promise.allSettled(
        feedbackList.map(feedback => this.triageFeedback(feedback))
      );

      const successfulResults: FeedbackTriagerResult[] = [];
      const failedCount = results.filter(result => result.status === 'rejected').length;

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
        } else {
          logger.error('Failed to triage feedback in batch', {
            index,
            error: result.status === 'rejected' ? result.reason : 'Unknown error'
          });
        }
      });

      logger.info('Batch triaging completed', {
        total: feedbackList.length,
        successful: successfulResults.length,
        failed: failedCount
      });

      return successfulResults;
    } catch (error) {
      logger.error('Error in batch triaging:', error);
      throw error;
    }
  }

  async generateInsights(feedbackList: ProcessedFeedback[]): Promise<{
    topThemes: Array<{ theme: string; count: number; trend: string }>;
    sentimentTrend: Array<{ date: string; average: number }>;
    priorityDistribution: Record<string, number>;
    recommendations: string[];
  }> {
    try {
      logger.info('Generating insights from feedback', { count: feedbackList.length });

      // Analyze themes
      const themeCounts: Record<string, number> = {};
      feedbackList.forEach(feedback => {
        feedback.themes.forEach(theme => {
          themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
      });

      const topThemes = Object.entries(themeCounts)
        .map(([theme, count]) => ({ theme, count, trend: 'stable' }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Analyze sentiment trend
      const sentimentByDate: Record<string, number[]> = {};
      feedbackList.forEach(feedback => {
        if (feedback.sentimentScore !== null) {
          const date = feedback.createdAt.toISOString().split('T')[0];
          if (!sentimentByDate[date]) {
            sentimentByDate[date] = [];
          }
          sentimentByDate[date].push(feedback.sentimentScore);
        }
      });

      const sentimentTrend = Object.entries(sentimentByDate)
        .map(([date, scores]) => ({
          date,
          average: scores.reduce((a, b) => a + b, 0) / scores.length
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Analyze priority distribution
      const priorityDistribution: Record<string, number> = {};
      feedbackList.forEach(feedback => {
        priorityDistribution[feedback.priority] = 
          (priorityDistribution[feedback.priority] || 0) + 1;
      });

      // Generate recommendations using AI
      const recommendations = await this.generateRecommendations(feedbackList, topThemes);

      return {
        topThemes,
        sentimentTrend,
        priorityDistribution,
        recommendations
      };
    } catch (error) {
      logger.error('Error generating insights:', error);
      throw error;
    }
  }

  private async generateRecommendations(
    feedbackList: ProcessedFeedback[],
    topThemes: Array<{ theme: string; count: number }>
  ): Promise<string[]> {
    try {
      const prompt = `
Based on the following user feedback analysis, provide 5 actionable recommendations for product improvement:

Top Themes:
${topThemes.map(t => `- ${t.theme}: ${t.count} occurrences`).join('\n')}

Total Feedback: ${feedbackList.length}
Average Sentiment: ${feedbackList.reduce((sum, f) => sum + (f.sentimentScore || 0), 0) / feedbackList.length}

Provide 5 specific, actionable recommendations that address the most critical issues identified in the feedback. Each recommendation should be:
1. Specific and measurable
2. Address the root cause of user concerns
3. Include a suggested timeline (short/medium/long term)
4. Be prioritized by impact and effort

Format as a JSON array of recommendation strings.
`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert product manager. Provide actionable recommendations based on user feedback analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 800
      });

      const recommendations = JSON.parse(response.choices[0].message.content || '[]');
      return Array.isArray(recommendations) ? recommendations : [];
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return [
        'Review and prioritize the top themes for immediate attention',
        'Implement user feedback collection improvements',
        'Create dedicated channels for different feedback types',
        'Establish regular feedback review processes',
        'Develop user satisfaction tracking mechanisms'
      ];
    }
  }
}

export default AITriagerService;
