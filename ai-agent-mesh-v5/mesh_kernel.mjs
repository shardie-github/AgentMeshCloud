#!/usr/bin/env node
/**
 * Autonomous Mesh OS - Core Kernel
 * 
 * Central orchestration layer that coordinates:
 * - Agent registry management
 * - Policy enforcement
 * - Telemetry aggregation
 * - Health monitoring
 * - Auto-scaling decisions
 * 
 * @module mesh_kernel
 */

import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { createServer } from 'http';
import YAML from 'yaml';

class MeshKernel extends EventEmitter {
  constructor(configPath = './scheduler_config.yaml') {
    super();
    this.configPath = configPath;
    this.config = null;
    this.agents = new Map();
    this.jobs = new Map();
    this.telemetry = [];
    this.status = 'initializing';
    this.startTime = Date.now();
    this.metrics = {
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      activeAgents: 0,
      quarantinedAgents: 0
    };
  }

  /**
   * Initialize the kernel and load configuration
   */
  async initialize() {
    try {
      console.log('[Mesh Kernel] Initializing Autonomous Mesh OS...');
      
      // Load configuration
      const configData = await readFile(this.configPath, 'utf-8');
      this.config = YAML.parse(configData);
      
      console.log(`[Mesh Kernel] Configuration loaded: ${this.config.mesh.name}`);
      console.log(`[Mesh Kernel] Max concurrent jobs: ${this.config.scheduler.maxConcurrentJobs}`);
      
      // Initialize subsystems
      await this.initializeRegistry();
      await this.initializeScheduler();
      await this.initializeTelemetry();
      await this.initializeHealthMonitor();
      
      this.status = 'running';
      this.emit('kernel:ready');
      
      console.log('[Mesh Kernel] ✓ Kernel initialized successfully');
      return true;
    } catch (error) {
      console.error('[Mesh Kernel] Initialization failed:', error);
      this.status = 'failed';
      throw error;
    }
  }

  /**
   * Initialize agent registry
   */
  async initializeRegistry() {
    console.log('[Registry] Initializing agent registry...');
    
    // Load agents from configuration
    if (this.config.agents) {
      for (const agent of this.config.agents) {
        this.registerAgent(agent);
      }
    }
    
    console.log(`[Registry] ✓ ${this.agents.size} agents registered`);
  }

  /**
   * Register a new agent in the mesh
   */
  registerAgent(agentConfig) {
    const agent = {
      id: agentConfig.id || `agent-${Date.now()}`,
      name: agentConfig.name,
      type: agentConfig.type,
      endpoint: agentConfig.endpoint,
      capabilities: agentConfig.capabilities || [],
      status: 'idle',
      health: 'healthy',
      lastHeartbeat: Date.now(),
      jobs: [],
      metrics: {
        totalJobs: 0,
        successRate: 100,
        avgLatency: 0,
        uptime: 100
      }
    };
    
    this.agents.set(agent.id, agent);
    this.metrics.activeAgents++;
    this.emit('agent:registered', agent);
    
    return agent;
  }

  /**
   * Initialize job scheduler
   */
  async initializeScheduler() {
    console.log('[Scheduler] Initializing job scheduler...');
    
    this.schedulerInterval = setInterval(() => {
      this.scheduleJobs();
    }, this.config.scheduler.schedulerInterval || 5000);
    
    console.log('[Scheduler] ✓ Scheduler active');
  }

  /**
   * Schedule pending jobs to available agents
   */
  scheduleJobs() {
    const pendingJobs = Array.from(this.jobs.values()).filter(j => j.status === 'pending');
    const availableAgents = Array.from(this.agents.values()).filter(
      a => a.status === 'idle' && a.health === 'healthy'
    );
    
    if (pendingJobs.length === 0) return;
    
    console.log(`[Scheduler] Scheduling ${pendingJobs.length} jobs to ${availableAgents.length} agents`);
    
    for (const job of pendingJobs.slice(0, this.config.scheduler.maxConcurrentJobs)) {
      const agent = this.selectAgent(job, availableAgents);
      if (agent) {
        this.assignJobToAgent(job, agent);
      }
    }
  }

  /**
   * Select best agent for a job based on capabilities and load
   */
  selectAgent(job, agents) {
    const capable = agents.filter(a => 
      !job.requiredCapabilities || 
      job.requiredCapabilities.every(cap => a.capabilities.includes(cap))
    );
    
    if (capable.length === 0) return null;
    
    // Simple load balancing: pick agent with fewest active jobs
    return capable.reduce((best, current) => 
      current.jobs.length < best.jobs.length ? current : best
    );
  }

  /**
   * Assign job to agent
   */
  async assignJobToAgent(job, agent) {
    job.status = 'running';
    job.assignedAgent = agent.id;
    job.startTime = Date.now();
    job.retries = job.retries || 0;
    
    agent.status = 'busy';
    agent.jobs.push(job.id);
    
    this.emit('job:assigned', { job, agent });
    
    // Simulate job execution with retry logic
    try {
      await this.executeJob(job, agent);
    } catch (error) {
      await this.handleJobFailure(job, agent, error);
    }
  }

  /**
   * Execute job on agent
   */
  async executeJob(job, agent) {
    console.log(`[Executor] Executing job ${job.id} on agent ${agent.id}`);
    
    // Simulate execution time
    const executionTime = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // Simulate success/failure (95% success rate)
    const success = Math.random() > 0.05;
    
    if (success) {
      job.status = 'completed';
      job.completionTime = Date.now();
      job.duration = job.completionTime - job.startTime;
      
      agent.status = 'idle';
      agent.jobs = agent.jobs.filter(jid => jid !== job.id);
      agent.metrics.totalJobs++;
      agent.metrics.avgLatency = (agent.metrics.avgLatency * (agent.metrics.totalJobs - 1) + job.duration) / agent.metrics.totalJobs;
      
      this.metrics.successfulJobs++;
      this.emit('job:completed', { job, agent });
      
      console.log(`[Executor] ✓ Job ${job.id} completed in ${job.duration}ms`);
    } else {
      throw new Error('Job execution failed');
    }
  }

  /**
   * Handle job failure with retry logic
   */
  async handleJobFailure(job, agent, error) {
    console.error(`[Executor] Job ${job.id} failed:`, error.message);
    
    const maxRetries = this.config.scheduler.retryPolicy.maxRetries || 3;
    const backoffMultiplier = this.config.scheduler.retryPolicy.backoffMultiplier || 2;
    
    if (job.retries < maxRetries) {
      job.retries++;
      job.status = 'pending';
      job.assignedAgent = null;
      
      agent.status = 'idle';
      agent.jobs = agent.jobs.filter(jid => jid !== job.id);
      
      const backoffTime = Math.pow(backoffMultiplier, job.retries) * 1000;
      console.log(`[Executor] Retrying job ${job.id} (attempt ${job.retries}/${maxRetries}) in ${backoffTime}ms`);
      
      setTimeout(() => {
        this.emit('job:retry', { job, agent, attempt: job.retries });
      }, backoffTime);
    } else {
      job.status = 'failed';
      job.error = error.message;
      job.completionTime = Date.now();
      
      agent.status = 'idle';
      agent.jobs = agent.jobs.filter(jid => jid !== job.id);
      
      this.metrics.failedJobs++;
      this.emit('job:failed', { job, agent, error });
      
      console.error(`[Executor] ✗ Job ${job.id} permanently failed after ${maxRetries} retries`);
    }
  }

  /**
   * Submit new job to the mesh
   */
  submitJob(jobConfig) {
    const job = {
      id: jobConfig.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: jobConfig.name,
      type: jobConfig.type,
      priority: jobConfig.priority || 'normal',
      requiredCapabilities: jobConfig.requiredCapabilities,
      payload: jobConfig.payload,
      status: 'pending',
      retries: 0,
      createdAt: Date.now()
    };
    
    this.jobs.set(job.id, job);
    this.metrics.totalJobs++;
    this.emit('job:submitted', job);
    
    console.log(`[Kernel] Job ${job.id} submitted (${job.type})`);
    return job;
  }

  /**
   * Initialize telemetry collection
   */
  async initializeTelemetry() {
    console.log('[Telemetry] Initializing telemetry system...');
    
    this.telemetryInterval = setInterval(() => {
      this.collectTelemetry();
    }, this.config.telemetry.collectionInterval || 10000);
    
    console.log('[Telemetry] ✓ Telemetry active');
  }

  /**
   * Collect telemetry data from all agents
   */
  collectTelemetry() {
    const snapshot = {
      timestamp: Date.now(),
      kernel: {
        status: this.status,
        uptime: Date.now() - this.startTime,
        metrics: this.metrics
      },
      agents: Array.from(this.agents.values()).map(a => ({
        id: a.id,
        name: a.name,
        status: a.status,
        health: a.health,
        metrics: a.metrics
      })),
      jobs: {
        total: this.jobs.size,
        pending: Array.from(this.jobs.values()).filter(j => j.status === 'pending').length,
        running: Array.from(this.jobs.values()).filter(j => j.status === 'running').length,
        completed: this.metrics.successfulJobs,
        failed: this.metrics.failedJobs
      }
    };
    
    this.telemetry.push(snapshot);
    
    // Keep only last 1000 snapshots
    if (this.telemetry.length > 1000) {
      this.telemetry = this.telemetry.slice(-1000);
    }
    
    this.emit('telemetry:collected', snapshot);
  }

  /**
   * Initialize health monitoring
   */
  async initializeHealthMonitor() {
    console.log('[Health] Initializing health monitor...');
    
    this.healthInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.health.checkInterval || 30000);
    
    console.log('[Health] ✓ Health monitor active');
  }

  /**
   * Perform health checks on all agents
   */
  async performHealthChecks() {
    console.log('[Health] Performing health checks...');
    
    for (const [agentId, agent] of this.agents) {
      const timeSinceHeartbeat = Date.now() - agent.lastHeartbeat;
      const timeout = this.config.health.heartbeatTimeout || 60000;
      
      if (timeSinceHeartbeat > timeout) {
        console.warn(`[Health] Agent ${agentId} missed heartbeat (${timeSinceHeartbeat}ms)`);
        agent.health = 'unhealthy';
        this.emit('agent:unhealthy', agent);
        
        // Trigger auto-scaling if enabled
        if (this.config.scaling.enabled) {
          this.emit('scaling:trigger', { reason: 'unhealthy_agent', agent });
        }
      }
    }
  }

  /**
   * Update agent heartbeat
   */
  updateHeartbeat(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      if (agent.health === 'unhealthy') {
        agent.health = 'healthy';
        console.log(`[Health] Agent ${agentId} recovered`);
        this.emit('agent:recovered', agent);
      }
    }
  }

  /**
   * Get kernel status
   */
  getStatus() {
    return {
      status: this.status,
      uptime: Date.now() - this.startTime,
      version: this.config?.mesh?.version || '1.0.0',
      metrics: this.metrics,
      agents: {
        total: this.agents.size,
        active: this.metrics.activeAgents,
        quarantined: this.metrics.quarantinedAgents
      },
      jobs: {
        total: this.jobs.size,
        pending: Array.from(this.jobs.values()).filter(j => j.status === 'pending').length,
        running: Array.from(this.jobs.values()).filter(j => j.status === 'running').length,
        completed: this.metrics.successfulJobs,
        failed: this.metrics.failedJobs
      }
    };
  }

  /**
   * Shutdown kernel gracefully
   */
  async shutdown() {
    console.log('[Mesh Kernel] Initiating graceful shutdown...');
    
    this.status = 'shutting_down';
    
    // Clear intervals
    if (this.schedulerInterval) clearInterval(this.schedulerInterval);
    if (this.telemetryInterval) clearInterval(this.telemetryInterval);
    if (this.healthInterval) clearInterval(this.healthInterval);
    
    // Wait for running jobs to complete (with timeout)
    const runningJobs = Array.from(this.jobs.values()).filter(j => j.status === 'running');
    if (runningJobs.length > 0) {
      console.log(`[Mesh Kernel] Waiting for ${runningJobs.length} jobs to complete...`);
      await Promise.race([
        new Promise(resolve => {
          const check = setInterval(() => {
            const stillRunning = Array.from(this.jobs.values()).filter(j => j.status === 'running');
            if (stillRunning.length === 0) {
              clearInterval(check);
              resolve();
            }
          }, 1000);
        }),
        new Promise(resolve => setTimeout(resolve, 30000)) // 30s timeout
      ]);
    }
    
    this.status = 'stopped';
    console.log('[Mesh Kernel] ✓ Shutdown complete');
    
    this.emit('kernel:stopped');
  }

  /**
   * Start HTTP server for status endpoint
   */
  startHttpServer(port = 8080) {
    const server = createServer((req, res) => {
      if (req.url === '/status' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.getStatus(), null, 2));
      } else if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          timestamp: Date.now(),
          metrics: this.metrics,
          telemetry: this.telemetry.slice(-10) // Last 10 snapshots
        }, null, 2));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });
    
    server.listen(port, () => {
      console.log(`[Mesh Kernel] HTTP server listening on port ${port}`);
      console.log(`[Mesh Kernel] Status endpoint: http://localhost:${port}/status`);
    });
    
    return server;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const kernel = new MeshKernel();
  
  kernel.on('kernel:ready', () => {
    console.log('\n🚀 Autonomous Mesh OS is READY\n');
    
    // Start HTTP server
    kernel.startHttpServer(8080);
    
    // Submit some test jobs
    for (let i = 0; i < 5; i++) {
      kernel.submitJob({
        name: `Test Job ${i + 1}`,
        type: 'analytics',
        priority: 'normal',
        requiredCapabilities: ['compute'],
        payload: { data: `test-${i}` }
      });
    }
  });
  
  // Graceful shutdown handling
  process.on('SIGINT', async () => {
    console.log('\n[Mesh Kernel] Received SIGINT');
    await kernel.shutdown();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n[Mesh Kernel] Received SIGTERM');
    await kernel.shutdown();
    process.exit(0);
  });
  
  // Initialize kernel
  kernel.initialize().catch(error => {
    console.error('[Mesh Kernel] Fatal error:', error);
    process.exit(1);
  });
}

export default MeshKernel;
