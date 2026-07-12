import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin') || undefined);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify secret key
    const authHeader = req.headers.get('Authorization');
    const secretKey = Deno.env.get('ADMIN_CREATE_SECRET');
    
    if (!secretKey || authHeader !== `Bearer ${secretKey}`) {
      return new Response(
        JSON.stringify({ error: 'غير مصرح' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'طلب غير صالح' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, full_name } = body;
    
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'email و password مطلوبان' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user in Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: email as string,
      password: password as string,
      email_confirm: true,
      user_metadata: { full_name: full_name || 'Admin' },
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already been registered') || authError.code === 'email_exists') {
        // Find existing user
        const { data: users } = await adminClient.auth.admin.listUsers();
        const existingUser = users?.find(u => u.email === email);
        
        if (!existingUser) {
          return new Response(
            JSON.stringify({ error: 'فشل في إنشاء المستخدم' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update password
        const { error: updateError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: password as string,
          email_confirm: true,
        });

        if (updateError) {
          return new Response(
            JSON.stringify({ error: 'فشل في تحديث كلمة المرور' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add admin role
        await adminClient.from('user_roles').upsert({
          user_id: existingUser.id,
          role: 'admin',
        }, { onConflict: 'user_id,role', ignoreDuplicates: true });

        // Create profile
        await adminClient.from('profiles').upsert({
          user_id: existingUser.id,
          full_name: full_name || 'Admin',
        }, { onConflict: 'user_id', ignoreDuplicates: true });

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'تم تحديث المستخدم وتعيينه كأدمن',
            user_id: existingUser.id,
            email 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'فشل في إنشاء المستخدم' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add admin role
    await adminClient.from('user_roles').upsert({
      user_id: userId,
      role: 'admin',
    }, { onConflict: 'user_id,role', ignoreDuplicates: true });

    // Create profile
    await adminClient.from('profiles').upsert({
      user_id: userId,
      full_name: full_name || 'Admin',
    }, { onConflict: 'user_id', ignoreDuplicates: true });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'تم إنشاء حساب الأدمن بنجاح',
        user_id: userId,
        email 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('create-admin error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});