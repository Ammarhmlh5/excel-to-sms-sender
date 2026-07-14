import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { extractProviderReference } from "../_shared/providers/reference-utils.js";
import { normalizeCampaignMessageStatus, normalizeDeliveryAttemptStatus } from "../_shared/providers/status-utils.ts";
import { extractCampaignMessageId } from "../_shared/providers/webhook-utils.ts";
import { logError } from "../_shared/log.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const rawBody = await req.text();
    let body: Record<string, unknown> | null = null;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        body = { raw: rawBody };
      }
    }
    if (!body) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Process Hudhud webhooks and update delivery state in the database.
    const provider = (body.provider as string) || 'unknown';
    if (provider === 'hudhud') {
      const entries = Array.isArray(body.events) ? body.events as Array<Record<string, unknown>> : [body as Record<string, unknown>];
      for (const ev of entries) {
        const providerRef = extractProviderReference(body, ev);
        const campaignMessageId = extractCampaignMessageId(body, ev);
        const status = (ev.status as string | undefined) || (ev.event as string | undefined) || 'unknown';
        const normalizedStatus = String(status).toLowerCase();
        const deliveryStatus = normalizeDeliveryAttemptStatus(normalizedStatus);
        const campaignStatus = normalizeCampaignMessageStatus(normalizedStatus);

        let attemptId: string | null = null;
        let match: { id: string; campaign_message_id: string | null } | null = null;
        if (providerRef) {
          const { data } = await adminClient
            .from('delivery_attempts')
            .select('id, campaign_message_id, campaign_messages(campaign_id)')
            .or(`provider_reference.eq.${providerRef},idempotency_key.eq.${providerRef}`)
            .limit(1)
            .maybeSingle();
          match = data as { id: string; campaign_message_id: string | null; campaign_messages?: { campaign_id?: string } } | null;
          if (match?.id) attemptId = match.id;
        }

        if (!attemptId && campaignMessageId) {
          const insertPayload: Record<string, unknown> = {
            campaign_message_id: campaignMessageId,
            provider: 'hudhud',
            channel: 'sms',
            status: deliveryStatus,
            attempts: 1,
            response_data: ev,
            error_message: deliveryStatus === 'failed' ? String((ev.message as string | undefined) || (ev.error as string | undefined) || 'provider_event') : null,
          };
          if (providerRef) {
            insertPayload.provider_reference = providerRef;
          }
          const { data: insertedAttempt, error: insertAttemptError } = await adminClient
            .from('delivery_attempts')
            .insert(insertPayload)
            .select('id, campaign_message_id, campaign_messages(campaign_id)')
            .single();
          if (!insertAttemptError && insertedAttempt?.id) {
            attemptId = insertedAttempt.id;
            match = insertedAttempt as { id: string; campaign_message_id: string | null; campaign_messages?: { campaign_id?: string } };
          }
        }

        const eventPayload = {
          status: deliveryStatus,
          response_data: ev,
          error_message: deliveryStatus === 'failed' ? String((ev.message as string | undefined) || (ev.error as string | undefined) || 'provider_event') : null,
        };

        let campaignId: string | null = null;
        if (match?.campaign_messages?.campaign_id) {
          campaignId = match.campaign_messages.campaign_id;
        }

        if (attemptId) {
          try {
            await adminClient.from('delivery_attempts').update(eventPayload).eq('id', attemptId);
          } catch (e) {
            logError('Failed updating delivery_attempts', { e });
          }
          if (match?.campaign_message_id) {
            try {
              await adminClient.from('campaign_messages').update({ status: campaignStatus, error: deliveryStatus === 'failed' ? String((ev.message as string | undefined) || (ev.error as string | undefined) || 'provider_event') : null }).eq('id', match.campaign_message_id);
            } catch (e) {
              logError('Failed updating campaign_message', { e });
            }
          }
        } else if (providerRef) {
          try {
            await adminClient.from('delivery_attempts').update(eventPayload).eq('provider_reference', providerRef);
          } catch (e) {
            logError('Failed updating delivery_attempts by provider_reference', { e });
          }
        } else if (campaignMessageId) {
          try {
            await adminClient.from('delivery_attempts').update(eventPayload).eq('campaign_message_id', campaignMessageId);
          } catch (e) {
            logError('Failed updating delivery_attempts by campaign_message_id', { e });
          }
        }

        if (attemptId) {
          try {
            await adminClient.from('delivery_events').insert({ delivery_attempt_id: attemptId, event_type: normalizedStatus, event_data: ev });
          } catch (e) {
            logError('Failed inserting delivery_event', { e });
          }
        }

        if (campaignStatus !== 'pending' && campaignId) {
          try {
            const { data: messages, error: messagesError } = await adminClient
              .from('campaign_messages')
              .select('status')
              .eq('campaign_id', campaignId);
            if (!messagesError && messages) {
              const counts = messages.reduce((acc: { sent: number; failed: number; pending: number; skipped: number }, row: { status?: string }) => {
                const statusValue = String(row.status || 'pending');
                if (statusValue === 'sent') acc.sent += 1;
                if (statusValue === 'failed') acc.failed += 1;
                if (statusValue === 'pending') acc.pending += 1;
                if (statusValue === 'skipped') acc.skipped += 1;
                return acc;
              }, { sent: 0, failed: 0, pending: 0, skipped: 0 });

              const allDone = counts.pending === 0;
              const campaignUpdate: Record<string, unknown> = {
                sent_count: counts.sent,
                failed_count: counts.failed,
              };

              if (allDone) {
                campaignUpdate.status = counts.sent > 0 && counts.failed === 0 ? 'completed'
                  : counts.failed > 0 && counts.sent === 0 ? 'failed'
                  : 'partially_completed';
              }

              try {
                await adminClient.from('campaigns').update(campaignUpdate).eq('id', campaignId);
              } catch (e) {
                logError('Failed updating campaign status/counts', { e, campaignId });
              }
            }
          } catch (e) {
            logError('Failed aggregating campaign counts', { e, campaignId });
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Webhook handler error', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});
