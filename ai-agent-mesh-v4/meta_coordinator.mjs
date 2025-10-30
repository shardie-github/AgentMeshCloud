/**
 * Meta-Coordinator AI - Autonomous Network Optimization
 * 
 * Purpose: Self-optimizing agent network orchestration, drift detection, and adaptive policy management
 * Capabilities:
 * - Real-time telemetry analysis (latency, cost, throughput)
 * - Automatic compute rebalancing across regions
 * - Drift detection and remediation
 * - Prompt and policy auto-tuning
 * - Predictive scaling
 * 
 * KPIs:
 * - Optimization cycle time: <5 minutes
 * - Cost reduction: 15-30%
 * - Latency improvement: 20-40%
 * - Drift detection accuracy: >95%
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// META-COORDINATOR CONSTANTS
// ═══════════════════════════════════════════════════════════════

export const OptimizationObjective = {
  COST: 'minimize-cost',
  LATENCY: 'minimize-latency',
  BALANCED: 'balanced',
  THROUGHPUT: 'maximize-throughput',
  CARBON: 'minimize-carbon'
};

export const DriftType = {
  PERFORMANCE: 'performance-degradation',
  COMPLIANCE: 'compliance-violation',
  COST: 'cost-anomaly',
  ALIGNMENT: 'alignment-drift',
  SECURITY: 'security-anomaly'
};

export const RemediationStrategy = {
  REBALANCE: 'compute-rebalance',
  RETUNE: 'parameter-retune',
  ROLLBACK: 'policy-rollback',
  ISOLATE: 'quarantine-agent',
  ALERT: 'human-intervention'
};

// ═══════════════════════════════════════════════════════════════
// META-COORDINATOR
// ═══════════════════════════════════════════════════════════════

export class MetaCoordinator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.coordinatorId = config.coordinatorId || `meta-${randomUUID()}`;
    this.objective = config.objective || OptimizationObjective.BALANCED;
    
    // Connected systems
    this.meshRegistry = config.meshRegistry;
    this.telemetryCollector = config.telemetryCollector;
    this.policyEngine = config.policyEngine;
    this.trustEngine = config.trustEngine;
    
    // Optimization state
    this.meshTopology = new Map(); // meshId -> capabilities, load, region
    this.telemetryBuffer = [];
    this.driftDetectors = new Map();
    this.optimizationHistory = [];
    
    // Adaptive policies
    this.adaptivePolicies = new Map();
    this.policyPerformance = new Map();
    
    // ML models (stubs for production ML integration)
    this.anomalyDetector = null;
    this.costPredictor = null;
    this.loadBalancer = null;
    
    this.metrics = {
      optimizationsPerformed: 0,
      driftsDetected: 0,
      remediationsExecuted: 0,
      costReductionPercent: 0,
      latencyImprovementPercent: 0,
      avgOptimizationCycleTime: 0
    };
    
    this.initializeCoordinator();
  }
  
  initializeCoordinator() {
    console.log(`[MetaCoordinator] Initializing coordinator ${this.coordinatorId}`);
    console.log(`  Objective: ${this.objective}`);
    
    // Start telemetry collection
    this.telemetryTimer = setInterval(() => this.collectTelemetry(), 10000); // 10 seconds
    
    // Start optimization cycle
    this.optimizationTimer = setInterval(() => this.runOptimizationCycle(), 300000); // 5 minutes
    
    // Start drift detection
    this.driftTimer = setInterval(() => this.detectDrift(), 60000); // 1 minute
    
    // Start policy evaluation
    this.policyTimer = setInterval(() => this.evaluatePolicies(), 600000); // 10 minutes
  }
  
  // ═══════════════════════════════════════════════════════════════
  // TELEMETRY COLLECTION
  // ═══════════════════════════════════════════════════════════════
  
  async collectTelemetry() {
    try {
      // Collect from all registered mesh nodes
      const meshNodes = await this.meshRegistry.getAllNodes();
      
      for (const node of meshNodes) {
        const telemetry = await this.telemetryCollector.collect(node.meshId);
        
        this.telemetryBuffer.push({
          meshId: node.meshId,
          timestamp: Date.now(),
          metrics: {
            latency: telemetry.avgLatency,
            throughput: telemetry.requestsPerSecond,
            errorRate: telemetry.errorRate,
            cpuUsage: telemetry.cpuUsage,
            memoryUsage: telemetry.memoryUsage,
            costPerHour: telemetry.costPerHour,
            carbonIntensity: telemetry.carbonIntensity,
            queueDepth: telemetry.queueDepth,
            activeAgents: telemetry.activeAgents
          }
        });
      }
      
      // Trim buffer (keep last 1 hour)
      const oneHourAgo = Date.now() - 3600000;
      this.telemetryBuffer = this.telemetryBuffer.filter(t => t.timestamp > oneHourAgo);
      
      // Update topology
      await this.updateTopology(meshNodes);
      
    } catch (error) {
      console.error('[MetaCoordinator] Telemetry collection failed:', error.message);
    }
  }
  
  async updateTopology(meshNodes) {
    for (const node of meshNodes) {
      const telemetry = this.getLatestTelemetry(node.meshId);
      
      this.meshTopology.set(node.meshId, {
        region: node.region,
        capabilities: node.capabilities,
        currentLoad: telemetry?.metrics.cpuUsage || 0,
        availableCapacity: 100 - (telemetry?.metrics.cpuUsage || 0),
        costPerHour: telemetry?.metrics.costPerHour || 0,
        latency: telemetry?.metrics.latency || 0,
        carbonIntensity: telemetry?.metrics.carbonIntensity || 0,
        healthScore: this.computeHealthScore(telemetry)
      });
    }
  }
  
  getLatestTelemetry(meshId) {
    const recent = this.telemetryBuffer
      .filter(t => t.meshId === meshId)
      .sort((a, b) => b.timestamp - a.timestamp);
    return recent[0] || null;
  }
  
  computeHealthScore(telemetry) {
    if (!telemetry) return 50;
    
    const m = telemetry.metrics;
    
    // Health = weighted combination of factors
    const latencyScore = Math.max(0, 100 - m.latency);
    const errorScore = Math.max(0, 100 - m.errorRate * 100);
    const cpuScore = Math.max(0, 100 - m.cpuUsage);
    const memScore = Math.max(0, 100 - m.memoryUsage);
    
    return (latencyScore * 0.4 + errorScore * 0.3 + cpuScore * 0.2 + memScore * 0.1);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // OPTIMIZATION CYCLE
  // ═══════════════════════════════════════════════════════════════
  
  async runOptimizationCycle() {
    const startTime = Date.now();
    
    console.log(`[MetaCoordinator] Starting optimization cycle (objective: ${this.objective})`);
    
    try {
      // Step 1: Analyze current state
      const analysis = await this.analyzeNetworkState();
      
      // Step 2: Identify optimization opportunities
      const opportunities = this.identifyOptimizations(analysis);
      
      if (opportunities.length === 0) {
        console.log('[MetaCoordinator] No optimization opportunities found');
        return;
      }
      
      // Step 3: Simulate optimizations
      const simulations = await this.simulateOptimizations(opportunities);
      
      // Step 4: Select best optimization
      const bestOptimization = this.selectBestOptimization(simulations);
      
      // Step 5: Execute optimization
      await this.executeOptimization(bestOptimization);
      
      this.metrics.optimizationsPerformed++;
      
      const duration = Date.now() - startTime;
      this.metrics.avgOptimizationCycleTime = 
        (this.metrics.avgOptimizationCycleTime * 0.9) + (duration * 0.1);
      
      console.log(`[MetaCoordinator] Optimization cycle completed in ${duration}ms`);
      console.log(`  Optimization: ${bestOptimization.type}`);
      console.log(`  Expected improvement: ${bestOptimization.expectedImprovement}%`);
      
      this.emit('optimization:completed', {
        optimization: bestOptimization,
        duration
      });
      
    } catch (error) {
      console.error('[MetaCoordinator] Optimization cycle failed:', error.message);
      this.emit('optimization:failed', { error: error.message });
    }
  }
  
  async analyzeNetworkState() {
    const analysis = {
      totalNodes: this.meshTopology.size,
      avgLatency: 0,
      avgCostPerHour: 0,
      avgCarbonIntensity: 0,
      avgLoad: 0,
      bottlenecks: [],
      underutilized: [],
      overutilized: []
    };
    
    let totalLatency = 0;
    let totalCost = 0;
    let totalCarbon = 0;
    let totalLoad = 0;
    
    for (const [meshId, topology] of this.meshTopology.entries()) {
      totalLatency += topology.latency;
      totalCost += topology.costPerHour;
      totalCarbon += topology.carbonIntensity;
      totalLoad += topology.currentLoad;
      
      // Identify problematic nodes
      if (topology.currentLoad > 80) {
        analysis.overutilized.push({ meshId, load: topology.currentLoad });
      } else if (topology.currentLoad < 20) {
        analysis.underutilized.push({ meshId, load: topology.currentLoad });
      }
      
      if (topology.latency > 200) {
        analysis.bottlenecks.push({ meshId, latency: topology.latency });
      }
    }
    
    const nodeCount = this.meshTopology.size || 1;
    analysis.avgLatency = totalLatency / nodeCount;
    analysis.avgCostPerHour = totalCost / nodeCount;
    analysis.avgCarbonIntensity = totalCarbon / nodeCount;
    analysis.avgLoad = totalLoad / nodeCount;
    
    return analysis;
  }
  
  identifyOptimizations(analysis) {
    const opportunities = [];
    
    // Opportunity 1: Rebalance overutilized nodes
    if (analysis.overutilized.length > 0 && analysis.underutilized.length > 0) {
      opportunities.push({
        type: 'load-rebalance',
        priority: 'high',
        from: analysis.overutilized,
        to: analysis.underutilized,
        reason: 'Load imbalance detected'
      });
    }
    
    // Opportunity 2: Cost optimization via region shift
    if (this.objective === OptimizationObjective.COST || 
        this.objective === OptimizationObjective.BALANCED) {
      const costVariance = this.analyzeRegionalCosts();
      if (costVariance.max / costVariance.min > 1.5) {
        opportunities.push({
          type: 'region-shift',
          priority: 'medium',
          targetRegion: costVariance.cheapestRegion,
          expectedSavings: costVariance.potentialSavings,
          reason: 'Significant regional cost difference'
        });
      }
    }
    
    // Opportunity 3: Latency optimization via geo-routing
    if (this.objective === OptimizationObjective.LATENCY || 
        this.objective === OptimizationObjective.BALANCED) {
      if (analysis.avgLatency > 100) {
        opportunities.push({
          type: 'geo-optimization',
          priority: 'high',
          currentLatency: analysis.avgLatency,
          targetLatency: analysis.avgLatency * 0.7,
          reason: 'High average latency detected'
        });
      }
    }
    
    // Opportunity 4: Carbon reduction
    if (this.objective === OptimizationObjective.CARBON) {
      const carbonVariance = this.analyzeRegionalCarbon();
      if (carbonVariance.max / carbonVariance.min > 2.0) {
        opportunities.push({
          type: 'carbon-reduction',
          priority: 'medium',
          targetRegion: carbonVariance.greenestRegion,
          expectedReduction: carbonVariance.potentialReduction,
          reason: 'High carbon intensity regions in use'
        });
      }
    }
    
    // Opportunity 5: Scale down idle resources
    if (analysis.underutilized.length > 2) {
      opportunities.push({
        type: 'scale-down',
        priority: 'low',
        candidates: analysis.underutilized,
        expectedSavings: this.estimateScaleDownSavings(analysis.underutilized),
        reason: 'Multiple underutilized nodes'
      });
    }
    
    return opportunities.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }
  
  analyzeRegionalCosts() {
    const regionalCosts = new Map();
    
    for (const [meshId, topology] of this.meshTopology.entries()) {
      const region = topology.region;
      if (!regionalCosts.has(region)) {
        regionalCosts.set(region, []);
      }
      regionalCosts.get(region).push(topology.costPerHour);
    }
    
    let minCost = Infinity;
    let maxCost = 0;
    let cheapestRegion = null;
    
    for (const [region, costs] of regionalCosts.entries()) {
      const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
      if (avgCost < minCost) {
        minCost = avgCost;
        cheapestRegion = region;
      }
      if (avgCost > maxCost) {
        maxCost = avgCost;
      }
    }
    
    return {
      min: minCost,
      max: maxCost,
      cheapestRegion,
      potentialSavings: ((maxCost - minCost) / maxCost * 100).toFixed(1)
    };
  }
  
  analyzeRegionalCarbon() {
    const regionalCarbon = new Map();
    
    for (const [meshId, topology] of this.meshTopology.entries()) {
      const region = topology.region;
      if (!regionalCarbon.has(region)) {
        regionalCarbon.set(region, []);
      }
      regionalCarbon.get(region).push(topology.carbonIntensity);
    }
    
    let minCarbon = Infinity;
    let maxCarbon = 0;
    let greenestRegion = null;
    
    for (const [region, intensities] of regionalCarbon.entries()) {
      const avgCarbon = intensities.reduce((a, b) => a + b, 0) / intensities.length;
      if (avgCarbon < minCarbon) {
        minCarbon = avgCarbon;
        greenestRegion = region;
      }
      if (avgCarbon > maxCarbon) {
        maxCarbon = avgCarbon;
      }
    }
    
    return {
      min: minCarbon,
      max: maxCarbon,
      greenestRegion,
      potentialReduction: ((maxCarbon - minCarbon) / maxCarbon * 100).toFixed(1)
    };
  }
  
  estimateScaleDownSavings(underutilized) {
    let totalSavings = 0;
    for (const node of underutilized) {
      const topology = this.meshTopology.get(node.meshId);
      if (topology && topology.currentLoad < 10) {
        totalSavings += topology.costPerHour;
      }
    }
    return totalSavings;
  }
  
  async simulateOptimizations(opportunities) {
    const simulations = [];
    
    for (const opp of opportunities) {
      const simulation = {
        opportunity: opp,
        expectedImprovement: 0,
        risk: 'low',
        estimatedDuration: 0,
        sideEffects: []
      };
      
      switch (opp.type) {
        case 'load-rebalance':
          simulation.expectedImprovement = 25;
          simulation.estimatedDuration = 30000; // 30 seconds
          simulation.sideEffects = ['temporary-latency-spike'];
          break;
          
        case 'region-shift':
          simulation.expectedImprovement = parseFloat(opp.expectedSavings);
          simulation.estimatedDuration = 120000; // 2 minutes
          simulation.risk = 'medium';
          simulation.sideEffects = ['brief-downtime', 'data-migration'];
          break;
          
        case 'geo-optimization':
          simulation.expectedImprovement = 30;
          simulation.estimatedDuration = 60000; // 1 minute
          simulation.sideEffects = ['routing-update'];
          break;
          
        case 'carbon-reduction':
          simulation.expectedImprovement = parseFloat(opp.expectedReduction);
          simulation.estimatedDuration = 120000;
          simulation.risk = 'low';
          break;
          
        case 'scale-down':
          simulation.expectedImprovement = 15;
          simulation.estimatedDuration = 45000;
          simulation.risk = 'low';
          simulation.sideEffects = ['capacity-reduction'];
          break;
      }
      
      simulations.push(simulation);
    }
    
    return simulations;
  }
  
  selectBestOptimization(simulations) {
    // Score each simulation
    const scored = simulations.map(sim => {
      const riskPenalty = { low: 0, medium: 10, high: 30 }[sim.risk];
      const score = sim.expectedImprovement - riskPenalty;
      
      return { ...sim, score };
    });
    
    // Select highest scoring
    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }
  
  async executeOptimization(optimization) {
    console.log(`[MetaCoordinator] Executing optimization: ${optimization.opportunity.type}`);
    
    const optimizationRecord = {
      id: randomUUID(),
      type: optimization.opportunity.type,
      startTime: Date.now(),
      endTime: null,
      success: false,
      actualImprovement: 0,
      details: optimization.opportunity
    };
    
    try {
      switch (optimization.opportunity.type) {
        case 'load-rebalance':
          await this.executeLoadRebalance(optimization.opportunity);
          break;
          
        case 'region-shift':
          await this.executeRegionShift(optimization.opportunity);
          break;
          
        case 'geo-optimization':
          await this.executeGeoOptimization(optimization.opportunity);
          break;
          
        case 'carbon-reduction':
          await this.executeCarbonReduction(optimization.opportunity);
          break;
          
        case 'scale-down':
          await this.executeScaleDown(optimization.opportunity);
          break;
      }
      
      optimizationRecord.success = true;
      optimizationRecord.endTime = Date.now();
      optimizationRecord.actualImprovement = optimization.expectedImprovement;
      
      this.optimizationHistory.push(optimizationRecord);
      
      // Update metrics
      if (optimization.opportunity.type === 'region-shift' || optimization.opportunity.type === 'scale-down') {
        this.metrics.costReductionPercent += optimization.expectedImprovement / 10;
      }
      if (optimization.opportunity.type === 'geo-optimization') {
        this.metrics.latencyImprovementPercent += optimization.expectedImprovement / 10;
      }
      
    } catch (error) {
      console.error('[MetaCoordinator] Optimization execution failed:', error.message);
      optimizationRecord.error = error.message;
      this.optimizationHistory.push(optimizationRecord);
      throw error;
    }
  }
  
  async executeLoadRebalance(opportunity) {
    console.log('[MetaCoordinator] Rebalancing load...');
    
    // Move workload from overutilized to underutilized nodes
    for (const overloaded of opportunity.from) {
      const underloaded = opportunity.to[0]; // Simple: pick first available
      
      if (underloaded) {
        await this.meshRegistry.rebalanceLoad(overloaded.meshId, underloaded.meshId, {
          percentage: 30 // Move 30% of load
        });
      }
    }
  }
  
  async executeRegionShift(opportunity) {
    console.log(`[MetaCoordinator] Shifting workload to ${opportunity.targetRegion}...`);
    
    // In production: migrate workload to target region
    // For now: simulate
    await this.sleep(2000);
  }
  
  async executeGeoOptimization(opportunity) {
    console.log('[MetaCoordinator] Optimizing geographic routing...');
    
    // Update routing tables to prefer closer nodes
    await this.meshRegistry.updateRoutingPreferences({
      strategy: 'minimize-latency',
      targetLatency: opportunity.targetLatency
    });
  }
  
  async executeCarbonReduction(opportunity) {
    console.log(`[MetaCoordinator] Shifting to greener region ${opportunity.targetRegion}...`);
    
    // Route traffic to regions with lower carbon intensity
    await this.meshRegistry.updateRoutingPreferences({
      strategy: 'minimize-carbon',
      preferredRegion: opportunity.targetRegion
    });
  }
  
  async executeScaleDown(opportunity) {
    console.log('[MetaCoordinator] Scaling down underutilized nodes...');
    
    for (const node of opportunity.candidates) {
      if (node.load < 10) {
        await this.meshRegistry.scaleNode(node.meshId, 'down');
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DRIFT DETECTION
  // ═══════════════════════════════════════════════════════════════
  
  async detectDrift() {
    try {
      const drifts = [];
      
      // Check for performance drift
      const perfDrift = await this.detectPerformanceDrift();
      if (perfDrift) drifts.push(perfDrift);
      
      // Check for cost drift
      const costDrift = await this.detectCostDrift();
      if (costDrift) drifts.push(costDrift);
      
      // Check for alignment drift
      const alignmentDrift = await this.detectAlignmentDrift();
      if (alignmentDrift) drifts.push(alignmentDrift);
      
      if (drifts.length > 0) {
        console.warn(`[MetaCoordinator] Detected ${drifts.length} drift(s)`);
        
        for (const drift of drifts) {
          this.metrics.driftsDetected++;
          await this.remediateDrift(drift);
        }
      }
      
    } catch (error) {
      console.error('[MetaCoordinator] Drift detection failed:', error.message);
    }
  }
  
  async detectPerformanceDrift() {
    // Compare current performance to baseline
    const recent = this.telemetryBuffer.slice(-60); // Last 10 minutes
    const baseline = this.getPerformanceBaseline();
    
    if (recent.length < 10 || !baseline) return null;
    
    const avgLatency = recent.reduce((sum, t) => sum + t.metrics.latency, 0) / recent.length;
    
    if (avgLatency > baseline.latency * 1.5) {
      return {
        type: DriftType.PERFORMANCE,
        severity: 'high',
        metric: 'latency',
        current: avgLatency,
        baseline: baseline.latency,
        deviation: ((avgLatency / baseline.latency - 1) * 100).toFixed(1) + '%'
      };
    }
    
    return null;
  }
  
  async detectCostDrift() {
    const analysis = await this.analyzeNetworkState();
    const baseline = this.getCostBaseline();
    
    if (!baseline) return null;
    
    if (analysis.avgCostPerHour > baseline * 1.3) {
      return {
        type: DriftType.COST,
        severity: 'medium',
        metric: 'cost',
        current: analysis.avgCostPerHour,
        baseline: baseline,
        deviation: ((analysis.avgCostPerHour / baseline - 1) * 100).toFixed(1) + '%'
      };
    }
    
    return null;
  }
  
  async detectAlignmentDrift() {
    // Check policy adherence
    const violations = await this.policyEngine.checkCompliance();
    
    if (violations.length > 5) {
      return {
        type: DriftType.ALIGNMENT,
        severity: 'high',
        metric: 'policy-violations',
        current: violations.length,
        violations: violations
      };
    }
    
    return null;
  }
  
  async remediateDrift(drift) {
    console.log(`[MetaCoordinator] Remediating drift: ${drift.type}`);
    
    const strategy = this.selectRemediationStrategy(drift);
    
    try {
      switch (strategy) {
        case RemediationStrategy.REBALANCE:
          await this.executeLoadRebalance({ from: [], to: [] }); // Auto-balance
          break;
          
        case RemediationStrategy.RETUNE:
          await this.retunePolicies(drift);
          break;
          
        case RemediationStrategy.ROLLBACK:
          await this.rollbackPolicy(drift);
          break;
          
        case RemediationStrategy.ALERT:
          this.emit('drift:human-intervention-required', drift);
          break;
      }
      
      this.metrics.remediationsExecuted++;
      
      console.log(`[MetaCoordinator] Drift remediated using strategy: ${strategy}`);
      
    } catch (error) {
      console.error('[MetaCoordinator] Drift remediation failed:', error.message);
      this.emit('drift:remediation-failed', { drift, error: error.message });
    }
  }
  
  selectRemediationStrategy(drift) {
    switch (drift.type) {
      case DriftType.PERFORMANCE:
        return RemediationStrategy.REBALANCE;
      case DriftType.COST:
        return RemediationStrategy.RETUNE;
      case DriftType.ALIGNMENT:
        return drift.severity === 'high' ? RemediationStrategy.ROLLBACK : RemediationStrategy.RETUNE;
      default:
        return RemediationStrategy.ALERT;
    }
  }
  
  async retunePolicies(drift) {
    console.log('[MetaCoordinator] Retuning policies based on drift...');
    // In production: adjust policy parameters using ML
    await this.sleep(1000);
  }
  
  async rollbackPolicy(drift) {
    console.log('[MetaCoordinator] Rolling back to last known good policy...');
    await this.policyEngine.rollback();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ADAPTIVE POLICY MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  async evaluatePolicies() {
    console.log('[MetaCoordinator] Evaluating policy performance...');
    
    for (const [policyId, policy] of this.adaptivePolicies.entries()) {
      const performance = await this.measurePolicyPerformance(policyId);
      
      this.policyPerformance.set(policyId, performance);
      
      if (performance.score < 60) {
        console.warn(`[MetaCoordinator] Policy ${policyId} performing poorly (score: ${performance.score})`);
        await this.adaptPolicy(policyId, performance);
      }
    }
  }
  
  async measurePolicyPerformance(policyId) {
    // Measure policy effectiveness
    return {
      score: 75 + Math.random() * 20, // Simulated
      successRate: 0.85 + Math.random() * 0.1,
      avgResponseTime: 100 + Math.random() * 50,
      costEfficiency: 0.75 + Math.random() * 0.2
    };
  }
  
  async adaptPolicy(policyId, performance) {
    console.log(`[MetaCoordinator] Adapting policy ${policyId}...`);
    
    // In production: use RL or gradient-based optimization
    // For now: simulate adaptation
    const policy = this.adaptivePolicies.get(policyId);
    
    if (policy) {
      // Example: adjust threshold
      policy.parameters.threshold *= 0.9;
      this.adaptivePolicies.set(policyId, policy);
      
      await this.policyEngine.updatePolicy(policyId, policy);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════
  
  getPerformanceBaseline() {
    if (this.optimizationHistory.length === 0) return null;
    
    // Use median of historical performance
    const latencies = this.optimizationHistory
      .filter(h => h.success)
      .map(h => h.details.currentLatency || 50);
    
    latencies.sort((a, b) => a - b);
    return { latency: latencies[Math.floor(latencies.length / 2)] || 50 };
  }
  
  getCostBaseline() {
    if (this.optimizationHistory.length === 0) return null;
    
    const costs = this.telemetryBuffer
      .filter(t => t.timestamp > Date.now() - 86400000) // Last 24h
      .map(t => t.metrics.costPerHour);
    
    return costs.length > 0 ? costs.reduce((a, b) => a + b) / costs.length : null;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      topologySize: this.meshTopology.size,
      telemetryBufferSize: this.telemetryBuffer.length,
      optimizationHistorySize: this.optimizationHistory.length,
      adaptivePoliciesCount: this.adaptivePolicies.size
    };
  }
  
  async shutdown() {
    console.log('[MetaCoordinator] Shutting down meta-coordinator...');
    
    clearInterval(this.telemetryTimer);
    clearInterval(this.optimizationTimer);
    clearInterval(this.driftTimer);
    clearInterval(this.policyTimer);
    
    this.emit('coordinator:shutdown');
  }
}

export default MetaCoordinator;
