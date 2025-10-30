import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const webhookLatency = new Trend('webhook_latency');
const apiLatency = new Trend('api_latency');
const webhookSuccessRate = new Rate('webhook_success_rate');
const webhookErrors = new Counter('webhook_errors');

// Test configuration - More comprehensive load test
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm up: Ramp up to 10 users
    { duration: '1m', target: 50 },    // Load test: Ramp up to 50 users
    { duration: '2m', target: 50 },    // Sustain: Stay at 50 users
    { duration: '1m', target: 100 },   // Spike test: Spike to 100 users
    { duration: '1m', target: 100 },   // Sustain spike
    { duration: '30s', target: 0 },    // Cool down: Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],      // 95% of requests must complete below 1s
    http_req_failed: ['rate<0.05'],         // Error rate must be below 5%
    errors: ['rate<0.05'],                  // Custom error rate below 5%
    webhook_latency: ['p(95)<2000'],        // 95% of webhook calls below 2s
    webhook_success_rate: ['rate>0.95'],    // 95% webhook success rate
  },
};

const BASE_URL = __ENV.APP_URL || 'http://localhost:3000';
const ADAPTER_SECRET = __ENV.ADAPTER_SECRET || 'changeme';

// Helper function to generate HMAC signature
function generateSignature(body) {
  // In a real scenario, we'd use crypto, but k6 doesn't have native crypto
  // This is a mock signature for testing purposes
  return 'mock_signature_' + randomString(32);
}

// Helper function to generate webhook payloads
function generateWebhookPayload(adapter, eventType) {
  const basePayload = {
    event: eventType,
    source: adapter,
    ts: new Date().toISOString(),
  };

  switch (adapter) {
    case 'zapier':
      return {
        ...basePayload,
        orderId: `ORDER-${randomString(8)}`,
        amount: randomIntBetween(100, 10000) / 100,
        currency: 'USD',
        customer: {
          id: `CUST-${randomIntBetween(1, 1000)}`,
          email: `customer${randomIntBetween(1, 1000)}@example.com`,
          name: `Customer ${randomIntBetween(1, 1000)}`
        }
      };
    
    case 'n8n':
      return {
        ...basePayload,
        ticketId: `TICKET-${randomString(6)}`,
        priority: ['low', 'medium', 'high', 'urgent'][randomIntBetween(0, 3)],
        subject: `Test ticket ${randomString(10)}`,
        customer: {
          id: `USER-${randomIntBetween(1, 1000)}`,
          email: `user${randomIntBetween(1, 1000)}@example.com`
        }
      };
    
    case 'servicenow':
      return {
        ...basePayload,
        incidentId: `INC${String(randomIntBetween(1000000, 9999999)).padStart(7, '0')}`,
        priority: String(randomIntBetween(1, 4)),
        state: eventType.includes('resolved') ? 'Resolved' : 'New',
        short_description: `Incident ${randomString(10)}`,
        assigned_to: {
          name: `Agent ${randomIntBetween(1, 50)}`
        }
      };
    
    case 'salesforce':
      return {
        ...basePayload,
        opportunityId: randomString(18),
        name: `Deal ${randomString(10)}`,
        amount: randomIntBetween(10000, 1000000),
        stage: eventType.includes('won') ? 'Closed Won' : 'Prospecting',
        probability: eventType.includes('won') ? 100 : randomIntBetween(10, 90)
      };
    
    default:
      return basePayload;
  }
}

export default function() {
  // Test 1: Health check
  group('Health Check', function() {
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
    
    apiLatency.add(healthResponse.timings.duration);
    errorRate.add(!healthCheck);
  });

  sleep(0.5);

  // Test 2: Webhook endpoints - Zapier
  group('Zapier Webhooks', function() {
    const eventTypes = ['order.created', 'order.fulfilled', 'order.shipped'];
    const eventType = eventTypes[randomIntBetween(0, eventTypes.length - 1)];
    const payload = generateWebhookPayload('zapier', eventType);
    const body = JSON.stringify(payload);
    
    const response = http.post(`${BASE_URL}/adapters/zapier/webhook`, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': randomString(36),
        'x-idempotency-key': randomString(36),
        'x-signature': generateSignature(body),
      },
    });
    
    const webhookCheck = check(response, {
      'zapier webhook status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'zapier webhook response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    webhookLatency.add(response.timings.duration);
    webhookSuccessRate.add(response.status === 200 || response.status === 202);
    if (!webhookCheck) {
      webhookErrors.add(1);
    }
    errorRate.add(!webhookCheck);
  });

  sleep(0.5);

  // Test 3: Webhook endpoints - n8n
  group('n8n Webhooks', function() {
    const eventTypes = ['ticket.opened', 'ticket.resolved', 'ticket.updated'];
    const eventType = eventTypes[randomIntBetween(0, eventTypes.length - 1)];
    const payload = generateWebhookPayload('n8n', eventType);
    const body = JSON.stringify(payload);
    
    const response = http.post(`${BASE_URL}/adapters/n8n/webhook`, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': randomString(36),
        'x-idempotency-key': randomString(36),
        'x-signature': generateSignature(body),
      },
    });
    
    const webhookCheck = check(response, {
      'n8n webhook status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'n8n webhook response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    webhookLatency.add(response.timings.duration);
    webhookSuccessRate.add(response.status === 200 || response.status === 202);
    if (!webhookCheck) {
      webhookErrors.add(1);
    }
    errorRate.add(!webhookCheck);
  });

  sleep(0.5);

  // Test 4: Webhook endpoints - ServiceNow
  group('ServiceNow Webhooks', function() {
    const eventTypes = ['incident.created', 'incident.resolved', 'incident.updated'];
    const eventType = eventTypes[randomIntBetween(0, eventTypes.length - 1)];
    const payload = generateWebhookPayload('servicenow', eventType);
    const body = JSON.stringify(payload);
    
    const response = http.post(`${BASE_URL}/adapters/servicenow/webhook`, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': randomString(36),
        'x-idempotency-key': randomString(36),
        'x-signature': generateSignature(body),
      },
    });
    
    const webhookCheck = check(response, {
      'servicenow webhook status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'servicenow webhook response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    webhookLatency.add(response.timings.duration);
    webhookSuccessRate.add(response.status === 200 || response.status === 202);
    if (!webhookCheck) {
      webhookErrors.add(1);
    }
    errorRate.add(!webhookCheck);
  });

  sleep(0.5);

  // Test 5: Webhook endpoints - Salesforce
  group('Salesforce Webhooks', function() {
    const eventTypes = ['opportunity.closed_won', 'lead.converted', 'account.created'];
    const eventType = eventTypes[randomIntBetween(0, eventTypes.length - 1)];
    const payload = generateWebhookPayload('salesforce', eventType);
    const body = JSON.stringify(payload);
    
    const response = http.post(`${BASE_URL}/adapters/salesforce/webhook`, body, {
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': randomString(36),
        'x-idempotency-key': randomString(36),
        'x-signature': generateSignature(body),
      },
    });
    
    const webhookCheck = check(response, {
      'salesforce webhook status is 200 or 202': (r) => r.status === 200 || r.status === 202,
      'salesforce webhook response time < 2000ms': (r) => r.timings.duration < 2000,
    });
    
    webhookLatency.add(response.timings.duration);
    webhookSuccessRate.add(response.status === 200 || response.status === 202);
    if (!webhookCheck) {
      webhookErrors.add(1);
    }
    errorRate.add(!webhookCheck);
  });

  sleep(0.5);

  // Test 6: Trust metrics endpoint
  group('Trust Metrics', function() {
    const trustResponse = http.get(`${BASE_URL}/trust`);
    const trustCheck = check(trustResponse, {
      'trust endpoint responds': (r) => r.status === 200 || r.status === 404,
      'trust endpoint response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    apiLatency.add(trustResponse.timings.duration);
    errorRate.add(!trustCheck);
  });

  // Random sleep between 0.5-2 seconds to simulate real user behavior
  sleep(randomIntBetween(5, 20) / 10);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();
  
  return {
    'load-test-report.json': JSON.stringify({
      timestamp,
      ...data
    }, null, 2),
    'load-test-summary.html': generateHTMLReport(data, timestamp),
    stdout: `
╔═══════════════════════════════════════════════════════════════════════════╗
║                        📊 K6 LOAD TEST RESULTS                             ║
╚═══════════════════════════════════════════════════════════════════════════╝

🔹 Test Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s

📈 HTTP Requests:
  - Total requests: ${data.metrics.http_reqs.values.count}
  - Request rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s
  - Failed requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%

⏱️  Response Times:
  - Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
  - Median (p50): ${data.metrics.http_req_duration.values['p(50)'].toFixed(2)}ms
  - p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  - p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms
  - Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms

🎯 Custom Metrics:
  - Webhook latency (p95): ${data.metrics.webhook_latency?.values['p(95)']?.toFixed(2) || 'N/A'}ms
  - API latency (p95): ${data.metrics.api_latency?.values['p(95)']?.toFixed(2) || 'N/A'}ms
  - Webhook success rate: ${((data.metrics.webhook_success_rate?.values.rate || 0) * 100).toFixed(2)}%
  - Webhook errors: ${data.metrics.webhook_errors?.values.count || 0}

👥 Virtual Users:
  - Max VUs: ${data.metrics.vus.values.max}
  - VU utilization: ${((data.metrics.vus.values.max / 100) * 100).toFixed(0)}%

📊 Data Transfer:
  - Data received: ${(data.metrics.data_received.values.count / 1024 / 1024).toFixed(2)} MB
  - Data sent: ${(data.metrics.data_sent.values.count / 1024 / 1024).toFixed(2)} MB

${determineTestResult(data)}

Full report saved to: load-test-report.json
HTML report saved to: load-test-summary.html
    `,
  };
}

function determineTestResult(data) {
  const failedRequests = data.metrics.http_req_failed.values.rate;
  const p95Duration = data.metrics.http_req_duration.values['p(95)'];
  
  if (failedRequests > 0.05 || p95Duration > 1000) {
    return `
╔═══════════════════════════════════════════════════════════════════════════╗
║                          ❌ TEST FAILED                                    ║
║  Some thresholds were not met. Please review the metrics above.          ║
╚═══════════════════════════════════════════════════════════════════════════╝`;
  } else {
    return `
╔═══════════════════════════════════════════════════════════════════════════╗
║                        ✅ TEST PASSED                                      ║
║  All thresholds met successfully! 🎉                                      ║
╚═══════════════════════════════════════════════════════════════════════════╝`;
  }
}

function generateHTMLReport(data, timestamp) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>K6 Load Test Report - ${timestamp}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
    .metric-card { background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4CAF50; }
    .metric-label { font-weight: bold; color: #555; }
    .metric-value { font-size: 1.2em; color: #333; }
    .success { color: #4CAF50; }
    .warning { color: #FF9800; }
    .error { color: #F44336; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 K6 Load Test Report</h1>
    <p><strong>Timestamp:</strong> ${timestamp}</p>
    <p><strong>Duration:</strong> ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>
    
    <h2>HTTP Metrics</h2>
    <div class="metric-card">
      <div class="metric-label">Total Requests:</div>
      <div class="metric-value">${data.metrics.http_reqs.values.count}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Request Rate:</div>
      <div class="metric-value">${data.metrics.http_reqs.values.rate.toFixed(2)}/s</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Failed Requests:</div>
      <div class="metric-value ${data.metrics.http_req_failed.values.rate > 0.05 ? 'error' : 'success'}">
        ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
      </div>
    </div>
    
    <h2>Response Times</h2>
    <div class="metric-card">
      <div class="metric-label">Average:</div>
      <div class="metric-value">${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">p95:</div>
      <div class="metric-value ${data.metrics.http_req_duration.values['p(95)'] > 1000 ? 'warning' : 'success'}">
        ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
      </div>
    </div>
    <div class="metric-card">
      <div class="metric-label">p99:</div>
      <div class="metric-value">${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms</div>
    </div>
  </div>
</body>
</html>`;
}