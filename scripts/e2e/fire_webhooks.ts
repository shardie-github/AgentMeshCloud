import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const SECRET = process.env.ADAPTER_SECRET || 'changeme';

function sign(body: string): string {
  return crypto.createHmac('sha256', SECRET).update(body).digest('hex');
}

async function post(adapterName: string, fixtureFile: string) {
  const fixturePath = path.resolve(__dirname, 'fixtures', fixtureFile);
  let body = await fs.readFile(fixturePath, 'utf8');
  
  // Replace {{now}} placeholders with current ISO timestamp
  const now = new Date().toISOString();
  body = body.replace(/\{\{now\}\}/g, now);

  const correlationId = crypto.randomUUID();
  const idempotencyKey = crypto.randomUUID();

  console.log(`[e2e] Firing webhook: ${adapterName} → ${fixtureFile}`);
  console.log(`[e2e]   correlation-id: ${correlationId}`);
  console.log(`[e2e]   idempotency-key: ${idempotencyKey}`);

  const url = `${BASE}/adapters/${adapterName}/webhook`;
  
  // Use native fetch (Node.js 18+)
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-correlation-id': correlationId,
      'x-idempotency-key': idempotencyKey,
      'x-signature': sign(body),
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${adapterName} webhook failed: ${res.status} ${text}`);
  }

  const result = await res.json();
  console.log(`[e2e] ✓ ${adapterName}/${fixtureFile} accepted:`, result);
  return result;
}

async function main() {
  console.log('[e2e] ========================================');
  console.log('[e2e] Firing synthetic webhooks...');
  console.log('[e2e] Target: ' + BASE);
  console.log('[e2e] ========================================\n');

  try {
    // Fire Zapier webhooks
    console.log('[e2e] === Zapier Webhooks ===');
    await post('zapier', 'zapier.order.created.json');
    await new Promise(r => setTimeout(r, 500)); // Small delay between events
    await post('zapier', 'zapier.order.fulfilled.json');

    // Fire n8n webhooks
    console.log('\n[e2e] === n8n Webhooks ===');
    await new Promise(r => setTimeout(r, 500));
    await post('n8n', 'n8n.ticket.opened.json');
    await new Promise(r => setTimeout(r, 500));
    await post('n8n', 'n8n.ticket.resolved.json');

    // Fire ServiceNow webhooks
    console.log('\n[e2e] === ServiceNow Webhooks ===');
    await new Promise(r => setTimeout(r, 500));
    await post('servicenow', 'servicenow.incident.created.json');
    await new Promise(r => setTimeout(r, 500));
    await post('servicenow', 'servicenow.incident.resolved.json');

    // Fire Salesforce webhooks
    console.log('\n[e2e] === Salesforce Webhooks ===');
    await new Promise(r => setTimeout(r, 500));
    await post('salesforce', 'salesforce.opportunity.won.json');
    await new Promise(r => setTimeout(r, 500));
    await post('salesforce', 'salesforce.lead.converted.json');

    // Fire HubSpot webhooks
    console.log('\n[e2e] === HubSpot Webhooks ===');
    await new Promise(r => setTimeout(r, 500));
    await post('hubspot', 'hubspot.deal.created.json');
    await new Promise(r => setTimeout(r, 500));
    await post('hubspot', 'hubspot.contact.updated.json');

    // Fire SAP webhooks
    console.log('\n[e2e] === SAP Webhooks ===');
    await new Promise(r => setTimeout(r, 500));
    await post('sap', 'sap.purchase_order.created.json');

    // Fire Oracle webhooks
    console.log('\n[e2e] === Oracle ERP Webhooks ===');
    await new Promise(r => setTimeout(r, 500));
    await post('oracle_erp', 'oracle.sales_order.created.json');

    // Fire Dynamics 365 webhooks
    console.log('\n[e2e] === Dynamics 365 Webhooks ===');
    await new Promise(r => setTimeout(r, 500));
    await post('dynamics365', 'dynamics.account.created.json');
    await new Promise(r => setTimeout(r, 500));
    await post('dynamics365', 'dynamics.opportunity.won.json');

    console.log('\n[e2e] ✓ All webhooks accepted successfully');
    console.log('[e2e] Total webhooks fired: 14');
  } catch (error) {
    console.error('\n[e2e] ✗ Webhook firing failed:', error);
    throw error;
  }
}

main().catch((e) => {
  console.error('[e2e] FATAL:', e.message);
  process.exit(1);
});
