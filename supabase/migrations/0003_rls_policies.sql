-- Enable RLS
alter table tenants enable row level security;
alter table user_memberships enable row level security;
alter table agents enable row level security;
alter table workflows enable row level security;
alter table events enable row level security;
alter table telemetry enable row level security;
alter table metrics enable row level security;
alter table baselines enable row level security;
alter table embeddings enable row level security;
alter table policies enable row level security;
alter table adapters enable row level security;
alter table api_keys enable row level security;
alter table dlq enable row level security;
alter table quarantine enable row level security;
alter table reports enable row level security;
alter table jobs enable row level security;

-- Helper: current user's tenant ids
create or replace view v_current_memberships as
select m.user_id, m.tenant_id, m.role
from user_memberships m
where m.user_id = auth.uid();

-- Policies (viewer+ can read within tenant; admin+ can write)
do $$
declare objs text[] := array[
  'agents','workflows','events','telemetry','metrics','baselines','embeddings',
  'policies','adapters','api_keys','dlq','quarantine','reports','jobs'
];
obj text;
begin
  foreach obj in array objs loop
    execute format($f$
      create policy if not exists %I_select on %I
        for select using (exists (
          select 1 from v_current_memberships v where v.tenant_id = %I.tenant_id
        ));
    $f$, obj, obj, obj);
    execute format($f$
      create policy if not exists %I_write on %I
        for all using (exists (
          select 1 from v_current_memberships v
          where v.tenant_id = %I.tenant_id and v.role in ('owner','admin')
        ));
    $f$, obj, obj, obj);
  end loop;
end$$;
