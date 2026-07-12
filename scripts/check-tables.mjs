import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('./.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const supabase = createClient(url, key);

// Check if tables exist
const tables = ['campaigns', 'campaign_messages', 'device_push_tokens', 'user_links', 'rate_limits', 'sms_logs', 'profiles', 'api_keys'];

console.log('Checking tables...\n');

for (const t of tables) {
  const { error } = await supabase.from(t).select('*').limit(1);
  if (error) {
    console.log(`❌ ${t}: ${error.code} - ${error.message}`);
  } else {
    console.log(`✅ ${t}: exists`);
  }
}