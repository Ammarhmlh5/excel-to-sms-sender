import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface RegisterDeviceRequest {
  device_id: string;
  push_token?: string;
  hardware_id?: string;
  device_name?: string;
  platform?: string;
  app_version?: string;
}

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

    let body: RegisterDeviceRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح - البيانات ليست JSON صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { device_id, push_token, hardware_id, device_name, platform, app_version } = body;

    if (!device_id || !device_id.trim()) {
      return new Response(
        JSON.stringify({ error: 'device_id مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (device_id.length > 255) {
      return new Response(
        JSON.stringify({ error: 'device_id طويل جداً' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (platform && !['android', 'ios'].includes(platform)) {
      return new Response(
        JSON.stringify({ error: 'platform يجب أن يكون android أو ios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limit to 10 devices per user
    const { count: deviceCount, error: countError } = await adminClient
      .from('device_push_tokens')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (!countError && deviceCount && deviceCount >= 10) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد الأقصى للأجهزة (10 أجهزة)' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sanitize = (v: string | undefined, max: number) =>
      v ? v.substring(0, max).trim() : v;

    const { data: existing, error: existingError } = await adminClient
      .from('device_push_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', device_id.trim())
      .maybeSingle();

    if (existingError) {
      return new Response(
        JSON.stringify({ error: 'خطأ في التحقق من الجهاز' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existing) {
      const updatePayload: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
        is_active: true,
      };
      if (push_token !== undefined) updatePayload.push_token = sanitize(push_token, 500);
      if (hardware_id !== undefined) updatePayload.hardware_id = sanitize(hardware_id, 255);
      if (device_name !== undefined) updatePayload.device_name = sanitize(device_name, 100);
      if (platform !== undefined) updatePayload.platform = platform;
      if (app_version !== undefined) updatePayload.app_version = sanitize(app_version, 50);

      const { error: updateError } = await adminClient
        .from('device_push_tokens')
        .update(updatePayload)
        .eq('id', existing.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'خطأ في تحديث الجهاز' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      const { error: insertError } = await adminClient
        .from('device_push_tokens')
        .insert({
          user_id: user.id,
          device_id: device_id.trim(),
          push_token: sanitize(push_token, 500),
          hardware_id: sanitize(hardware_id, 255),
          device_name: sanitize(device_name, 100),
          platform: platform ?? null,
          app_version: sanitize(app_version, 50),
          last_seen_at: new Date().toISOString(),
        });

      if (insertError) {
        return new Response(
          JSON.stringify({ error: 'خطأ في تسجيل الجهاز' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const platformName = platform === 'android' ? 'hudhud_android' : platform === 'ios' ? 'hudhud_ios' : 'mobile';
      const { error: linkError } = await adminClient.from('user_links').upsert({
        local_user_id: user.id,
        external_platform: platformName,
        external_user_id: device_id.trim(),
        external_email: null,
        linked_via: 'device_registration',
        is_verified: true,
      }, {
        onConflict: 'local_user_id, external_platform',
      });
      if (linkError) {
        console.error('Failed to create user_link:', linkError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        device_id: device_id.trim(),
        message: 'تم تسجيل الجهاز بنجاح',
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
