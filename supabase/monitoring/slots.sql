-- Replication Slot Monitoring - Supabase Operations
-- Prevents disk bloat from abandoned replication slots

-- ============================================================================
-- Replication Slot Health Check
-- ============================================================================

CREATE OR REPLACE FUNCTION monitor_replication_slots()
RETURNS TABLE (
  slot_name TEXT,
  plugin TEXT,
  slot_type TEXT,
  active BOOLEAN,
  restart_lsn TEXT,
  confirmed_flush_lsn TEXT,
  wal_status TEXT,
  lag_bytes BIGINT,
  lag_mb NUMERIC,
  safe_wal_size BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.slot_name::TEXT,
    s.plugin::TEXT,
    s.slot_type::TEXT,
    s.active,
    s.restart_lsn::TEXT,
    s.confirmed_flush_lsn::TEXT,
    s.wal_status::TEXT,
    (pg_current_wal_lsn() - s.restart_lsn)::BIGINT AS lag_bytes,
    ROUND((pg_current_wal_lsn() - s.restart_lsn)::NUMERIC / 1024 / 1024, 2) AS lag_mb,
    s.safe_wal_size
  FROM pg_replication_slots s
  ORDER BY (pg_current_wal_lsn() - s.restart_lsn) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Alert on Stale Replication Slots
-- ============================================================================

CREATE OR REPLACE FUNCTION alert_stale_replication_slots()
RETURNS TABLE (
  alert_level TEXT,
  slot_name TEXT,
  lag_mb NUMERIC,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN lag_mb > 1000 THEN 'CRITICAL'
      WHEN lag_mb > 500 THEN 'WARNING'
      ELSE 'OK'
    END AS alert_level,
    m.slot_name,
    m.lag_mb,
    CASE 
      WHEN lag_mb > 1000 THEN 'Immediate action required: Drop inactive slot or investigate replication lag'
      WHEN lag_mb > 500 THEN 'Monitor closely: Slot accumulating WAL, may cause disk bloat'
      ELSE 'Slot healthy'
    END AS recommendation
  FROM monitor_replication_slots() m
  WHERE m.lag_mb > 100
  ORDER BY m.lag_mb DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- WAL Size Check (Disk Usage)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_wal_size()
RETURNS TABLE (
  metric TEXT,
  value_mb NUMERIC,
  status TEXT
) AS $$
DECLARE
  wal_size_mb NUMERIC;
  max_wal_mb NUMERIC := 10000; -- 10 GB threshold
BEGIN
  SELECT 
    ROUND(SUM(size)::NUMERIC / 1024 / 1024, 2)
  INTO wal_size_mb
  FROM pg_ls_waldir();

  RETURN QUERY
  SELECT 
    'WAL Directory Size'::TEXT,
    wal_size_mb,
    CASE 
      WHEN wal_size_mb > max_wal_mb THEN 'CRITICAL: WAL accumulation detected'
      WHEN wal_size_mb > max_wal_mb * 0.7 THEN 'WARNING: WAL size growing'
      ELSE 'OK'
    END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Cleanup Abandoned Slots (USE WITH CAUTION)
-- ============================================================================

-- This function is for manual cleanup only - DO NOT automate without careful consideration
CREATE OR REPLACE FUNCTION list_inactive_slots()
RETURNS TABLE (
  slot_name TEXT,
  inactive_since INTERVAL,
  lag_mb NUMERIC,
  can_drop BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.slot_name::TEXT,
    CASE 
      WHEN s.active THEN INTERVAL '0'
      ELSE now() - s.confirmed_flush_lsn::pg_lsn::TEXT::TIMESTAMP
    END AS inactive_since,
    ROUND((pg_current_wal_lsn() - s.restart_lsn)::NUMERIC / 1024 / 1024, 2) AS lag_mb,
    (NOT s.active AND 
     ROUND((pg_current_wal_lsn() - s.restart_lsn)::NUMERIC / 1024 / 1024, 2) > 500) AS can_drop
  FROM pg_replication_slots s
  WHERE NOT s.active
  ORDER BY lag_mb DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Manual cleanup (example - adjust slot name)
-- SELECT pg_drop_replication_slot('abandoned_slot_name');

-- ============================================================================
-- Scheduled Monitoring (Cron Integration)
-- ============================================================================

-- If using pg_cron extension:
-- SELECT cron.schedule(
--   'check-replication-slots',
--   '*/15 * * * *', -- Every 15 minutes
--   $$ SELECT * FROM alert_stale_replication_slots(); $$
-- );

-- ============================================================================
-- Grant Access to Monitoring Functions
-- ============================================================================

GRANT EXECUTE ON FUNCTION monitor_replication_slots() TO authenticated;
GRANT EXECUTE ON FUNCTION alert_stale_replication_slots() TO authenticated;
GRANT EXECUTE ON FUNCTION check_wal_size() TO authenticated;
GRANT EXECUTE ON FUNCTION list_inactive_slots() TO service_role;

-- ============================================================================
-- Usage Examples
-- ============================================================================

-- Check all replication slots
-- SELECT * FROM monitor_replication_slots();

-- Get alerts for problematic slots
-- SELECT * FROM alert_stale_replication_slots();

-- Check WAL disk usage
-- SELECT * FROM check_wal_size();

-- List inactive slots that can be dropped
-- SELECT * FROM list_inactive_slots();
