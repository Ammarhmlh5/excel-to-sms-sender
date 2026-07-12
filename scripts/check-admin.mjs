import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('./.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const supabase = createClient(url, key);

// Check for admin users - simplified query
const { data, error } = await supabase
  .from('user_roles')
  .select('*')
  .eq('role', 'admin');

console.log('Admin users count:', data?.length || 0);
console.log('Admins:', JSON.stringify(data, null, 2));
if (error) console.log('Error:', error.message);