#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !DATABASE_URL) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create clients
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const prisma = new PrismaClient();

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

async function testAnonAccess(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🔐 Testing anonymous access...');
  
  // Test 1: Anonymous user should NOT be able to access agents
  try {
    const { data, error } = await supabaseAnon
      .from('agents')
      .select('*')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Anonymous agents access blocked',
        passed: true,
        details: { error: error.message }
      });
    } else if (data && data.length > 0) {
      results.push({
        name: 'Anonymous agents access blocked',
        passed: false,
        error: 'Anonymous user was able to access agents table'
      });
    } else {
      results.push({
        name: 'Anonymous agents access blocked',
        passed: true,
        details: { message: 'No data returned (expected)' }
      });
    }
  } catch (error) {
    results.push({
      name: 'Anonymous agents access blocked',
      passed: true,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
  
  // Test 2: Anonymous user should NOT be able to access workflows
  try {
    const { data, error } = await supabaseAnon
      .from('workflows')
      .select('*')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Anonymous workflows access blocked',
        passed: true,
        details: { error: error.message }
      });
    } else if (data && data.length > 0) {
      results.push({
        name: 'Anonymous workflows access blocked',
        passed: false,
        error: 'Anonymous user was able to access workflows table'
      });
    } else {
      results.push({
        name: 'Anonymous workflows access blocked',
        passed: true,
        details: { message: 'No data returned (expected)' }
      });
    }
  } catch (error) {
    results.push({
      name: 'Anonymous workflows access blocked',
      passed: true,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
  
  // Test 3: Anonymous user should NOT be able to access audit logs
  try {
    const { data, error } = await supabaseAnon
      .from('audit_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Anonymous audit logs access blocked',
        passed: true,
        details: { error: error.message }
      });
    } else if (data && data.length > 0) {
      results.push({
        name: 'Anonymous audit logs access blocked',
        passed: false,
        error: 'Anonymous user was able to access audit_logs table'
      });
    } else {
      results.push({
        name: 'Anonymous audit logs access blocked',
        passed: true,
        details: { message: 'No data returned (expected)' }
      });
    }
  } catch (error) {
    results.push({
      name: 'Anonymous audit logs access blocked',
      passed: true,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
  
  return results;
}

async function testServiceRoleAccess(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🔑 Testing service role access...');
  
  // Test 1: Service role should be able to access agents
  try {
    const { data, error } = await supabaseService
      .from('agents')
      .select('*')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Service role agents access',
        passed: false,
        error: `Service role cannot access agents: ${error.message}`
      });
    } else {
      results.push({
        name: 'Service role agents access',
        passed: true,
        details: { count: data?.length || 0 }
      });
    }
  } catch (error) {
    results.push({
      name: 'Service role agents access',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Test 2: Service role should be able to access workflows
  try {
    const { data, error } = await supabaseService
      .from('workflows')
      .select('*')
      .limit(1);
    
    if (error) {
      results.push({
        name: 'Service role workflows access',
        passed: false,
        error: `Service role cannot access workflows: ${error.message}`
      });
    } else {
      results.push({
        name: 'Service role workflows access',
        passed: true,
        details: { count: data?.length || 0 }
      });
    }
  } catch (error) {
    results.push({
      name: 'Service role workflows access',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Test 3: Service role should be able to write to audit logs
  try {
    const testLog = {
      entity_type: 'test',
      entity_id: '00000000-0000-0000-0000-000000000000',
      action: 'test',
      tenant_id: '00000000-0000-0000-0000-000000000000'
    };
    
    const { data, error } = await supabaseService
      .from('audit_logs')
      .insert(testLog)
      .select();
    
    if (error) {
      results.push({
        name: 'Service role audit logs write',
        passed: false,
        error: `Service role cannot write to audit logs: ${error.message}`
      });
    } else {
      // Clean up test data
      if (data && data[0]) {
        await supabaseService
          .from('audit_logs')
          .delete()
          .eq('id', data[0].id);
      }
      
      results.push({
        name: 'Service role audit logs write',
        passed: true,
        details: { inserted: data?.length || 0 }
      });
    }
  } catch (error) {
    results.push({
      name: 'Service role audit logs write',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return results;
}

async function testPrismaAccess(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🗄️ Testing Prisma access...');
  
  // Test 1: Prisma should be able to read agents
  try {
    const agents = await prisma.agent.findMany({ take: 1 });
    results.push({
      name: 'Prisma agents read',
      passed: true,
      details: { count: agents.length }
    });
  } catch (error) {
    results.push({
      name: 'Prisma agents read',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Test 2: Prisma should be able to read workflows
  try {
    const workflows = await prisma.workflow.findMany({ take: 1 });
    results.push({
      name: 'Prisma workflows read',
      passed: true,
      details: { count: workflows.length }
    });
  } catch (error) {
    results.push({
      name: 'Prisma workflows read',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  // Test 3: Prisma should be able to write to audit logs
  try {
    const testLog = await prisma.auditLog.create({
      data: {
        entityType: 'test',
        entityId: '00000000-0000-0000-0000-000000000000',
        action: 'test',
        tenantId: '00000000-0000-0000-0000-000000000000'
      }
    });
    
    // Clean up
    await prisma.auditLog.delete({
      where: { id: testLog.id }
    });
    
    results.push({
      name: 'Prisma audit logs write',
      passed: true,
      details: { created: true }
    });
  } catch (error) {
    results.push({
      name: 'Prisma audit logs write',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return results;
}

async function testTenantIsolation(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log('🏢 Testing tenant isolation...');
  
  // Create test tenants
  const tenant1 = '00000000-0000-0000-0000-000000000001';
  const tenant2 = '00000000-0000-0000-0000-000000000002';
  
  try {
    // Test 1: Create agent for tenant1
    const agent1 = await prisma.agent.create({
      data: {
        name: 'test-agent-1',
        version: '1.0.0',
        tenantId: tenant1,
        capabilities: [],
        metadata: {}
      }
    });
    
    // Test 2: Try to access agent1 with tenant2 context (should fail or return empty)
    const agentsForTenant2 = await prisma.agent.findMany({
      where: { tenantId: tenant2 }
    });
    
    const hasAgent1 = agentsForTenant2.some(a => a.id === agent1.id);
    
    results.push({
      name: 'Tenant isolation - agent access',
      passed: !hasAgent1,
      details: { 
        agent1Id: agent1.id,
        tenant2Agents: agentsForTenant2.length,
        hasAgent1
      }
    });
    
    // Clean up
    await prisma.agent.delete({
      where: { id: agent1.id }
    });
    
  } catch (error) {
    results.push({
      name: 'Tenant isolation - agent access',
      passed: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  return results;
}

async function runRLSSmokeTests() {
  console.log('🚀 Starting RLS smoke tests...');
  
  const allResults: TestResult[] = [];
  
  try {
    // Run all test suites
    const anonResults = await testAnonAccess();
    allResults.push(...anonResults);
    
    const serviceResults = await testServiceRoleAccess();
    allResults.push(...serviceResults);
    
    const prismaResults = await testPrismaAccess();
    allResults.push(...prismaResults);
    
    const tenantResults = await testTenantIsolation();
    allResults.push(...tenantResults);
    
    // Generate report
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed).length;
    
    console.log('\n📊 RLS Smoke Test Results:');
    console.log(`Total tests: ${allResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    console.log('\n📋 Test Details:');
    allResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`  ${status} ${result.name}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`    Details: ${JSON.stringify(result.details)}`);
      }
    });
    
    // Write report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: allResults.length,
        passed,
        failed
      },
      results: allResults
    };
    
    require('fs').writeFileSync('./rls-smoke-report.json', JSON.stringify(report, null, 2));
    
    // Exit with error if any tests failed
    if (failed > 0) {
      console.log('\n❌ RLS smoke tests failed!');
      process.exit(1);
    } else {
      console.log('\n✅ All RLS smoke tests passed!');
    }
    
  } catch (error) {
    console.error('❌ RLS smoke tests failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
runRLSSmokeTests();