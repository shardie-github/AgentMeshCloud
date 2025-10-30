#!/usr/bin/env node

/**
 * AI-Agent Mesh Telemetry Service
 * 
 * Collects metrics, traces, and logs from all agents.
 * OpenTelemetry-compliant with Prometheus integration.
 * 
 * @version 1.0.0
 * @module telemetry
 */

import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// ============================================================================
// IN-MEMORY TELEMETRY STORAGE (Replace with Prometheus + Elasticsearch)
// ============================================================================

const metrics = {
  requests: new Map(), // request_count by agent
  errors: new Map(),   // error_count by agent
  latencies: new Map(), // latency measurements
  tokens: new Map(),    // token usage
  costs: new Map()      // cost tracking
};

const traces = [];
const logs = [];

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'telemetry',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Ingest metrics
app.post('/api/v1/metrics', (req, res) => {
  const { agent_id, metric_type, value, timestamp, labels } = req.body;
  
  if (!agent_id || !metric_type || value === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const metric = {
    id: crypto.randomUUID(),
    agent_id,
    metric_type,
    value,
    timestamp: timestamp || new Date().toISOString(),
    labels: labels || {}
  };
  
  // Store metric
  if (!metrics[metric_type]) {
    metrics[metric_type] = new Map();
  }
  
  if (!metrics[metric_type].has(agent_id)) {
    metrics[metric_type].set(agent_id, []);
  }
  
  metrics[metric_type].get(agent_id).push(metric);
  
  res.status(201).json({ id: metric.id, status: 'recorded' });
});

// Ingest trace
app.post('/api/v1/traces', (req, res) => {
  const trace = {
    trace_id: req.body.trace_id || crypto.randomUUID(),
    span_id: req.body.span_id || crypto.randomUUID(),
    parent_span_id: req.body.parent_span_id,
    agent_id: req.body.agent_id,
    operation: req.body.operation,
    start_time: req.body.start_time || new Date().toISOString(),
    end_time: req.body.end_time,
    duration_ms: req.body.duration_ms,
    status: req.body.status || 'ok',
    attributes: req.body.attributes || {},
    events: req.body.events || []
  };
  
  traces.push(trace);
  
  // Keep only last 10000 traces in memory
  if (traces.length > 10000) {
    traces.shift();
  }
  
  res.status(201).json({ trace_id: trace.trace_id, status: 'recorded' });
});

// Ingest log
app.post('/api/v1/logs', (req, res) => {
  const log = {
    log_id: crypto.randomUUID(),
    timestamp: req.body.timestamp || new Date().toISOString(),
    agent_id: req.body.agent_id,
    level: req.body.level || 'info',
    message: req.body.message,
    attributes: req.body.attributes || {},
    trace_id: req.body.trace_id
  };
  
  logs.push(log);
  
  // Keep only last 50000 logs in memory
  if (logs.length > 50000) {
    logs.shift();
  }
  
  res.status(201).json({ log_id: log.log_id, status: 'recorded' });
});

// Query metrics
app.get('/api/v1/metrics', (req, res) => {
  const { agent_id, metric_type, start_time, end_time } = req.query;
  
  let results = [];
  
  if (metric_type && metrics[metric_type]) {
    if (agent_id && metrics[metric_type].has(agent_id)) {
      results = metrics[metric_type].get(agent_id);
    } else if (!agent_id) {
      // All agents for this metric type
      for (const agentMetrics of metrics[metric_type].values()) {
        results.push(...agentMetrics);
      }
    }
  }
  
  // Filter by time range
  if (start_time) {
    const startDate = new Date(start_time);
    results = results.filter(m => new Date(m.timestamp) >= startDate);
  }
  
  if (end_time) {
    const endDate = new Date(end_time);
    results = results.filter(m => new Date(m.timestamp) <= endDate);
  }
  
  res.json({
    count: results.length,
    metrics: results
  });
});

// Query traces
app.get('/api/v1/traces', (req, res) => {
  const { agent_id, trace_id, start_time, end_time } = req.query;
  
  let results = traces;
  
  if (agent_id) {
    results = results.filter(t => t.agent_id === agent_id);
  }
  
  if (trace_id) {
    results = results.filter(t => t.trace_id === trace_id);
  }
  
  if (start_time) {
    const startDate = new Date(start_time);
    results = results.filter(t => new Date(t.start_time) >= startDate);
  }
  
  if (end_time) {
    const endDate = new Date(end_time);
    results = results.filter(t => new Date(t.start_time) <= endDate);
  }
  
  res.json({
    count: results.length,
    traces: results.slice(0, 100) // Limit to 100 traces
  });
});

// Query logs
app.get('/api/v1/logs', (req, res) => {
  const { agent_id, level, start_time, end_time, limit } = req.query;
  
  let results = logs;
  
  if (agent_id) {
    results = results.filter(l => l.agent_id === agent_id);
  }
  
  if (level) {
    results = results.filter(l => l.level === level);
  }
  
  if (start_time) {
    const startDate = new Date(start_time);
    results = results.filter(l => new Date(l.timestamp) >= startDate);
  }
  
  if (end_time) {
    const endDate = new Date(end_time);
    results = results.filter(l => new Date(l.timestamp) <= endDate);
  }
  
  const maxResults = parseInt(limit) || 1000;
  
  res.json({
    count: results.length,
    logs: results.slice(-maxResults) // Most recent logs
  });
});

// Dashboard summary
app.get('/api/v1/dashboard', (req, res) => {
  const summary = {
    timestamp: new Date().toISOString(),
    agents: {
      total: new Set([...traces.map(t => t.agent_id), ...logs.map(l => l.agent_id)]).size
    },
    requests: {
      total: traces.length,
      success: traces.filter(t => t.status === 'ok').length,
      error: traces.filter(t => t.status === 'error').length
    },
    logs: {
      total: logs.length,
      by_level: {
        debug: logs.filter(l => l.level === 'debug').length,
        info: logs.filter(l => l.level === 'info').length,
        warn: logs.filter(l => l.level === 'warn').length,
        error: logs.filter(l => l.level === 'error').length
      }
    },
    performance: {
      avg_latency_ms: 0,
      p95_latency_ms: 0,
      p99_latency_ms: 0
    }
  };
  
  // Calculate latency percentiles
  const latencies = traces
    .filter(t => t.duration_ms)
    .map(t => t.duration_ms)
    .sort((a, b) => a - b);
  
  if (latencies.length > 0) {
    summary.performance.avg_latency_ms = 
      latencies.reduce((a, b) => a + b, 0) / latencies.length;
    summary.performance.p95_latency_ms = 
      latencies[Math.floor(latencies.length * 0.95)] || 0;
    summary.performance.p99_latency_ms = 
      latencies[Math.floor(latencies.length * 0.99)] || 0;
  }
  
  res.json(summary);
});

// Prometheus-compatible metrics endpoint
app.get('/metrics', (req, res) => {
  const prometheusMetrics = [];
  
  // Request count
  prometheusMetrics.push('# HELP ai_mesh_requests_total Total number of requests');
  prometheusMetrics.push('# TYPE ai_mesh_requests_total counter');
  const requestsByAgent = new Map();
  traces.forEach(t => {
    requestsByAgent.set(t.agent_id, (requestsByAgent.get(t.agent_id) || 0) + 1);
  });
  requestsByAgent.forEach((count, agent_id) => {
    prometheusMetrics.push(`ai_mesh_requests_total{agent_id="${agent_id}"} ${count}`);
  });
  
  // Error count
  prometheusMetrics.push('# HELP ai_mesh_errors_total Total number of errors');
  prometheusMetrics.push('# TYPE ai_mesh_errors_total counter');
  const errorsByAgent = new Map();
  traces.filter(t => t.status === 'error').forEach(t => {
    errorsByAgent.set(t.agent_id, (errorsByAgent.get(t.agent_id) || 0) + 1);
  });
  errorsByAgent.forEach((count, agent_id) => {
    prometheusMetrics.push(`ai_mesh_errors_total{agent_id="${agent_id}"} ${count}`);
  });
  
  res.type('text/plain').send(prometheusMetrics.join('\n'));
});

// ============================================================================
// STARTUP
// ============================================================================

const PORT = process.env.TELEMETRY_PORT || 3002;

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════╗`);
  console.log(`║   AI-Agent Mesh Telemetry Service v1.0.0      ║`);
  console.log(`║   Port: ${PORT}                                    ║`);
  console.log(`╚════════════════════════════════════════════════╝\n`);
  console.log(`📊 Telemetry API: http://localhost:${PORT}/api/v1`);
  console.log(`📈 Prometheus: http://localhost:${PORT}/metrics\n`);
});

export { app, metrics, traces, logs };
