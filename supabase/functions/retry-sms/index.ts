import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح - الرجاء تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح - الرجاء تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body: { campaign_id?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.campaign_id) {
      return new Response(
        JSON.stringify({ error: 'معرف الحملة مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify campaign ownership
    const { data: campaign } = await adminClient
      .from('campaigns')
      .select('id')
      .eq('id', body.campaign_id)
      .eq('user_id', user.id)
      .single();

    if (!campaign) {
      return new Response(
        JSON.stringify({ error: 'الحملة غير موجودة أو لا تملك صلاحية الوصول' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key
    const { data: apiKeyData } = await supabase
      .from('api_keys')
      .select('id, api_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!apiKeyData || !apiKeyData.api_key) {
      return new Response(
        JSON.stringify({ error: 'مفتاح API غير موجود' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get failed messages for this campaign
    const { data: failedMessages, error: fetchError } = await adminClient
      .from('campaign_messages')
      .select('id, phone, message')
      .eq('campaign_id', body.campaign_id)
      .eq('status', 'failed');

    if (fetchError || !failedMessages || failedMessages.length === 0) {
      return new Response(
        JSON.stringify({
          error: failedMessages?.length === 0 ? 'لا توجد رسائل فاشلة لإعادة الإرسال' : 'خطأ في جلب الرسائل',
          retriedCount: 0,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const RATE_LIMITS = { MAX_MESSAGES_PER_REQUEST: 1000, MAX_MESSAGES_PER_HOUR: 5000, MAX_MESSAGES_PER_DAY: 10000 };

    if (failedMessages.length > RATE_LIMITS.MAX_MESSAGES_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `لا يمكن إعادة إرسال أكثر من ${RATE_LIMITS.MAX_MESSAGES_PER_REQUEST} رسالة في طلب واحد` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));

    const { data: rateResult, error: rateError } = await adminClient.rpc('check_rate_limit_and_increment', {
      p_user_id: user.id,
      p_window_start: hourStart.toISOString(),
      p_message_count: failedMessages.length,
      p_max_hourly: RATE_LIMITS.MAX_MESSAGES_PER_HOUR,
      p_max_daily: RATE_LIMITS.MAX_MESSAGES_PER_DAY,
    });

    if (rateError) {
      return new Response(
        JSON.stringify({ error: 'خطأ في التحقق من معدل الإرسال' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rateResult?.allowed) {
      const reason = rateResult?.reason === 'daily_limit'
        ? 'تم تجاوز الحد الأقصى للرسائل اليومية.'
        : 'تم تجاوز الحد الأقصى للرسائل في الساعة. حاول لاحقًا.';
      return new Response(
        JSON.stringify({ error: reason }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send via Hudhud API
    const payload = {
      api_key: apiKeyData.api_key,
      messages: failedMessages.map(m => ({ to: m.phone, message: m.message })),
    };

    const hudhudResponse = await fetch('https://www.hloov.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let hudhudResult: Record<string, unknown> = {};
    try {
      hudhudResult = await hudhudResponse.json();
    } catch {
      hudhudResult = { error: 'invalid_json', message: 'Provider returned non-JSON response' };
    }

    const bodySuccess = hudhudResult.success !== false && !hudhudResult.error;
    const sentSuccess = hudhudResponse.ok && bodySuccess;

    // Update message statuses AFTER API call
    const msgIds = failedMessages.map(m => m.id);

    if (sentSuccess) {
      await adminClient
        .from('campaign_messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .in('id', msgIds);

      // Update campaign counts
      const { data: allMessages } = await adminClient
        .from('campaign_messages')
        .select('status')
        .eq('campaign_id', body.campaign_id);

      if (allMessages) {
        const sentCount = allMessages.filter(m => m.status === 'sent').length;
        const failedCount = allMessages.filter(m => m.status === 'failed').length;
        const newStatus = failedCount === 0 ? 'completed' : 'partially_completed';

        await adminClient
          .from('campaigns')
          .update({
            status: newStatus,
            sent_count: sentCount,
            failed_count: failedCount,
          })
          .eq('id', body.campaign_id);
      }
    } else {
      await adminClient
        .from('campaign_messages')
        .update({ status: 'failed', error: (hudhudResult.message as string) || 'فشل الإرسال' })
        .in('id', msgIds);
    }

    // Log retry
    await adminClient.from('sms_logs').insert({
      user_id: user.id,
      api_key_id: apiKeyData.id,
      recipients_count: failedMessages.length,
      status: sentSuccess ? 'sent' : 'failed',
      response_data: hudhudResult,
      message_template: '[RETRY] ' + (failedMessages[0]?.message?.substring(0, 255) || ''),
    });

    return new Response(
      JSON.stringify({
        success: sentSuccess,
        message: sentSuccess
          ? `تم إعادة إرسال ${failedMessages.length} رسالة بنجاح`
          : 'فشل في إعادة الإرسال',
        retriedCount: failedMessages.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch {
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
