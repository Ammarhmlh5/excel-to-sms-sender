// Run migrations via Supabase Management API
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envContent = readFileSync(join(__dirname, '..', '.env'), 'utf-8');
const match = envContent.match(/VITE_SUPABASE_URL="([^"]+)"/);
const supabaseUrl = match ? match[1] : null;
const supabaseKey = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)?.[1];

console.log('URL from env:', supabaseUrl);

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get migration files
const migrationsDir = join(__dirname, '..', 'supabase', 'migrations');
const migrations = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

console.log('Found migrations:', migrations.length);

// Test connection
try {
  const { error } = await supabase.from('profiles').select('count').limit(1);
  if (error && error.code !== 'PGRST116') {
    console.log('Connection test result:', error.message);
  } else {
    console.log('✓ Connected to Supabase successfully!');
  }
} catch (e) {
  console.log('Connection test failed:', e.message);
}

console.log('\nMigrations to apply:');
migrations.forEach(m => console.log(' -', m));

console.log('\n---');
console.log('To apply migrations, you need:');
console.log('1. Access Token from: https://supabase.com/dashboard/account/tokens');
console.log('2. Run: set SUPABASE_ACCESS_TOKEN=YOUR_TOKEN');
console.log('3. Then: npx supabase db push');