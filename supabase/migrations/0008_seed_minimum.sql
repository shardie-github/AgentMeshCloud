-- Minimal tenant + baselines so /trust can show data immediately
insert into tenants (id, name) values
  ('00000000-0000-0000-0000-000000000001','default') on conflict do nothing;

-- Seed admin membership for service user (replace with your auth uid in app logic)
-- (Left blank intentionally; app should insert logged-in user's membership)

-- Seed agents/workflows to make dashboards non-empty
insert into agents(tenant_id, env, name, agent_type, owner, model, trust_level)
values
 ('00000000-0000-0000-0000-000000000001','dev','MCP Orchestrator','mcp','platform','gpt-4.1','baseline'),
 ('00000000-0000-0000-0000-000000000001','dev','Zapier Bridge','zapier','ops','-', 'baseline')
on conflict do nothing;

insert into workflows(tenant_id, env, name, source, trigger)
values
 ('00000000-0000-0000-0000-000000000001','dev','Orders Sync','zapier','order.created'),
 ('00000000-0000-0000-0000-000000000001','dev','Tickets Sync','n8n','ticket.opened')
on conflict do nothing;

-- Baselines for RA$ and freshness SLOs
insert into baselines(tenant_id, env, key, value, note) values
 ('00000000-0000-0000-0000-000000000001','dev','incident_cost.order_duplication',1500,'Avg loss per dup'),
 ('00000000-0000-0000-0000-000000000001','dev','incident_cost.ticket_breach',5000,'Compliance exposure'),
 ('00000000-0000-0000-0000-000000000001','dev','freshness_slo_min.orders',5,'Orders within 5m'),
 ('00000000-0000-0000-0000-000000000001','dev','freshness_slo_min.tickets',10,'Tickets within 10m')
on conflict do nothing;

-- Initial metrics snapshot
insert into metrics(tenant_id, env, trust_score, risk_avoided_usd, sync_freshness_pct, drift_rate_pct, compliance_sla_pct)
values ('00000000-0000-0000-0000-000000000001','dev',80,0,90,5,100);
