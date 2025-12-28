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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase client with user auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'غير مصرح - الرجاء تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'غير مصرح - الرجاء تسجيل الدخول' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.id);

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
      console.error('API key fetch error:', apiKeyError);
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

      validMessages.push({
        to: cleanPhone,
        message: msg.message || ''
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

    console.log(`Sending ${validMessages.length} messages, ${invalidNumbers.length} invalid numbers skipped`);

    // Call Hudhud API server-side
    const payload = {
      api_key: apiKeyData.api_key,
      messages: validMessages
    };

    const hudhudResponse = await fetch('https://www.hloov.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const hudhudResult = await hudhudResponse.json();

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

    console.log('SMS log saved, status:', status);

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
    console.error('Error in send-sms function:', error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
