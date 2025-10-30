-- Daily KPI materialization for fast dashboards
create materialized view if not exists mv_kpis_daily as
select
  tenant_id, env,
  date_trunc('day', ts)::date as d,
  avg(trust_score) as trust_score_avg,
  sum(risk_avoided_usd) as risk_avoided_usd_sum,
  avg(sync_freshness_pct) as sync_freshness_avg,
  avg(drift_rate_pct) as drift_rate_avg,
  avg(compliance_sla_pct) as compliance_sla_avg
from metrics
group by 1,2,3;

create index if not exists idx_mv_kpis_daily on mv_kpis_daily(tenant_id, env, d);

-- Auto-aggregate: compute and append snapshot to metrics hourly (coarse demo)
create or replace function job_compute_hourly_metrics()
returns void language plpgsql as $$
declare r record; v record;
begin
  for r in select distinct tenant_id, env from agents loop
    select * into v from api_compute_trust_kpis(r.tenant_id, r.env, now()-interval '1 hour', now());
    insert into metrics(tenant_id, env, trust_score, risk_avoided_usd, sync_freshness_pct, drift_rate_pct, compliance_sla_pct)
    values (r.tenant_id, r.env, v.trust_score, v.risk_avoided_usd, v.sync_freshness_pct, v.drift_rate_pct, v.compliance_sla_pct);
  end loop;
end$$;
