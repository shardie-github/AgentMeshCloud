import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;
const dbUrl = process.env.DATABASE_URL!;

async function main() {
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const db = new Client({ connectionString: dbUrl });
  await db.connect();

  console.log('[seed] Setting up baselines...');

  // Baseline: expected incident cost (USD) per event class, freshness SLO mins
  await db.query(`
    create table if not exists baselines(
      key text primary key,
      value numeric,
      note text
    );
  `);

  await db.query(`
    insert into baselines(key, value, note) values
      ('incident_cost.order_duplication', 1500, 'Average loss if duplicate order is created'),
      ('incident_cost.ticket_breach', 5000, 'Compliance breach exposure per incident'),
      ('freshness_slo_min.orders', 5, 'Orders should sync within 5 minutes'),
      ('freshness_slo_min.tickets', 10, 'Tickets should sync within 10 minutes')
    on conflict (key) do update set
      value = excluded.value,
      note = excluded.note;
  `);

  // Ensure metrics table exists
  await db.query(`
    create table if not exists metrics(
      id serial primary key,
      ts timestamp with time zone default now(),
      trust_score numeric default 0,
      risk_avoided_usd numeric default 0,
      sync_freshness_pct numeric default 0,
      drift_rate_pct numeric default 0,
      compliance_sla_pct numeric default 100
    );
  `);

  // Seed a metrics row to ensure /trust has a baseline frame
  await db.query(`
    insert into metrics(ts, trust_score, risk_avoided_usd, sync_freshness_pct, drift_rate_pct, compliance_sla_pct)
    values (now(), 0, 0, 0, 0, 100)
    on conflict do nothing;
  `);

  // Ensure events table exists for adapters
  await db.query(`
    create table if not exists events(
      id uuid primary key default gen_random_uuid(),
      correlation_id text,
      idempotency_key text unique,
      source text not null,
      event_type text not null,
      payload jsonb not null,
      created_at timestamp with time zone default now(),
      processed boolean default false
    );
  `);

  console.log('[seed] ✓ Baselines and initial metrics seeded');
  console.log('[seed] ✓ Tables verified/created: baselines, metrics, events');

  await db.end();
}

main().catch((e) => {
  console.error('[seed] ERROR:', e.message);
  process.exit(1);
});
