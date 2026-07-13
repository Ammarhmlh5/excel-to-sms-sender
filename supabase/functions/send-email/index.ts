import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

interface EmailMessage {
  phone: string;
  message: string;
  name?: string;
}

interface RequestBody {
  messages: EmailMessage[];
  campaign_name?: string;
  campaign_id?: string;
}

const RATE_LIMITS = {
  MAX_MESSAGES_PER_REQUEST: 1000,
  MAX_EMAIL_LENGTH: 1530,
};

function sanitize(text: string, maxLen: number): string {
  // eslint-disable-next-line no-control-regex
  const cleaned = text.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, "");
  return cleaned.trim().substring(0, maxLen);
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "خدمة البريد الإلكتروني غير مُعدّة — الرجاء إضافة RESEND_API_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (!user.email) {
      return new Response(
        JSON.stringify({ error: "لا يوجد بريد إلكتروني مرتبط بالحساب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "طلب غير صالح - البيانات ليست JSON صحيح" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages, campaign_name } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "لا توجد رسائل للإرسال" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messages.length > RATE_LIMITS.MAX_MESSAGES_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `لا يمكن إرسال أكثر من ${RATE_LIMITS.MAX_MESSAGES_PER_REQUEST} رسالة في طلب واحد` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate messages
    const validMessages: EmailMessage[] = [];
    let invalidCount = 0;

    for (const msg of messages) {
      const phone = msg.phone?.trim();
      if (!phone) { invalidCount++; continue; }

      // Validate phone: must be 9-15 digits
      const cleaned = phone.replace(/[^\d]/g, '');
      if (cleaned.length < 9 || cleaned.length > 15) { invalidCount++; continue; }

      const msgSanitized = sanitize(msg.message || "", RATE_LIMITS.MAX_EMAIL_LENGTH);
      if (!msgSanitized) { invalidCount++; continue; }

      validMessages.push({ phone, message: msgSanitized, name: typeof msg.name === 'string' ? msg.name.trim().substring(0, 255) : undefined });
    }

    if (validMessages.length === 0) {
      return new Response(
        JSON.stringify({ error: "لا توجد رسائل صالحة للإرسال" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit check
    const now = new Date();
    const hourStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), 0, 0));
    const { data: rateResult, error: rateError } = await adminClient.rpc('check_rate_limit_and_increment', {
      p_user_id: user.id,
      p_window_start: hourStart.toISOString(),
      p_message_count: validMessages.length,
      p_max_hourly: 5000,
      p_max_daily: 10000,
    });

    if (rateError || !rateResult) {
      return new Response(
        JSON.stringify({ error: "تم تجاوز الحد المسموح للإرسال" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // STEP 1: reuse a pre-saved campaign when present, otherwise create one here.
    const campaignName = campaign_name || `حملة بريد - ${validMessages.length} رسالة`;
    let activeCampaignId: string | null = null;

    if (body.campaign_id) {
      const { data: ownership } = await adminClient
        .from("campaigns")
        .select("id")
        .eq("id", body.campaign_id)
        .eq("user_id", user.id)
        .single();

      if (!ownership) {
        return new Response(
          JSON.stringify({ error: "الحملة غير موجودة أو لا تملك صلاحية الوصول" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      activeCampaignId = ownership.id;
    } else {
      const { data: newCampaign, error: campError } = await adminClient
        .from("campaigns")
        .insert({
          user_id: user.id,
          name: campaignName,
          status: "sending",
          contacts_count: validMessages.length,
          source: "excel_upload",
        })
        .select("id")
        .single();

      if (campError || !newCampaign) {
        return new Response(
          JSON.stringify({ error: "فشل إنشاء الحملة في قاعدة البيانات" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      activeCampaignId = newCampaign.id;
    }

    // STEP 2: save messages only when the campaign was created in this function.
    if (!body.campaign_id) {
      const campaignMessages = validMessages.map((msg) => ({
        campaign_id: activeCampaignId!,
        phone: msg.phone,
        name: msg.name || null,
        message: msg.message,
        status: "pending" as const,
      }));

      const { error: insertMsgsError } = await adminClient
        .from("campaign_messages")
        .insert(campaignMessages);

      if (insertMsgsError) {
        console.error("Failed to insert campaign messages:", insertMsgsError.message);
      }
    }

    await adminClient
      .from("campaigns")
      .update({ status: "sending", updated_at: new Date().toISOString() })
      .eq("id", activeCampaignId);

    const { data: campaignMessagesRows, error: campaignMessagesRowsError } = await adminClient
      .from("campaign_messages")
      .select("id")
      .eq("campaign_id", activeCampaignId)
      .order("created_at", { ascending: true });

    if (campaignMessagesRowsError) {
      return new Response(
        JSON.stringify({ error: "فشل قراءة رسائل الحملة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deliveryAttemptsPayload = validMessages
      .map((_, index) => {
        const row = campaignMessagesRows?.[index];
        if (!row) return null;
        return {
          campaign_message_id: row.id,
          provider: "resend",
          channel: "email",
          status: "queued",
          attempts: 0,
        };
      })
      .filter((item): item is { campaign_message_id: string; provider: string; channel: string; status: string; attempts: number } => Boolean(item));

    let attemptIds: string[] = [];
    if (deliveryAttemptsPayload.length > 0) {
      const { data: insertedAttempts, error: attemptsError } = await adminClient
        .from("delivery_attempts")
        .insert(deliveryAttemptsPayload)
        .select("id");

      if (attemptsError) {
        return new Response(
          JSON.stringify({ error: "فشل تسجيل محاولات الإرسال" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      attemptIds = (insertedAttempts || []).map((attempt) => attempt.id);
      await adminClient
        .from("delivery_attempts")
        .update({ status: "sending", attempts: 1 })
        .in("id", attemptIds);

      await adminClient
        .from("delivery_events")
        .insert(attemptIds.map((attemptId) => ({
          delivery_attempt_id: attemptId,
          event_type: "dispatch_started",
          event_data: { channel: "email", provider: "resend" },
        })));
    }

    // STEP 3: إرسال البريد الإلكتروني عبر Resend
    const senderName = profileData?.full_name || "مرسال الهدهد";
    const companyName = profileData?.company_name;

    const emailSubject = `${campaignName} (${validMessages.length} رسالة)`;

    // بناء محتوى البريد
    const messagesText = validMessages
      .map((msg, i) => `${i + 1}. [${msg.phone}]${msg.name ? ` (${msg.name})` : ''}\n${msg.message}`)
      .join("\n\n");

    const emailBody = `مرحباً ${senderName}،

${companyName ? `الشركة: ${companyName}\n` : ''}الحملة: ${campaignName}
عدد الرسائل: ${validMessages.length}

--- الرسائل ---

${messagesText}

---
تم الإرسال عبر مرسال الهدهد`;

    const resendController = new AbortController();
    const resendTimeout = setTimeout(() => resendController.abort(), 30000);
    let resendResult: Record<string, unknown> = {};
    let resendResponse: Response | undefined;
    try {
      resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM_EMAIL") || "مرسال الهدهد <onboarding@resend.dev>",
          to: [user.email],
          subject: emailSubject,
          text: emailBody,
        }),
        signal: resendController.signal,
      });
      try {
        resendResult = await resendResponse.json();
      } catch {
        resendResult = { error: "invalid_json" };
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return new Response(
          JSON.stringify({ error: 'انتهت مهلة الاتصال بخدمة البريد' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    } finally {
      clearTimeout(resendTimeout);
    }

    const emailSuccess = resendResponse!.ok && !resendResult.error;

    // STEP 4: تحديث حالة الحملة والرسائل
    const finalStatus = emailSuccess ? "completed" : "failed";
    const msgStatus = emailSuccess ? "sent" : "failed";

    await adminClient
      .from("campaigns")
      .update({
        status: finalStatus,
        sent_count: emailSuccess ? validMessages.length : 0,
        failed_count: emailSuccess ? 0 : validMessages.length,
      })
      .eq("id", activeCampaignId);

    const messageIds = (campaignMessagesRows || []).slice(0, validMessages.length).map((row) => row.id);

    await adminClient
      .from("campaign_messages")
      .update({
        status: msgStatus,
        sent_at: emailSuccess ? new Date().toISOString() : undefined,
        error: emailSuccess ? undefined : (resendResult.message as string) || "فشل إرسال البريد",
      })
      .in("id", messageIds);

    if (attemptIds.length > 0) {
      await adminClient
        .from("delivery_attempts")
        .update({
          status: emailSuccess ? "sent" : "failed",
          response_data: resendResult,
          error_message: emailSuccess ? null : ((resendResult.message as string) || "فشل إرسال البريد"),
        })
        .in("id", attemptIds);

      await adminClient
        .from("delivery_events")
        .insert(attemptIds.map((attemptId) => ({
          delivery_attempt_id: attemptId,
          event_type: emailSuccess ? "sent" : "failed",
          event_data: resendResult,
        })));
    }

    if (!emailSuccess) {
      return new Response(
        JSON.stringify({
          error: (resendResult.message as string) || "فشل إرسال البريد الإلكتروني",
          campaign_id: activeCampaignId,
        }),
        { status: resendResponse!.ok ? 400 : resendResponse!.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `تم إرسال ${validMessages.length} رسالة إلى بريدك الإلكتروني (${user.email})`,
        sentCount: validMessages.length,
        skippedCount: invalidCount,
        campaign_id: activeCampaignId,
        email_id: (resendResult as { id?: string }).id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "حدث خطأ غير متوقع" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
