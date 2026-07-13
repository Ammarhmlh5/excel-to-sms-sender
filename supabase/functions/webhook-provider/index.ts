import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logError, logInfo } from "../_shared/log.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => null);
    if (!body) return new Response(JSON.stringify({ error: 'Bad request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Example: process hudhud webhook with structure { message_id, status, provider_ref }
    const provider = body.provider || 'unknown';
    if (provider === 'hudhud') {
      const entries = Array.isArray(body.events) ? body.events : [body];
      for (const ev of entries) {
        const providerRef = ev.provider_ref || ev.message_id || ev.id || null;
        const status = ev.status || ev.event || 'unknown';

        // Try to find existing delivery_attempt by provider_reference or idempotency_key
        let attemptId: string | null = null;
        if (providerRef) {
          const { data: match } = await adminClient
            .from('delivery_attempts')
            .select('id')
            .or(`provider_reference.eq.${providerRef},idempotency_key.eq.${providerRef}`)
            .limit(1)
            .maybeSingle();
          if (match && match.id) attemptId = match.id;
        }

        // Update attempt if found, otherwise try to update by provider_reference fallback
        if (attemptId) {
          await adminClient.from('delivery_attempts').update({ status: status, response_data: ev }).eq('id', attemptId).catch((e) => logError('Failed updating delivery_attempts', { e }));
        } else if (providerRef) {
          await adminClient.from('delivery_attempts').update({ status: status, response_data: ev }).eq('provider_reference', providerRef).catch((e) => logError('Failed updating delivery_attempts by provider_reference', { e }));
        }

        await adminClient.from('delivery_events').insert({ delivery_attempt_id: attemptId, event_type: status, event_data: ev }).catch((e) => logError('Failed inserting delivery_event', { e }));
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Webhook handler error', err);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }
});
