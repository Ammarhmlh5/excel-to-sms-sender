import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSMessage {
  to: string;
  message: string;
}

interface RequestBody {
  messages: SMSMessage[];
}

// Rate limiting configuration
const RATE_LIMITS = {
  MAX_MESSAGES_PER_REQUEST: 1000,
  MAX_MESSAGES_PER_HOUR: 5000,
  MAX_MESSAGES_PER_DAY: 10000,
  MAX_MESSAGE_LENGTH: 1530, // ~10 concatenated SMS
};

function validateMessage(message: string): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof message !== 'string') {
    return { valid: false, error: 'Message must be a string' };
  }
  // Remove null bytes and control chars (keep newline/tab)
  const cleaned = message.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
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
  // Handle CORS preflight requests
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
    const body: RequestBody = await req.json();
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
    const phoneRegex = /^[\d+\-\s()]+$/;
    const validMessages: SMSMessage[] = [];
    const invalidNumbers: string[] = [];

    for (const msg of messages) {
      const phone = msg.to?.trim();
      if (!phone || !phoneRegex.test(phone)) {
        invalidNumbers.push(phone || 'empty');
        continue;
      }
      
      // Clean phone number - remove spaces and special chars except +
      const cleanPhone = phone.replace(/[\s\-()]/g, '');
      
      // Basic validation - at least 9 digits
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      if (digitsOnly.length < 9) {
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

    // Rate limit checks (hourly + daily) using rate_limits table
    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

    const { data: hourRows } = await adminClient
      .from('rate_limits')
      .select('messages_sent')
      .eq('user_id', user.id)
      .gte('window_start', hourStart.toISOString());
    const hourlySent = (hourRows || []).reduce((s: number, r: any) => s + (r.messages_sent || 0), 0);
    if (hourlySent + validMessages.length > RATE_LIMITS.MAX_MESSAGES_PER_HOUR) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد الأقصى للرسائل في الساعة. حاول لاحقًا.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: dayRows } = await adminClient
      .from('rate_limits')
      .select('messages_sent')
      .eq('user_id', user.id)
      .gte('window_start', dayStart.toISOString());
    const dailySent = (dayRows || []).reduce((s: number, r: any) => s + (r.messages_sent || 0), 0);
    if (dailySent + validMessages.length > RATE_LIMITS.MAX_MESSAGES_PER_DAY) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد الأقصى للرسائل اليومية.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    const contentType = hudhudResponse.headers.get('content-type') || '';
    const responseText = await hudhudResponse.text();
    
    console.log('Hudhud API response status:', hudhudResponse.status);

    let hudhudResult;
    if (contentType.includes('application/json') && responseText.trim().startsWith('{')) {
      try {
        hudhudResult = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse provider response');
        hudhudResult = { error: 'Invalid JSON response' };
      }
    } else {
      console.error('Provider returned non-JSON response');
      return new Response(
        JSON.stringify({ 
          error: 'خطأ في الاتصال بخادم الرسائل - الرجاء التحقق من مفتاح API أو المحاولة لاحقاً',
          details: `Server returned status ${hudhudResponse.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log to database
    const status = hudhudResponse.ok ? 'sent' : 'failed';
    await supabase.from('sms_logs').insert({
      user_id: user.id,
      api_key_id: apiKeyData.id,
      recipients_count: validMessages.length,
      status,
      response_data: hudhudResult,
      message_template: validMessages[0]?.message?.substring(0, 255) || null
    });

    // Record rate-limit usage (bucketed per hour)
    if (status === 'sent') {
      await adminClient
        .from('rate_limits')
        .upsert(
          {
            user_id: user.id,
            window_start: hourStart.toISOString(),
            messages_sent: hourlySent + validMessages.length - (hourlySent || 0), // increment via re-upsert below
            requests_made: 1,
          },
          { onConflict: 'user_id,window_start' }
        );
      // Increment atomically using RPC-like update
      await adminClient.rpc('noop').catch(() => {});
      await adminClient
        .from('rate_limits')
        .update({
          messages_sent: hourlySent + validMessages.length,
        })
        .eq('user_id', user.id)
        .eq('window_start', hourStart.toISOString());
    }

    if (!hudhudResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: hudhudResult.message || 'فشل في إرسال الرسائل',
          details: hudhudResult
        }),
        { status: hudhudResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم إرسال ${validMessages.length} رسالة بنجاح`,
        sentCount: validMessages.length,
        skippedCount: invalidNumbers.length,
        invalidNumbers: invalidNumbers.length > 0 ? invalidNumbers : undefined,
        response: hudhudResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in send-sms function');
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
