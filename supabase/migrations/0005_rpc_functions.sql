-- Compute trust KPIs between dates
create or replace function api_compute_trust_kpis(p_tenant uuid, p_env env_t, p_from timestamptz, p_to timestamptz)
returns table(
  trust_score numeric, risk_avoided_usd numeric,
  sync_freshness_pct numeric, drift_rate_pct numeric, compliance_sla_pct numeric
)
language plpgsql security definer as $$
declare
  v_ts numeric := 0; v_ra numeric := 0; v_sf numeric := 0; v_drift numeric := 0; v_sla numeric := 100;
begin
  -- Example formulas (refine as needed)
  select coalesce(avg(uptime_pct),0) into v_ts
  from telemetry t where t.tenant_id = p_tenant and t.env = p_env and t.ts between p_from and p_to;

  select coalesce(sum(value),0) into v_ra
  from baselines b
  where b.tenant_id = p_tenant and b.env = p_env and b.key like 'incident_cost.%';

  -- Sync Freshness: % events meeting SLO windows
  with e as (
    select ts, source from events where tenant_id = p_tenant and env = p_env and ts between p_from and p_to
  )
  select coalesce(100.0 * count(*) filter (where now() - e.ts <= interval '10 minutes') / greatest(count(*),1),0)
  into v_sf from e;

  -- Drift rate: share of telemetry rows with policy violations
  select coalesce(100.0 * sum(case when policy_violations > 0 then 1 else 0 end) / greatest(count(*),1),0)
  into v_drift from telemetry t where t.tenant_id=p_tenant and t.env=p_env and t.ts between p_from and p_to;

  -- Compliance SLA: % days with zero policy violations (coarse)
  with d as (
    select date_trunc('day', ts) d, sum(policy_violations) v
    from telemetry t
    where t.tenant_id=p_tenant and t.env=p_env and ts between p_from and p_to
    group by 1
  )
  select coalesce(100.0 * count(*) filter (where v=0) / greatest(count(*),1),100) into v_sla from d;

  return query select round(v_ts::numeric,2), round(v_ra::numeric,2), round(v_sf::numeric,2), round(v_drift::numeric,2), round(v_sla::numeric,2);
end$$;

-- Agents list RPC (filtered)
create or replace function api_list_agents(p_tenant uuid, p_env env_t)
returns setof agents language sql security definer as
$$
  select * from agents where tenant_id = p_tenant and env = p_env;
$$;

-- Workflows list RPC
create or replace function api_list_workflows(p_tenant uuid, p_env env_t)
returns setof workflows language sql security definer as
$$
  select * from workflows where tenant_id = p_tenant and env = p_env;
$$;

-- Insert normalized event with idempotency guard
create or replace function api_ingest_event(
  p_tenant uuid, p_env env_t, p_workflow uuid, p_kind text, p_source text,
  p_correlation text, p_idem text, p_payload jsonb
) returns bigint language plpgsql security definer as $$
declare new_id bigint;
begin
  insert into events(tenant_id, env, workflow_id, kind, source, correlation_id, idempotency_key, payload)
  values (p_tenant, p_env, p_workflow, p_kind, p_source, p_correlation, p_idem, p_payload)
  on conflict on constraint ux_events_idem do nothing
  returning id into new_id;

  -- Touch agent/workflow last_seen if possible
  if p_workflow is not null then
    update workflows set last_run_at = now() where id = p_workflow;
  end if;
  return coalesce(new_id, 0);
end$$;

-- Record telemetry row
create or replace function api_record_telemetry(
  p_tenant uuid, p_env env_t, p_agent uuid, p_latency int, p_errors int, p_policy int, p_uptime numeric
) returns bigint language sql security definer as
$$
  insert into telemetry(tenant_id, env, agent_id, latency_ms, error_count, policy_violations, uptime_pct)
  values ($1,$2,$3,$4,$5,$6,$7) returning id;
$$;

-- Upsert baseline
create or replace function api_set_baseline(p_tenant uuid, p_env env_t, p_key text, p_value numeric, p_note text)
returns void language sql security definer as
$$
  insert into baselines(tenant_id, env, key, value, note)
  values ($1,$2,$3,$4,$5)
  on conflict (tenant_id, env, key) do update set value=excluded.value, note=excluded.note;
$$;

-- Trusted /trust view (convenience)
create or replace view v_trust_kpis as
select
  m.tenant_id, m.env,
  (select trust_score from metrics where tenant_id=m.tenant_id and env=m.env order by ts desc limit 1) as trust_score,
  (select risk_avoided_usd from metrics where tenant_id=m.tenant_id and env=m.env order by ts desc limit 1) as risk_avoided_usd,
  (select sync_freshness_pct from metrics where tenant_id=m.tenant_id and env=m.env order by ts desc limit 1) as sync_freshness_pct,
  (select drift_rate_pct from metrics where tenant_id=m.tenant_id and env=m.env order by ts desc limit 1) as drift_rate_pct,
  (select compliance_sla_pct from metrics where tenant_id=m.tenant_id and env=m.env order by ts desc limit 1) as compliance_sla_pct
from metrics m
group by m.tenant_id, m.env;
