#!/usr/bin/env node
/**
 * UADSI Predictive Insights & Root Cause Analysis
 * ML pipeline for predicting failures, drift patterns, and policy breaches
 * Uses historical telemetry + drift patterns for intelligent forecasting
 */

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import * as tf from '@tensorflow/tfjs-node';

export class UADSIPredictor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      supabaseUrl: config.supabaseUrl || process.env.SUPABASE_URL,
      supabaseKey: config.supabaseKey || process.env.SUPABASE_KEY,
      predictionInterval: config.predictionInterval || 300000, // 5 min
      lookbackWindow: config.lookbackWindow || 86400000, // 24 hours
      ...config
    };
    
    this.db = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    this.models = {};
    this.predictionTimer = null;
  }

  /**
   * Initialize predictor
   */
  async initialize() {
    console.log('🧠 Initializing UADSI Predictor...');
    
    await this.ensureSchema();
    await this.loadModels();
    
    // Start periodic prediction
    await this.runPredictions();
    this.predictionTimer = setInterval(
      () => this.runPredictions(),
      this.config.predictionInterval
    );
    
    this.emit('initialized');
    console.log('✅ UADSI Predictor initialized');
  }

  /**
   * Ensure database schema for predictions
   */
  async ensureSchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS uadsi_predictions (
        prediction_id TEXT PRIMARY KEY,
        prediction_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        predicted_event TEXT NOT NULL,
        probability DECIMAL(5,4) NOT NULL,
        confidence DECIMAL(5,4) NOT NULL,
        time_horizon_hours INTEGER NOT NULL,
        predicted_for TIMESTAMPTZ NOT NULL,
        features JSONB,
        model_version TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS uadsi_root_causes (
        analysis_id TEXT PRIMARY KEY,
        incident_id TEXT NOT NULL,
        incident_type TEXT NOT NULL,
        root_cause_type TEXT NOT NULL,
        contributing_factors JSONB,
        confidence DECIMAL(5,4),
        evidence JSONB,
        recommendations JSONB,
        analyzed_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_predictions_entity ON uadsi_predictions(entity_id, predicted_for);
      CREATE INDEX IF NOT EXISTS idx_root_causes_incident ON uadsi_root_causes(incident_id);
    `;

    try {
      await this.db.rpc('exec_sql', { sql: schema });
    } catch (error) {
      console.log('Schema check:', error.message);
    }
  }

  /**
   * Load ML models
   */
  async loadModels() {
    // In production, load pre-trained models from storage
    // For now, initialize with simple statistical models
    
    this.models = {
      failure_predictor: this.createFailurePredictor(),
      drift_predictor: this.createDriftPredictor(),
      anomaly_detector: this.createAnomalyDetector()
    };
    
    console.log('✅ ML models loaded');
  }

  /**
   * Create failure prediction model
   */
  createFailurePredictor() {
    // Simple model structure - in production, load trained weights
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [10], units: 32, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 16, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }

  /**
   * Create drift prediction model
   */
  createDriftPredictor() {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [15], units: 64, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ units: 32, activation: 'relu' }),
        tf.layers.dense({ units: 1, activation: 'sigmoid' })
      ]
    });
    
    model.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }

  /**
   * Create anomaly detection model
   */
  createAnomalyDetector() {
    // Autoencoder for anomaly detection
    const encoder = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [20], units: 10, activation: 'relu' }),
        tf.layers.dense({ units: 5, activation: 'relu' })
      ]
    });
    
    const decoder = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [5], units: 10, activation: 'relu' }),
        tf.layers.dense({ units: 20, activation: 'sigmoid' })
      ]
    });
    
    return { encoder, decoder };
  }

  /**
   * Run all predictions
   */
  async runPredictions() {
    console.log('🔮 Running predictive analysis...');
    
    try {
      // Get entities to predict for
      const { data: agents } = await this.db
        .from('uadsi_agents')
        .select('agent_id, agent_name');
      
      const predictions = [];
      
      for (const agent of agents || []) {
        // Predict failures
        const failurePrediction = await this.predictFailure(agent.agent_id);
        if (failurePrediction) predictions.push(failurePrediction);
        
        // Predict drift
        const driftPrediction = await this.predictDrift(agent.agent_id);
        if (driftPrediction) predictions.push(driftPrediction);
      }
      
      // Store predictions
      for (const prediction of predictions) {
        await this.storePrediction(prediction);
      }
      
      this.emit('predictions:complete', {
        count: predictions.length,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Generated ${predictions.length} predictions`);
    } catch (error) {
      console.error('❌ Prediction error:', error);
      this.emit('prediction:error', error);
    }
  }

  /**
   * Predict agent failure
   */
  async predictFailure(agentId) {
    // Get historical data
    const features = await this.extractFailureFeatures(agentId);
    if (!features) return null;
    
    // Convert to tensor
    const inputTensor = tf.tensor2d([features], [1, 10]);
    
    // Predict
    const prediction = this.models.failure_predictor.predict(inputTensor);
    const probability = await prediction.data();
    
    // Cleanup
    inputTensor.dispose();
    prediction.dispose();
    
    const prob = probability[0];
    
    // Only store significant predictions
    if (prob < 0.3) return null;
    
    return {
      prediction_id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prediction_type: 'failure',
      entity_id: agentId,
      entity_type: 'agent',
      predicted_event: 'agent_failure',
      probability: Math.round(prob * 10000) / 10000,
      confidence: this.calculateConfidence(features, prob),
      time_horizon_hours: 24,
      predicted_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      features: { input: features },
      model_version: '1.0'
    };
  }

  /**
   * Extract features for failure prediction
   */
  async extractFailureFeatures(agentId) {
    const since = new Date(Date.now() - this.config.lookbackWindow).toISOString();
    
    // Get execution history
    const { data: executions } = await this.db
      .from('workflow_executions')
      .select('status, duration_ms, created_at')
      .contains('agent_ids', [agentId])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (!executions || executions.length < 10) return null;
    
    // Calculate features
    const failures = executions.filter(e => e.status === 'failed').length;
    const failureRate = failures / executions.length;
    
    const durations = executions.map(e => e.duration_ms || 0);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const durationStdDev = this.calculateStdDev(durations);
    
    // Get trust score trend
    const { data: trustScores } = await this.db
      .from('uadsi_trust_scores')
      .select('trust_score, calculated_at')
      .eq('agent_id', agentId)
      .gte('calculated_at', since)
      .order('calculated_at', { ascending: false })
      .limit(10);
    
    const trustTrend = this.calculateTrend(
      (trustScores || []).map(t => Number(t.trust_score))
    );
    
    return [
      failureRate,
      avgDuration / 1000, // normalize
      maxDuration / 1000,
      durationStdDev / 1000,
      trustTrend,
      executions.length / 100, // execution volume (normalized)
      (trustScores?.[0]?.trust_score || 85) / 100,
      failures,
      minDuration / 1000,
      durationStdDev / avgDuration // coefficient of variation
    ];
  }

  /**
   * Predict drift
   */
  async predictDrift(agentId) {
    const features = await this.extractDriftFeatures(agentId);
    if (!features) return null;
    
    const inputTensor = tf.tensor2d([features], [1, 15]);
    const prediction = this.models.drift_predictor.predict(inputTensor);
    const probability = await prediction.data();
    
    inputTensor.dispose();
    prediction.dispose();
    
    const prob = probability[0];
    
    if (prob < 0.4) return null;
    
    return {
      prediction_id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      prediction_type: 'drift',
      entity_id: agentId,
      entity_type: 'agent',
      predicted_event: 'sync_drift',
      probability: Math.round(prob * 10000) / 10000,
      confidence: this.calculateConfidence(features, prob),
      time_horizon_hours: 6,
      predicted_for: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      features: { input: features },
      model_version: '1.0'
    };
  }

  /**
   * Extract features for drift prediction
   */
  async extractDriftFeatures(agentId) {
    const since = new Date(Date.now() - this.config.lookbackWindow).toISOString();
    
    // Get sync events
    const { data: syncEvents } = await this.db
      .from('uadsi_sync_events')
      .select('*')
      .eq('agent_id', agentId)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (!syncEvents || syncEvents.length < 10) return null;
    
    // Get historical drift incidents
    const { data: driftIncidents } = await this.db
      .from('uadsi_drift_incidents')
      .select('*')
      .contains('agent_ids', [agentId])
      .gte('detected_at', since);
    
    const avgFreshness = syncEvents.reduce((sum, e) => 
      sum + (Number(e.freshness_score) || 0), 0) / syncEvents.length;
    
    const freshnessTrend = this.calculateTrend(
      syncEvents.map(e => Number(e.freshness_score) || 0)
    );
    
    const historicalDriftCount = driftIncidents?.length || 0;
    const avgDriftMs = driftIncidents?.length > 0
      ? driftIncidents.reduce((sum, i) => sum + i.drift_ms, 0) / driftIncidents.length
      : 0;
    
    return [
      avgFreshness / 100,
      freshnessTrend,
      historicalDriftCount,
      avgDriftMs / 1000,
      syncEvents.length / 100,
      ...Array(10).fill(0).map((_, i) => 
        (syncEvents[i]?.freshness_score || 0) / 100
      )
    ];
  }

  /**
   * Perform root cause analysis on an incident
   */
  async analyzeRootCause(incident) {
    console.log(`🔍 Analyzing root cause for incident ${incident.incident_id}...`);
    
    try {
      // Gather context
      const context = await this.gatherIncidentContext(incident);
      
      // Identify root cause type
      const rootCauseType = this.identifyRootCauseType(context);
      
      // Extract contributing factors
      const contributingFactors = this.extractContributingFactors(context);
      
      // Generate evidence
      const evidence = this.collectEvidence(context, rootCauseType);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(rootCauseType, contributingFactors);
      
      const analysis = {
        analysis_id: `rca_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        incident_id: incident.incident_id,
        incident_type: incident.severity,
        root_cause_type: rootCauseType,
        contributing_factors: contributingFactors,
        confidence: this.calculateRCAConfidence(context),
        evidence,
        recommendations
      };
      
      // Store analysis
      await this.storeRootCauseAnalysis(analysis);
      
      this.emit('rca:complete', analysis);
      console.log(`✅ Root cause analysis complete: ${rootCauseType}`);
      
      return analysis;
    } catch (error) {
      console.error('❌ Root cause analysis error:', error);
      this.emit('rca:error', error);
      throw error;
    }
  }

  /**
   * Gather context for incident
   */
  async gatherIncidentContext(incident) {
    const context = {
      incident,
      agents: [],
      recentEvents: [],
      trustScores: [],
      syncHistory: []
    };
    
    // Get agent details
    for (const agentId of incident.agent_ids || []) {
      const { data: agent } = await this.db
        .from('uadsi_agents')
        .select('*')
        .eq('agent_id', agentId)
        .single();
      
      if (agent) context.agents.push(agent);
    }
    
    // Get recent events
    const since = new Date(incident.detected_at);
    since.setHours(since.getHours() - 24);
    
    const { data: events } = await this.db
      .from('uadsi_sync_events')
      .select('*')
      .in('agent_id', incident.agent_ids || [])
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false })
      .limit(100);
    
    context.recentEvents = events || [];
    
    return context;
  }

  /**
   * Identify root cause type
   */
  identifyRootCauseType(context) {
    const { incident, agents, recentEvents } = context;
    
    // Check for configuration drift
    const contextHashes = recentEvents
      .map(e => e.context_hash)
      .filter(h => h != null);
    
    if (new Set(contextHashes).size > contextHashes.length / 2) {
      return 'configuration_drift';
    }
    
    // Check for resource contention
    const unhealthyAgents = agents.filter(a => a.health_status !== 'healthy');
    if (unhealthyAgents.length > agents.length / 2) {
      return 'resource_contention';
    }
    
    // Check for network latency
    const drifts = recentEvents.map(e => e.drift_ms).filter(d => d != null);
    const avgDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length;
    if (avgDrift > 10000) {
      return 'network_latency';
    }
    
    // Check for version mismatch
    const versions = agents.map(a => a.metadata?.version).filter(v => v != null);
    if (new Set(versions).size > 1) {
      return 'version_mismatch';
    }
    
    return 'unknown';
  }

  /**
   * Extract contributing factors
   */
  extractContributingFactors(context) {
    const factors = [];
    
    const { agents, recentEvents, incident } = context;
    
    // Agent health
    const unhealthy = agents.filter(a => a.health_status !== 'healthy').length;
    if (unhealthy > 0) {
      factors.push({
        factor: 'agent_health',
        severity: unhealthy > agents.length / 2 ? 'high' : 'medium',
        details: `${unhealthy} of ${agents.length} agents unhealthy`
      });
    }
    
    // Data freshness
    const staleness = recentEvents.filter(e => 
      (e.freshness_score || 0) < 70
    ).length;
    
    if (staleness > recentEvents.length / 3) {
      factors.push({
        factor: 'data_staleness',
        severity: 'high',
        details: `${staleness} events with low freshness`
      });
    }
    
    // Drift magnitude
    if (incident.drift_ms > 300000) {
      factors.push({
        factor: 'high_drift',
        severity: 'critical',
        details: `${incident.drift_ms}ms drift detected`
      });
    }
    
    return factors;
  }

  /**
   * Collect evidence
   */
  collectEvidence(context, rootCauseType) {
    const evidence = {
      type: rootCauseType,
      observations: [],
      metrics: {}
    };
    
    // Add relevant evidence based on root cause type
    if (rootCauseType === 'configuration_drift') {
      evidence.observations.push('Multiple context hash values detected');
      evidence.metrics.unique_contexts = new Set(
        context.recentEvents.map(e => e.context_hash)
      ).size;
    }
    
    if (rootCauseType === 'network_latency') {
      const drifts = context.recentEvents
        .map(e => e.drift_ms)
        .filter(d => d != null);
      
      evidence.observations.push('High temporal drift detected');
      evidence.metrics.avg_drift_ms = drifts.reduce((a, b) => a + b, 0) / drifts.length;
      evidence.metrics.max_drift_ms = Math.max(...drifts);
    }
    
    return evidence;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(rootCauseType, contributingFactors) {
    const recommendations = [];
    
    const typeMap = {
      configuration_drift: [
        'Standardize agent configurations across the mesh',
        'Implement configuration version control',
        'Deploy configuration management tool'
      ],
      resource_contention: [
        'Scale agent resources (CPU/memory)',
        'Implement resource quotas',
        'Review agent scheduling and placement'
      ],
      network_latency: [
        'Optimize network topology',
        'Implement caching layers',
        'Review data transfer patterns'
      ],
      version_mismatch: [
        'Synchronize agent versions',
        'Implement rolling upgrade strategy',
        'Establish version compatibility matrix'
      ]
    };
    
    if (typeMap[rootCauseType]) {
      recommendations.push(...typeMap[rootCauseType].map((action, i) => ({
        priority: i === 0 ? 'high' : 'medium',
        action,
        category: rootCauseType
      })));
    }
    
    // Add factor-specific recommendations
    for (const factor of contributingFactors) {
      if (factor.factor === 'agent_health') {
        recommendations.push({
          priority: 'high',
          action: 'Investigate and remediate unhealthy agents',
          category: 'operations'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(features, probability) {
    // Higher confidence when:
    // - Feature values are within expected ranges
    // - Prediction probability is clear (close to 0 or 1)
    // - Sufficient historical data
    
    const clarity = Math.abs(probability - 0.5) * 2; // 0-1 scale
    const featureQuality = 0.8; // Placeholder - would calculate from feature variance
    
    return Math.round((clarity * 0.6 + featureQuality * 0.4) * 10000) / 10000;
  }

  /**
   * Calculate RCA confidence
   */
  calculateRCAConfidence(context) {
    const { agents, recentEvents } = context;
    
    // More data = higher confidence
    const dataQuality = Math.min(
      (agents.length / 5) * 0.5 + 
      (recentEvents.length / 50) * 0.5,
      1.0
    );
    
    return Math.round(dataQuality * 10000) / 10000;
  }

  /**
   * Calculate trend (positive = increasing, negative = decreasing)
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const recent = values.slice(0, Math.floor(values.length / 2));
    const older = values.slice(Math.floor(values.length / 2));
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    return (recentAvg - olderAvg) / (olderAvg || 1);
  }

  /**
   * Calculate standard deviation
   */
  calculateStdDev(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Store prediction
   */
  async storePrediction(prediction) {
    const { error } = await this.db
      .from('uadsi_predictions')
      .insert(prediction);
    
    if (error) {
      console.error('Failed to store prediction:', error);
    }
    
    this.emit('prediction:stored', prediction);
  }

  /**
   * Store root cause analysis
   */
  async storeRootCauseAnalysis(analysis) {
    const { error } = await this.db
      .from('uadsi_root_causes')
      .insert(analysis);
    
    if (error) {
      console.error('Failed to store RCA:', error);
    }
  }

  /**
   * Get predictions for an entity
   */
  async getPredictions(entityId, entityType) {
    const { data, error } = await this.db
      .from('uadsi_predictions')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType)
      .gte('predicted_for', new Date().toISOString())
      .order('probability', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  /**
   * Shutdown predictor
   */
  async shutdown() {
    if (this.predictionTimer) {
      clearInterval(this.predictionTimer);
      this.predictionTimer = null;
    }
    
    // Cleanup TensorFlow resources
    Object.values(this.models).forEach(model => {
      if (model.dispose) model.dispose();
    });
    
    this.emit('shutdown');
    console.log('🛑 UADSI Predictor shutdown');
  }
}

export default UADSIPredictor;
