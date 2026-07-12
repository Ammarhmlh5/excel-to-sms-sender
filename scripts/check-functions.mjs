import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('./.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const supabase = createClient(url, key);

// Check required functions via RPC
const functions = [
  { name: 'check_rate_limit_and_increment', args: {} },
  { name: 'has_role', args: { _role: 'admin', _user_id: '00000000-0000-0000-0000-000000000000' } }
];

console.log('Checking functions...\n');

for (const fn of functions) {
  try {
    const { error } = await supabase.rpc(fn.name, fn.args);
    if (error && error.code === 'PGRST202') {
      console.log(`❌ ${fn.name}: not found`);
    } else if (error && error.message.includes('function') && error.code === '42883') {
      console.log(`❌ ${fn.name}: does not exist`);
    } else {
      console.log(`✅ ${fn.name}: exists`);
    }
  } catch (e) {
    if (e.message.includes('function') && e.code === '42883') {
      console.log(`❌ ${fn.name}: does not exist`);
    } else {
      console.log(`✅ ${fn.name}: exists (${e.message.substring(0,50)})`);
    }
  }
}

// Check pg_cron
console.log('\n---');
console.log('Note: pg_cron extension requires manual enable in Supabase Dashboard');
console.log('Go to: Dashboard → Database → Extensions → Enable pg_cron');