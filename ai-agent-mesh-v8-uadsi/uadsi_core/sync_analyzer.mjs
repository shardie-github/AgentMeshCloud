#!/usr/bin/env node
/**
 * UADSI Sync Analyzer Module
 * Traces data freshness & context drift across agent workflows
 * Detects synchronization issues and temporal misalignment
 */

import { EventEmitter } from 'events';
import { createClient } from '@supabase/supabase-js';

export class SyncAnalyzer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      analysisInterval: config.analysisInterval || 60000, // 1 min
      driftThreshold: config.driftThreshold || 300000, // 5 min
      freshnessWindow: config.freshnessWindow || 600000, // 10 min
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_KEY,
      ...config
    };
    
    this.db = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    this.syncMetrics = new Map();
    this.analysisTimer = null;
  }

  /**
   * Initialize sync analyzer
   */
  async initialize() {
    console.log('🔄 Initializing UADSI Sync Analyzer...');
    
    await this.ensureSchema();
    await this.analyze();
    
    this.analysisTimer = setInterval(
      () => this.analyze(), 
      this.config.analysisInterval
    );
    
    this.emit('initialized');
    console.log('✅ Sync Analyzer initialized');
  }

  /**
   * Ensure database schema for sync tracking
   */
  async ensureSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS uadsi_sync_events (
        event_id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        workflow_id TEXT,
        event_type TEXT NOT NULL,
        data_version TEXT,
        timestamp TIMESTAMPTZ NOT NULL,
        freshness_score DECIMAL(5,2),
        drift_ms INTEGER,
        context_hash TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uadsi_drift_incidents (
        incident_id TEXT PRIMARY KEY,
        agent_ids TEXT[],
        workflow_id TEXT,
        drift_ms INTEGER NOT NULL,
        severity TEXT NOT NULL,
        root_cause TEXT,
        impact_score DECIMAL(5,2),
        detected_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        resolution TEXT,
        metadata JSONB
      );

      CREATE INDEX IF NOT EXISTS idx_sync_events_agent ON uadsi_sync_events(agent_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_sync_events_workflow ON uadsi_sync_events(workflow_id, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_drift_severity ON uadsi_drift_incidents(severity) WHERE resolved_at IS NULL;
    `;

    try {
      await this.db.rpc('exec_sql', { sql: schema });
    } catch (error) {
      console.log('Schema check:', error.message);
    }
  }

  /**
   * Analyze synchronization state across all workflows
   */
  async analyze() {
    console.log('🔄 Analyzing synchronization state...');
    
    try {
      // Get all active workflows
      const { data: workflows } = await this.db
        .from('uadsi_workflows')
        .select('*')
        .neq('status', 'inactive');
      
      const metrics = {
        totalWorkflows: workflows?.length || 0,
        inSync: 0,
        drifted: 0,
        stale: 0,
        avgFreshness: 0,
        avgDrift: 0,
        incidents: []
      };

      for (const workflow of workflows || []) {
        const syncState = await this.analyzeWorkflowSync(workflow);
        
        if (syncState.status === 'in_sync') metrics.inSync++;
        else if (syncState.status === 'drifted') metrics.drifted++;
        else if (syncState.status === 'stale') metrics.stale++;
        
        metrics.avgFreshness += syncState.freshness;
        metrics.avgDrift += syncState.drift;
        
        if (syncState.incidents) {
          metrics.incidents.push(...syncState.incidents);
        }
        
        this.syncMetrics.set(workflow.workflow_id, syncState);
      }

      if (metrics.totalWorkflows > 0) {
        metrics.avgFreshness /= metrics.totalWorkflows;
        metrics.avgDrift /= metrics.totalWorkflows;
      }

      // Record incidents
      for (const incident of metrics.incidents) {
        await this.recordDriftIncident(incident);
      }

      this.emit('analysis:complete', metrics);
      console.log(`✅ Analyzed ${metrics.totalWorkflows} workflows - ${metrics.inSync} in sync, ${metrics.drifted} drifted`);
      
      return metrics;
    } catch (error) {
      console.error('❌ Analysis error:', error);
      this.emit('analysis:error', error);
      throw error;
    }
  }

  /**
   * Analyze synchronization state for a single workflow
   */
  async analyzeWorkflowSync(workflow) {
    const agentIds = workflow.agent_ids || [];
    
    if (agentIds.length === 0) {
      return {
        workflowId: workflow.workflow_id,
        status: 'unknown',
        freshness: 0,
        drift: 0,
        agentStates: []
      };
    }

    // Get recent events for all agents in workflow
    const agentStates = await Promise.all(
      agentIds.map(id => this.getAgentSyncState(id, workflow.workflow_id))
    );

    // Calculate temporal alignment
    const timestamps = agentStates
      .map(s => s.lastUpdate)
      .filter(t => t != null)
      .map(t => new Date(t).getTime());
    
    if (timestamps.length === 0) {
      return {
        workflowId: workflow.workflow_id,
        status: 'stale',
        freshness: 0,
        drift: 0,
        agentStates
      };
    }

    const maxTimestamp = Math.max(...timestamps);
    const minTimestamp = Math.min(...timestamps);
    const driftMs = maxTimestamp - minTimestamp;
    const freshnessMs = Date.now() - maxTimestamp;
    
    // Calculate freshness score (0-100)
    const freshnessScore = Math.max(
      0, 
      100 - (freshnessMs / this.config.freshnessWindow * 100)
    );

    // Determine status
    let status = 'in_sync';
    const incidents = [];
    
    if (freshnessMs > this.config.freshnessWindow) {
      status = 'stale';
      incidents.push({
        agent_ids: agentIds,
        workflow_id: workflow.workflow_id,
        drift_ms: freshnessMs,
        severity: 'high',
        root_cause: 'Data staleness exceeds threshold',
        impact_score: this.calculateImpact(freshnessMs, 'stale')
      });
    } else if (driftMs > this.config.driftThreshold) {
      status = 'drifted';
      incidents.push({
        agent_ids: agentIds,
        workflow_id: workflow.workflow_id,
        drift_ms: driftMs,
        severity: 'medium',
        root_cause: 'Temporal misalignment between agents',
        impact_score: this.calculateImpact(driftMs, 'drift')
      });
    }

    // Check context hash consistency
    const contextHashes = agentStates
      .map(s => s.contextHash)
      .filter(h => h != null);
    
    const uniqueHashes = new Set(contextHashes);
    
    if (uniqueHashes.size > 1 && contextHashes.length > 1) {
      incidents.push({
        agent_ids: agentIds,
        workflow_id: workflow.workflow_id,
        drift_ms: 0,
        severity: 'medium',
        root_cause: 'Context divergence detected',
        impact_score: 50
      });
    }

    return {
      workflowId: workflow.workflow_id,
      status,
      freshness: Math.round(freshnessScore),
      drift: driftMs,
      agentStates,
      incidents: incidents.length > 0 ? incidents : null
    };
  }

  /**
   * Get synchronization state for a single agent
   */
  async getAgentSyncState(agentId, workflowId) {
    const { data } = await this.db
      .from('uadsi_sync_events')
      .select('*')
      .eq('agent_id', agentId)
      .eq('workflow_id', workflowId)
      .order('timestamp', { ascending: false })
      .limit(1);
    
    const latest = data?.[0];
    
    return {
      agentId,
      lastUpdate: latest?.timestamp,
      dataVersion: latest?.data_version,
      contextHash: latest?.context_hash,
      freshnessScore: latest?.freshness_score
    };
  }

  /**
   * Record a drift incident
   */
  async recordDriftIncident(incident) {
    const incidentId = `drift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await this.db
      .from('uadsi_drift_incidents')
      .insert({
        incident_id: incidentId,
        ...incident,
        metadata: {
          detected_by: 'sync_analyzer',
          version: '1.0'
        }
      });
    
    if (error) {
      console.error('Failed to record drift incident:', error);
    }
    
    this.emit('incident:detected', { incidentId, ...incident });
  }

  /**
   * Calculate impact score based on drift characteristics
   */
  calculateImpact(driftMs, type) {
    if (type === 'stale') {
      // Stale data has higher impact
      const hours = driftMs / (1000 * 60 * 60);
      return Math.min(100, hours * 10);
    } else {
      // Drift impact scales with misalignment
      const minutes = driftMs / (1000 * 60);
      return Math.min(100, minutes * 5);
    }
  }

  /**
   * Record a sync event
   */
  async recordSyncEvent(event) {
    const eventId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await this.db
      .from('uadsi_sync_events')
      .insert({
        event_id: eventId,
        ...event,
        timestamp: event.timestamp || new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to record sync event:', error);
    }
  }

  /**
   * Get sync metrics for a workflow
   */
  async getWorkflowMetrics(workflowId) {
    return this.syncMetrics.get(workflowId) || null;
  }

  /**
   * Get all active drift incidents
   */
  async getActiveDriftIncidents() {
    const { data, error } = await this.db
      .from('uadsi_drift_incidents')
      .select('*')
      .is('resolved_at', null)
      .order('detected_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Resolve a drift incident
   */
  async resolveDriftIncident(incidentId, resolution) {
    const { error } = await this.db
      .from('uadsi_drift_incidents')
      .update({
        resolved_at: new Date().toISOString(),
        resolution
      })
      .eq('incident_id', incidentId);
    
    if (error) throw error;
    
    this.emit('incident:resolved', { incidentId, resolution });
  }

  /**
   * Get freshness statistics
   */
  async getFreshnessStats(timeWindow = 3600000) { // 1 hour default
    const since = new Date(Date.now() - timeWindow).toISOString();
    
    const { data } = await this.db
      .from('uadsi_sync_events')
      .select('freshness_score, agent_id')
      .gte('timestamp', since);
    
    if (!data || data.length === 0) {
      return {
        avgFreshness: 0,
        minFreshness: 0,
        maxFreshness: 0,
        sampleSize: 0
      };
    }

    const scores = data.map(e => e.freshness_score).filter(s => s != null);
    
    return {
      avgFreshness: scores.reduce((a, b) => a + b, 0) / scores.length,
      minFreshness: Math.min(...scores),
      maxFreshness: Math.max(...scores),
      sampleSize: scores.length
    };
  }

  /**
   * Shutdown sync analyzer
   */
  async shutdown() {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    this.emit('shutdown');
    console.log('🛑 Sync Analyzer shutdown');
  }
}

export default SyncAnalyzer;
