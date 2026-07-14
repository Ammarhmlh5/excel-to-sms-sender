import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin") || undefined);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "غير مصرح" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleData } = await adminClient.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
    const isAdmin = roleData?.role === "admin";

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const body = req.method === "POST" || req.method === "PUT" ? await req.json().catch(() => ({})) : {};

    if (action === "list") {
      const { data, error } = await adminClient
        .from("allowed_company_domains")
        .select("id, domain, company_name, is_active, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ items: data || [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "لا يوجد صلاحية" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "create") {
      if (!body.domain || typeof body.domain !== "string") {
        return new Response(JSON.stringify({ error: "يرجى إدخال مسار صحيح" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const normalizedDomain = body.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      const { data, error } = await adminClient
        .from("allowed_company_domains")
        .insert({ domain: normalizedDomain, company_name: body.company_name?.trim() || null, is_active: body.is_active !== false })
        .select("id, domain, company_name, is_active, created_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ item: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "update") {
      const id = body.id;
      const { error } = await adminClient.from("allowed_company_domains").update({
        domain: body.domain?.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, ""),
        company_name: body.company_name?.trim() || null,
        is_active: body.is_active,
      }).eq("id", id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const id = body.id;
      const { error } = await adminClient.from("allowed_company_domains").delete().eq("id", id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "إجراء غير معروف" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
