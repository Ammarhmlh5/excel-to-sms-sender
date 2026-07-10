// تشغيل: node scripts/test-tables.mjs
// يختبر وجود الجداول في Supabase باستخدام المفتاح العام من .env

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');

function loadEnv(path) {
  const entries = {};
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

const env = loadEnv(envPath);
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('❌ VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY missing from .env');
  process.exit(1);
}

const tables = ['campaigns', 'campaign_messages', 'device_push_tokens', 'user_links'];

async function checkTables() {
  console.log('Checking new tables...\n');

  for (const table of tables) {
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=1`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
      });

      if (resp.ok) {
        console.log(`  OK   ${table}`);
      } else if (resp.status === 404) {
        console.log(`  MISS ${table}`);
      } else {
        const text = await resp.text();
        if (text.includes('relation') || text.includes('does not exist')) {
          console.log(`  MISS ${table}`);
        } else {
          console.log(`  ERR  ${table} — ${resp.status}`);
        }
      }
    } catch (err) {
      console.log(`  ERR  ${table} — ${err.message}`);
    }
  }
}

checkTables().catch(console.error);
