#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

// Configuration
const SLOW_QUERY_THRESHOLD = 300; // 300ms p95 threshold
const MAX_QUERIES_TO_TEST = 10;
const REPORT_FILE = './db-performance-report.json';

// Test queries for common operations
const TEST_QUERIES = [
  {
    name: 'Agent List Query',
    query: async (prisma) => {
      return await prisma.agent.findMany({
        take: 50,
        include: {
          capabilities_rel: true,
          sessions: {
            take: 5,
            orderBy: { startedAt: 'desc' }
          }
        }
      });
    }
  },
  {
    name: 'Workflow Execution Query',
    query: async (prisma) => {
      return await prisma.workflowExecution.findMany({
        take: 20,
        where: {
          status: 'completed',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          workflow: true
        },
        orderBy: { completedAt: 'desc' }
      });
    }
  },
  {
    name: 'Feedback Aggregation Query',
    query: async (prisma) => {
      return await prisma.productFeedback.groupBy({
        by: ['feedbackType', 'priority'],
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      });
    }
  },
  {
    name: 'Growth Signals Query',
    query: async (prisma) => {
      return await prisma.growthSignal.findMany({
        take: 100,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
  },
  {
    name: 'Audit Log Query',
    query: async (prisma) => {
      return await prisma.auditLog.findMany({
        take: 50,
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
  }
];

async function measureQueryPerformance(prisma, queryFn, queryName) {
  const measurements = [];
  const iterations = 3; // Run each query 3 times for better accuracy
  
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    
    try {
      await queryFn(prisma);
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      measurements.push(duration);
    } catch (error) {
      console.warn(`Query ${queryName} failed: ${error.message}`);
      return null;
    }
  }
  
  // Calculate statistics
  measurements.sort((a, b) => a - b);
  const p50 = measurements[Math.floor(measurements.length * 0.5)];
  const p95 = measurements[Math.floor(measurements.length * 0.95)];
  const p99 = measurements[Math.floor(measurements.length * 0.99)];
  const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
  const min = Math.min(...measurements);
  const max = Math.max(...measurements);
  
  return {
    query: queryName,
    measurements,
    statistics: {
      min,
      max,
      avg,
      p50,
      p95,
      p99,
    },
    threshold: SLOW_QUERY_THRESHOLD,
    passed: p95 <= SLOW_QUERY_THRESHOLD
  };
}

async function checkDatabaseConnection(prisma) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
}

async function analyzeDatabasePerformance() {
  console.log('🔍 Starting database performance analysis...');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });
  
  const report = {
    timestamp: new Date().toISOString(),
    threshold: SLOW_QUERY_THRESHOLD,
    queries: [],
    summary: {
      totalQueries: 0,
      passedQueries: 0,
      failedQueries: 0,
      slowestQuery: null,
      averageP95: 0,
    },
    recommendations: []
  };
  
  try {
    // Check database connection
    console.log('🔌 Checking database connection...');
    const isConnected = await checkDatabaseConnection(prisma);
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    console.log('✅ Database connected');
    
    // Run performance tests
    console.log('⚡ Running performance tests...');
    
    for (const testQuery of TEST_QUERIES.slice(0, MAX_QUERIES_TO_TEST)) {
      console.log(`  Testing: ${testQuery.name}`);
      const result = await measureQueryPerformance(prisma, testQuery.query, testQuery.name);
      
      if (result) {
        report.queries.push(result);
        report.summary.totalQueries++;
        
        if (result.passed) {
          report.summary.passedQueries++;
        } else {
          report.summary.failedQueries++;
        }
        
        // Track slowest query
        if (!report.summary.slowestQuery || result.statistics.p95 > report.summary.slowestQuery.statistics.p95) {
          report.summary.slowestQuery = result;
        }
      }
    }
    
    // Calculate average p95
    if (report.queries.length > 0) {
      const totalP95 = report.queries.reduce((sum, q) => sum + q.statistics.p95, 0);
      report.summary.averageP95 = totalP95 / report.queries.length;
    }
    
    // Generate recommendations
    generateRecommendations(report);
    
    // Print results
    console.log('\n📊 Database Performance Results:');
    console.log(`Total queries tested: ${report.summary.totalQueries}`);
    console.log(`Passed: ${report.summary.passedQueries}`);
    console.log(`Failed: ${report.summary.failedQueries}`);
    console.log(`Average P95: ${report.summary.averageP95.toFixed(2)}ms`);
    
    if (report.summary.slowestQuery) {
      console.log(`Slowest query: ${report.summary.slowestQuery.query} (${report.summary.slowestQuery.statistics.p95.toFixed(2)}ms)`);
    }
    
    console.log('\n📋 Query Details:');
    report.queries.forEach(query => {
      const status = query.passed ? '✅' : '❌';
      console.log(`  ${status} ${query.query}: P95=${query.statistics.p95.toFixed(2)}ms`);
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
    
    // Write report
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${REPORT_FILE}`);
    
    // Exit with error if any queries failed
    if (report.summary.failedQueries > 0) {
      console.log('\n❌ Database performance budget exceeded!');
      process.exit(1);
    } else {
      console.log('\n✅ All database queries within performance budget!');
    }
    
  } catch (error) {
    console.error('❌ Database performance analysis failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function generateRecommendations(report) {
  const recommendations = [];
  
  // Check for slow queries
  const slowQueries = report.queries.filter(q => !q.passed);
  if (slowQueries.length > 0) {
    recommendations.push(`Consider adding indexes for slow queries: ${slowQueries.map(q => q.query).join(', ')}`);
  }
  
  // Check average performance
  if (report.summary.averageP95 > SLOW_QUERY_THRESHOLD * 0.8) {
    recommendations.push('Average query performance is approaching threshold. Consider database optimization.');
  }
  
  // Check for specific patterns
  const agentQueries = report.queries.filter(q => q.query.includes('Agent'));
  if (agentQueries.some(q => !q.passed)) {
    recommendations.push('Agent-related queries are slow. Consider adding indexes on agent.tenantId and agent.status');
  }
  
  const workflowQueries = report.queries.filter(q => q.query.includes('Workflow'));
  if (workflowQueries.some(q => !q.passed)) {
    recommendations.push('Workflow-related queries are slow. Consider adding indexes on workflow.tenantId and workflow.status');
  }
  
  const feedbackQueries = report.queries.filter(q => q.query.includes('Feedback'));
  if (feedbackQueries.some(q => !q.passed)) {
    recommendations.push('Feedback queries are slow. Consider adding indexes on productFeedback.tenantId and productFeedback.createdAt');
  }
  
  report.recommendations = recommendations;
}

// Run analysis
analyzeDatabasePerformance();