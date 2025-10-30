-- Helpful indexes
create index if not exists idx_events_tenant_ts on events (tenant_id, ts desc);
create index if not exists idx_events_corr on events (tenant_id, correlation_id);
create index if not exists idx_telemetry_agent_ts on telemetry (agent_id, ts desc);
create index if not exists idx_metrics_tenant_ts on metrics (tenant_id, ts desc);
create index if not exists idx_workflows_tenant on workflows (tenant_id, status);
create index if not exists idx_agents_tenant on agents (tenant_id, last_seen_at);

-- FKs already defined; ensure not null where needed
