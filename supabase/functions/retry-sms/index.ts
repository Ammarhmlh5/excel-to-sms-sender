import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendToHudhud } from "../_shared/providers/hudhud.ts";
import { logError, logInfo } from "../_shared/log.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Retry policy
    const MAX_ATTEMPTS = 4;
    const BACKOFF_MS = [0, 30_000, 5 * 60_000, 30 * 60_000]; // index by current attempts

    // Find candidate attempts: status = 'failed' and attempts < MAX_ATTEMPTS and elapsed >= backoff
    const nowIso = new Date().toISOString();

    const { data: candidates, error } = await adminClient
      .rpc('get_retryable_delivery_attempts', { p_max_attempts: MAX_ATTEMPTS });

    // Fallback if RPC not present: simple query limited
    let rows = candidates as any[] | null;
    if (error || !rows) {
      const { data: qrows } = await adminClient
        .from('delivery_attempts')
        .select('id, attempts, idempotency_key, provider_reference, campaign_message_id, updated_at, campaign_messages(id, phone, message)')
        .eq('status', 'failed')
        .limit(200);
      rows = (qrows || []).map((r: any) => ({
        id: r.id,
        attempts: r.attempts,
        idempotency_key: r.idempotency_key,
        provider_reference: r.provider_reference,
        campaign_message_id: r.campaign_message_id,
        phone: r.campaign_messages?.phone,
        message: r.campaign_messages?.message,
        updated_at: r.updated_at,
      }));
    }

    const processed: { id: string; ok: boolean; error?: string }[] = [];

    for (const r of rows) {
      try {
        const attempts = r.attempts || 0;
        if (attempts >= MAX_ATTEMPTS) continue;

        const updatedAt = new Date(r.updated_at || r.created_at || nowIso).getTime();
        const elapsed = Date.now() - updatedAt;
        const wait = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
        if (elapsed < wait) continue; // not yet time

        // Lookup campaign_message -> campaign -> owner's API key
        const { data: cm } = await adminClient.from('campaign_messages').select('id, campaign_id, message, phone').eq('id', r.campaign_message_id).maybeSingle();
        if (!cm) {
          logError('Missing campaign_message for attempt', { attemptId: r.id });
          continue;
        }

        const { data: camp } = await adminClient.from('campaigns').select('id, user_id').eq('id', cm.campaign_id).maybeSingle();
        const { data: apiKeyRow } = await adminClient.from('api_keys').select('id, api_key').eq('user_id', camp?.user_id).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle();
        const apiKey = apiKeyRow?.api_key;
        if (!apiKey) {
          logError('No API key for user of campaign', { campaign_id: cm.campaign_id });
          // increment attempts and mark error
          await adminClient.from('delivery_attempts').update({ attempts: attempts + 1, error_message: 'no_api_key', updated_at: new Date().toISOString() }).eq('id', r.id);
          await adminClient.from('delivery_events').insert({ delivery_attempt_id: r.id, event_type: 'no_api_key', event_data: {} }).catch(() => {});
          processed.push({ id: r.id, ok: false, error: 'no_api_key' });
          continue;
        }

        // Prepare message
        const payload = [{ to: cm.phone, message: cm.message }];

        // Mark as sending
        await adminClient.from('delivery_attempts').update({ status: 'sending' }).eq('id', r.id);

        // Send via Hudhud
        const res = await sendToHudhud({ apiKey, messages: payload });
        const body = res.body || {};
        const ok = res.response.ok && !(body as any).error;


        // Update attempt
        const newAttempts = attempts + 1;
        const newStatus = ok ? 'sent' : 'failed';
        await adminClient.from('delivery_attempts').update({
          attempts: newAttempts,
          status: newStatus,
          response_data: body,
          error_message: ok ? null : (body as any).message || 'provider_error',
          updated_at: new Date().toISOString(),
        }).eq('id', r.id);

        // Insert event
        await adminClient.from('delivery_events').insert({
          delivery_attempt_id: r.id,
          event_type: ok ? 'sent' : (newAttempts >= MAX_ATTEMPTS ? 'failed_final' : 'retry_failed'),
          event_data: body,
        });

        // If this attempt exhausted retries, move to dead letters
        if (!ok && newAttempts >= MAX_ATTEMPTS) {
          try {
            await adminClient.from('dead_letters').insert({
              campaign_message_id: cm.id,
              delivery_attempt_id: r.id,
              provider: 'hudhud',
              channel: 'sms',
              error_message: (body as any).message || 'provider_error',
              response_data: body,
              created_at: new Date().toISOString(),
            });
            // Optionally mark attempt status to indicate DLQ moved
            await adminClient.from('delivery_attempts').update({ status: 'dead_lettered' }).eq('id', r.id);
          } catch (dlqErr) {
            logError('Failed to insert into dead_letters', { attemptId: r.id, error: dlqErr });
          }
        }

        processed.push({ id: r.id, ok });
      } catch (err) {
        logError('Retry error', { attemptId: r.id, error: err });
        processed.push({ id: r.id, ok: false, error: String(err) });
      }
    }

    return new Response(JSON.stringify({ processed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('retry-sms failed', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
