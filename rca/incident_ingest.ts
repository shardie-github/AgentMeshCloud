/**
 * Incident Ingest
 * Ingests incident postmortems for RCA library
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Incident {
  id?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  started_at: string;
  resolved_at?: string;
  affected_services: string[];
  root_cause: string;
  contributing_factors?: string[];
  resolution: string;
  preventive_actions: string[];
  tags: string[];
  postmortem_url?: string;
}

export class IncidentIngestor {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Ingest a new incident postmortem
   */
  async ingestIncident(incident: Incident): Promise<string> {
    console.log(`📝 Ingesting incident: ${incident.title}`);

    // Store incident
    const { data, error } = await this.supabase
      .from('incidents')
      .insert({
        title: incident.title,
        description: incident.description,
        severity: incident.severity,
        started_at: incident.started_at,
        resolved_at: incident.resolved_at,
        affected_services: incident.affected_services,
        root_cause: incident.root_cause,
        contributing_factors: incident.contributing_factors || [],
        resolution: incident.resolution,
        preventive_actions: incident.preventive_actions,
        tags: incident.tags,
        postmortem_url: incident.postmortem_url,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to ingest incident:', error);
      throw error;
    }

    const incidentId = data.id;
    console.log(`✅ Incident ingested with ID: ${incidentId}`);

    // Trigger embedding generation
    await this.triggerEmbeddingGeneration(incidentId);

    return incidentId;
  }

  /**
   * Batch ingest incidents from JSON
   */
  async batchIngest(incidents: Incident[]): Promise<number> {
    console.log(`📝 Batch ingesting ${incidents.length} incidents...`);

    let successCount = 0;
    for (const incident of incidents) {
      try {
        await this.ingestIncident(incident);
        successCount++;
      } catch (error) {
        console.error(`Failed to ingest incident: ${incident.title}`, error);
      }
    }

    console.log(`✅ Batch ingest complete: ${successCount}/${incidents.length} succeeded`);
    return successCount;
  }

  /**
   * Update existing incident
   */
  async updateIncident(id: string, updates: Partial<Incident>): Promise<void> {
    const { error } = await this.supabase
      .from('incidents')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to update incident:', error);
      throw error;
    }

    // Re-generate embedding if content changed
    if (updates.description || updates.root_cause || updates.resolution) {
      await this.triggerEmbeddingGeneration(id);
    }
  }

  /**
   * Get incident by ID
   */
  async getIncident(id: string): Promise<Incident | null> {
    const { data, error } = await this.supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch incident:', error);
      return null;
    }

    return data as Incident;
  }

  /**
   * Search incidents by tags
   */
  async searchByTags(tags: string[]): Promise<Incident[]> {
    const { data, error } = await this.supabase
      .from('incidents')
      .select('*')
      .contains('tags', tags)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Failed to search incidents:', error);
      return [];
    }

    return data as Incident[];
  }

  /**
   * Get recent incidents
   */
  async getRecentIncidents(limit: number = 10): Promise<Incident[]> {
    const { data, error } = await this.supabase
      .from('incidents')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent incidents:', error);
      return [];
    }

    return data as Incident[];
  }

  /**
   * Get incidents by severity
   */
  async getIncidentsBySeverity(severity: string): Promise<Incident[]> {
    const { data, error } = await this.supabase
      .from('incidents')
      .select('*')
      .eq('severity', severity)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch incidents by severity:', error);
      return [];
    }

    return data as Incident[];
  }

  /**
   * Trigger embedding generation for incident
   */
  private async triggerEmbeddingGeneration(incidentId: string): Promise<void> {
    // This will be handled by the embedding_index service
    console.log(`🔄 Triggering embedding generation for incident ${incidentId}`);

    // Emit event or call embedding service
    await this.supabase.from('embedding_queue').insert({
      incident_id: incidentId,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  }

  /**
   * Get incident statistics
   */
  async getStatistics(): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_incident_stats');

    if (error) {
      console.error('Failed to get incident statistics:', error);
      return null;
    }

    return data;
  }
}

/**
 * Factory function
 */
export function createIncidentIngestor(): IncidentIngestor | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase credentials not found, incident ingestor disabled');
    return null;
  }

  return new IncidentIngestor(supabaseUrl, supabaseKey);
}

export default IncidentIngestor;
