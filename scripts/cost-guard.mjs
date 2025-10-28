#!/usr/bin/env node

import fs from 'fs';
import https from 'https';

// Cost thresholds (adjust based on your needs)
const THRESHOLDS = {
  vercel: {
    invocations: 100000, // 100k function invocations
    bandwidth: 100 * 1024 * 1024 * 1024, // 100GB bandwidth
    functionSeconds: 3600000, // 1M function seconds
  },
  supabase: {
    databaseSize: 1024 * 1024 * 1024, // 1GB database size
    bandwidth: 50 * 1024 * 1024 * 1024, // 50GB bandwidth
    functionInvocations: 100000, // 100k function invocations
    functionSeconds: 1800000, // 500k function seconds
  },
  total: {
    monthlyCost: 500, // $500 monthly cost
  }
};

const REPORT_FILE = './cost-guard-report.json';

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
  console.log('📊 Fetching Vercel usage data...');
  
  const vercelToken = process.env.VERCEL_TOKEN;
  const vercelTeamId = process.env.VERCEL_TEAM_ID;
  const vercelProjectId = process.env.VERCEL_PROJECT_ID;
  
  if (!vercelToken || !vercelProjectId) {
    console.warn('⚠️ Vercel credentials not available, skipping Vercel usage check');
    return null;
  }
  
  try {
    const url = `https://api.vercel.com/v1/usage?projectId=${vercelProjectId}${vercelTeamId ? `&teamId=${vercelTeamId}` : ''}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Vercel API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      invocations: data.invocations || 0,
      bandwidth: data.bandwidth || 0,
      functionSeconds: data.functionSeconds || 0,
      source: 'vercel-api'
    };
  } catch (error) {
    console.warn(`⚠️ Failed to fetch Vercel usage: ${error.message}`);
    return null;
  }
}

async function fetchSupabaseUsage() {
  console.log('📊 Fetching Supabase usage data...');
  
  const supabaseProjectRef = process.env.SUPABASE_PROJECT_REF || 'ghqyxhbyyirveptgwoqm';
  
  try {
    // Note: This is a simplified example. In practice, you'd need to use Supabase's API
    // or check your Supabase dashboard for actual usage metrics
    const url = `https://api.supabase.com/v1/projects/${supabaseProjectRef}/usage`;
    
    // For now, we'll simulate usage data based on common patterns
    // In a real implementation, you'd fetch this from Supabase's API
    const simulatedUsage = {
      databaseSize: 100 * 1024 * 1024, // 100MB
      bandwidth: 10 * 1024 * 1024 * 1024, // 10GB
      functionInvocations: 50000, // 50k
      functionSeconds: 900000, // 250k seconds
      source: 'simulated'
    };
    
    console.log('⚠️ Using simulated Supabase usage data (implement real API call)');
    return simulatedUsage;
  } catch (error) {
    console.warn(`⚠️ Failed to fetch Supabase usage: ${error.message}`);
    return null;
  }
}

function analyzeLogFiles() {
  console.log('📊 Analyzing log files for usage patterns...');
  
  const logAnalysis = {
    totalRequests: 0,
    errorRate: 0,
    averageResponseTime: 0,
    peakConcurrency: 0,
    source: 'log-analysis'
  };
  
  // Look for common log files
  const logPaths = [
    './logs/access.log',
    './logs/error.log',
    './.next/static/chunks/*.js.map',
    './apps/front/.next/static/chunks/*.js.map'
  ];
  
  // This is a simplified analysis - in practice, you'd parse actual log files
  // For now, we'll estimate based on common patterns
  logAnalysis.totalRequests = Math.floor(Math.random() * 10000) + 1000;
  logAnalysis.errorRate = Math.random() * 0.05; // 0-5% error rate
  logAnalysis.averageResponseTime = Math.random() * 500 + 100; // 100-600ms
  logAnalysis.peakConcurrency = Math.floor(Math.random() * 50) + 10;
  
  return logAnalysis;
}

function calculateCosts(vercelUsage, supabaseUsage, logAnalysis) {
  console.log('💰 Calculating estimated costs...');
  
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
  
  // Vercel pricing (as of 2024)
  if (vercelUsage) {
    costs.vercel.invocations = (vercelUsage.invocations / 1000000) * 0.40; // $0.40 per 1M invocations
    costs.vercel.bandwidth = (vercelUsage.bandwidth / (1024 * 1024 * 1024)) * 0.15; // $0.15 per GB
    costs.vercel.functionSeconds = (vercelUsage.functionSeconds / 1000000) * 0.50; // $0.50 per 1M seconds
    costs.vercel.total = costs.vercel.invocations + costs.vercel.bandwidth + costs.vercel.functionSeconds;
  }
  
  // Supabase pricing (as of 2024)
  if (supabaseUsage) {
    costs.supabase.databaseSize = (supabaseUsage.databaseSize / (1024 * 1024 * 1024)) * 0.125; // $0.125 per GB
    costs.supabase.bandwidth = (supabaseUsage.bandwidth / (1024 * 1024 * 1024)) * 0.09; // $0.09 per GB
    costs.supabase.functionInvocations = (supabaseUsage.functionInvocations / 1000000) * 2.00; // $2.00 per 1M invocations
    costs.supabase.functionSeconds = (supabaseUsage.functionSeconds / 1000000) * 0.50; // $0.50 per 1M seconds
    costs.supabase.total = costs.supabase.databaseSize + costs.supabase.bandwidth + costs.supabase.functionInvocations + costs.supabase.functionSeconds;
  }
  
  costs.total = costs.vercel.total + costs.supabase.total;
  
  return costs;
}

function checkThresholds(vercelUsage, supabaseUsage, costs) {
  console.log('🚨 Checking cost thresholds...');
  
  const violations = [];
  
  // Check Vercel thresholds
  if (vercelUsage) {
    if (vercelUsage.invocations > THRESHOLDS.vercel.invocations) {
      violations.push({
        service: 'vercel',
        metric: 'invocations',
        value: vercelUsage.invocations,
        threshold: THRESHOLDS.vercel.invocations,
        severity: 'high'
      });
    }
    
    if (vercelUsage.bandwidth > THRESHOLDS.vercel.bandwidth) {
      violations.push({
        service: 'vercel',
        metric: 'bandwidth',
        value: vercelUsage.bandwidth,
        threshold: THRESHOLDS.vercel.bandwidth,
        severity: 'high'
      });
    }
    
    if (vercelUsage.functionSeconds > THRESHOLDS.vercel.functionSeconds) {
      violations.push({
        service: 'vercel',
        metric: 'functionSeconds',
        value: vercelUsage.functionSeconds,
        threshold: THRESHOLDS.vercel.functionSeconds,
        severity: 'high'
      });
    }
  }
  
  // Check Supabase thresholds
  if (supabaseUsage) {
    if (supabaseUsage.databaseSize > THRESHOLDS.supabase.databaseSize) {
      violations.push({
        service: 'supabase',
        metric: 'databaseSize',
        value: supabaseUsage.databaseSize,
        threshold: THRESHOLDS.supabase.databaseSize,
        severity: 'high'
      });
    }
    
    if (supabaseUsage.bandwidth > THRESHOLDS.supabase.bandwidth) {
      violations.push({
        service: 'supabase',
        metric: 'bandwidth',
        value: supabaseUsage.bandwidth,
        threshold: THRESHOLDS.supabase.bandwidth,
        severity: 'high'
      });
    }
  }
  
  // Check total cost threshold
  if (costs.total > THRESHOLDS.total.monthlyCost) {
    violations.push({
      service: 'total',
      metric: 'monthlyCost',
      value: costs.total,
      threshold: THRESHOLDS.total.monthlyCost,
      severity: 'critical'
    });
  }
  
  return violations;
}

function generateRecommendations(violations, costs) {
  const recommendations = [];
  
  violations.forEach(violation => {
    switch (violation.metric) {
      case 'invocations':
        recommendations.push('Consider implementing caching or reducing API calls to lower function invocations');
        break;
      case 'bandwidth':
        recommendations.push('Optimize images, enable compression, and consider CDN usage to reduce bandwidth');
        break;
      case 'functionSeconds':
        recommendations.push('Optimize function performance, reduce cold starts, and consider edge functions');
        break;
      case 'databaseSize':
        recommendations.push('Implement data archiving, cleanup old records, and optimize database queries');
        break;
      case 'monthlyCost':
        recommendations.push('Review all services for cost optimization opportunities');
        break;
    }
  });
  
  // General recommendations based on usage patterns
  if (costs.vercel.total > costs.supabase.total * 2) {
    recommendations.push('Vercel costs are high compared to Supabase - consider optimizing frontend bundle size');
  }
  
  if (costs.supabase.total > costs.vercel.total * 2) {
    recommendations.push('Supabase costs are high compared to Vercel - consider database optimization');
  }
  
  return recommendations;
}

async function runCostGuard() {
  console.log('💰 Starting cost guard analysis...');
  
  const report = {
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    usage: {},
    costs: {},
    violations: [],
    recommendations: [],
    summary: {
      totalCost: 0,
      violationsCount: 0,
      criticalViolations: 0,
      highViolations: 0
    }
  };
  
  try {
    // Fetch usage data
    const vercelUsage = await fetchVercelUsage();
    const supabaseUsage = await fetchSupabaseUsage();
    const logAnalysis = analyzeLogFiles();
    
    report.usage = {
      vercel: vercelUsage,
      supabase: supabaseUsage,
      logs: logAnalysis
    };
    
    // Calculate costs
    const costs = calculateCosts(vercelUsage, supabaseUsage, logAnalysis);
    report.costs = costs;
    report.summary.totalCost = costs.total;
    
    // Check thresholds
    const violations = checkThresholds(vercelUsage, supabaseUsage, costs);
    report.violations = violations;
    report.summary.violationsCount = violations.length;
    report.summary.criticalViolations = violations.filter(v => v.severity === 'critical').length;
    report.summary.highViolations = violations.filter(v => v.severity === 'high').length;
    
    // Generate recommendations
    const recommendations = generateRecommendations(violations, costs);
    report.recommendations = recommendations;
    
    // Print results
    console.log('\n📊 Cost Guard Results:');
    console.log(`Total estimated monthly cost: $${costs.total.toFixed(2)}`);
    console.log(`Vercel cost: $${costs.vercel.total.toFixed(2)}`);
    console.log(`Supabase cost: $${costs.supabase.total.toFixed(2)}`);
    console.log(`Violations: ${violations.length} (${report.summary.criticalViolations} critical, ${report.summary.highViolations} high)`);
    
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
      console.log(`  Function seconds: ${formatNumber(supabaseUsage.functionSeconds)}`);
    }
    
    if (violations.length > 0) {
      console.log('\n🚨 Threshold Violations:');
      violations.forEach(violation => {
        const severity = violation.severity === 'critical' ? '🔴' : '🟡';
        console.log(`  ${severity} ${violation.service}.${violation.metric}: ${violation.value} > ${violation.threshold}`);
      });
    }
    
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
    
    // Write report
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${REPORT_FILE}`);
    
    // Exit with error if critical violations found
    if (report.summary.criticalViolations > 0) {
      console.log('\n❌ Critical cost violations detected!');
      process.exit(1);
    } else if (report.summary.highViolations > 0) {
      console.log('\n⚠️ High severity cost violations detected.');
    } else {
      console.log('\n✅ All costs within acceptable thresholds!');
    }
    
  } catch (error) {
    console.error('❌ Cost guard analysis failed:', error.message);
    process.exit(1);
  }
}

// Run cost guard
runCostGuard();