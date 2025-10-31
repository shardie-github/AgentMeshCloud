-- Database Maintenance Monitoring - Supabase Operations
-- Autovacuum, bloat, and index health monitoring

-- ============================================================================
-- Autovacuum Monitoring
-- ============================================================================

CREATE OR REPLACE FUNCTION monitor_autovacuum_activity()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  last_vacuum TIMESTAMP,
  last_autovacuum TIMESTAMP,
  last_analyze TIMESTAMP,
  last_autoanalyze TIMESTAMP,
  vacuum_age_hours NUMERIC,
  dead_tuples BIGINT,
  live_tuples BIGINT,
  dead_pct NUMERIC,
  needs_vacuum BOOLEAN,
  needs_analyze BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    s.last_vacuum,
    s.last_autovacuum,
    s.last_analyze,
    s.last_autoanalyze,
    ROUND(EXTRACT(EPOCH FROM now() - COALESCE(s.last_autovacuum, s.last_vacuum))::NUMERIC / 3600, 1) AS vacuum_age_hours,
    s.n_dead_tup AS dead_tuples,
    s.n_live_tup AS live_tuples,
    CASE 
      WHEN s.n_live_tup > 0 
      THEN ROUND(s.n_dead_tup::NUMERIC * 100.0 / s.n_live_tup, 2)
      ELSE 0
    END AS dead_pct,
    (s.n_dead_tup > 1000 AND 
     s.n_dead_tup::NUMERIC / NULLIF(s.n_live_tup, 0) > 0.1) AS needs_vacuum,
    (s.n_mod_since_analyze > 1000) AS needs_analyze
  FROM pg_stat_user_tables s
  WHERE s.schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY s.n_dead_tup DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Table Bloat Estimation
-- ============================================================================

CREATE OR REPLACE FUNCTION estimate_table_bloat()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  table_size_mb NUMERIC,
  bloat_mb NUMERIC,
  bloat_pct NUMERIC,
  bloat_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    ROUND(pg_total_relation_size(s.schemaname || '.' || s.tablename)::NUMERIC / 1024 / 1024, 2) AS table_size_mb,
    ROUND((pg_total_relation_size(s.schemaname || '.' || s.tablename) * 
           (s.n_dead_tup::NUMERIC / NULLIF(s.n_live_tup + s.n_dead_tup, 0)))::NUMERIC / 1024 / 1024, 2) AS bloat_mb,
    ROUND((s.n_dead_tup::NUMERIC / NULLIF(s.n_live_tup + s.n_dead_tup, 0)) * 100, 2) AS bloat_pct,
    CASE 
      WHEN (s.n_dead_tup::NUMERIC / NULLIF(s.n_live_tup + s.n_dead_tup, 0)) > 0.25 THEN 'HIGH'
      WHEN (s.n_dead_tup::NUMERIC / NULLIF(s.n_live_tup + s.n_dead_tup, 0)) > 0.15 THEN 'MEDIUM'
      WHEN (s.n_dead_tup::NUMERIC / NULLIF(s.n_live_tup + s.n_dead_tup, 0)) > 0.05 THEN 'LOW'
      ELSE 'MINIMAL'
    END::TEXT AS bloat_level
  FROM pg_stat_user_tables s
  WHERE s.n_live_tup > 0
  ORDER BY bloat_mb DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Index Health Check
-- ============================================================================

CREATE OR REPLACE FUNCTION check_index_health()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  indexname TEXT,
  index_size_mb NUMERIC,
  index_scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  is_unused BOOLEAN,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    s.indexrelname::TEXT,
    ROUND(pg_relation_size(s.indexrelid)::NUMERIC / 1024 / 1024, 2) AS index_size_mb,
    s.idx_scan AS index_scans,
    s.idx_tup_read AS tuples_read,
    s.idx_tup_fetch AS tuples_fetched,
    (s.idx_scan = 0) AS is_unused,
    CASE 
      WHEN s.idx_scan = 0 THEN 'Consider dropping - never used'
      WHEN s.idx_scan < 100 AND pg_relation_size(s.indexrelid) > 10485760 THEN 'Rarely used - evaluate necessity'
      ELSE 'Index is used'
    END::TEXT AS recommendation
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE NOT i.indisprimary  -- Exclude primary keys
  ORDER BY s.idx_scan ASC, pg_relation_size(s.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Missing Index Suggestions
-- ============================================================================

CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  seq_scans BIGINT,
  seq_tup_read BIGINT,
  avg_rows_per_scan NUMERIC,
  suggestion TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::TEXT,
    s.tablename::TEXT,
    s.seq_scan AS seq_scans,
    s.seq_tup_read AS seq_tup_read,
    CASE 
      WHEN s.seq_scan > 0 
      THEN ROUND(s.seq_tup_read::NUMERIC / s.seq_scan, 0)
      ELSE 0
    END AS avg_rows_per_scan,
    CASE 
      WHEN s.seq_scan > 1000 AND s.seq_tup_read / NULLIF(s.seq_scan, 0) > 10000 
      THEN 'High seq scans with many rows - consider adding index on frequently filtered columns'
      WHEN s.seq_scan > 100 AND s.n_live_tup > 100000
      THEN 'Moderate seq scans on large table - review query patterns'
      ELSE 'OK'
    END::TEXT AS suggestion
  FROM pg_stat_user_tables s
  WHERE s.seq_scan > 100
  ORDER BY s.seq_tup_read DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Vacuum Recommendations
-- ============================================================================

CREATE OR REPLACE FUNCTION recommend_vacuum_operations()
RETURNS TABLE (
  schemaname TEXT,
  tablename TEXT,
  action TEXT,
  priority TEXT,
  reason TEXT,
  command TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.schemaname,
    m.tablename,
    CASE 
      WHEN m.dead_pct > 25 THEN 'VACUUM FULL'
      WHEN m.dead_pct > 10 THEN 'VACUUM'
      ELSE 'ANALYZE'
    END::TEXT AS action,
    CASE 
      WHEN m.dead_pct > 25 OR m.dead_tuples > 1000000 THEN 'HIGH'
      WHEN m.dead_pct > 10 OR m.dead_tuples > 100000 THEN 'MEDIUM'
      ELSE 'LOW'
    END::TEXT AS priority,
    format('Dead tuples: %s (%s%%), Last vacuum: %s hours ago',
           m.dead_tuples, m.dead_pct, m.vacuum_age_hours)::TEXT AS reason,
    format('VACUUM ANALYZE %I.%I;', m.schemaname, m.tablename)::TEXT AS command
  FROM monitor_autovacuum_activity() m
  WHERE m.needs_vacuum OR m.needs_analyze
  ORDER BY m.dead_pct DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant Access to Monitoring Functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION monitor_autovacuum_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION estimate_table_bloat() TO authenticated;
GRANT EXECUTE ON FUNCTION check_index_health() TO authenticated;
GRANT EXECUTE ON FUNCTION suggest_missing_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION recommend_vacuum_operations() TO service_role;

-- ============================================================================
-- Scheduled Monitoring (Optional with pg_cron)
-- ============================================================================

-- Check autovacuum daily
-- SELECT cron.schedule(
--   'daily-autovacuum-check',
--   '0 2 * * *', -- 2 AM daily
--   $$ SELECT * FROM monitor_autovacuum_activity() WHERE needs_vacuum; $$
-- );

-- Check bloat weekly
-- SELECT cron.schedule(
--   'weekly-bloat-check',
--   '0 3 * * 0', -- 3 AM Sunday
--   $$ SELECT * FROM estimate_table_bloat() WHERE bloat_level IN ('HIGH', 'MEDIUM'); $$
-- );

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Check autovacuum status
-- SELECT * FROM monitor_autovacuum_activity() WHERE needs_vacuum;

-- Estimate table bloat
-- SELECT * FROM estimate_table_bloat() WHERE bloat_level IN ('HIGH', 'MEDIUM');

-- Check unused indexes
-- SELECT * FROM check_index_health() WHERE is_unused;

-- Get vacuum recommendations
-- SELECT * FROM recommend_vacuum_operations();

-- Suggest missing indexes
-- SELECT * FROM suggest_missing_indexes();
