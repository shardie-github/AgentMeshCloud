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
    await post('zapier', 'zapier.order.created.json');
    await new Promise(r => setTimeout(r, 500)); // Small delay between events
    await post('zapier', 'zapier.order.fulfilled.json');

    // Fire n8n webhooks
    await new Promise(r => setTimeout(r, 500));
    await post('n8n', 'n8n.ticket.opened.json');
    await new Promise(r => setTimeout(r, 500));
    await post('n8n', 'n8n.ticket.resolved.json');

    console.log('\n[e2e] ✓ All webhooks accepted successfully');
  } catch (error) {
    console.error('\n[e2e] ✗ Webhook firing failed:', error);
    throw error;
  }
}

main().catch((e) => {
  console.error('[e2e] FATAL:', e.message);
  process.exit(1);
});
