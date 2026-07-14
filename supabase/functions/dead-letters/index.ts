import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logError } from "../_shared/log.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roleData } = await adminClient.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (req.method === 'GET') {
      const url = new URL(req.url);
      const limit = Math.min(Number(url.searchParams.get('limit') || '100'), 1000);
      const offset = Math.max(Number(url.searchParams.get('offset') || '0'), 0);

      const { data, error } = await adminClient
        .from('dead_letters')
        .select('id, campaign_message_id, delivery_attempt_id, provider, channel, error_message, response_data, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logError('Failed to fetch dead letters', { error });
        return new Response(JSON.stringify({ error: 'failed_fetch' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);

      if (body && body.action === 'list') {
        const page = Math.max(Number(body.page || 1), 1);
        const limit = Math.min(Number(body.limit || 25), 1000);
        const offset = (page - 1) * limit;

        const { data, error } = await adminClient
          .from('dead_letters')
          .select('id, campaign_message_id, delivery_attempt_id, provider, channel, error_message, response_data, created_at')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          logError('Failed to fetch dead letters (post)', { error });
          return new Response(JSON.stringify({ error: 'failed_fetch' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (body && body.action === 'requeue' && body.id) {
        const { data: dl, error: dlErr } = await adminClient.from('dead_letters').select('*').eq('id', body.id).maybeSingle();
        if (dlErr || !dl) {
          return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const idempotencyKey = crypto.randomUUID();
        const attemptRow = {
          campaign_message_id: dl.campaign_message_id,
          provider: dl.provider || 'unknown',
          channel: dl.channel || 'sms',
          status: 'queued',
          attempts: 0,
          provider_reference: idempotencyKey,
          idempotency_key: idempotencyKey,
        };

        const { data: inserted, error: insErr } = await adminClient.from('delivery_attempts').insert(attemptRow).select('id').maybeSingle();
        if (insErr || !inserted) {
          logError('Failed to insert requeue attempt', { insErr });
          return new Response(JSON.stringify({ error: 'failed_insert' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        await adminClient.from('campaign_messages').update({ status: 'pending', error: null }).eq('id', dl.campaign_message_id);
        await adminClient.from('delivery_events').insert({ delivery_attempt_id: inserted.id, event_type: 'requeued', event_data: { from_dead_letter: dl.id } }).catch(() => {});
        await adminClient.from('dead_letters').delete().eq('id', dl.id);

        return new Response(JSON.stringify({ ok: true, attempt_id: inserted.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('dead-letters function error', err);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
