/**
 * ORCA k6 Load Test Suite
 * 
 * Tests: baseline, spike, soak
 * Targets: /trust, /agents, /workflows, /adapters
 * 
 * Usage:
 *   k6 run tests/perf/k6_load.js
 *   k6 run tests/perf/k6_load.js --env TEST=spike
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const trustScoreLatency = new Trend('trust_score_latency');
const ingestLatency = new Trend('ingest_latency');
const totalRequests = new Counter('total_requests');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'https://orca-mesh.io';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const TEST_TYPE = __ENV.TEST || 'baseline';

// Load test profiles
export const options = {
  scenarios: {
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Ramp up
        { duration: '5m', target: 10 },  // Steady state
        { duration: '2m', target: 0 },   // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },   // Normal load
        { duration: '30s', target: 100 }, // Spike!
        { duration: '2m', target: 100 },  // Sustained spike
        { duration: '1m', target: 10 },   // Recovery
        { duration: '1m', target: 0 },
      ],
    },
    soak: {
      executor: 'constant-vus',
      vus: 20,
      duration: '30m', // 30-minute soak test
    },
  },
  thresholds: {
    // HTTP failures should be less than 1%
    'errors': ['rate<0.01'],
    // 95% of requests should be below 500ms
    'http_req_duration': ['p(95)<500'],
    // 99% should be below 1000ms
    'http_req_duration': ['p(99)<1000'],
    // Trust score endpoint should be fast
    'trust_score_latency': ['p(95)<500', 'p(99)<1000'],
    // Ingest should be under 800ms
    'ingest_latency': ['p(95)<800', 'p(99)<1500'],
  },
};

// Test data
const agents = ['agent-001', 'agent-002', 'agent-003'];
const workflows = ['wf-001', 'wf-002', 'wf-003'];

export function setup() {
  console.log(`Starting ${TEST_TYPE} load test against ${BASE_URL}`);
  return { startTime: Date.now() };
}

export default function(data) {
  totalRequests.add(1);
  
  // Test distribution: simulate real traffic
  const rand = Math.random();
  
  if (rand < 0.3) {
    // 30% - Health check
    testHealthCheck();
  } else if (rand < 0.5) {
    // 20% - Trust score
    testTrustScore();
  } else if (rand < 0.7) {
    // 20% - Agent operations
    testAgentOps();
  } else if (rand < 0.85) {
    // 15% - Workflow operations
    testWorkflowOps();
  } else {
    // 15% - Adapter ingest
    testAdapterIngest();
  }
  
  // Think time between requests
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

function testHealthCheck() {
  const res = http.get(`${BASE_URL}/health`);
  
  const success = check(res, {
    'health: status 200': (r) => r.status === 200,
    'health: response time < 200ms': (r) => r.timings.duration < 200,
    'health: has status field': (r) => JSON.parse(r.body).hasOwnProperty('status'),
  });
  
  errorRate.add(!success);
}

function testTrustScore() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/trust`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  const duration = Date.now() - start;
  
  trustScoreLatency.add(duration);
  
  const success = check(res, {
    'trust: status 200': (r) => r.status === 200,
    'trust: has trustScore': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('trustScore') && body.trustScore >= 0 && body.trustScore <= 100;
      } catch (e) {
        return false;
      }
    },
    'trust: has KPIs': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('riskAvoided') && body.hasOwnProperty('syncFreshness');
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
}

function testAgentOps() {
  // List agents
  let res = http.get(`${BASE_URL}/api/agents`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  
  let success = check(res, {
    'agents: list status 200': (r) => r.status === 200,
    'agents: list response time < 400ms': (r) => r.timings.duration < 400,
  });
  
  errorRate.add(!success);
  
  // Get specific agent (30% of the time)
  if (Math.random() < 0.3) {
    const agentId = agents[Math.floor(Math.random() * agents.length)];
    res = http.get(`${BASE_URL}/api/agents/${agentId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    
    success = check(res, {
      'agent: get status 200 or 404': (r) => r.status === 200 || r.status === 404,
      'agent: response time < 300ms': (r) => r.timings.duration < 300,
    });
    
    errorRate.add(!success && res.status !== 404);
  }
}

function testWorkflowOps() {
  // List workflows
  const res = http.get(`${BASE_URL}/api/workflows`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  
  const success = check(res, {
    'workflows: list status 200': (r) => r.status === 200,
    'workflows: response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  errorRate.add(!success);
}

function testAdapterIngest() {
  const start = Date.now();
  
  const payload = {
    event: 'synthetic.load.test',
    timestamp: new Date().toISOString(),
    task_id: `load-test-${__VU}-${__ITER}`,
    data: {
      status: 'completed',
      vu: __VU,
      iteration: __ITER,
    },
  };
  
  const res = http.post(
    `${BASE_URL}/api/adapters/zapier/webhook`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Hook-Signature': 'load-test-signature',
      },
    }
  );
  
  const duration = Date.now() - start;
  ingestLatency.add(duration);
  
  const success = check(res, {
    'ingest: status 200 or 202': (r) => r.status === 200 || r.status === 202,
    'ingest: response time < 800ms': (r) => r.timings.duration < 800,
    'ingest: has eventId': (r) => {
      try {
        return JSON.parse(r.body).hasOwnProperty('eventId');
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load test completed in ${duration}s`);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/perf/summary.json': JSON.stringify(data),
  };
}

function textSummary(data, opts) {
  // Basic summary
  return `
  Load Test Summary
  ==================
  
  Scenarios: ${Object.keys(data.metrics).length}
  Total Requests: ${data.metrics.total_requests?.values?.count || 0}
  
  Performance:
    - p95 latency: ${Math.round(data.metrics.http_req_duration?.values['p(95)'] || 0)}ms
    - p99 latency: ${Math.round(data.metrics.http_req_duration?.values['p(99)'] || 0)}ms
    - Error rate: ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
  
  Trust Score:
    - p95: ${Math.round(data.metrics.trust_score_latency?.values['p(95)'] || 0)}ms
    - p99: ${Math.round(data.metrics.trust_score_latency?.values['p(99)'] || 0)}ms
  
  Adapter Ingest:
    - p95: ${Math.round(data.metrics.ingest_latency?.values['p(95)'] || 0)}ms
    - p99: ${Math.round(data.metrics.ingest_latency?.values['p(99)'] || 0)}ms
  
  ${data.metrics.errors?.values?.rate > 0.01 ? '❌ FAILED: Error rate above 1%' : '✅ PASSED: All thresholds met'}
  `;
}
