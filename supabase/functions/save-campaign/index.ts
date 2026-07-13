import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface CampaignMessageInput {
  phone?: string;
  to?: string;
  message: string;
  name?: string;
}

interface RequestBody {
  messages: CampaignMessageInput[];
  campaign_name?: string;
  device_id?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin") || undefined);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "غير مصرح - الرجاء تسجيل الدخول" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "غير مصرح - الرجاء تسجيل الدخول" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "طلب غير صالح - البيانات ليست JSON صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
    if (incomingMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "لا توجد رسائل للحفظ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validMessages = incomingMessages
      .map((msg) => {
        const phone = String(msg.phone || msg.to || "").trim();
        const message = String(msg.message || "").trim();
        if (!phone || !message) return null;
        return {
          phone,
          message,
          name: typeof msg.name === "string" ? msg.name.trim().substring(0, 255) : null,
        };
      })
      .filter((msg): msg is { phone: string; message: string; name: string | null } => Boolean(msg));

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "لا توجد رسائل صالحة للحفظ" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaignName = body.campaign_name || `حملة ${validMessages.length} رسالة`;

    const { data: newCampaign, error: campError } = await adminClient
      .from("campaigns")
      .insert({
        user_id: user.id,
        name: campaignName,
        status: "queued",
        contacts_count: validMessages.length,
        source: body.device_id ? "mobile" : "excel_upload",
        device_id: body.device_id || null,
      })
      .select("id")
      .single();

    if (campError || !newCampaign) {
      console.error('Campaign insert error:', JSON.stringify(campError));
      return new Response(
        JSON.stringify({ error: "فشل إنشاء الحملة في قاعدة البيانات", details: campError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaignMessages = validMessages.map((msg) => ({
      campaign_id: newCampaign.id,
      phone: msg.phone,
      name: msg.name,
      message: msg.message,
      status: "pending" as const,
    }));

    const { error: insertMsgsError } = await adminClient
      .from("campaign_messages")
      .insert(campaignMessages);

    if (insertMsgsError) {
      console.error('Messages insert error:', JSON.stringify(insertMsgsError));
      return new Response(
        JSON.stringify({ error: "فشل حفظ الرسائل في قاعدة البيانات", details: insertMsgsError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaign_id: newCampaign.id,
        savedCount: validMessages.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error('Unexpected error:', JSON.stringify(err));
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع أثناء حفظ الحملة" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
