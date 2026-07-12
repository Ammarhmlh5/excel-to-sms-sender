import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify, errors } from "https://esm.sh/jose@5.2.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface AllowedJwks {
  jwksUri: string;
  issuer: string;
}

const ALLOWED_JWKS_URLS: Record<string, AllowedJwks> = {
  hudhud: {
    jwksUri: 'https://api.hudhud.com/.well-known/jwks.json',
    issuer: 'https://api.hudhud.com',
  },
};

const RATE_LIMIT_MAX = 10;

// JWKS cache to avoid fetching keys on every request
const jwksCache = new Map<string, { keySet: ReturnType<typeof createRemoteJWKSet>; fetchedAt: number }>();
const JWKS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedJWKS(jwksUri: string): ReturnType<typeof createRemoteJWKSet> {
  const cached = jwksCache.get(jwksUri);
  if (cached && Date.now() - cached.fetchedAt < JWKS_CACHE_TTL) {
    return cached.keySet;
  }
  const keySet = createRemoteJWKSet(new URL(jwksUri));
  jwksCache.set(jwksUri, { keySet, fetchedAt: Date.now() });
  return keySet;
}

interface VerifyRequest {
  token: string;
  platform?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    // Database-based rate limiting (works across multiple Edge Function instances)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: rateResult } = await adminClient.rpc('check_rate_limit_and_increment', {
      p_user_id: clientIp,
      p_limit_hourly: RATE_LIMIT_MAX,
      p_limit_daily: RATE_LIMIT_MAX * 24,
      p_messages_to_add: 1
    });

    if (!rateResult) {
      return new Response(
        JSON.stringify({ error: 'تم تجاوز الحد المسموح. حاول مرة أخرى لاحقاً' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body: VerifyRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح - البيانات ليست JSON صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { token, platform } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowed = platform && ALLOWED_JWKS_URLS[platform];
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'منصة غير معروفة. حدد platform صحيح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const JWKS = getCachedJWKS(allowed.jwksUri);

    let payload: { sub?: string; email?: string; device_id?: string; [key: string]: unknown };
    try {
      const result = await jwtVerify(token, JWKS, {
        algorithms: ['RS256'],
        issuer: allowed.issuer,
      });
      payload = result.payload as typeof payload;
    } catch (err) {
      if (err instanceof errors.JWTExpired) {
        return new Response(
          JSON.stringify({ error: 'انتهت صلاحية الرابط' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'التوقيع غير صالح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If user is authenticated, link accounts
    const authHeader = req.headers.get('Authorization');
    let linked = false;
    if (authHeader) {
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (user && payload.sub) {
        const { error: linkError } = await adminClient.from('user_links').upsert({
          local_user_id: user.id,
          external_platform: platform || 'external',
          external_user_id: payload.sub,
          external_email: payload.email || null,
          linked_via: 'redirect',
          is_verified: true,
        }, {
          onConflict: 'local_user_id, external_platform',
        });
        if (!linkError) {
          linked = true;
        } else {
          console.error('Failed to link accounts:', linkError.message);
        }
      }
    }

    return new Response(
      JSON.stringify({
        verified: true,
        linked,
        sub: payload.sub,
        email: payload.email || null,
        device_id: payload.device_id || null,
        platform: platform || 'external',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('verify-jwks error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
