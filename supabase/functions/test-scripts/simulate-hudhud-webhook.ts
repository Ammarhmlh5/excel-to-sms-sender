/**
 * simulate-hudhud-webhook.ts
 *
 * Simple Deno script to POST two Hudhud-style webhook events to the
 * `webhook-provider` endpoint so you can verify the handler's matching
 * and aggregation logic locally.
 *
 * Usage:
 *   set HUDHUD_WEBHOOK_TARGET=http://localhost:54321/functions/v1/webhook-provider
 *   deno run --allow-net --allow-env supabase/functions/test-scripts/simulate-hudhud-webhook.ts
 */

const TARGET = Deno.env.get('HUDHUD_WEBHOOK_TARGET') || 'http://localhost:54321/functions/v1/webhook-provider';
const provider = 'hudhud';
const providerRef = crypto.randomUUID();
const campaignMessageId = Deno.env.get('SIM_CAMPAIGN_MESSAGE_ID') || crypto.randomUUID();

function makeEvent(status: string, message?: string) {
  return {
    id: crypto.randomUUID(),
    status,
    message: message || `${status} simulated by script`,
    data: {
      campaign_message_id: campaignMessageId,
      provider_ref: providerRef,
    },
  };
}

async function post(payload: unknown) {
  console.log('Posting to', TARGET);
  const res = await fetch(TARGET, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}

async function run() {
  console.log('Simulating Hudhud webhook sequence');
  console.log('provider_reference:', providerRef);
  console.log('campaign_message_id:', campaignMessageId);

  // 1) initial queued/accepted event
  const queuedPayload = { provider, events: [ makeEvent('accepted', 'queued by provider') ] };
  await post(queuedPayload);

  // Wait a moment then send delivered event
  await new Promise((r) => setTimeout(r, 1000));

  const deliveredPayload = { provider, events: [ makeEvent('delivered', 'final delivered event') ] };
  await post(deliveredPayload);

  console.log('Done. Check your database for updated delivery_attempts and campaign_messages.');
}

if (import.meta.main) {
  run().catch((e) => {
    console.error('Simulation failed', e);
    Deno.exit(1);
  });
}
