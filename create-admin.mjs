/**
 * Run this script to create the admin user in Supabase.
 * Usage:
 *   1. Paste your service_role key below (from Supabase Dashboard → Settings → API)
 *   2. Run: node create-admin.mjs
 */

const SUPABASE_URL = 'https://jqilueudbhgcgskvkvhe.supabase.co';

// ← Paste your service_role key here (NOT the anon key)
const SERVICE_ROLE_KEY = 'PASTE_SERVICE_ROLE_KEY_HERE';

const EMAIL = 'admin@sms.com';
const PASSWORD = 'Admin@123456';
const USER_ID = '949abb5d-5bd2-4902-bb16-327240e0d36a';

if (SERVICE_ROLE_KEY === 'PASTE_SERVICE_ROLE_KEY_HERE') {
  console.error('❌ Please paste your service_role key in the script first!');
  console.error('   Get it from: https://supabase.com/dashboard/project/jqilueudbhgcgskvkvhe/settings/api');
  process.exit(1);
}

async function createAdminUser() {
  console.log('🚀 Creating admin user...');

  // Try to create user via Admin API
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      id: USER_ID,
      user_metadata: { full_name: 'Admin' },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // If user already exists, try to update password
    if (data.code === 'email_exists' || res.status === 422) {
      console.log('⚠️  User already exists. Updating password...');
      return await updateUserPassword();
    }
    console.error('❌ Failed to create user:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('✅ User created successfully!');
  console.log('   ID:', data.id);
  console.log('   Email:', data.email);
  console.log('   Confirmed:', data.email_confirmed_at ? 'Yes' : 'No');
  console.log('');
  console.log('🔑 Login with:');
  console.log('   Email:    ', EMAIL);
  console.log('   Password: ', PASSWORD);
}

async function updateUserPassword() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${USER_ID}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      password: PASSWORD,
      email_confirm: true,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // If we don't know the ID, list all users and find by email
    console.log('   Searching for user by email...');
    return await findAndUpdateUser();
  }

  console.log('✅ Password updated successfully!');
  console.log('🔑 Login with:');
  console.log('   Email:    ', EMAIL);
  console.log('   Password: ', PASSWORD);
}

async function findAndUpdateUser() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
  });

  const data = await res.json();
  const users = data.users || [];
  const existing = users.find(u => u.email === EMAIL);

  if (!existing) {
    console.error('❌ User not found. Something is wrong.');
    process.exit(1);
  }

  console.log('   Found user ID:', existing.id);

  const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  });

  const updateData = await updateRes.json();
  if (!updateRes.ok) {
    console.error('❌ Failed to update user:', JSON.stringify(updateData, null, 2));
    process.exit(1);
  }

  console.log('✅ User password updated and email confirmed!');
  console.log('🔑 Login with:');
  console.log('   Email:    ', EMAIL);
  console.log('   Password: ', PASSWORD);
}

createAdminUser().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
