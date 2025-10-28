#!/usr/bin/env node

import fs from 'fs';
import https from 'https';

// Cost thresholds for daily monitoring
const DAILY_THRESHOLDS = {
  vercel: {
    invocations: 10000, // 10k daily invocations
    bandwidth: 5 * 1024 * 1024 * 1024, // 5GB daily bandwidth
    functionSeconds: 360000, // 100k function seconds
  },
  supabase: {
    databaseSize: 1024 * 1024 * 1024, // 1GB database size
    bandwidth: 2 * 1024 * 1024 * 1024, // 2GB daily bandwidth
    functionInvocations: 10000, // 10k daily function invocations
  },
  total: {
    dailyCost: 50, // $50 daily cost
  }
};

const REPORT_FILE = './daily-cost-report.json';
const ALERT_FILE = './cost-alert.json';

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatNumber(num) {
  return new Intl.NumberFormat().format(num);
}

async function fetchVercelUsage() {
  console.log('📊 Fetching Vercel daily usage...');
  
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  
  if (!vercelToken || !vercelProjectId) {
    console.warn('⚠️ Vercel credentials not available');
    return null;
  }
  
  try {
    // Get usage for last 24 hours
    const url = `https://api.vercel.com/v1/usage?projectId=${vercelProjectId}&since=${Date.now() - 24 * 60 * 60 * 1000}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      invocations: data.invocations || 0,
      bandwidth: data.bandwidth || 0,
      functionSeconds: data.functionSeconds || 0,
      source: 'vercel-api',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.warn(`⚠️ Failed to fetch Vercel usage: ${error.message}`);
    return null;
  }
}

async function fetchSupabaseUsage() {
  console.log('📊 Fetching Supabase daily usage...');
  
  const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF || 'ghqyxhbyyirveptgwoqm';
  
  try {
    // Simulate daily usage data
    // In production, you'd fetch from Supabase API
    const simulatedUsage = {
      databaseSize: 100 * 1024 * 1024, // 100MB
      bandwidth: 500 * 1024 * 1024, // 500MB
      functionInvocations: 5000, // 5k
      functionSeconds: 180000, // 50k seconds
      source: 'simulated',
      timestamp: new Date().toISOString()
    };
    
    console.log('⚠️ Using simulated Supabase usage data');
    return simulatedUsage;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch Supabase usage: ${error.message}`);
    return null;
  }
}

function calculateDailyCosts(vercelUsage, supabaseUsage) {
  console.log('💰 Calculating daily costs...');
  
  const costs = {
    vercel: {
      invocations: 0,
      bandwidth: 0,
      functionSeconds: 0,
      total: 0
    },
    supabase: {
      databaseSize: 0,
      bandwidth: 0,
      functionInvocations: 0,
      functionSeconds: 0,
      total: 0
    },
    total: 0
  };
  
  // Vercel daily pricing
  if (vercelUsage) {
    costs.vercel.invocations = (vercelUsage.invocations / 1000000) * 0.40;
    costs.vercel.bandwidth = (vercelUsage.bandwidth / (1024 * 1024 * 1024)) * 0.15;
    costs.vercel.functionSeconds = (vercelUsage.functionSeconds / 1000000) * 0.50;
    costs.vercel.total = costs.vercel.invocations + costs.vercel.bandwidth + costs.vercel.functionSeconds;
  }
  
  // Supabase daily pricing
  if (supabaseUsage) {
    costs.supabase.databaseSize = (supabaseUsage.databaseSize / (1024 * 1024 * 1024)) * 0.125;
    costs.supabase.bandwidth = (supabaseUsage.bandwidth / (1024 * 1024 * 1024)) * 0.09;
    costs.supabase.functionInvocations = (supabaseUsage.functionInvocations / 1000000) * 2.00;
    costs.supabase.functionSeconds = (supabaseUsage.functionSeconds / 1000000) * 0.50;
    costs.supabase.total = costs.supabase.databaseSize + costs.supabase.bandwidth + costs.supabase.functionInvocations + costs.supabase.functionSeconds;
  }
  
  costs.total = costs.vercel.total + costs.supabase.total;
  
  return costs;
}

function checkDailyThresholds(vercelUsage, supabaseUsage, costs) {
  console.log('🚨 Checking daily cost thresholds...');
  
  const violations = [];
  
  // Check Vercel thresholds
  if (vercelUsage) {
    if (vercelUsage.invocations > DAILY_THRESHOLDS.vercel.invocations) {
      violations.push({
        service: 'vercel',
        metric: 'invocations',
        value: vercelUsage.invocations,
        threshold: DAILY_THRESHOLDS.vercel.invocations,
        severity: 'high'
      });
    }
    
    if (vercelUsage.bandwidth > DAILY_THRESHOLDS.vercel.bandwidth) {
      violations.push({
        service: 'vercel',
        metric: 'bandwidth',
        value: vercelUsage.bandwidth,
        threshold: DAILY_THRESHOLDS.vercel.bandwidth,
        severity: 'high'
      });
    }
  }
  
  // Check Supabase thresholds
  if (supabaseUsage) {
    if (supabaseUsage.bandwidth > DAILY_THRESHOLDS.supabase.bandwidth) {
      violations.push({
        service: 'supabase',
        metric: 'bandwidth',
        value: supabaseUsage.bandwidth,
        threshold: DAILY_THRESHOLDS.supabase.bandwidth,
        severity: 'high'
      });
    }
  }
  
  // Check total cost threshold
  if (costs.total > DAILY_THRESHOLDS.total.dailyCost) {
    violations.push({
      service: 'total',
      metric: 'dailyCost',
      value: costs.total,
      threshold: DAILY_THRESHOLDS.total.dailyCost,
      severity: 'critical'
    });
  }
  
  return violations;
}

function generateDailyReport(vercelUsage, supabaseUsage, costs, violations) {
  const report = {
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    thresholds: DAILY_THRESHOLDS,
    usage: {
      vercel: vercelUsage,
      supabase: supabaseUsage
    },
    costs,
    violations,
    summary: {
      totalCost: costs.total,
      violationsCount: violations.length,
      criticalViolations: violations.filter(v => v.severity === 'critical').length,
      highViolations: violations.filter(v => v.severity === 'high').length
    }
  };
  
  return report;
}

function sendAlert(violations, costs) {
  if (violations.length === 0) return;
  
  const alert = {
    timestamp: new Date().toISOString(),
    severity: violations.some(v => v.severity === 'critical') ? 'critical' : 'high',
    violations,
    costs,
    message: `Cost alert: ${violations.length} threshold violations detected`
  };
  
  // Write alert file
  fs.writeFileSync(ALERT_FILE, JSON.stringify(alert, null, 2));
  
  // In production, you'd send this to Slack, email, etc.
  console.log('🚨 COST ALERT GENERATED');
  console.log(`Severity: ${alert.severity}`);
  console.log(`Violations: ${violations.length}`);
  console.log(`Total cost: $${costs.total.toFixed(2)}`);
}

async function runDailyCostMonitor() {
  console.log('💰 Starting daily cost monitoring...');
  
  try {
    // Fetch usage data
    const vercelUsage = await fetchVercelUsage();
    const supabaseUsage = await fetchSupabaseUsage();
    
    // Calculate costs
    const costs = calculateDailyCosts(vercelUsage, supabaseUsage);
    
    // Check thresholds
    const violations = checkDailyThresholds(vercelUsage, supabaseUsage, costs);
    
    // Generate report
    const report = generateDailyReport(vercelUsage, supabaseUsage, costs, violations);
    
    // Print summary
    console.log('\n📊 Daily Cost Summary:');
    console.log(`Date: ${report.date}`);
    console.log(`Total cost: $${costs.total.toFixed(2)}`);
    console.log(`Vercel cost: $${costs.vercel.total.toFixed(2)}`);
    console.log(`Supabase cost: $${costs.supabase.total.toFixed(2)}`);
    console.log(`Violations: ${violations.length}`);
    
    if (vercelUsage) {
      console.log('\n📈 Vercel Usage:');
      console.log(`  Invocations: ${formatNumber(vercelUsage.invocations)}`);
      console.log(`  Bandwidth: ${formatBytes(vercelUsage.bandwidth)}`);
      console.log(`  Function seconds: ${formatNumber(vercelUsage.functionSeconds)}`);
    }
    
    if (supabaseUsage) {
      console.log('\n📈 Supabase Usage:');
      console.log(`  Database size: ${formatBytes(supabaseUsage.databaseSize)}`);
      console.log(`  Bandwidth: ${formatBytes(supabaseUsage.bandwidth)}`);
      console.log(`  Function invocations: ${formatNumber(supabaseUsage.functionInvocations)}`);
    }
    
    if (violations.length > 0) {
      console.log('\n🚨 Threshold Violations:');
      violations.forEach(violation => {
        const severity = violation.severity === 'critical' ? '🔴' : '🟡';
        console.log(`  ${severity} ${violation.service}.${violation.metric}: ${violation.value} > ${violation.threshold}`);
      });
    }
    
    // Write report
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${REPORT_FILE}`);
    
    // Send alerts if needed
    sendAlert(violations, costs);
    
    // Exit with error if critical violations
    if (report.summary.criticalViolations > 0) {
      console.log('\n❌ Critical cost violations detected!');
      process.exit(1);
    } else if (report.summary.highViolations > 0) {
      console.log('\n⚠️ High severity cost violations detected.');
    } else {
      console.log('\n✅ All costs within daily thresholds!');
    }
    
  } catch (error) {
    console.error('❌ Daily cost monitoring failed:', error.message);
    process.exit(1);
  }
}

// Run daily cost monitor
runDailyCostMonitor();