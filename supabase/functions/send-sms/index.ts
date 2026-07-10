import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface SMSMessage {
  to: string;
  message: string;
}

interface RequestBody {
  messages: SMSMessage[];
  campaign_id?: string;
  device_id?: string;
  campaign_name?: string;
}

const RATE_LIMITS = {
  MAX_MESSAGES_PER_REQUEST: 1000,
  MAX_MESSAGES_PER_HOUR: 5000,
  MAX_MESSAGES_PER_DAY: 10000,
  MAX_MESSAGE_LENGTH: 1530,
};

function validateMessage(message: string): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }
  // eslint-disable-next-line no-control-regex
  const cleaned = message.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '');
  const trimmed = cleaned.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (trimmed.length > RATE_LIMITS.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message too long (max ${RATE_LIMITS.MAX_MESSAGE_LENGTH} chars)` };
  }
  return { valid: true, sanitized: trimmed };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client with user auth
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
    // Admin client for writing rate limit rows (bypasses RLS write restrictions)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed');
      return new Response(
        JSON.stringify({ error: 'غير مصرح - الرجاء تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's API key from database
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, api_key')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (apiKeyError) {
      console.error('Failed to retrieve API key');
      return new Response(
        JSON.stringify({ error: 'خطأ في جلب مفتاح API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKeyData || !apiKeyData.api_key) {
      return new Response(
        JSON.stringify({ error: 'مفتاح API غير موجود - الرجاء إضافة مفتاح API في الإعدادات' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح - البيانات ليست JSON صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'لا توجد رسائل للإرسال' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Per-request cap
    if (messages.length > RATE_LIMITS.MAX_MESSAGES_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `لا يمكن إرسال أكثر من ${RATE_LIMITS.MAX_MESSAGES_PER_REQUEST} رسالة في طلب واحد` }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone numbers
    const validMessages: SMSMessage[] = [];
    const invalidNumbers: string[] = [];

    for (const msg of messages) {
      const phone = msg.to?.trim();
      if (!phone) {
        invalidNumbers.push('empty');
        continue;
      }
      
      // Clean phone number - remove spaces and special chars except +
      const cleanPhone = phone.replace(/[\s\-()]/g, '');
      
      // Must start with + or digit, only contain digits after cleaning
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      if (digitsOnly.length === 0) {
        invalidNumbers.push(phone);
        continue;
      }
      
      // Basic validation - at least 9 digits, at most 15 digits
      if (digitsOnly.length < 9 || digitsOnly.length > 15) {
        invalidNumbers.push(phone);
        continue;
      }

      // Validate & sanitize message content
      const msgValidation = validateMessage(msg.message || '');
      if (!msgValidation.valid) {
        invalidNumbers.push(phone);
        continue;
      }

      validMessages.push({
        to: cleanPhone,
        message: msgValidation.sanitized!,
      });
    }

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'لا توجد أرقام هواتف صالحة',
          invalidNumbers 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atomic rate limit check (uses PostgreSQL function to prevent race conditions)
    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));

    const { data: rateResult, error: rateError } = await adminClient.rpc('check_rate_limit_and_increment', {
      p_user_id: user.id,
      p_window_start: hourStart.toISOString(),
      p_message_count: validMessages.length,
      p_max_hourly: RATE_LIMITS.MAX_MESSAGES_PER_HOUR,
      p_max_daily: RATE_LIMITS.MAX_MESSAGES_PER_DAY,
    });

    if (rateError) {
      console.error('Rate limit check failed:', rateError.message);
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

    // Create campaign if not provided
    let activeCampaignId = body.campaign_id;
    if (activeCampaignId) {
      const { data: ownership } = await adminClient
        .from('campaigns')
        .select('id')
        .eq('id', activeCampaignId)
        .eq('user_id', user.id)
        .single();

      if (!ownership) {
        return new Response(
          JSON.stringify({ error: 'الحملة غير موجودة أو لا تملك صلاحية الوصول' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      const { data: newCampaign, error: campError } = await adminClient
        .from('campaigns')
        .insert({
          user_id: user.id,
          name: body.campaign_name || `حملة ${validMessages.length} رسالة`,
          status: 'sending',
          contacts_count: validMessages.length,
          source: body.device_id ? 'mobile' : 'excel_upload',
          device_id: body.device_id || null,
        })
        .select('id')
        .single();

      if (campError || !newCampaign) {
        return new Response(
          JSON.stringify({ error: 'فشل إنشاء الحملة' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      activeCampaignId = newCampaign.id;
    }

    // Insert campaign messages (only if we have a valid campaign_id)
    const campaignMessages = validMessages.map(msg => ({
      campaign_id: activeCampaignId!,
      phone: msg.to,
      message: msg.message,
      status: 'pending',
    }));

    const { error: insertMsgsError } = await adminClient
      .from('campaign_messages')
      .insert(campaignMessages);

    if (insertMsgsError) {
      console.error('Failed to insert campaign messages');
    }

    // Call Hudhud API server-side
    const payload = {
      api_key: apiKeyData.api_key,
      messages: validMessages
    };

    const hudhudResponse = await fetch('https://www.hloov.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    let hudhudResult: Record<string, unknown> = {};
    try {
      hudhudResult = await hudhudResponse.json();
    } catch {
      hudhudResult = { error: 'invalid_json', message: 'Provider returned non-JSON response' };
    }

    // Determine actual success: HTTP 2xx AND body success flag
    const bodySuccess = hudhudResult.success !== false && !hudhudResult.error;
    const sentSuccess = hudhudResponse.ok && bodySuccess;

    // Log to database
    await adminClient.from('sms_logs').insert({
      user_id: user.id,
      api_key_id: apiKeyData.id,
      recipients_count: validMessages.length,
      status: sentSuccess ? 'sent' : 'failed',
      response_data: hudhudResult,
      message_template: validMessages[0]?.message?.substring(0, 255) || null
    });

    // Update campaign status
    if (activeCampaignId) {
      await adminClient
        .from('campaigns')
        .update({
          status: sentSuccess ? 'completed' : 'failed',
          sent_count: sentSuccess ? validMessages.length : 0,
          failed_count: sentSuccess ? 0 : validMessages.length,
        })
        .eq('id', activeCampaignId);

      const msgUpdate = sentSuccess
        ? { status: 'sent', sent_at: new Date().toISOString() }
        : { status: 'failed', error: (hudhudResult.message as string) || 'فشل الإرسال' };

      await adminClient
        .from('campaign_messages')
        .update(msgUpdate)
        .eq('campaign_id', activeCampaignId)
        .eq('status', 'pending');
    }

    // Send push notification to mobile devices on success
    if (sentSuccess && activeCampaignId) {
      try {
        const { data: devices } = await adminClient
          .from('device_push_tokens')
          .select('push_token, device_name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .not('push_token', 'is', null);

        if (devices && devices.length > 0) {
          const pushMessages = devices.map(device => ({
            to: device.push_token,
            title: 'مرسال الهدهد',
            body: `تم إرسال ${validMessages.length} رسالة بنجاح`,
            data: {
              campaign_id: activeCampaignId,
              type: 'campaign_completed',
              sent_count: validMessages.length,
            },
          }));

          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pushMessages),
          });
        }
      } catch {
        console.error('Failed to send push notification');
      }
    }

    if (!sentSuccess) {
      return new Response(
        JSON.stringify({ 
          error: (hudhudResult.message as string) || 'فشل في إرسال الرسائل',
          campaign_id: activeCampaignId,
        }),
        { status: hudhudResponse.ok ? 400 : hudhudResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم إرسال ${validMessages.length} رسالة بنجاح`,
        sentCount: validMessages.length,
        skippedCount: invalidNumbers.length,
        invalidNumbers: invalidNumbers.length > 0 ? invalidNumbers : undefined,
        campaign_id: activeCampaignId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch {
    console.error('Unexpected error in send-sms function');
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
