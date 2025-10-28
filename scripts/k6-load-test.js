import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '10s', target: 5 },   // Ramp up to 5 users
    { duration: '30s', target: 10 },  // Stay at 10 users
    { duration: '10s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<700'], // 95% of requests must complete below 700ms
    http_req_failed: ['rate<0.05'],   // Error rate must be below 5%
    errors: ['rate<0.05'],            // Custom error rate below 5%
  },
};

const BASE_URL = __ENV.APP_URL || 'http://localhost:3000';

export default function() {
  // Test 1: Health endpoint
  const healthResponse = http.get(`${BASE_URL}/api/health`);
  const healthCheck = check(healthResponse, {
    'health endpoint status is 200': (r) => r.status === 200,
    'health endpoint response time < 500ms': (r) => r.timings.duration < 500,
    'health endpoint has valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });
  
  errorRate.add(!healthCheck);

  // Test 2: Main page
  const mainResponse = http.get(BASE_URL);
  const mainCheck = check(mainResponse, {
    'main page status is 200': (r) => r.status === 200,
    'main page response time < 1000ms': (r) => r.timings.duration < 1000,
    'main page has content': (r) => r.body.length > 1000,
  });
  
  errorRate.add(!mainCheck);

  // Test 3: Static assets (if any)
  const staticResponse = http.get(`${BASE_URL}/favicon.ico`);
  const staticCheck = check(staticResponse, {
    'static asset loads': (r) => r.status === 200 || r.status === 404, // 404 is ok for favicon
  });
  
  errorRate.add(!staticCheck);

  // Wait between requests
  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-report.json': JSON.stringify(data, null, 2),
    stdout: `
📊 Load Test Results:
  - Total requests: ${data.metrics.http_reqs.values.count}
  - Average response time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  - 95th percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  - Error rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
  - VUs: ${data.metrics.vus.values.max}
    `,
  };
}