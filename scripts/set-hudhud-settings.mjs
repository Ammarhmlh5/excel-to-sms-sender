#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env file if present and missing env vars
function loadDotEnvIfNeeded() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length === 0) return;

  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  try {
    const content = readFileSync(envPath, { encoding: 'utf8' });
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (e) {
    // ignore
  }
}

loadDotEnvIfNeeded();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment or in a .env file at the project root');
  console.error('Example .env:\nSUPABASE_URL=https://your-project.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=service_role_xxx\nHUDHUD_API_KEY=your_hudhud_api_key');
  process.exit(1);
}

const hudhudApiKey = process.env.HUDHUD_API_KEY || '';
const hudhudSenderId = process.env.HUDHUD_SENDER_ID || undefined;
const hudhudBaseUrl = process.env.HUDHUD_BASE_URL || undefined;

const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function main() {
  try {
    const settings = {
      api_key: hudhudApiKey,
      sender_id: hudhudSenderId,
      base_url: hudhudBaseUrl,
    };

    const { data, error } = await client
      .from('hudhud_settings')
      .upsert({ provider: 'hudhud', settings_json: settings }, { onConflict: 'provider' })
      .select()
      .single();

    if (error) {
      console.error('Failed to upsert hudhud_settings:', error);
      process.exit(1);
    }

    console.log('Hudhud settings saved:', data);
    process.exit(0);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(1);
  }
}

main();
