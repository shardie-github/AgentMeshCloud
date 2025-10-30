-- Refresh materialized view every 15 min
select cron.schedule('mv-kpis-refresh', '*/15 * * * *', $$ refresh materialized view concurrently mv_kpis_daily; $$);

-- Hourly KPI snapshot
select cron.schedule('kpi-hourly-snapshot', '0 * * * *', $$ select job_compute_hourly_metrics(); $$);

-- DLQ pruning (30 days)
select cron.schedule('dlq-prune', '15 3 * * *', $$ delete from dlq where ts < now() - interval '30 days'; $$);
