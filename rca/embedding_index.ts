/**
 * Embedding Index
 * Generates and indexes embeddings for RCA search using pgvector
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export interface EmbeddingRecord {
  incident_id: string;
  embedding: number[];
  text_content: string;
  metadata: Record<string, any>;
}

export class EmbeddingIndexer {
  private supabase: SupabaseClient;
  private openai: OpenAI | null = null;

  constructor(supabaseUrl: string, supabaseKey: string, openaiKey?: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);

    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  /**
   * Generate and store embedding for an incident
   */
  async indexIncident(incidentId: string): Promise<void> {
    console.log(`🔄 Generating embedding for incident ${incidentId}`);

    // Fetch incident
    const { data: incident, error } = await this.supabase
      .from('incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (error || !incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    // Prepare text for embedding
    const textContent = this.prepareTextForEmbedding(incident);

    // Generate embedding
    const embedding = await this.generateEmbedding(textContent);

    // Store embedding
    await this.storeEmbedding({
      incident_id: incidentId,
      embedding,
      text_content: textContent,
      metadata: {
        title: incident.title,
        severity: incident.severity,
        tags: incident.tags,
        affected_services: incident.affected_services,
      },
    });

    // Mark as indexed
    await this.supabase
      .from('embedding_queue')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('incident_id', incidentId);

    console.log(`✅ Embedding indexed for incident ${incidentId}`);
  }

  /**
   * Process pending embeddings from queue
   */
  async processPendingEmbeddings(batchSize: number = 10): Promise<number> {
    console.log('🔄 Processing pending embeddings...');

    const { data: pending, error } = await this.supabase
      .from('embedding_queue')
      .select('incident_id')
      .eq('status', 'pending')
      .limit(batchSize);

    if (error || !pending || pending.length === 0) {
      console.log('No pending embeddings');
      return 0;
    }

    let successCount = 0;
    for (const item of pending) {
      try {
        await this.indexIncident(item.incident_id);
        successCount++;
      } catch (error) {
        console.error(`Failed to index incident ${item.incident_id}:`, error);
      }
    }

    console.log(`✅ Processed ${successCount}/${pending.length} embeddings`);
    return successCount;
  }

  /**
   * Prepare incident text for embedding
   */
  private prepareTextForEmbedding(incident: any): string {
    const parts = [
      `Title: ${incident.title}`,
      `Description: ${incident.description}`,
      `Root Cause: ${incident.root_cause}`,
      `Resolution: ${incident.resolution}`,
    ];

    if (incident.contributing_factors && incident.contributing_factors.length > 0) {
      parts.push(`Contributing Factors: ${incident.contributing_factors.join(', ')}`);
    }

    if (incident.preventive_actions && incident.preventive_actions.length > 0) {
      parts.push(`Preventive Actions: ${incident.preventive_actions.join(', ')}`);
    }

    return parts.join('\n\n');
  }

  /**
   * Generate embedding using OpenAI or fallback method
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (this.openai) {
      try {
        const response = await this.openai.embeddings.create({
          model: 'text-embedding-ada-002',
          input: text,
        });

        return response.data[0].embedding;
      } catch (error) {
        console.warn('OpenAI embedding failed, using fallback:', error);
      }
    }

    // Fallback: Simple hash-based embedding (not ideal but works)
    return this.generateFallbackEmbedding(text);
  }

  /**
   * Generate simple fallback embedding
   */
  private generateFallbackEmbedding(text: string): number[] {
    const dimension = 384; // Match common embedding dimensions
    const embedding = new Array(dimension).fill(0);

    // Simple word frequency based embedding
    const words = text.toLowerCase().split(/\s+/);
    words.forEach((word, idx) => {
      const hash = this.hashString(word);
      embedding[hash % dimension] += 1;
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map((val) => val / (magnitude || 1));
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Store embedding in database
   */
  private async storeEmbedding(record: EmbeddingRecord): Promise<void> {
    const { error } = await this.supabase.from('incident_embeddings').upsert({
      incident_id: record.incident_id,
      embedding: JSON.stringify(record.embedding), // pgvector expects array format
      text_content: record.text_content,
      metadata: record.metadata,
      indexed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to store embedding:', error);
      throw error;
    }
  }

  /**
   * Search similar incidents using vector similarity
   */
  async searchSimilar(queryText: string, limit: number = 5): Promise<any[]> {
    console.log(`🔍 Searching for incidents similar to: ${queryText.substring(0, 100)}...`);

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Use pgvector similarity search
    const { data, error } = await this.supabase.rpc('search_similar_incidents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_limit: limit,
      match_threshold: 0.5, // Cosine similarity threshold
    });

    if (error) {
      console.error('Failed to search similar incidents:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Re-index all incidents
   */
  async reindexAll(): Promise<number> {
    console.log('🔄 Re-indexing all incidents...');

    const { data: incidents, error } = await this.supabase
      .from('incidents')
      .select('id');

    if (error || !incidents) {
      console.error('Failed to fetch incidents for re-indexing:', error);
      return 0;
    }

    // Queue all incidents for indexing
    const { error: queueError } = await this.supabase.from('embedding_queue').insert(
      incidents.map((inc) => ({
        incident_id: inc.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      }))
    );

    if (queueError) {
      console.error('Failed to queue incidents for re-indexing:', queueError);
      return 0;
    }

    // Process in batches
    const batchSize = 10;
    let totalProcessed = 0;

    while (true) {
      const processed = await this.processPendingEmbeddings(batchSize);
      totalProcessed += processed;

      if (processed < batchSize) {
        break; // No more pending
      }
    }

    console.log(`✅ Re-indexing complete: ${totalProcessed} incidents indexed`);
    return totalProcessed;
  }
}

/**
 * Factory function
 */
export function createEmbeddingIndexer(): EmbeddingIndexer | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, embedding indexer disabled');
    return null;
  }

  return new EmbeddingIndexer(supabaseUrl, supabaseKey, openaiKey);
}

export default EmbeddingIndexer;
