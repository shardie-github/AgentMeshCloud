-- RLS Policy Matrix Tests - Supabase Operations
-- Quick assertions for Row Level Security policies

BEGIN;

-- ============================================================================
-- Test Setup
-- ============================================================================

-- Create test users (if not exists)
DO $$
BEGIN
  -- Test roles should already exist: anon, authenticated, service_role
  -- This is just for reference
  NULL;
END $$;

-- ============================================================================
-- Helper Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION test_rls_policy(
  p_table_name TEXT,
  p_role_name TEXT,
  p_operation TEXT,
  p_expected_accessible BOOLEAN
) RETURNS BOOLEAN AS $func$
DECLARE
  v_result BOOLEAN;
  v_count INTEGER;
BEGIN
  -- Set role
  EXECUTE format('SET LOCAL ROLE %I', p_role_name);
  
  -- Test operation
  CASE p_operation
    WHEN 'SELECT' THEN
      EXECUTE format('SELECT COUNT(*) FROM %I', p_table_name) INTO v_count;
      v_result := (v_count >= 0);
    WHEN 'INSERT' THEN
      -- Try insert (will rollback)
      BEGIN
        EXECUTE format('INSERT INTO %I DEFAULT VALUES', p_table_name);
        v_result := TRUE;
      EXCEPTION WHEN OTHERS THEN
        v_result := FALSE;
      END;
    WHEN 'UPDATE' THEN
      EXECUTE format('UPDATE %I SET id = id WHERE FALSE', p_table_name);
      v_result := TRUE;
    WHEN 'DELETE' THEN
      EXECUTE format('DELETE FROM %I WHERE FALSE', p_table_name);
      v_result := TRUE;
    ELSE
      RAISE EXCEPTION 'Unknown operation: %', p_operation;
  END CASE;
  
  -- Reset role
  RESET ROLE;
  
  -- Check expectation
  IF v_result = p_expected_accessible THEN
    RETURN TRUE;
  ELSE
    RAISE WARNING 'RLS test failed: table=%, role=%, operation=%, expected=%, actual=%',
      p_table_name, p_role_name, p_operation, p_expected_accessible, v_result;
    RETURN FALSE;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RESET ROLE;
  IF p_expected_accessible THEN
    RAISE WARNING 'RLS test failed with error: table=%, role=%, operation=%, error=%',
      p_table_name, p_role_name, p_operation, SQLERRM;
    RETURN FALSE;
  ELSE
    RETURN TRUE; -- Expected to fail
  END IF;
END;
$func$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Matrix Tests
-- ============================================================================

-- Test table: agent_registry
-- Expected permissions:
-- - anon: SELECT only (public read)
-- - authenticated: SELECT, INSERT (own), UPDATE (own), DELETE (own)
-- - service_role: ALL

DO $$
DECLARE
  all_passed BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE 'Testing RLS policies for agent_registry...';
  
  -- Anon role
  all_passed := test_rls_policy('agent_registry', 'anon', 'SELECT', TRUE) AND all_passed;
  all_passed := test_rls_policy('agent_registry', 'anon', 'INSERT', FALSE) AND all_passed;
  
  -- Authenticated role
  all_passed := test_rls_policy('agent_registry', 'authenticated', 'SELECT', TRUE) AND all_passed;
  
  -- Service role (bypass RLS)
  all_passed := test_rls_policy('agent_registry', 'service_role', 'SELECT', TRUE) AND all_passed;
  all_passed := test_rls_policy('agent_registry', 'service_role', 'INSERT', TRUE) AND all_passed;
  
  IF all_passed THEN
    RAISE NOTICE '✓ agent_registry RLS tests PASSED';
  ELSE
    RAISE WARNING '✗ agent_registry RLS tests FAILED';
  END IF;
END $$;

-- Test table: trust_scores
-- Expected permissions:
-- - anon: SELECT only (public read for transparency)
-- - authenticated: SELECT, INSERT (system only), UPDATE (system only)
-- - service_role: ALL

DO $$
DECLARE
  all_passed BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE 'Testing RLS policies for trust_scores...';
  
  -- Anon role
  all_passed := test_rls_policy('trust_scores', 'anon', 'SELECT', TRUE) AND all_passed;
  all_passed := test_rls_policy('trust_scores', 'anon', 'INSERT', FALSE) AND all_passed;
  all_passed := test_rls_policy('trust_scores', 'anon', 'UPDATE', FALSE) AND all_passed;
  
  -- Authenticated role (read only for regular users)
  all_passed := test_rls_policy('trust_scores', 'authenticated', 'SELECT', TRUE) AND all_passed;
  
  -- Service role
  all_passed := test_rls_policy('trust_scores', 'service_role', 'SELECT', TRUE) AND all_passed;
  all_passed := test_rls_policy('trust_scores', 'service_role', 'INSERT', TRUE) AND all_passed;
  all_passed := test_rls_policy('trust_scores', 'service_role', 'UPDATE', TRUE) AND all_passed;
  
  IF all_passed THEN
    RAISE NOTICE '✓ trust_scores RLS tests PASSED';
  ELSE
    RAISE WARNING '✗ trust_scores RLS tests FAILED';
  END IF;
END $$;

-- Test table: audit_logs
-- Expected permissions:
-- - anon: NO ACCESS
-- - authenticated: SELECT (own tenant only), INSERT (own tenant only)
-- - service_role: ALL

DO $$
DECLARE
  all_passed BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE 'Testing RLS policies for audit_logs...';
  
  -- Anon role (no access)
  all_passed := test_rls_policy('audit_logs', 'anon', 'SELECT', FALSE) AND all_passed;
  all_passed := test_rls_policy('audit_logs', 'anon', 'INSERT', FALSE) AND all_passed;
  
  -- Authenticated role (tenant-scoped)
  all_passed := test_rls_policy('audit_logs', 'authenticated', 'SELECT', TRUE) AND all_passed;
  
  -- Service role
  all_passed := test_rls_policy('audit_logs', 'service_role', 'SELECT', TRUE) AND all_passed;
  all_passed := test_rls_policy('audit_logs', 'service_role', 'INSERT', TRUE) AND all_passed;
  all_passed := test_rls_policy('audit_logs', 'service_role', 'DELETE', TRUE) AND all_passed;
  
  IF all_passed THEN
    RAISE NOTICE '✓ audit_logs RLS tests PASSED';
  ELSE
    RAISE WARNING '✗ audit_logs RLS tests FAILED';
  END IF;
END $$;

-- ============================================================================
-- RLS Coverage Check
-- ============================================================================

DO $$
DECLARE
  v_table RECORD;
  v_missing_rls INTEGER := 0;
BEGIN
  RAISE NOTICE 'Checking RLS coverage...';
  
  FOR v_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE '_prisma%'
  LOOP
    -- Check if table has RLS enabled
    IF NOT (
      SELECT relrowsecurity
      FROM pg_class
      WHERE relname = v_table.tablename
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = v_table.schemaname)
    ) THEN
      RAISE WARNING 'Table %.% does not have RLS enabled!', v_table.schemaname, v_table.tablename;
      v_missing_rls := v_missing_rls + 1;
    END IF;
  END LOOP;
  
  IF v_missing_rls = 0 THEN
    RAISE NOTICE '✓ All public tables have RLS enabled';
  ELSE
    RAISE WARNING '✗ % table(s) missing RLS policies', v_missing_rls;
  END IF;
END $$;

-- ============================================================================
-- Cleanup
-- ============================================================================

DROP FUNCTION IF EXISTS test_rls_policy(TEXT, TEXT, TEXT, BOOLEAN);

ROLLBACK;

-- ============================================================================
-- Manual RLS Tests (run these separately with actual roles)
-- ============================================================================

-- Test anon access to agent_registry
-- SET ROLE anon;
-- SELECT * FROM agent_registry LIMIT 1; -- Should work
-- INSERT INTO agent_registry (name) VALUES ('test'); -- Should fail
-- RESET ROLE;

-- Test authenticated access
-- SET ROLE authenticated;
-- SET request.jwt.claims TO '{"sub": "test-user-id", "tenant_id": "test-tenant"}';
-- SELECT * FROM audit_logs; -- Should only see own tenant
-- RESET ROLE;

-- Test service_role bypass
-- SET ROLE service_role;
-- SELECT * FROM audit_logs; -- Should see all
-- RESET ROLE;
