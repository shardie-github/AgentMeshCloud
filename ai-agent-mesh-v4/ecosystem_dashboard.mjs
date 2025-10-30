/**
 * Ecosystem Dashboard - Global Mesh Network Analytics
 * 
 * Purpose: Real-time visibility into mesh network health, performance, and impact
 * Metrics: Active agents, uptime, trust scores, carbon footprint, economic activity
 * 
 * Features:
 * - Real-time telemetry aggregation
 * - Multi-regional statistics
 * - Trust score distribution
 * - Economic metrics (transactions, staking, fees)
 * - Environmental impact tracking
 * - Network topology visualization
 * 
 * KPIs:
 * - Data freshness: <30 seconds
 * - Query performance: <100ms p95
 * - Dashboard uptime: 99.99%
 * - Concurrent users: 10,000+
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

// ═══════════════════════════════════════════════════════════════
// ECOSYSTEM DASHBOARD
// ═══════════════════════════════════════════════════════════════

export class EcosystemDashboard extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.dashboardId = config.dashboardId || `dashboard-${randomUUID()}`;
    this.meshRegistry = config.meshRegistry;
    this.trustEngine = config.trustEngine;
    this.telemetryCollector = config.telemetryCollector;
    this.economicTracker = config.economicTracker;
    
    // Aggregated metrics cache
    this.metricsCache = {
      network: {},
      regional: {},
      trust: {},
      economic: {},
      environmental: {},
      lastUpdated: null
    };
    
    // Real-time data streams
    this.activeConnections = new Set();
    this.streamBuffer = [];
    
    this.metrics = {
      queriesServed: 0,
      avgQueryLatency: 0,
      cacheHitRate: 0,
      activeSubscribers: 0
    };
    
    this.initializeDashboard();
  }
  
  initializeDashboard() {
    console.log(`[EcosystemDashboard] Initializing dashboard ${this.dashboardId}`);
    
    // Start metric aggregation
    this.aggregationTimer = setInterval(() => this.aggregateMetrics(), 30000); // 30 seconds
    
    // Start real-time streaming
    this.streamTimer = setInterval(() => this.broadcastUpdates(), 5000); // 5 seconds
    
    // Initial metric collection
    this.aggregateMetrics();
    
    console.log('[EcosystemDashboard] Dashboard active');
  }
  
  // ═══════════════════════════════════════════════════════════════
  // METRIC AGGREGATION
  // ═══════════════════════════════════════════════════════════════
  
  async aggregateMetrics() {
    const startTime = Date.now();
    
    try {
      console.log('[EcosystemDashboard] Aggregating metrics...');
      
      // Collect from all subsystems in parallel
      const [network, trust, economic, environmental] = await Promise.all([
        this.aggregateNetworkMetrics(),
        this.aggregateTrustMetrics(),
        this.aggregateEconomicMetrics(),
        this.aggregateEnvironmentalMetrics()
      ]);
      
      this.metricsCache = {
        network,
        trust,
        economic,
        environmental,
        lastUpdated: Date.now()
      };
      
      const duration = Date.now() - startTime;
      console.log(`[EcosystemDashboard] Metrics aggregated in ${duration}ms`);
      
      this.emit('metrics:updated', this.metricsCache);
      
    } catch (error) {
      console.error('[EcosystemDashboard] Metric aggregation failed:', error.message);
    }
  }
  
  async aggregateNetworkMetrics() {
    const meshNodes = await this.meshRegistry.getAllNodes();
    
    const metrics = {
      totalNodes: meshNodes.length,
      activeNodes: 0,
      totalAgents: 0,
      activeFederations: 0,
      totalInteractions: 0,
      avgLatency: 0,
      uptimePercentage: 0,
      
      byRegion: {},
      byType: {},
      topPerformers: []
    };
    
    let totalLatency = 0;
    let totalUptime = 0;
    
    for (const node of meshNodes) {
      const telemetry = await this.telemetryCollector.getLatest(node.meshId);
      
      if (!telemetry) continue;
      
      // Active if seen in last 5 minutes
      const isActive = (Date.now() - telemetry.timestamp) < 300000;
      if (isActive) metrics.activeNodes++;
      
      metrics.totalAgents += telemetry.activeAgents || 0;
      metrics.activeFederations += telemetry.activeFederations || 0;
      metrics.totalInteractions += telemetry.totalInteractions || 0;
      
      totalLatency += telemetry.avgLatency || 0;
      totalUptime += telemetry.uptimePercentage || 0;
      
      // Regional breakdown
      const region = node.region || 'unknown';
      if (!metrics.byRegion[region]) {
        metrics.byRegion[region] = { nodes: 0, agents: 0, uptime: 0 };
      }
      metrics.byRegion[region].nodes++;
      metrics.byRegion[region].agents += telemetry.activeAgents || 0;
      metrics.byRegion[region].uptime += telemetry.uptimePercentage || 0;
      
      // Type breakdown
      const type = node.type || 'unknown';
      metrics.byType[type] = (metrics.byType[type] || 0) + 1;
    }
    
    metrics.avgLatency = meshNodes.length > 0 ? totalLatency / meshNodes.length : 0;
    metrics.uptimePercentage = meshNodes.length > 0 ? totalUptime / meshNodes.length : 0;
    
    // Calculate regional averages
    for (const region in metrics.byRegion) {
      const data = metrics.byRegion[region];
      data.avgUptime = data.nodes > 0 ? data.uptime / data.nodes : 0;
      delete data.uptime;
    }
    
    // Find top performers
    const performanceData = await Promise.all(
      meshNodes.map(async node => ({
        meshId: node.meshId,
        score: await this.calculatePerformanceScore(node)
      }))
    );
    
    metrics.topPerformers = performanceData
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(p => ({ meshId: p.meshId, score: p.score }));
    
    return metrics;
  }
  
  async aggregateTrustMetrics() {
    const metrics = {
      avgTrustScore: 0,
      distribution: {
        unverified: 0,
        basic: 0,
        validated: 0,
        certified: 0,
        audited: 0
      },
      totalAttestations: 0,
      violationRate: 0,
      trustGraphEdges: 0,
      topTrustedNodes: []
    };
    
    const trustData = this.trustEngine.exportTrustGraph();
    
    metrics.trustGraphEdges = trustData.totalEdges;
    
    // Calculate trust score distribution
    const scores = [];
    for (const edge of trustData.edges) {
      const sourceScore = await this.trustEngine.getTrustScore(edge.from);
      scores.push(sourceScore);
      
      // Classify into trust levels
      if (sourceScore < 25) metrics.distribution.unverified++;
      else if (sourceScore < 50) metrics.distribution.basic++;
      else if (sourceScore < 75) metrics.distribution.validated++;
      else if (sourceScore < 90) metrics.distribution.certified++;
      else metrics.distribution.audited++;
      
      metrics.totalAttestations += edge.attestations || 0;
      metrics.violationRate += edge.violations / edge.interactions;
    }
    
    metrics.avgTrustScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;
    
    metrics.violationRate = trustData.edges.length > 0
      ? metrics.violationRate / trustData.edges.length
      : 0;
    
    // Top trusted nodes
    metrics.topTrustedNodes = await this.getTopTrustedNodes(10);
    
    return metrics;
  }
  
  async aggregateEconomicMetrics() {
    const metrics = {
      meshToken: {
        totalSupply: 1000000000,
        circulatingSupply: 0,
        burned: 0,
        staked: 0,
        price: 0,
        marketCap: 0,
        volume24h: 0
      },
      transactions: {
        count24h: 0,
        volume24h: 0,
        fees24h: 0,
        avgFee: 0
      },
      compute: {
        hoursUsed24h: 0,
        costMESH24h: 0,
        topConsumers: []
      },
      staking: {
        totalStaked: 0,
        uniqueStakers: 0,
        avgStake: 0,
        rewards24h: 0,
        apr: 5.0
      },
      treasury: {
        balance: 0,
        inflow24h: 0,
        outflow24h: 0
      }
    };
    
    // Get economic data from tracker
    if (this.economicTracker) {
      const tokenData = await this.economicTracker.getTokenMetrics();
      const txData = await this.economicTracker.getTransactionMetrics(24);
      const computeData = await this.economicTracker.getComputeMetrics(24);
      const stakingData = await this.economicTracker.getStakingMetrics();
      
      Object.assign(metrics.meshToken, tokenData);
      Object.assign(metrics.transactions, txData);
      Object.assign(metrics.compute, computeData);
      Object.assign(metrics.staking, stakingData);
      metrics.treasury = await this.economicTracker.getTreasuryMetrics();
    }
    
    return metrics;
  }
  
  async aggregateEnvironmentalMetrics() {
    const metrics = {
      carbonFootprint: {
        total: 0,          // kg CO2
        offsetAchieved: 0, // kg CO2 offset
        netFootprint: 0,   // kg CO2 (total - offset)
        offsetPercentage: 0
      },
      renewableEnergy: {
        percentage: 0,
        regions: {}
      },
      efficiency: {
        computePerWatt: 0,
        carbonPerTransaction: 0
      },
      targets: {
        carbonNeutral: { target: '2027-01-01', progress: 0 },
        renewable90: { target: '2028-01-01', progress: 0 }
      }
    };
    
    const meshNodes = await this.meshRegistry.getAllNodes();
    
    let totalCarbon = 0;
    let totalOffset = 0;
    let totalRenewable = 0;
    let nodeCount = 0;
    
    for (const node of meshNodes) {
      const telemetry = await this.telemetryCollector.getLatest(node.meshId);
      if (!telemetry) continue;
      
      totalCarbon += telemetry.carbonEmitted || 0;
      totalOffset += telemetry.carbonOffset || 0;
      totalRenewable += telemetry.renewablePercentage || 0;
      nodeCount++;
      
      // Regional renewable breakdown
      const region = node.region || 'unknown';
      if (!metrics.renewableEnergy.regions[region]) {
        metrics.renewableEnergy.regions[region] = { percentage: 0, count: 0 };
      }
      metrics.renewableEnergy.regions[region].percentage += telemetry.renewablePercentage || 0;
      metrics.renewableEnergy.regions[region].count++;
    }
    
    metrics.carbonFootprint.total = totalCarbon;
    metrics.carbonFootprint.offsetAchieved = totalOffset;
    metrics.carbonFootprint.netFootprint = totalCarbon - totalOffset;
    metrics.carbonFootprint.offsetPercentage = totalCarbon > 0 
      ? (totalOffset / totalCarbon * 100) 
      : 0;
    
    metrics.renewableEnergy.percentage = nodeCount > 0 
      ? totalRenewable / nodeCount 
      : 0;
    
    // Calculate regional averages
    for (const region in metrics.renewableEnergy.regions) {
      const data = metrics.renewableEnergy.regions[region];
      data.percentage = data.count > 0 ? data.percentage / data.count : 0;
      delete data.count;
    }
    
    // Calculate progress toward targets
    metrics.targets.carbonNeutral.progress = metrics.carbonFootprint.offsetPercentage;
    metrics.targets.renewable90.progress = (metrics.renewableEnergy.percentage / 90 * 100);
    
    return metrics;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // API ENDPOINTS
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Get global network overview
   */
  async getGlobalOverview() {
    const startTime = Date.now();
    
    const overview = {
      network: this.metricsCache.network,
      trust: this.metricsCache.trust,
      economic: this.metricsCache.economic,
      environmental: this.metricsCache.environmental,
      timestamp: this.metricsCache.lastUpdated
    };
    
    const duration = Date.now() - startTime;
    this.metrics.queriesServed++;
    this.metrics.avgQueryLatency = (this.metrics.avgQueryLatency * 0.9) + (duration * 0.1);
    
    return overview;
  }
  
  /**
   * Get regional statistics
   */
  async getRegionalStats(region) {
    return {
      region,
      network: this.metricsCache.network.byRegion[region] || {},
      renewable: this.metricsCache.environmental.renewableEnergy.regions[region] || {},
      timestamp: this.metricsCache.lastUpdated
    };
  }
  
  /**
   * Get trust score distribution
   */
  async getTrustDistribution() {
    return {
      distribution: this.metricsCache.trust.distribution,
      avgScore: this.metricsCache.trust.avgTrustScore,
      violationRate: this.metricsCache.trust.violationRate,
      timestamp: this.metricsCache.lastUpdated
    };
  }
  
  /**
   * Get economic dashboard
   */
  async getEconomicDashboard() {
    return {
      token: this.metricsCache.economic.meshToken,
      transactions: this.metricsCache.economic.transactions,
      staking: this.metricsCache.economic.staking,
      compute: this.metricsCache.economic.compute,
      treasury: this.metricsCache.economic.treasury,
      timestamp: this.metricsCache.lastUpdated
    };
  }
  
  /**
   * Get carbon impact report
   */
  async getCarbonImpact() {
    return {
      footprint: this.metricsCache.environmental.carbonFootprint,
      renewable: this.metricsCache.environmental.renewableEnergy,
      efficiency: this.metricsCache.environmental.efficiency,
      targets: this.metricsCache.environmental.targets,
      timestamp: this.metricsCache.lastUpdated
    };
  }
  
  // ═══════════════════════════════════════════════════════════════
  // REAL-TIME STREAMING
  // ═══════════════════════════════════════════════════════════════
  
  /**
   * Subscribe to real-time updates
   */
  subscribeToUpdates(connectionId, callback) {
    this.activeConnections.add({ connectionId, callback });
    this.metrics.activeSubscribers = this.activeConnections.size;
    
    console.log(`[EcosystemDashboard] Client subscribed: ${connectionId}`);
    
    // Send initial data
    callback(this.metricsCache);
  }
  
  /**
   * Unsubscribe from updates
   */
  unsubscribe(connectionId) {
    for (const conn of this.activeConnections) {
      if (conn.connectionId === connectionId) {
        this.activeConnections.delete(conn);
        break;
      }
    }
    
    this.metrics.activeSubscribers = this.activeConnections.size;
    console.log(`[EcosystemDashboard] Client unsubscribed: ${connectionId}`);
  }
  
  /**
   * Broadcast updates to all subscribers
   */
  broadcastUpdates() {
    if (this.activeConnections.size === 0) return;
    
    const update = {
      type: 'metrics_update',
      data: this.metricsCache,
      timestamp: Date.now()
    };
    
    for (const conn of this.activeConnections) {
      try {
        conn.callback(update);
      } catch (error) {
        console.error(`[EcosystemDashboard] Failed to broadcast to ${conn.connectionId}:`, error.message);
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════
  
  async calculatePerformanceScore(node) {
    const telemetry = await this.telemetryCollector.getLatest(node.meshId);
    if (!telemetry) return 0;
    
    const uptimeScore = telemetry.uptimePercentage || 0;
    const latencyScore = Math.max(0, 100 - telemetry.avgLatency);
    const trustScore = await this.trustEngine.getTrustScore(node.meshId);
    
    return (uptimeScore * 0.4 + latencyScore * 0.3 + trustScore * 0.3);
  }
  
  async getTopTrustedNodes(count = 10) {
    const meshNodes = await this.meshRegistry.getAllNodes();
    
    const nodesWithScores = await Promise.all(
      meshNodes.map(async node => ({
        meshId: node.meshId,
        trustScore: await this.trustEngine.getTrustScore(node.meshId),
        organization: node.organization || 'Unknown'
      }))
    );
    
    return nodesWithScores
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, count);
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: JSON.stringify(this.metricsCache).length,
      cacheAge: Date.now() - (this.metricsCache.lastUpdated || Date.now())
    };
  }
  
  async shutdown() {
    console.log('[EcosystemDashboard] Shutting down dashboard');
    
    clearInterval(this.aggregationTimer);
    clearInterval(this.streamTimer);
    
    // Notify all subscribers
    for (const conn of this.activeConnections) {
      try {
        conn.callback({ type: 'shutdown', message: 'Dashboard shutting down' });
      } catch (error) {
        // Ignore errors during shutdown
      }
    }
    
    this.activeConnections.clear();
    
    this.emit('dashboard:shutdown');
  }
}

export default EcosystemDashboard;
