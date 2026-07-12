import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = readFileSync('./.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const key = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="([^"]+)"/)[1];

const supabase = createClient(url, key);

async function addApiKey() {
  // First, get current user (you need to be logged in)
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.log('❌ يجب تسجيل الدخول أولاً');
    console.log('افتح التطبيق وسجل دخولك، ثم أعد تشغيل هذا السكريبت');
    return;
  }

  console.log('👤 المستخدم:', user.email);

  // Insert API key
  const apiKey = 'gwk_834d0bd4-9f9d-4921-a72f-d901e0d7c7fa';
  
  const { error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      key_name: 'Hudhud API',
      api_key: apiKey,
      is_active: true
    });

  if (error) {
    console.log('❌ خطأ:', error.message);
  } else {
    console.log('✅ تم إضافة مفتاح API بنجاح!');
    console.log('🔑 المفتاح:', apiKey);
  }
}

addApiKey();