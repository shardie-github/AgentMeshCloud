#!/usr/bin/env node

const https = require('https');
const http = require('http');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds
const BUILD_SHA = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'unknown';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: TIMEOUT, ...options }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function checkHealth() {
  console.log('🏥 Starting comprehensive health check...');
  console.log(`📍 Checking: ${APP_URL}`);
  console.log(`🔖 Build SHA: ${BUILD_SHA}`);

  const healthReport = {
    timestamp: new Date().toISOString(),
    buildSha: BUILD_SHA,
    url: APP_URL,
    checks: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  try {
    // Check main page
    console.log('📄 Checking main page...');
    const mainResponse = await makeRequest(APP_URL);
    
    if (mainResponse.statusCode !== 200) {
      throw new Error(`Main page returned ${mainResponse.statusCode}`);
    }
    console.log('✅ Main page is healthy');
    
    healthReport.checks.push({
      name: 'Main page',
      status: 'passed',
      statusCode: mainResponse.statusCode,
      responseTime: Date.now()
    });

    // Check API health endpoint
    console.log('🔌 Checking API health endpoint...');
    try {
      const healthResponse = await makeRequest(`${APP_URL}/api/health`);
      
      if (healthResponse.statusCode === 200) {
        const healthData = JSON.parse(healthResponse.body);
        console.log('✅ API health endpoint is healthy');
        console.log(`   Status: ${healthData.status}`);
        console.log(`   Environment: ${healthData.environment}`);
        
        healthReport.checks.push({
          name: 'API health endpoint',
          status: 'passed',
          statusCode: healthResponse.statusCode,
          data: healthData
        });
      } else {
        console.log(`⚠️  API health endpoint returned ${healthResponse.statusCode}`);
        healthReport.checks.push({
          name: 'API health endpoint',
          status: 'warning',
          statusCode: healthResponse.statusCode
        });
      }
    } catch (error) {
      console.log(`⚠️  API health endpoint not available: ${error.message}`);
      healthReport.checks.push({
        name: 'API health endpoint',
        status: 'warning',
        error: error.message
      });
    }

    // Check for required environment variables in response
    console.log('🔍 Checking for environment variable leaks...');
    const responseText = mainResponse.body;
    
    const sensitivePatterns = [
      /SUPABASE_SERVICE_ROLE_KEY/,
      /DATABASE_URL/,
      /VERCEL_TOKEN/,
      /RAILWAY_TOKEN/,
      /GITHUB_TOKEN/,
      /TURBO_TOKEN/
    ];

    let leaksFound = false;
    const detectedLeaks = [];
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(responseText)) {
        console.error(`❌ Potential leak detected: ${pattern.source}`);
        detectedLeaks.push(pattern.source);
        leaksFound = true;
      }
    }

    if (!leaksFound) {
      console.log('✅ No sensitive data leaks detected');
      healthReport.checks.push({
        name: 'Security leak check',
        status: 'passed',
        leaksDetected: 0
      });
    } else {
      console.log('❌ Sensitive data leaks detected!');
      healthReport.checks.push({
        name: 'Security leak check',
        status: 'failed',
        leaksDetected: detectedLeaks.length,
        leaks: detectedLeaks
      });
    }

    // Check response headers for security
    console.log('🔒 Checking security headers...');
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy'
    ];

    const missingHeaders = securityHeaders.filter(header => 
      !mainResponse.headers[header] && !mainResponse.headers[header.toLowerCase()]
    );

    if (missingHeaders.length === 0) {
      console.log('✅ All security headers present');
      healthReport.checks.push({
        name: 'Security headers',
        status: 'passed',
        headersChecked: securityHeaders.length
      });
    } else {
      console.log(`⚠️  Missing security headers: ${missingHeaders.join(', ')}`);
      healthReport.checks.push({
        name: 'Security headers',
        status: 'warning',
        headersChecked: securityHeaders.length,
        missingHeaders
      });
    }

    // Check for Next.js specific optimizations
    console.log('⚡ Checking Next.js optimizations...');
    const hasNextData = responseText.includes('__NEXT_DATA__');
    const hasNextScripts = responseText.includes('_next/static');
    
    if (hasNextData && hasNextScripts) {
      console.log('✅ Next.js optimizations detected');
      healthReport.checks.push({
        name: 'Next.js optimizations',
        status: 'passed',
        hasNextData,
        hasNextScripts
      });
    } else {
      console.log('⚠️  Next.js optimizations may be missing');
      healthReport.checks.push({
        name: 'Next.js optimizations',
        status: 'warning',
        hasNextData,
        hasNextScripts
      });
    }

    // Calculate summary
    healthReport.summary.total = healthReport.checks.length;
    healthReport.summary.passed = healthReport.checks.filter(c => c.status === 'passed').length;
    healthReport.summary.failed = healthReport.checks.filter(c => c.status === 'failed').length;
    healthReport.summary.warnings = healthReport.checks.filter(c => c.status === 'warning').length;

    // Print summary
    console.log('\n📊 Health Check Summary:');
    console.log(`Total checks: ${healthReport.summary.total}`);
    console.log(`Passed: ${healthReport.summary.passed}`);
    console.log(`Failed: ${healthReport.summary.failed}`);
    console.log(`Warnings: ${healthReport.summary.warnings}`);

    // Write report
    require('fs').writeFileSync('./health-check-report.json', JSON.stringify(healthReport, null, 2));

    if (healthReport.summary.failed > 0) {
      console.log('❌ Health check failed!');
      process.exit(1);
    } else if (healthReport.summary.warnings > 0) {
      console.log('⚠️  Health check completed with warnings.');
    } else {
      console.log('🎉 Health check completed successfully!');
    }

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    healthReport.checks.push({
      name: 'Overall health check',
      status: 'failed',
      error: error.message
    });
    
    require('fs').writeFileSync('./health-check-report.json', JSON.stringify(healthReport, null, 2));
    process.exit(1);
  }
}

checkHealth();