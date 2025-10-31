#!/bin/bash
# Database ANALYZE Script - Supabase Operations
# Targeted ANALYZE for hot tables after migrations or data loads

set -e

echo "🔍 Running ANALYZE on hot tables..."

# Load environment variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ Error: SUPABASE_DB_URL not set"
  echo "   Set it in .env or export it: export SUPABASE_DB_URL='postgresql://...'"
  exit 1
fi

# Hot tables (frequently queried/updated)
HOT_TABLES=(
  "agent_registry"
  "trust_scores"
  "audit_logs"
  "policy_evaluations"
  "telemetry_events"
)

# Run ANALYZE on each hot table
for table in "${HOT_TABLES[@]}"; do
  echo "  Analyzing $table..."
  psql "$SUPABASE_DB_URL" -c "ANALYZE $table;" 2>/dev/null || echo "    ⚠️  Table $table not found (skipping)"
done

# Run ANALYZE on all tables (lightweight)
echo "  Running full ANALYZE..."
psql "$SUPABASE_DB_URL" -c "ANALYZE;" 2>/dev/null

# Show statistics
echo ""
echo "📊 Table Statistics:"
psql "$SUPABASE_DB_URL" -c "
  SELECT 
    schemaname,
    tablename,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows,
    last_analyze,
    last_autoanalyze
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY n_live_tup DESC
  LIMIT 10;
"

echo ""
echo "✅ ANALYZE complete!"
