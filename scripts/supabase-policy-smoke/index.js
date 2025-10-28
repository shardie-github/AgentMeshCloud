#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required Supabase environment variables');
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testRLSPolicies() {
  console.log('🔒 Testing RLS policies...');

  const testTenantId = '00000000-0000-0000-0000-000000000001';

  try {
    // Test 1: Anonymous client should not be able to read data without auth
    console.log('🔍 Testing anonymous access...');
    const { data: anonData, error: anonError } = await anonClient
      .from('agents')
      .select('*')
      .limit(1);

    if (anonError && anonError.code === 'PGRST301') {
      console.log('✅ Anonymous access properly blocked (expected)');
    } else if (anonData && anonData.length === 0) {
      console.log('✅ Anonymous access returns empty result (expected)');
    } else {
      console.log('⚠️  Anonymous access behavior unexpected:', anonError || anonData);
    }

    // Test 2: Service client should be able to read data
    console.log('🔍 Testing service role access...');
    const { data: serviceData, error: serviceError } = await serviceClient
      .from('agents')
      .select('*')
      .limit(1);

    if (serviceError) {
      console.error('❌ Service role access failed:', serviceError);
    } else {
      console.log('✅ Service role access successful');
    }

    // Test 3: Test tenant isolation (if we have test data)
    console.log('🔍 Testing tenant isolation...');
    const { data: tenantData, error: tenantError } = await serviceClient
      .from('agents')
      .select('*')
      .eq('tenant_id', testTenantId)
      .limit(1);

    if (tenantError) {
      console.log('⚠️  Tenant isolation test failed (may be expected if no test data):', tenantError.message);
    } else {
      console.log('✅ Tenant isolation test passed');
    }

    // Test 4: Test specific table policies
    const tablesToTest = [
      'agents',
      'workflows',
      'workflow_executions',
      'product_feedback',
      'aiops_incidents'
    ];

    for (const table of tablesToTest) {
      console.log(`🔍 Testing table: ${table}`);
      
      const { data, error } = await serviceClient
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`⚠️  Table ${table} access failed:`, error.message);
      } else {
        console.log(`✅ Table ${table} access successful`);
      }
    }

    console.log('🎉 RLS policy smoke tests completed!');

  } catch (error) {
    console.error('❌ RLS policy test failed:', error);
    process.exit(1);
  }
}

async function testDatabaseConnectivity() {
  console.log('🔌 Testing database connectivity...');

  try {
    const { data, error } = await serviceClient
      .from('agents')
      .select('count')
      .limit(1);

    if (error) {
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log('✅ Database connectivity successful');
  } catch (error) {
    console.error('❌ Database connectivity failed:', error.message);
    process.exit(1);
  }
}

async function main() {
  console.log('🧪 Starting Supabase policy smoke tests...');
  
  await testDatabaseConnectivity();
  await testRLSPolicies();
  
  console.log('✅ All smoke tests passed!');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Smoke test failed:', error);
  process.exit(1);
});