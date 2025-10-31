-- Supabase Database Parameters - Day 2 Operations Tuning
-- Safety timeouts and operational best practices

-- ============================================================================
-- Statement Timeouts - Prevent Long-Running Queries
-- ============================================================================

-- Global statement timeout (8 seconds for most queries)
ALTER DATABASE postgres SET statement_timeout = '8s';

-- Lock timeout (prevent deadlocks)
ALTER DATABASE postgres SET lock_timeout = '2s';

-- Idle in transaction timeout (prevent connection leaks)
ALTER DATABASE postgres SET idle_in_transaction_session_timeout = '10min';

-- ============================================================================
-- Connection Settings
-- ============================================================================

-- TCP keepalives (detect dead connections faster)
ALTER SYSTEM SET tcp_keepalives_idle = '60';
ALTER SYSTEM SET tcp_keepalives_interval = '10';
ALTER SYSTEM SET tcp_keepalives_count = '6';

-- ============================================================================
-- Query Performance
-- ============================================================================

-- Enable parallel query execution
ALTER DATABASE postgres SET max_parallel_workers_per_gather = '4';

-- Random page cost (tuned for SSD)
ALTER DATABASE postgres SET random_page_cost = '1.1';

-- Effective cache size (assume 75% of RAM available, adjust as needed)
-- ALTER SYSTEM SET effective_cache_size = '6GB'; -- Uncomment and adjust for your instance

-- ============================================================================
-- Logging and Monitoring
-- ============================================================================

-- Log slow queries (> 1 second)
ALTER DATABASE postgres SET log_min_duration_statement = '1000'; -- milliseconds

-- Log lock waits
ALTER DATABASE postgres SET log_lock_waits = 'on';

-- Log checkpoints for monitoring
ALTER SYSTEM SET log_checkpoints = 'on';

-- ============================================================================
-- Autovacuum Tuning
-- ============================================================================

-- More aggressive autovacuum for busy tables
ALTER DATABASE postgres SET autovacuum_vacuum_scale_factor = '0.05';
ALTER DATABASE postgres SET autovacuum_analyze_scale_factor = '0.02';

-- Faster autovacuum for hot tables
ALTER DATABASE postgres SET autovacuum_vacuum_cost_delay = '10ms';
ALTER DATABASE postgres SET autovacuum_vacuum_cost_limit = '1000';

-- ============================================================================
-- Per-Table Tuning for Hot Tables
-- ============================================================================

-- Example: Trust scores table (high update frequency)
ALTER TABLE IF EXISTS trust_scores SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  fillfactor = 70  -- Leave room for HOT updates
);

-- Example: Agent registry (moderate updates)
ALTER TABLE IF EXISTS agent_registry SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);

-- Example: Audit logs (append-only, less aggressive vacuum)
ALTER TABLE IF EXISTS audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- ============================================================================
-- Replication Monitoring
-- ============================================================================

-- Enable logical replication (if needed)
-- ALTER SYSTEM SET wal_level = 'logical';
-- ALTER SYSTEM SET max_replication_slots = '10';

-- Monitor replication lag
CREATE OR REPLACE FUNCTION check_replication_lag()
RETURNS TABLE (
  slot_name TEXT,
  lag_bytes BIGINT,
  lag_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.slot_name::TEXT,
    pg_current_wal_lsn() - s.confirmed_flush_lsn AS lag_bytes,
    EXTRACT(EPOCH FROM now() - s.confirmed_flush_lsn::pg_lsn::TEXT::TIMESTAMP) AS lag_seconds
  FROM pg_replication_slots s
  WHERE s.active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Session Management
-- ============================================================================

-- Per-role statement timeouts (stricter for API users)
ALTER ROLE authenticated SET statement_timeout = '5s';
ALTER ROLE anon SET statement_timeout = '3s';

-- Service role can have longer timeouts for admin operations
ALTER ROLE service_role SET statement_timeout = '30s';

-- ============================================================================
-- Security Best Practices
-- ============================================================================

-- Disable superuser connections from public (Supabase handles this)
-- ALTER SYSTEM SET superuser_reserved_connections = '3';

-- Force SSL connections (if not already enforced by Supabase)
-- ALTER DATABASE postgres SET ssl = 'on';

-- ============================================================================
-- Reload Configuration
-- ============================================================================

-- Note: Some settings require restart, but most can be reloaded
SELECT pg_reload_conf();

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Check current parameters
-- SELECT name, setting, unit, context 
-- FROM pg_settings 
-- WHERE name IN (
--   'statement_timeout', 
--   'lock_timeout', 
--   'idle_in_transaction_session_timeout',
--   'log_min_duration_statement'
-- );

-- Check table-specific settings
-- SELECT 
--   schemaname, 
--   tablename, 
--   reloptions 
-- FROM pg_tables 
-- WHERE reloptions IS NOT NULL;
