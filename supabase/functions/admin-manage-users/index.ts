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

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح - صلاحية المشرف مطلوبة' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح - البيانات ليست JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action } = body;
    if (!action || typeof action !== 'string') {
      return new Response(
        JSON.stringify({ error: 'حقل action مطلوب' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    switch (action) {

      case 'list_users': {
        const page = Math.max(1, (body.page as number) || 1);
        const search = (body.search as string) || '';
        const limit = Math.min(100, Math.max(1, (body.limit as number) || 20));
        const offset = (page - 1) * limit;

        let countQuery = adminClient
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        let fetchQuery = adminClient
          .from('profiles')
          .select('*, user_roles(role)')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (search) {
          const filter = `full_name.ilike.%${search}%,company_name.ilike.%${search}%`;
          countQuery = countQuery.or(filter);
          fetchQuery = fetchQuery.or(filter);
        }

        const [{ count }, { data: profiles, error }] = await Promise.all([
          countQuery,
          fetchQuery,
        ]);

        if (error) throw error;

        return new Response(
          JSON.stringify({ users: profiles || [], total: count || 0, page, limit }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_user': {
        const targetUserId = body.user_id as string;
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: 'user_id مطلوب' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const [
          { data: profile, error: profileError },
          keysResult,
          campaignsResult,
          devicesResult,
          linksResult,
          rolesResult,
          smsCountResult,
          rateLimitsResult,
          logsResult,
        ] = await Promise.all([
          adminClient.from('profiles').select('*').eq('user_id', targetUserId).maybeSingle(),
          adminClient.from('api_keys').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }),
          adminClient.from('campaigns').select('id, name, status, contacts_count, sent_count, failed_count, source, created_at').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(50),
          adminClient.from('device_push_tokens').select('*').eq('user_id', targetUserId).order('created_at', { ascending: false }),
          adminClient.from('user_links').select('*').eq('local_user_id', targetUserId).order('linked_at', { ascending: false }),
          adminClient.from('user_roles').select('role').eq('user_id', targetUserId),
          adminClient.from('sms_logs').select('*', { count: 'exact', head: true }).eq('user_id', targetUserId),
          adminClient.from('rate_limits').select('*').eq('user_id', targetUserId).order('window_start', { ascending: false }).limit(10),
          adminClient.from('sms_logs').select('id, created_at, recipients_count, status').eq('user_id', targetUserId).order('created_at', { ascending: false }).limit(20),
        ]);

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        return new Response(
          JSON.stringify({
            profile,
            apiKeys: keysResult.data || [],
            campaigns: campaignsResult.data || [],
            devices: devicesResult.data || [],
            links: linksResult.data || [],
            roles: rolesResult.data || [],
            smsLogsCount: smsCountResult.count || 0,
            recentLogs: logsResult.data || [],
            rateLimits: rateLimitsResult.data || [],
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle_api_key': {
        const keyId = body.key_id as string;
        const isActive = body.is_active as boolean;
        if (!keyId) {
          return new Response(
            JSON.stringify({ error: 'key_id مطلوب' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await adminClient
          .from('api_keys')
          .update({ is_active: isActive })
          .eq('id', keyId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'set_role': {
        const targetUserId = body.user_id as string;
        const role = body.role as string;
        if (!targetUserId || !role) {
          return new Response(
            JSON.stringify({ error: 'user_id و role مطلوبان' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!['admin', 'user'].includes(role)) {
          return new Response(
            JSON.stringify({ error: 'role غير صالح - القيم المسموحة: admin, user' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (user.id === targetUserId && role !== 'admin') {
          return new Response(
            JSON.stringify({ error: 'لا يمكن إزالة صلاحية المشرف عن نفسك' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (role === 'admin') {
          const { error } = await adminClient
            .from('user_roles')
            .insert({ user_id: targetUserId, role: 'admin' })
            .onConflict(['user_id', 'role'])
            .ignore();

          if (error) throw error;
        } else {
          const { error } = await adminClient
            .from('user_roles')
            .delete()
            .eq('user_id', targetUserId)
            .eq('role', 'admin');

          if (error) throw error;
        }

        return new Response(
          JSON.stringify({ success: true, role }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_user_data': {
        const targetUserId = body.user_id as string;
        if (!targetUserId) {
          return new Response(
            JSON.stringify({ error: 'user_id مطلوب' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (user.id === targetUserId) {
          return new Response(
            JSON.stringify({ error: 'لا يمكن حذف بيانات حسابك' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await Promise.all([
          adminClient.from('user_roles').delete().eq('user_id', targetUserId),
          adminClient.from('user_links').delete().eq('local_user_id', targetUserId),
          adminClient.from('device_push_tokens').delete().eq('user_id', targetUserId),
          adminClient.from('api_keys').delete().eq('user_id', targetUserId),
          adminClient.from('sms_logs').delete().eq('user_id', targetUserId),
          adminClient.from('rate_limits').delete().eq('user_id', targetUserId),
          adminClient.from('campaigns').delete().eq('user_id', targetUserId),
          adminClient.from('profiles').delete().eq('user_id', targetUserId),
        ]);

        return new Response(
          JSON.stringify({ success: true, message: 'تم حذف جميع بيانات المستخدم' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get_stats': {
        const [
          { count: usersCount },
          { count: campaignsCount },
          { count: smsSentCount },
          { count: apiKeysCount },
          { count: devicesCount },
          { count: adminCount },
        ] = await Promise.all([
          adminClient.from('profiles').select('*', { count: 'exact', head: true }),
          adminClient.from('campaigns').select('*', { count: 'exact', head: true }),
          adminClient.from('sms_logs').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
          adminClient.from('api_keys').select('*', { count: 'exact', head: true }),
          adminClient.from('device_push_tokens').select('*', { count: 'exact', head: true }),
          adminClient.from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        ]);

        return new Response(
          JSON.stringify({
            users: usersCount || 0,
            campaigns: campaignsCount || 0,
            smsSent: smsSentCount || 0,
            apiKeys: apiKeysCount || 0,
            devices: devicesCount || 0,
            admins: adminCount || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `إجراء غير معروف: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('admin-manage-users error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع في خدمة الإدارة' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
