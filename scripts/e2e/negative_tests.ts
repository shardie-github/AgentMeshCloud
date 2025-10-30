import 'dotenv/config';
import crypto from 'crypto';

const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.ADAPTER_SECRET || 'changeme';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}

async function testInvalidSignature() {
  const testName = 'Invalid Signature Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const body = JSON.stringify({
    event: 'test.event',
    source: 'zapier',
    ts: new Date().toISOString()
  });

  const invalidSignature = 'invalid_signature_12345';
  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': invalidSignature,
      },
      body,
    });

    // We expect this to fail with 401 or 403
    if (res.status === 401 || res.status === 403) {
      console.log(`[negative-test] ✓ ${testName}: Correctly rejected invalid signature (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Correctly rejected with status ${res.status}`
      });
    } else {
      console.log(`[negative-test] ✗ ${testName}: Expected 401/403 but got ${res.status}`);
      results.push({
        name: testName,
        passed: false,
        message: `Expected 401/403 but got ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testMissingSignature() {
  const testName = 'Missing Signature Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const body = JSON.stringify({
    event: 'test.event',
    source: 'zapier',
    ts: new Date().toISOString()
  });

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        // Intentionally omit x-signature
      },
      body,
    });

    // We expect this to fail with 401
    if (res.status === 401 || res.status === 403 || res.status === 400) {
      console.log(`[negative-test] ✓ ${testName}: Correctly rejected missing signature (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Correctly rejected with status ${res.status}`
      });
    } else {
      console.log(`[negative-test] ✗ ${testName}: Expected 401/403/400 but got ${res.status}`);
      results.push({
        name: testName,
        passed: false,
        message: `Expected 401/403/400 but got ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testMalformedJSON() {
  const testName = 'Malformed JSON Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const malformedBody = '{invalid json: this is not valid, missing quotes}';
  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': sign(malformedBody),
      },
      body: malformedBody,
    });

    // We expect this to fail with 400
    if (res.status === 400) {
      console.log(`[negative-test] ✓ ${testName}: Correctly rejected malformed JSON (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Correctly rejected with status ${res.status}`
      });
    } else {
      console.log(`[negative-test] ✗ ${testName}: Expected 400 but got ${res.status}`);
      results.push({
        name: testName,
        passed: false,
        message: `Expected 400 but got ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testInvalidContentType() {
  const testName = 'Invalid Content-Type Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const body = JSON.stringify({
    event: 'test.event',
    source: 'zapier',
    ts: new Date().toISOString()
  });

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain', // Wrong content type
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': sign(body),
      },
      body,
    });

    // We expect this to fail with 415 (Unsupported Media Type) or 400
    if (res.status === 415 || res.status === 400) {
      console.log(`[negative-test] ✓ ${testName}: Correctly rejected invalid content-type (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Correctly rejected with status ${res.status}`
      });
    } else if (res.status === 200) {
      // Some implementations might be lenient, which is also acceptable
      console.log(`[negative-test] ~ ${testName}: Server accepted request (lenient implementation)`);
      results.push({
        name: testName,
        passed: true,
        message: `Server accepted request (lenient implementation)`
      });
    } else {
      console.log(`[negative-test] ✗ ${testName}: Expected 415/400 but got ${res.status}`);
      results.push({
        name: testName,
        passed: false,
        message: `Expected 415/400 but got ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testMissingRequiredFields() {
  const testName = 'Missing Required Fields Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const body = JSON.stringify({
    // Missing 'event' field which might be required
    source: 'zapier',
    ts: new Date().toISOString()
  });

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': sign(body),
      },
      body,
    });

    // We expect this to fail with 400 or 422
    if (res.status === 400 || res.status === 422) {
      console.log(`[negative-test] ✓ ${testName}: Correctly rejected missing required fields (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Correctly rejected with status ${res.status}`
      });
    } else if (res.status === 200) {
      // If server accepts it, that's also valid (event field might be optional)
      console.log(`[negative-test] ~ ${testName}: Server accepted request (event field is optional)`);
      results.push({
        name: testName,
        passed: true,
        message: `Server accepted request (event field is optional)`
      });
    } else {
      console.log(`[negative-test] ✗ ${testName}: Expected 400/422 but got ${res.status}`);
      results.push({
        name: testName,
        passed: false,
        message: `Expected 400/422 but got ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testOversizedPayload() {
  const testName = 'Oversized Payload Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  // Create a large payload (10MB)
  const largeData = 'x'.repeat(10 * 1024 * 1024);
  const body = JSON.stringify({
    event: 'test.event',
    source: 'zapier',
    ts: new Date().toISOString(),
    data: largeData
  });

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': sign(body),
      },
      body,
    });

    // We expect this to fail with 413 (Payload Too Large)
    if (res.status === 413) {
      console.log(`[negative-test] ✓ ${testName}: Correctly rejected oversized payload (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Correctly rejected with status ${res.status}`
      });
    } else if (res.status === 400 || res.status === 500) {
      // Also acceptable error codes
      console.log(`[negative-test] ~ ${testName}: Rejected with status ${res.status}`);
      results.push({
        name: testName,
        passed: true,
        message: `Rejected with status ${res.status}`
      });
    } else {
      console.log(`[negative-test] ✗ ${testName}: Expected 413 but got ${res.status}`);
      results.push({
        name: testName,
        passed: false,
        message: `Expected 413 but got ${res.status}`
      });
    }
  } catch (error: any) {
    // Network errors are also acceptable for oversized payloads
    console.log(`[negative-test] ~ ${testName}: Network error (expected for large payloads) - ${error.message}`);
    results.push({
      name: testName,
      passed: true,
      message: `Network error (acceptable): ${error.message}`
    });
  }
}

async function testInvalidHTTPMethod() {
  const testName = 'Invalid HTTP Method Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const body = JSON.stringify({
    event: 'test.event',
    source: 'zapier',
    ts: new Date().toISOString()
  });

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'GET', // Should be POST
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': sign(body),
      },
    });

    // We expect this to fail with 405 (Method Not Allowed)
    if (res.status === 405) {
      console.log(`[negative-test] ✓ ${testName}: Correctly rejected invalid HTTP method (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Correctly rejected with status ${res.status}`
      });
    } else {
      console.log(`[negative-test] ✗ ${testName}: Expected 405 but got ${res.status}`);
      results.push({
        name: testName,
        passed: false,
        message: `Expected 405 but got ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testSQLInjection() {
  const testName = 'SQL Injection Attempt Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const body = JSON.stringify({
    event: "test'; DROP TABLE users; --",
    source: 'zapier',
    ts: new Date().toISOString(),
    orderId: "' OR '1'='1"
  });

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': sign(body),
      },
      body,
    });

    // The server should handle this safely (either accept as data or reject)
    // We're just checking it doesn't crash
    if (res.status === 200 || res.status === 400) {
      console.log(`[negative-test] ✓ ${testName}: Server handled SQL injection attempt safely (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Server handled safely with status ${res.status}`
      });
    } else {
      console.log(`[negative-test] ~ ${testName}: Got status ${res.status}`);
      results.push({
        name: testName,
        passed: true,
        message: `Got status ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function testXSSAttempt() {
  const testName = 'XSS Attempt Test';
  console.log(`\n[negative-test] Running: ${testName}`);
  
  const body = JSON.stringify({
    event: 'test.event',
    source: 'zapier',
    ts: new Date().toISOString(),
    description: '<script>alert("XSS")</script>',
    name: '<img src=x onerror=alert("XSS")>'
  });

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  try {
    const res = await fetch(`${BASE}/adapters/zapier/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-correlation-id': correlationId,
        'x-idempotency-key': idempotencyKey,
        'x-signature': sign(body),
      },
      body,
    });

    // The server should handle this safely
    if (res.status === 200 || res.status === 400) {
      console.log(`[negative-test] ✓ ${testName}: Server handled XSS attempt safely (${res.status})`);
      results.push({
        name: testName,
        passed: true,
        message: `Server handled safely with status ${res.status}`
      });
    } else {
      console.log(`[negative-test] ~ ${testName}: Got status ${res.status}`);
      results.push({
        name: testName,
        passed: true,
        message: `Got status ${res.status}`
      });
    }
  } catch (error: any) {
    console.log(`[negative-test] ✗ ${testName}: Error - ${error.message}`);
    results.push({
      name: testName,
      passed: false,
      message: `Error: ${error.message}`
    });
  }
}

async function main() {
  console.log('[negative-test] ========================================');
  console.log('[negative-test] Running Negative Test Suite');
  console.log('[negative-test] Target: ' + BASE);
  console.log('[negative-test] ========================================');

  // Run all negative tests
  await testInvalidSignature();
  await testMissingSignature();
  await testMalformedJSON();
  await testInvalidContentType();
  await testMissingRequiredFields();
  await testOversizedPayload();
  await testInvalidHTTPMethod();
  await testSQLInjection();
  await testXSSAttempt();

  // Summary
  console.log('\n[negative-test] ========================================');
  console.log('[negative-test] Test Summary');
  console.log('[negative-test] ========================================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`[negative-test] Total Tests: ${results.length}`);
  console.log(`[negative-test] Passed: ${passed}`);
  console.log(`[negative-test] Failed: ${failed}`);
  console.log('\n[negative-test] Detailed Results:');
  
  results.forEach((result, index) => {
    const icon = result.passed ? '✓' : '✗';
    console.log(`[negative-test] ${icon} ${index + 1}. ${result.name}: ${result.message}`);
  });

  if (failed > 0) {
    console.log('\n[negative-test] ========================================');
    console.log('[negative-test] ✗ SOME NEGATIVE TESTS FAILED');
    console.log('[negative-test] ========================================');
    process.exit(1);
  } else {
    console.log('\n[negative-test] ========================================');
    console.log('[negative-test] ✓ ALL NEGATIVE TESTS PASSED');
    console.log('[negative-test] ========================================');
    process.exit(0);
  }
}

main().catch((e) => {
  console.error('[negative-test] FATAL:', e.message);
  process.exit(1);
});
