#!/usr/bin/env node

const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TIMEOUT = 30000; // 30 seconds

async function runSmokeTests() {
  console.log('🎭 Starting Playwright smoke tests...');
  console.log(`📍 Testing: ${APP_URL}`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = {
    timestamp: new Date().toISOString(),
    url: APP_URL,
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    // Test 1: Page loads successfully
    console.log('📄 Testing page load...');
    const startTime = Date.now();
    
    try {
      await page.goto(APP_URL, { timeout: TIMEOUT });
      const loadTime = Date.now() - startTime;
      
      results.tests.push({
        name: 'Page Load',
        status: 'passed',
        duration: loadTime,
        details: { url: APP_URL }
      });
      console.log(`✅ Page loaded in ${loadTime}ms`);
    } catch (error) {
      results.tests.push({
        name: 'Page Load',
        status: 'failed',
        error: error.message
      });
      console.log(`❌ Page load failed: ${error.message}`);
    }

    // Test 2: Health endpoint accessible
    console.log('🏥 Testing health endpoint...');
    try {
      const healthResponse = await page.goto(`${APP_URL}/api/health`, { timeout: TIMEOUT });
      
      if (healthResponse && healthResponse.status() === 200) {
        const healthData = await healthResponse.json();
        results.tests.push({
          name: 'Health Endpoint',
          status: 'passed',
          details: { status: healthData.status, buildSha: healthData.buildSha }
        });
        console.log('✅ Health endpoint accessible');
      } else {
        results.tests.push({
          name: 'Health Endpoint',
          status: 'failed',
          error: `Status: ${healthResponse?.status()}`
        });
        console.log(`❌ Health endpoint failed: ${healthResponse?.status()}`);
      }
    } catch (error) {
      results.tests.push({
        name: 'Health Endpoint',
        status: 'failed',
        error: error.message
      });
      console.log(`❌ Health endpoint error: ${error.message}`);
    }

    // Test 3: Check for critical UI elements
    console.log('🎨 Testing UI elements...');
    try {
      await page.goto(APP_URL, { timeout: TIMEOUT });
      
      // Check for main content
      const hasMainContent = await page.locator('main').count() > 0;
      const hasTitle = await page.locator('h1, h2, h3').count() > 0;
      
      if (hasMainContent && hasTitle) {
        results.tests.push({
          name: 'UI Elements',
          status: 'passed',
          details: { hasMainContent, hasTitle }
        });
        console.log('✅ UI elements present');
      } else {
        results.tests.push({
          name: 'UI Elements',
          status: 'failed',
          error: `hasMainContent: ${hasMainContent}, hasTitle: ${hasTitle}`
        });
        console.log(`❌ UI elements missing`);
      }
    } catch (error) {
      results.tests.push({
        name: 'UI Elements',
        status: 'failed',
        error: error.message
      });
      console.log(`❌ UI elements error: ${error.message}`);
    }

    // Test 4: Check for JavaScript errors
    console.log('🐛 Testing for JavaScript errors...');
    const jsErrors = [];
    
    page.on('pageerror', error => {
      jsErrors.push(error.message);
    });

    try {
      await page.goto(APP_URL, { timeout: TIMEOUT });
      await page.waitForTimeout(2000); // Wait for JS to load
      
      if (jsErrors.length === 0) {
        results.tests.push({
          name: 'JavaScript Errors',
          status: 'passed',
          details: { errorCount: 0 }
        });
        console.log('✅ No JavaScript errors detected');
      } else {
        results.tests.push({
          name: 'JavaScript Errors',
          status: 'failed',
          error: `Found ${jsErrors.length} errors`,
          details: { errors: jsErrors }
        });
        console.log(`❌ JavaScript errors detected: ${jsErrors.length}`);
      }
    } catch (error) {
      results.tests.push({
        name: 'JavaScript Errors',
        status: 'failed',
        error: error.message
      });
      console.log(`❌ JavaScript errors test failed: ${error.message}`);
    }

    // Test 5: Performance metrics
    console.log('⚡ Testing performance metrics...');
    try {
      await page.goto(APP_URL, { timeout: TIMEOUT });
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: navigation.loadEventEnd - navigation.loadEventStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      const isPerformant = metrics.loadTime < 3000 && metrics.domContentLoaded < 2000;
      
      results.tests.push({
        name: 'Performance Metrics',
        status: isPerformant ? 'passed' : 'warning',
        details: metrics
      });
      
      if (isPerformant) {
        console.log('✅ Performance metrics within acceptable range');
      } else {
        console.log('⚠️ Performance metrics exceed thresholds');
      }
    } catch (error) {
      results.tests.push({
        name: 'Performance Metrics',
        status: 'failed',
        error: error.message
      });
      console.log(`❌ Performance metrics test failed: ${error.message}`);
    }

    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status === 'passed').length;
    results.summary.failed = results.tests.filter(t => t.status === 'failed').length;

    // Print summary
    console.log('\n📊 Smoke Test Summary:');
    console.log(`Total tests: ${results.summary.total}`);
    console.log(`Passed: ${results.summary.passed}`);
    console.log(`Failed: ${results.summary.failed}`);

    console.log('\n📋 Test Details:');
    results.tests.forEach(test => {
      const status = test.status === 'passed' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';
      console.log(`  ${status} ${test.name}`);
      if (test.error) {
        console.log(`    Error: ${test.error}`);
      }
      if (test.details) {
        console.log(`    Details: ${JSON.stringify(test.details)}`);
      }
    });

    // Write report
    require('fs').writeFileSync('./playwright-smoke-report.json', JSON.stringify(results, null, 2));
    console.log('\n📄 Report saved to: playwright-smoke-report.json');

    // Exit with error if any tests failed
    if (results.summary.failed > 0) {
      console.log('\n❌ Smoke tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All smoke tests passed!');
    }

  } catch (error) {
    console.error('❌ Smoke tests failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Run smoke tests
runSmokeTests();