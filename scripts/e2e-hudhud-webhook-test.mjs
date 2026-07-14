import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadDotEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i += 1) {
    const arg = process.argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = process.argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      i -= 1;
    } else {
      args[key] = next;
    }
  }
  return args;
}

function uuid() {
  return crypto.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function main() {
  loadDotEnv();
  const args = parseArgs();

  const supabaseUrl = args.url || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = args.key || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const endpoint = args.endpoint || process.env.WEBHOOK_PROVIDER_ENDPOINT || 'https://jqilueudbhgcgskvkvhe.supabase.co/functions/v1/webhook-provider';
  const userId = args['user-id'];
  const campaignId = args['campaign-id'];
  const messageId = args['campaign-message-id'];
  const providerRef = args['provider-ref'] || uuid();
  const createAttempt = args['create-attempt'] !== 'false';
  const email = args.email || `e2e-${Date.now()}@example.com`;
  const password = args.password || 'TempPass123!';

  if (!supabaseUrl) {
    console.error('Missing SUPABASE_URL. Set --url or SUPABASE_URL in .env');
    process.exit(1);
  }
  if (!serviceRoleKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Set --key or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let actualUserId = userId;
  if (!actualUserId) {
    console.log('Creating temporary test user...');
    const { data: userData, error: userError } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError) {
      console.error('Failed to create test user:', userError.message || userError);
      process.exit(1);
    }
    actualUserId = userData?.id;
    console.log('Created user', actualUserId, email);
  }

  if (!actualUserId) {
    console.error('Unable to resolve a valid user ID.');
    process.exit(1);
  }

  let actualCampaignId = campaignId;
  if (!actualCampaignId) {
    console.log('Creating a campaign for the test user...');
    const { data: campaignData, error: campaignError } = await client
      .from('campaigns')
      .insert({ user_id: actualUserId, name: 'E2E Hudhud Webhook Test', status: 'sending', contacts_count: 1 })
      .select('id')
      .single();
    if (campaignError) {
      console.error('Failed to create campaign:', campaignError.message || campaignError);
      process.exit(1);
    }
    actualCampaignId = campaignData.id;
    console.log('Created campaign', actualCampaignId);
  }

  let actualMessageId = messageId;
  if (!actualMessageId) {
    console.log('Creating a campaign message...');
    const { data: messageData, error: messageError } = await client
      .from('campaign_messages')
      .insert({ campaign_id: actualCampaignId, phone: '+966500000000', name: 'E2E Test', message: 'Hello from Hudhud E2E simulation', status: 'pending' })
      .select('id')
      .single();
    if (messageError) {
      console.error('Failed to create campaign message:', messageError.message || messageError);
      process.exit(1);
    }
    actualMessageId = messageData.id;
    console.log('Created campaign_message', actualMessageId);
  }

  let attemptId = null;
  if (createAttempt) {
    console.log('Creating a delivery_attempt row...');
    const { data: attemptData, error: attemptError } = await client
      .from('delivery_attempts')
      .insert({
        campaign_message_id: actualMessageId,
        provider: 'hudhud',
        channel: 'sms',
        status: 'queued',
        attempts: 1,
        provider_reference: providerRef,
        idempotency_key: providerRef,
      })
      .select('id')
      .single();
    if (attemptError) {
      console.error('Failed to create delivery attempt:', attemptError.message || attemptError);
      process.exit(1);
    }
    attemptId = attemptData.id;
    console.log('Created delivery_attempt', attemptId, 'provider_reference', providerRef);
  }

  async function postWebhook(eventType, message) {
    const payload = {
      provider: 'hudhud',
      events: [
        {
          id: uuid(),
          status: eventType,
          message,
          data: {
            campaign_message_id: actualMessageId,
            provider_ref: providerRef,
          },
        },
      ],
    };
    console.log(`\nPosting webhook event ${eventType} -> ${endpoint}`);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('Response status:', res.status);
    console.log('Response:', text);
  }

  await postWebhook('accepted', 'Simulated accepted event');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await postWebhook('delivered', 'Simulated delivered event');

  console.log('\nReading final row states...');
  const [{ data: attemptRows }, { data: msgRows }, { data: campaignRows }] = await Promise.all([
    client.from('delivery_attempts').select('id, campaign_message_id, provider_reference, status, attempts, error_message').eq('campaign_message_id', actualMessageId),
    client.from('campaign_messages').select('id, campaign_id, status, error, sent_at').eq('id', actualMessageId),
    client.from('campaigns').select('id, status, sent_count, failed_count').eq('id', actualCampaignId),
  ]);

  console.log('delivery_attempts:', JSON.stringify(attemptRows, null, 2));
  console.log('campaign_messages:', JSON.stringify(msgRows, null, 2));
  console.log('campaigns:', JSON.stringify(campaignRows, null, 2));

  console.log('\nE2E webhook test complete.');
  if (!userId) {
    console.log('Note: temporary test user was created. Remove it manually if desired.');
  }
}

main().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
