#!/usr/bin/env node
/**
 * Autonomous Mesh OS - Adaptive Learning Loop
 * 
 * Reinforcement learning system for operational optimization:
 * - Cost and uptime rewards
 * - Policy tuning suggestions
 * - Performance pattern recognition
 * - Automated threshold adjustment
 * - Anomaly prediction
 * 
 * @module adaptive_loop
 */

import { EventEmitter } from 'events';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import YAML from 'yaml';

class AdaptiveLearningLoop extends EventEmitter {
  constructor(configPath = './learning_config.yaml') {
    super();
    this.configPath = configPath;
    this.config = null;
    this.model = null;
    this.trainingData = [];
    this.predictions = [];
    this.recommendations = [];
    this.startTime = Date.now();
  }

  /**
   * Initialize the adaptive learning loop
   */
  async initialize() {
    console.log('[Adaptive Learning] Initializing...');
    
    try {
      const configData = await readFile(this.configPath, 'utf-8');
      this.config = YAML.parse(configData);
      
      // Load or create model
      await this.loadModel();
      
      // Load training data
      await this.loadTrainingData();
      
      console.log('[Adaptive Learning] ✓ Initialized');
      this.emit('learning:ready');
    } catch (error) {
      console.error('[Adaptive Learning] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load the RL model
   */
  async loadModel() {
    const modelPath = './ops_rl_model.json';
    
    if (existsSync(modelPath)) {
      try {
        const data = await readFile(modelPath, 'utf-8');
        this.model = JSON.parse(data);
        console.log(`[Adaptive Learning] Loaded model v${this.model.version}`);
      } catch (error) {
        console.warn('[Adaptive Learning] Failed to load model, creating new one');
        this.createModel();
      }
    } else {
      this.createModel();
    }
  }

  /**
   * Create a new RL model
   */
  createModel() {
    this.model = {
      version: '1.0.0',
      type: 'policy_optimizer',
      created: Date.now(),
      lastTrained: null,
      parameters: {
        learningRate: 0.01,
        discountFactor: 0.95,
        explorationRate: 0.1,
        minReward: -100,
        maxReward: 100
      },
      state: {
        weights: this.initializeWeights(),
        episodeCount: 0,
        totalReward: 0,
        avgReward: 0
      },
      metrics: {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0
      }
    };
    
    console.log('[Adaptive Learning] Created new model');
  }

  /**
   * Initialize model weights
   */
  initializeWeights() {
    return {
      cost: 0.3,
      uptime: 0.4,
      performance: 0.2,
      compliance: 0.1
    };
  }

  /**
   * Load training data
   */
  async loadTrainingData() {
    const dataPath = './training_data.json';
    
    if (existsSync(dataPath)) {
      try {
        const data = await readFile(dataPath, 'utf-8');
        this.trainingData = JSON.parse(data);
        console.log(`[Adaptive Learning] Loaded ${this.trainingData.length} training samples`);
      } catch (error) {
        console.warn('[Adaptive Learning] Failed to load training data');
        this.trainingData = [];
      }
    }
  }

  /**
   * Save model to disk
   */
  async saveModel() {
    try {
      await writeFile('./ops_rl_model.json', JSON.stringify(this.model, null, 2));
      console.log('[Adaptive Learning] Model saved');
    } catch (error) {
      console.error('[Adaptive Learning] Failed to save model:', error);
    }
  }

  /**
   * Save training data
   */
  async saveTrainingData() {
    try {
      await writeFile('./training_data.json', JSON.stringify(this.trainingData, null, 2));
    } catch (error) {
      console.error('[Adaptive Learning] Failed to save training data:', error);
    }
  }

  /**
   * Record observation for training
   */
  recordObservation(state, action, reward, nextState) {
    const observation = {
      timestamp: Date.now(),
      state: state,
      action: action,
      reward: reward,
      nextState: nextState
    };

    this.trainingData.push(observation);
    
    // Keep only recent data (last 10000 observations)
    if (this.trainingData.length > 10000) {
      this.trainingData = this.trainingData.slice(-10000);
    }

    // Auto-save periodically
    if (this.trainingData.length % 100 === 0) {
      this.saveTrainingData();
    }
  }

  /**
   * Calculate reward based on system performance
   */
  calculateReward(metrics) {
    const weights = this.model.state.weights;
    
    // Normalize metrics to 0-1 scale
    const normalizedMetrics = {
      cost: this.normalizeCost(metrics.cost, metrics.budget),
      uptime: metrics.uptime / 100,
      performance: this.normalizePerformance(metrics.latency, metrics.targetLatency),
      compliance: metrics.complianceScore / 100
    };

    // Calculate weighted reward
    let reward = 0;
    reward += weights.cost * normalizedMetrics.cost * 100;
    reward += weights.uptime * normalizedMetrics.uptime * 100;
    reward += weights.performance * normalizedMetrics.performance * 100;
    reward += weights.compliance * normalizedMetrics.compliance * 100;

    // Penalize violations
    if (metrics.violations > 0) {
      reward -= metrics.violations * 10;
    }

    // Penalize incidents
    if (metrics.incidents > 0) {
      reward -= metrics.incidents * 20;
    }

    return Math.max(this.model.parameters.minReward, 
            Math.min(this.model.parameters.maxReward, reward));
  }

  /**
   * Normalize cost metric (lower is better)
   */
  normalizeCost(cost, budget) {
    if (cost <= budget * 0.8) return 1.0; // Under 80% budget = excellent
    if (cost <= budget) return 0.8; // Under budget = good
    if (cost <= budget * 1.1) return 0.5; // Over budget but < 10% = acceptable
    return 0; // Significantly over budget = poor
  }

  /**
   * Normalize performance metric (lower latency is better)
   */
  normalizePerformance(latency, targetLatency) {
    if (latency <= targetLatency) return 1.0;
    if (latency <= targetLatency * 1.5) return 0.7;
    if (latency <= targetLatency * 2) return 0.4;
    return 0;
  }

  /**
   * Train model with recent observations
   */
  async trainModel() {
    console.log('[Adaptive Learning] Training model...');
    
    if (this.trainingData.length < this.config?.training?.minSamples || 100) {
      console.log('[Adaptive Learning] Insufficient training data');
      return;
    }

    const batchSize = Math.min(this.config?.training?.batchSize || 32, this.trainingData.length);
    const batch = this.trainingData.slice(-batchSize);

    // Simple gradient descent on weights
    const learningRate = this.model.parameters.learningRate;
    const gradients = {
      cost: 0,
      uptime: 0,
      performance: 0,
      compliance: 0
    };

    for (const obs of batch) {
      const predicted = this.predictValue(obs.state);
      const target = obs.reward + this.model.parameters.discountFactor * this.predictValue(obs.nextState);
      const error = target - predicted;

      // Calculate gradients
      gradients.cost += error * (obs.state.costPerformance || 0);
      gradients.uptime += error * (obs.state.systemUptime || 0);
      gradients.performance += error * (obs.state.avgLatency || 0);
      gradients.compliance += error * (obs.state.complianceScore || 0);
    }

    // Update weights
    this.model.state.weights.cost += learningRate * gradients.cost / batchSize;
    this.model.state.weights.uptime += learningRate * gradients.uptime / batchSize;
    this.model.state.weights.performance += learningRate * gradients.performance / batchSize;
    this.model.state.weights.compliance += learningRate * gradients.compliance / batchSize;

    // Normalize weights to sum to 1
    const total = Object.values(this.model.state.weights).reduce((a, b) => a + b, 0);
    for (const key in this.model.state.weights) {
      this.model.state.weights[key] /= total;
    }

    // Update model stats
    this.model.state.episodeCount++;
    this.model.lastTrained = Date.now();

    await this.saveModel();
    
    console.log('[Adaptive Learning] ✓ Model trained');
    console.log(`[Adaptive Learning] Weights: ${JSON.stringify(this.model.state.weights, null, 2)}`);
    
    this.emit('model:trained', this.model);
  }

  /**
   * Predict value for a given state
   */
  predictValue(state) {
    const weights = this.model.state.weights;
    
    let value = 0;
    value += weights.cost * (state.costPerformance || 0.5);
    value += weights.uptime * (state.systemUptime || 0.5);
    value += weights.performance * (1 - (state.avgLatency || 0.5));
    value += weights.compliance * (state.complianceScore || 0.5);
    
    return value * 100;
  }

  /**
   * Generate policy tuning recommendations
   */
  async generateRecommendations(currentState) {
    console.log('[Adaptive Learning] Generating recommendations...');
    
    const recommendations = [];

    // Analyze weights to determine focus areas
    const weights = this.model.state.weights;
    const sortedWeights = Object.entries(weights).sort(([, a], [, b]) => b - a);

    // Recommendation 1: Scaling thresholds
    if (currentState.avgCpuUsage < 40 && currentState.avgMemoryUsage < 50) {
      recommendations.push({
        category: 'scaling',
        priority: 'medium',
        title: 'Adjust scale-down thresholds',
        description: 'System consistently under-utilized. Consider more aggressive scale-down.',
        currentThreshold: { cpu: 30, memory: 40 },
        recommendedThreshold: { cpu: 40, memory: 50 },
        expectedImpact: {
          costSavings: '15-20%',
          riskLevel: 'low'
        }
      });
    }

    if (currentState.avgCpuUsage > 80 || currentState.avgMemoryUsage > 85) {
      recommendations.push({
        category: 'scaling',
        priority: 'high',
        title: 'Lower scale-up thresholds',
        description: 'System frequently hitting resource limits. More proactive scaling needed.',
        currentThreshold: { cpu: 75, memory: 80 },
        recommendedThreshold: { cpu: 65, memory: 70 },
        expectedImpact: {
          uptimeImprovement: '2-3%',
          costIncrease: '10-15%'
        }
      });
    }

    // Recommendation 2: Job scheduling
    if (currentState.avgQueueDepth > 50) {
      recommendations.push({
        category: 'scheduling',
        priority: 'high',
        title: 'Increase concurrent job limit',
        description: 'Job queue consistently deep. System can handle more concurrent jobs.',
        currentLimit: currentState.maxConcurrentJobs || 100,
        recommendedLimit: Math.ceil((currentState.maxConcurrentJobs || 100) * 1.5),
        expectedImpact: {
          throughputIncrease: '40-50%',
          latencyReduction: '20-30%'
        }
      });
    }

    // Recommendation 3: Health check intervals
    if (currentState.incidentCount < 2 && weights.uptime < 0.3) {
      recommendations.push({
        category: 'monitoring',
        priority: 'low',
        title: 'Reduce health check frequency',
        description: 'Low incident rate. Can reduce monitoring overhead.',
        currentInterval: '30s',
        recommendedInterval: '60s',
        expectedImpact: {
          cpuReduction: '5-8%',
          riskLevel: 'low'
        }
      });
    }

    // Recommendation 4: Cost optimization based on patterns
    if (weights.cost > 0.4) {
      recommendations.push({
        category: 'cost',
        priority: 'high',
        title: 'Enable cost-aware scheduling',
        description: 'High cost sensitivity detected. Implement time-based cost optimization.',
        actions: [
          'Schedule non-urgent jobs during off-peak hours',
          'Use spot instances for batch workloads',
          'Implement auto-shutdown for idle resources'
        ],
        expectedImpact: {
          costSavings: '20-30%',
          latencyIncrease: '< 5%'
        }
      });
    }

    this.recommendations = recommendations;
    
    console.log(`[Adaptive Learning] Generated ${recommendations.length} recommendations`);
    this.emit('recommendations:generated', recommendations);
    
    return recommendations;
  }

  /**
   * Predict potential anomalies
   */
  async predictAnomalies(currentState, historicalData) {
    console.log('[Adaptive Learning] Predicting anomalies...');
    
    const predictions = [];

    // Analyze trends
    if (historicalData.length < 10) {
      return predictions;
    }

    // Cost trend analysis
    const recentCosts = historicalData.slice(-7).map(d => d.cost);
    const costTrend = this.calculateTrend(recentCosts);
    
    if (costTrend.direction === 'increasing' && costTrend.rate > 0.1) {
      predictions.push({
        type: 'cost_spike',
        probability: 0.7,
        timeframe: '24-48 hours',
        description: `Cost trending up ${(costTrend.rate * 100).toFixed(1)}% per day`,
        recommendedAction: 'Review resource allocation and identify cost drivers'
      });
    }

    // Latency trend analysis
    const recentLatencies = historicalData.slice(-10).map(d => d.avgLatency);
    const latencyTrend = this.calculateTrend(recentLatencies);
    
    if (latencyTrend.direction === 'increasing' && latencyTrend.rate > 0.15) {
      predictions.push({
        type: 'performance_degradation',
        probability: 0.65,
        timeframe: '12-24 hours',
        description: `Latency increasing ${(latencyTrend.rate * 100).toFixed(1)}% per period`,
        recommendedAction: 'Scale resources proactively to prevent SLO violation'
      });
    }

    // Agent failure prediction
    if (currentState.unhealthyAgents > 0) {
      const failureRate = currentState.unhealthyAgents / currentState.totalAgents;
      if (failureRate > 0.1) {
        predictions.push({
          type: 'cascading_failure',
          probability: 0.5,
          timeframe: '1-6 hours',
          description: `${(failureRate * 100).toFixed(1)}% of agents unhealthy`,
          recommendedAction: 'Investigate root cause and prepare for potential cascade'
        });
      }
    }

    this.predictions = predictions;
    
    console.log(`[Adaptive Learning] Predicted ${predictions.length} potential anomalies`);
    this.emit('anomalies:predicted', predictions);
    
    return predictions;
  }

  /**
   * Calculate trend from time series data
   */
  calculateTrend(data) {
    if (data.length < 2) {
      return { direction: 'stable', rate: 0 };
    }

    // Simple linear regression
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = data.reduce((sum, _, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const avgY = sumY / n;
    const rate = avgY !== 0 ? Math.abs(slope / avgY) : 0;

    return {
      direction: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable',
      rate: rate,
      slope: slope
    };
  }

  /**
   * Run adaptive learning cycle
   */
  async runCycle(currentState, historicalData) {
    console.log('[Adaptive Learning] Running adaptive cycle...');
    
    const cycle = {
      timestamp: Date.now(),
      state: currentState,
      results: {}
    };

    try {
      // Train model if enough data
      if (this.trainingData.length >= (this.config?.training?.minSamples || 100)) {
        await this.trainModel();
        cycle.results.training = 'completed';
      } else {
        cycle.results.training = 'skipped_insufficient_data';
      }

      // Generate recommendations
      const recommendations = await this.generateRecommendations(currentState);
      cycle.results.recommendations = recommendations;

      // Predict anomalies
      const predictions = await this.predictAnomalies(currentState, historicalData);
      cycle.results.predictions = predictions;

      console.log('[Adaptive Learning] ✓ Cycle complete');
      this.emit('cycle:complete', cycle);

      return cycle;
    } catch (error) {
      console.error('[Adaptive Learning] Cycle failed:', error);
      cycle.results.error = error.message;
      return cycle;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const loop = new AdaptiveLearningLoop();
  await loop.initialize();

  // Mock current state
  const currentState = {
    cost: 8500,
    budget: 10000,
    uptime: 99.5,
    latency: 250,
    targetLatency: 500,
    complianceScore: 95,
    violations: 0,
    incidents: 1,
    avgCpuUsage: 65,
    avgMemoryUsage: 70,
    avgQueueDepth: 35,
    maxConcurrentJobs: 100,
    totalAgents: 10,
    unhealthyAgents: 1,
    incidentCount: 1
  };

  // Mock historical data
  const historicalData = Array.from({ length: 30 }, (_, i) => ({
    timestamp: Date.now() - (30 - i) * 86400000,
    cost: 8000 + Math.random() * 1000,
    avgLatency: 200 + Math.random() * 100,
    uptime: 99 + Math.random() * 1
  }));

  // Record some observations
  for (let i = 0; i < 5; i++) {
    loop.recordObservation(
      { costPerformance: 0.85, systemUptime: 0.995, avgLatency: 0.5, complianceScore: 0.95 },
      'scale_up',
      85,
      { costPerformance: 0.82, systemUptime: 0.998, avgLatency: 0.4, complianceScore: 0.95 }
    );
  }

  // Run cycle
  const cycle = await loop.runCycle(currentState, historicalData);
  
  console.log('\n=== Adaptive Learning Cycle Results ===');
  console.log(`Recommendations: ${cycle.results.recommendations?.length || 0}`);
  console.log(`Predictions: ${cycle.results.predictions?.length || 0}`);
  
  if (cycle.results.recommendations?.length > 0) {
    console.log('\nTop Recommendation:');
    console.log(JSON.stringify(cycle.results.recommendations[0], null, 2));
  }
}

export default AdaptiveLearningLoop;
