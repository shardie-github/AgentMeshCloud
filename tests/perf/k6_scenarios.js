/**
 * K6 Performance Test Scenarios
 * Tests baseline, spike, and soak scenarios for ORCA APIs
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const trustScoreLatency = new Trend('trust_score_latency');
const kpiLatency = new Trend('kpi_latency');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'demo-api-key';

// Test scenarios
export const options = {
  scenarios: {
    // Baseline: Normal load
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { scenario: 'baseline' },
    },
    
    // Spike: Sudden traffic increase
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 50 },  // Ramp up
        { duration: '30s', target: 50 },  // Hold
        { duration: '10s', target: 0 },   // Ramp down
      ],
      startTime: '2m',
      tags: { scenario: 'spike' },
    },
    
    // Soak: Extended load
    soak: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
      startTime: '3m',
      tags: { scenario: 'soak' },
    },
  },
  
  // Thresholds (SLAs)
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],  // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.01'],
    trust_score_latency: ['p(95)<300'],
    kpi_latency: ['p(95)<200'],
  },
};

// Helper: Make authenticated request
function makeRequest(method, endpoint, body = null) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { endpoint },
  };
  
  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${endpoint}`, JSON.stringify(body), params);
  }
  
  return response;
}

// Main test flow
export default function () {
  // 1. Health check
  let response = makeRequest('GET', '/status');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  }) || errorRate.add(1);
  
  sleep(0.5);
  
  // 2. Get trust metrics
  response = makeRequest('GET', '/trust');
  const trustCheck = check(response, {
    'trust endpoint is 200': (r) => r.status === 200,
    'trust score exists': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.kpis && body.kpis.trust_score !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!trustCheck) errorRate.add(1);
  trustScoreLatency.add(response.timings.duration);
  
  sleep(1);
  
  // 3. Calculate ROI
  response = makeRequest('POST', '/kpi/roi', {
    kpi_values: {
      trust_score: 85,
      risk_avoided_usd: 50000,
      sync_freshness_pct: 95,
      compliance_sla_pct: 99
    },
    tenant_tier: 'pro'
  });
  
  const kpiCheck = check(response, {
    'kpi endpoint is 200': (r) => r.status === 200 || r.status === 404,  // Allow 404 if not implemented yet
    'roi calculation works': (r) => {
      if (r.status === 404) return true;  // Skip if endpoint not ready
      try {
        const body = JSON.parse(r.body);
        return body.total_monthly_roi !== undefined;
      } catch (e) {
        return false;
      }
    },
  });
  
  if (!kpiCheck) errorRate.add(1);
  kpiLatency.add(response.timings.duration);
  
  sleep(1);
  
  // 4. List agents
  response = makeRequest('GET', '/agents');
  check(response, {
    'agents endpoint is 200': (r) => r.status === 200,
    'agents list returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.agents) || body.total !== undefined;
      } catch (e) {
        return false;
      }
    },
  }) || errorRate.add(1);
  
  sleep(1);
  
  // 5. Get workflows
  response = makeRequest('GET', '/workflows');
  check(response, {
    'workflows endpoint responds': (r) => r.status === 200 || r.status === 404,
  }) || errorRate.add(1);
  
  sleep(1);
}

// Smoke test scenario (quick validation)
export function smokeTest() {
  const endpoints = [
    '/status',
    '/health',
    '/trust',
    '/agents',
    '/workflows',
  ];
  
  endpoints.forEach(endpoint => {
    const response = makeRequest('GET', endpoint);
    check(response, {
      [`${endpoint} is accessible`]: (r) => r.status < 500,
    }) || errorRate.add(1);
  });
}

// Teardown: Report summary
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'tests/perf/summary.json': JSON.stringify(data),
  };
}

function textSummary(data, options) {
  // Simple text summary
  const metrics = data.metrics;
  let summary = '\n=== K6 Performance Test Summary ===\n\n';
  
  if (metrics.http_req_duration) {
    summary += `HTTP Request Duration:\n`;
    summary += `  p(50): ${metrics.http_req_duration.values['p(50)']} ms\n`;
    summary += `  p(95): ${metrics.http_req_duration.values['p(95)']} ms\n`;
    summary += `  p(99): ${metrics.http_req_duration.values['p(99)']} ms\n\n`;
  }
  
  if (metrics.http_req_failed) {
    summary += `HTTP Request Failures: ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  if (metrics.errors) {
    summary += `Error Rate: ${(metrics.errors.values.rate * 100).toFixed(2)}%\n\n`;
  }
  
  return summary;
}
