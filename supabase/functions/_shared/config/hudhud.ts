import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';

export interface HudhudConfig {
  apiKey: string;
  senderId?: string;
  baseUrl?: string;
}

export async function getHudhudConfigFromEnv(): Promise<HudhudConfig> {
  const envConfig = {
    apiKey: Deno.env.get('HUDHUD_API_KEY') || '',
    senderId: Deno.env.get('HUDHUD_SENDER_ID') || undefined,
    baseUrl: Deno.env.get('HUDHUD_BASE_URL') || undefined,
  };

  if (envConfig.apiKey) {
    return envConfig;
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return envConfig;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data } = await supabase.from('hudhud_settings').select('settings_json').eq('provider', 'hudhud').maybeSingle();
  const settings = data?.settings_json || {};

  return {
    apiKey: envConfig.apiKey || settings.api_key || '',
    senderId: envConfig.senderId || settings.sender_id || undefined,
    baseUrl: envConfig.baseUrl || settings.base_url || undefined,
  };
}
