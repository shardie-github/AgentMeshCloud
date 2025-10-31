/**
 * k6 Public Performance Benchmark
 * 
 * Reproducible performance tests for transparency and proof:
 * - Steady state load test
 * - Spike test
 * - Soak test
 * 
 * Run: k6 run tests/perf/k6_public.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const trustScoreLatency = new Trend('trust_score_latency');
const agentsLatency = new Trend('agents_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.orca-mesh.io';
const API_KEY = __ENV.API_KEY || 'demo_key';

export const options = {
  stages: [
    // Warm-up
    { duration: '30s', target: 10 },
    
    // Steady state
    { duration: '2m', target: 50 },
    
    // Spike test
    { duration: '30s', target: 200 },
    { duration: '30s', target: 200 },
    { duration: '30s', target: 50 },
    
    // Soak test
    { duration: '3m', target: 100 },
    
    // Ramp down
    { duration: '30s', target: 0 }
  ],
  
  thresholds: {
    'http_req_duration': ['p(95)<700', 'p(99)<1200'], // SLA targets
    'errors': ['rate<0.015'], // <1.5% error rate
    'http_req_failed': ['rate<0.01'], // <1% failed requests
  },
};

// Test scenarios
export default function() {
  const scenario = Math.random();
  
  if (scenario < 0.4) {
    // 40% - Get Trust Score
    getTrustScore();
  } else if (scenario < 0.7) {
    // 30% - List Agents
    listAgents();
  } else if (scenario < 0.9) {
    // 20% - Get KPI/ROI
    getROI();
  } else {
    // 10% - Report Incident
    reportIncident();
  }
  
  sleep(Math.random() * 2 + 1); // 1-3 seconds between requests
}

function getTrustScore() {
  const startTime = new Date();
  
  const res = http.get(`${BASE_URL}/api/v1/trust`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  
  const latency = new Date() - startTime;
  trustScoreLatency.add(latency);
  
  const success = check(res, {
    'trust score status is 200': (r) => r.status === 200,
    'trust score has data': (r) => r.json('trust_score') !== undefined,
    'latency < 700ms': () => latency < 700,
  });
  
  errorRate.add(!success);
}

function listAgents() {
  const startTime = new Date();
  
  const res = http.get(`${BASE_URL}/api/v1/agents`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  
  const latency = new Date() - startTime;
  agentsLatency.add(latency);
  
  const success = check(res, {
    'agents status is 200': (r) => r.status === 200,
    'agents is array': (r) => Array.isArray(r.json()),
    'latency < 500ms': () => latency < 500,
  });
  
  errorRate.add(!success);
}

function getROI() {
  const res = http.get(`${BASE_URL}/api/v1/kpi/roi`, {
    headers: {
      'X-API-Key': API_KEY,
    },
  });
  
  const success = check(res, {
    'ROI status is 200': (r) => r.status === 200,
    'ROI has risk_avoided': (r) => r.json('risk_avoided_usd') !== undefined,
  });
  
  errorRate.add(!success);
}

function reportIncident() {
  const payload = JSON.stringify({
    agent_id: 'agent_test',
    type: 'policy_violation',
    severity: 'medium',
    description: 'Test incident from k6'
  });
  
  const res = http.post(`${BASE_URL}/api/v1/incidents`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
  });
  
  const success = check(res, {
    'incident status is 201': (r) => r.status === 201,
    'incident has id': (r) => r.json('id') !== undefined,
  });
  
  errorRate.add(!success);
}

// Summary report
export function handleSummary(data) {
  console.log('Performance Test Summary:');
  console.log('========================');
  console.log(`Total Requests: ${data.metrics.http_reqs.values.count}`);
  console.log(`Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%`);
  console.log(`Error Rate: ${data.metrics.errors.values.rate * 100}%`);
  console.log(`P95 Latency: ${data.metrics.http_req_duration.values['p(95)']}ms`);
  console.log(`P99 Latency: ${data.metrics.http_req_duration.values['p(99)']}ms`);
  console.log(`Avg Latency: ${data.metrics.http_req_duration.values.avg}ms`);
  
  return {
    'tests/perf/results.json': JSON.stringify(data, null, 2),
    stdout: generateMarkdownReport(data),
  };
}

function generateMarkdownReport(data) {
  const metrics = data.metrics;
  
  return `
# Performance Test Results

**Date:** ${new Date().toISOString()}

## Summary

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Total Requests | ${metrics.http_reqs.values.count} | - | - |
| Failed Requests | ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}% | <1% | ${metrics.http_req_failed.values.rate < 0.01 ? '✅' : '❌'} |
| Error Rate | ${(metrics.errors.values.rate * 100).toFixed(2)}% | <1.5% | ${metrics.errors.values.rate < 0.015 ? '✅' : '❌'} |
| P95 Latency | ${metrics.http_req_duration.values['p(95)'].toFixed(0)}ms | <700ms | ${metrics.http_req_duration.values['p(95)'] < 700 ? '✅' : '❌'} |
| P99 Latency | ${metrics.http_req_duration.values['p(99)'].toFixed(0)}ms | <1200ms | ${metrics.http_req_duration.values['p(99)'] < 1200 ? '✅' : '❌'} |
| Avg Latency | ${metrics.http_req_duration.values.avg.toFixed(0)}ms | - | - |

## Latency Breakdown

- Min: ${metrics.http_req_duration.values.min.toFixed(0)}ms
- P50 (Median): ${metrics.http_req_duration.values['p(50)'].toFixed(0)}ms
- P90: ${metrics.http_req_duration.values['p(90)'].toFixed(0)}ms
- P95: ${metrics.http_req_duration.values['p(95)'].toFixed(0)}ms
- P99: ${metrics.http_req_duration.values['p(99)'].toFixed(0)}ms
- Max: ${metrics.http_req_duration.values.max.toFixed(0)}ms

## Custom Metrics

- Trust Score Latency (P95): ${metrics.trust_score_latency?.values['p(95)']?.toFixed(0) || 'N/A'}ms
- Agents Latency (P95): ${metrics.agents_latency?.values['p(95)']?.toFixed(0) || 'N/A'}ms

## Test Configuration

- Duration: ${options.stages.reduce((sum, stage) => sum + parseInt(stage.duration), 0)} total
- Peak VUs: 200
- Steady State VUs: 100
`;
}
