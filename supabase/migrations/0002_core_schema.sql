-- Multi-tenant scaffolding
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- User ↔ tenant mapping (for RLS)
create table if not exists user_memberships (
  user_id uuid not null,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null check (role in ('owner','admin','analyst','viewer')),
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

-- Shared enum for environment
create type env_t as enum ('dev','staging','prod');

-- Agents registered across MCP & non-MCP adapters
create table if not exists agents (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  name text not null,
  agent_type text not null,                -- mcp|zapier|n8n|airflow|lambda|custom
  owner text,
  model text,
  prompt_hash text,
  access_tier text,                        -- free|pro|ent
  trust_level text default 'baseline',
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

-- Workflows discovered by UADSI
create table if not exists workflows (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  name text not null,
  source text not null,                    -- zapier/n8n/airflow/custom
  trigger text,
  status text default 'active',            -- active|paused|quarantined
  conformance_score numeric(5,2) default 0,
  last_run_at timestamptz,
  created_at timestamptz not null default now()
);

-- Normalized inbound events (idempotent)
create table if not exists events (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  workflow_id uuid references workflows(id) on delete set null,
  ts timestamptz not null default now(),
  kind text not null,
  source text not null,
  correlation_id text,
  idempotency_key text,
  payload jsonb not null,
  payload_hash bytea generated always as (digest(coalesce(payload::text,'')::bytea, 'sha256')) stored
);

-- Telemetry summarized per agent
create table if not exists telemetry (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  agent_id uuid references agents(id) on delete set null,
  ts timestamptz not null default now(),
  latency_ms integer default 0,
  error_count integer default 0,
  policy_violations integer default 0,
  uptime_pct numeric(5,2) default 100
);

-- Rolling KPIs and snapshots
create table if not exists metrics (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  ts timestamptz not null default now(),
  trust_score numeric(5,2) default 0,
  risk_avoided_usd numeric(18,2) default 0,
  sync_freshness_pct numeric(5,2) default 0,
  drift_rate_pct numeric(5,2) default 0,
  compliance_sla_pct numeric(5,2) default 100
);

-- Baselines for RA$ & freshness SLO
create table if not exists baselines (
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  key text not null,
  value numeric(18,4) not null,
  note text,
  primary key (tenant_id, env, key)
);

-- Embeddings for context bus (pgvector)
create table if not exists embeddings (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  agent_id uuid references agents(id) on delete set null,
  created_at timestamptz not null default now(),
  vector vector(1536) not null
);

-- Policy rules registry
create table if not exists policies (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  name text not null,
  rule jsonb not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- Adapter credentials (hashed) & status
create table if not exists adapters (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  name text not null,
  secret_hash text not null,
  enabled boolean not null default true,
  last_used_at timestamptz
);

-- API keys (HMAC jwt or x-api-key)
create table if not exists api_keys (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  role text not null check (role in ('owner','admin','analyst','viewer')),
  hash text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- DLQ and quarantine tracking
create table if not exists dlq (
  id bigserial primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  source text not null,
  ts timestamptz not null default now(),
  payload jsonb not null,
  reason text not null
);

create table if not exists quarantine (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  resource_type text not null,             -- agent|workflow|event
  resource_id text not null,
  reason text not null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

-- Reports registry (for executive summaries)
create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  period_start date not null,
  period_end date not null,
  url text,                                 -- storage path if exported
  format text default 'md',                  -- md|csv|pdf
  created_at timestamptz not null default now()
);

-- Background jobs (for exports, recompute, etc.)
create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  env env_t not null default 'dev',
  job_type text not null,
  status text not null default 'queued',     -- queued|running|done|failed
  started_at timestamptz,
  completed_at timestamptz,
  error text
);

-- Idempotency guard
create unique index if not exists ux_events_idem
  on events (tenant_id, env, coalesce(idempotency_key,''));
