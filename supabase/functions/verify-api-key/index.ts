import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const RATE_LIMIT_MAX = 10;
const ipRateLimit = new Map<string, { count: number; windowStart: number }>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const hourStart = new Date(now);
  hourStart.setUTCMinutes(0, 0, 0);
  const windowMs = hourStart.getTime();

  const entry = ipRateLimit.get(ip);
  if (!entry || entry.windowStart !== windowMs) {
    ipRateLimit.set(ip, { count: 1, windowStart: windowMs });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

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
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (!checkIpRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد المسموح. حاول مرة أخرى لاحقاً' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let body: { api_key: string };
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح - البيانات ليست JSON صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { api_key } = body;

    if (!api_key || !api_key.trim()) {
      return new Response(
        JSON.stringify({ error: 'api_key مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: keyData, error: keyError } = await adminClient
      .from('api_keys')
      .select('id, user_id, key_name, is_active')
      .eq('api_key', api_key.trim())
      .maybeSingle();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ valid: false, error: 'مفتاح غير صالح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyData.is_active) {
      return new Response(
        JSON.stringify({ valid: false, error: 'المفتاح معطل' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', keyData.user_id)
      .maybeSingle();

    if (!profile) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(keyData.user_id);
      return new Response(
        JSON.stringify({
          valid: true,
          user: {
            id: keyData.user_id,
            email: authUser?.user?.email || null,
            name: null,
          },
          key: {
            id: keyData.id,
            name: keyData.key_name,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        valid: true,
        user: {
          id: keyData.user_id,
          email: profile?.email || null,
          name: profile?.full_name || null,
        },
        key: {
          id: keyData.id,
          name: keyData.key_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: 'خطأ داخلي في الخادم' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
