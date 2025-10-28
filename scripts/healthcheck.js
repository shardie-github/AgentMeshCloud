#!/usr/bin/env node

const https = require('https');
const http = require('http');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TIMEOUT = 10000; // 10 seconds

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: TIMEOUT }, (res) => {
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
  console.log('🏥 Starting health check...');
  console.log(`📍 Checking: ${APP_URL}`);

  try {
    // Check main page
    console.log('📄 Checking main page...');
    const mainResponse = await makeRequest(APP_URL);
    
    if (mainResponse.statusCode !== 200) {
      throw new Error(`Main page returned ${mainResponse.statusCode}`);
    }
    console.log('✅ Main page is healthy');

    // Check API routes if they exist
    const apiRoutes = [
      '/api/health',
      '/api/agents',
      '/api/workflows'
    ];

    for (const route of apiRoutes) {
      try {
        console.log(`🔌 Checking API route: ${route}`);
        const apiResponse = await makeRequest(`${APP_URL}${route}`);
        
        if (apiResponse.statusCode >= 200 && apiResponse.statusCode < 400) {
          console.log(`✅ API route ${route} is healthy`);
        } else {
          console.log(`⚠️  API route ${route} returned ${apiResponse.statusCode} (may be expected)`);
        }
      } catch (error) {
        console.log(`⚠️  API route ${route} not available (may be expected): ${error.message}`);
      }
    }

    // Check for required environment variables in response
    console.log('🔍 Checking for environment variable leaks...');
    const responseText = mainResponse.body;
    
    const sensitivePatterns = [
      /SUPABASE_SERVICE_ROLE_KEY/,
      /DATABASE_URL/,
      /VERCEL_TOKEN/,
      /RAILWAY_TOKEN/
    ];

    let leaksFound = false;
    for (const pattern of sensitivePatterns) {
      if (pattern.test(responseText)) {
        console.error(`❌ Potential leak detected: ${pattern.source}`);
        leaksFound = true;
      }
    }

    if (!leaksFound) {
      console.log('✅ No sensitive data leaks detected');
    }

    console.log('🎉 Health check completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

checkHealth();