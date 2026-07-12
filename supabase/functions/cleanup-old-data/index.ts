import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify cron secret or service role
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronRequest) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Record<string, number> = {};

    // Count BEFORE deleting so we get accurate numbers
    const now = Date.now();
    const rateCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const campCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    const smsCutoff = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    const deviceCutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Pre-count: rate_limits
    const { count: rateCount } = await adminClient
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .lt('window_start', rateCutoff);
    results.rate_limits = rateCount ?? 0;

    // Pre-count: campaigns
    const { count: campCount } = await adminClient
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', campCutoff);
    results.campaigns = campCount ?? 0;

    // Pre-count: sms_logs
    const { count: smsCount } = await adminClient
      .from('sms_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', smsCutoff);
    results.sms_logs = smsCount ?? 0;

    // 1. Delete rate_limits older than 7 days
    const { error: rateError } = await adminClient
      .from('rate_limits')
      .delete()
      .lt('window_start', rateCutoff);
    if (rateError) console.error('rate_limits cleanup:', rateError.message);

    // 2. Delete campaigns older than 30 days (messages deleted CASCADE)
    const { error: campError } = await adminClient
      .from('campaigns')
      .delete()
      .lt('created_at', campCutoff);
    if (campError) console.error('campaigns cleanup:', campError.message);

    // 3. Delete sms_logs older than 90 days
    const { error: smsError } = await adminClient
      .from('sms_logs')
      .delete()
      .lt('created_at', smsCutoff);
    if (smsError) console.error('sms_logs cleanup:', smsError.message);

    // 4. Deactivate devices not seen for 30 days
    const { error: deviceError } = await adminClient
      .from('device_push_tokens')
      .update({ is_active: false })
      .lt('last_seen_at', deviceCutoff)
      .eq('is_active', true);
    if (deviceError) console.error('device_push_tokens cleanup:', deviceError.message);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'تم التنظيف بنجاح',
        cleaned: results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('Unexpected error in cleanup function:', e);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
