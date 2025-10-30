import 'dotenv/config';

const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = parseInt(process.env.E2E_TIMEOUT_MS || '60000', 10);

type TrustResp = {
  trust_score: number;
  risk_avoided_usd: number;
  sync_freshness_pct: number;
  drift_rate_pct: number;
  compliance_sla_pct: number;
};

async function getTrust(): Promise<TrustResp> {
  const r = await fetch(`${BASE}/trust`);
  if (!r.ok) {
    throw new Error(`/trust failed with status ${r.status}`);
  }
  return r.json() as any;
}

async function waitForKPIs(timeoutMs = TIMEOUT_MS): Promise<TrustResp> {
  const start = Date.now();
  let attempt = 0;

  console.log(`[e2e] Waiting for KPIs to populate (timeout: ${timeoutMs}ms)...`);

  while (Date.now() - start < timeoutMs) {
    attempt++;
    try {
      const kpi = await getTrust();
      console.log(`[e2e] Attempt ${attempt}: TS=${kpi.trust_score}, Fresh=${kpi.sync_freshness_pct}%`);

      // Check if metrics have been populated
      if (kpi.trust_score > 0 && kpi.sync_freshness_pct > 0) {
        console.log('[e2e] ✓ KPIs populated successfully');
        return kpi;
      }
    } catch (error: any) {
      console.log(`[e2e] Attempt ${attempt}: Endpoint not ready - ${error.message}`);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error(`KPIs did not populate within ${timeoutMs}ms timeout`);
}

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    throw new Error(`ASSERTION FAILED: ${msg}`);
  }
  console.log(`[e2e] ✓ ${msg}`);
}

async function main() {
  console.log('[e2e] ========================================');
  console.log('[e2e] Asserting Trust KPIs...');
  console.log('[e2e] ========================================\n');

  // Wait for metrics to be calculated
  const k = await waitForKPIs();

  console.log('\n[e2e] Final KPI Values:');
  console.log(`[e2e]   Trust Score: ${k.trust_score}`);
  console.log(`[e2e]   Risk Avoided: $${k.risk_avoided_usd}`);
  console.log(`[e2e]   Sync Freshness: ${k.sync_freshness_pct}%`);
  console.log(`[e2e]   Drift Rate: ${k.drift_rate_pct}%`);
  console.log(`[e2e]   Compliance SLA: ${k.compliance_sla_pct}%\n`);

  console.log('[e2e] Validating thresholds...');
  assert(k.trust_score >= 75, 'trust_score >= 75');
  assert(k.sync_freshness_pct >= 90, 'sync_freshness_pct >= 90');
  assert(k.drift_rate_pct <= 5, 'drift_rate_pct <= 5');
  assert(k.compliance_sla_pct >= 95, 'compliance_sla_pct >= 95');

  // Optional: Trigger report export and verify
  console.log('\n[e2e] Triggering executive report export...');
  try {
    const r = await fetch(`${BASE}/reports/export`, { method: 'POST' });
    if (!r.ok) {
      console.warn(`[e2e] ⚠ /reports/export returned ${r.status} (may not be implemented yet)`);
    } else {
      console.log('[e2e] ✓ Report export triggered successfully');
    }
  } catch (error: any) {
    console.warn(`[e2e] ⚠ Report export not available: ${error.message}`);
  }

  console.log('\n[e2e] ========================================');
  console.log('[e2e] ✓ ALL E2E ASSERTIONS PASSED');
  console.log('[e2e] ========================================');
}

main().catch((e) => {
  console.error('\n[e2e] ========================================');
  console.error('[e2e] ✗ E2E ASSERTIONS FAILED');
  console.error('[e2e] ========================================');
  console.error('[e2e] Error:', e.message);
  process.exit(1);
});
