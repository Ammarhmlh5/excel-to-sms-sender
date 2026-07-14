import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendToHudhud } from "../_shared/providers/hudhud.ts";
import { getHudhudConfigFromEnv } from "../_shared/config/hudhud.ts";
import { extractProviderReference } from "../_shared/providers/reference-utils.js";
import { logError } from "../_shared/log.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData } = await adminClient
      .from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'ممنوع - للمسؤولين فقط' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Retry policy
    const MAX_ATTEMPTS = 4;
    const BACKOFF_MS = [0, 30_000, 5 * 60_000, 30 * 60_000]; // index by current attempts

    // Find candidate attempts: status = 'failed' and attempts < MAX_ATTEMPTS and elapsed >= backoff
    const nowIso = new Date().toISOString();

    const { data: candidates, error } = await adminClient
      .rpc('get_retryable_delivery_attempts', { p_max_attempts: MAX_ATTEMPTS });

    // Fallback if RPC not present: simple query limited
    let rows = candidates as Array<Record<string, unknown>> | null;
    if (error || !rows) {
      const { data: qrows } = await adminClient
        .from('delivery_attempts')
        .select('id, attempts, idempotency_key, provider_reference, campaign_message_id, updated_at, campaign_messages(id, phone, message)')
        .eq('status', 'failed')
        .limit(200);
      rows = (qrows || []).map((r: Record<string, unknown>) => ({
        id: r.id,
        attempts: r.attempts,
        idempotency_key: r.idempotency_key,
        provider_reference: r.provider_reference,
        campaign_message_id: r.campaign_message_id,
        phone: (r.campaign_messages as { phone?: string } | null | undefined)?.phone,
        message: (r.campaign_messages as { message?: string } | null | undefined)?.message,
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

        // Lookup campaign_message for retry payload data.
        const { data: cm } = await adminClient.from('campaign_messages').select('id, message, phone').eq('id', r.campaign_message_id).maybeSingle();
        if (!cm) {
          logError('Missing campaign_message for attempt', { attemptId: r.id });
          continue;
        }

        // Prepare message
        const payload = [{ to: cm.phone, message: cm.message }];

        // Mark as sending
        await adminClient.from('delivery_attempts').update({ status: 'sending' }).eq('id', r.id);

        const hudhudConfig = await getHudhudConfigFromEnv();
        const providerApiKey = hudhudConfig.apiKey;
        const providerSenderId = hudhudConfig.senderId;
        const providerBaseUrl = hudhudConfig.baseUrl;

        if (!providerApiKey) {
          logError('Missing Hudhud provider key for retry', { campaign_message_id: cm.id });
          await adminClient.from('delivery_attempts').update({
            attempts: attempts + 1,
            status: 'failed',
            error_message: 'missing_provider_api_key',
            updated_at: new Date().toISOString(),
          }).eq('id', r.id);
          await adminClient.from('delivery_events').insert({
            delivery_attempt_id: r.id,
            event_type: 'no_provider_api_key',
            event_data: {},
          }).catch(() => {});
          processed.push({ id: r.id, ok: false, error: 'missing_provider_api_key' });
          continue;
        }

        // Send via Hudhud
        const res = await sendToHudhud({
          apiKey: providerApiKey,
          messages: payload,
          senderId: providerSenderId,
          baseUrl: providerBaseUrl,
        });
        const body = res.body || {};
        const ok = res.response.ok && !((body as Record<string, unknown>).error);

        const responseStatus = String((body as Record<string, unknown>).status ?? '').toLowerCase();
        const responseMessage = String((body as Record<string, unknown>).message ?? '').toLowerCase();
        const isDelivered = ok && (
          responseStatus === 'delivered' ||
          (body as Record<string, unknown>).success === true ||
          responseStatus.includes('delivered') ||
          responseMessage.includes('delivered')
        );
        const isQueued = ok && !isDelivered && (
          responseStatus.includes('queued') ||
          responseStatus.includes('accepted') ||
          responseMessage.includes('queued') ||
          responseMessage.includes('accepted')
        );

        // Update attempt
        const providerReference = extractProviderReference(body) || String(body?.request_id || body?.messageId || body?.id || '');
        const newAttempts = attempts + 1;
        const newStatus = isDelivered ? 'sent' : isQueued ? 'queued' : 'failed';
        await adminClient.from('delivery_attempts').update({
          attempts: newAttempts,
          status: newStatus,
          response_data: body,
          error_message: isDelivered || isQueued ? null : ((body as Record<string, unknown>).message as string | undefined) || 'provider_error',
          ...(providerReference ? { provider_reference: providerReference } : {}),
          updated_at: new Date().toISOString(),
        }).eq('id', r.id);

        // Insert event
        await adminClient.from('delivery_events').insert({
          delivery_attempt_id: r.id,
          event_type: isDelivered ? 'sent' : isQueued ? 'queued' : (newAttempts >= MAX_ATTEMPTS ? 'failed_final' : 'retry_failed'),
          event_data: body,
        });

        // If this attempt exhausted retries and is not queued/accepted, move to dead letters
        if (!isDelivered && !isQueued && newAttempts >= MAX_ATTEMPTS) {
          try {
            await adminClient.from('dead_letters').insert({
              campaign_message_id: cm.id,
              delivery_attempt_id: r.id,
              provider: 'hudhud',
              channel: 'sms',
              error_message: ((body as Record<string, unknown>).message as string | undefined) || 'provider_error',
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
