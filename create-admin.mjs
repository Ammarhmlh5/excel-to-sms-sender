/**
 * Run this script to create the admin user in Supabase.
 *
 * Usage:
 *   node create-admin.mjs --email=admin@sms.com --password=YourSecurePassword --url=https://xxx.supabase.co --key=YOUR_SERVICE_ROLE_KEY
 *
 * All four flags are required.
 */

function parseArgs(args) {
  const parsed = {};
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, ...rest] = arg.slice(2).split('=');
      parsed[key] = rest.join('=');
    }
  }
  return parsed;
}

const flags = parseArgs(process.argv.slice(2));

const SUPABASE_URL = flags.url;
const SERVICE_ROLE_KEY = flags.key;
const EMAIL = flags.email;
const PASSWORD = flags.password;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !EMAIL || !PASSWORD) {
  console.error('Usage: node create-admin.mjs --email=<email> --password=<password> --url=<supabase_url> --key=<service_role_key>');
  process.exit(1);
}

async function createAdminUser() {
  console.log('Creating admin user...');

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
      user_metadata: { full_name: 'Admin' },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.code === 'email_exists' || res.status === 422) {
      console.log('User already exists. Updating password...');
      return await updateUserPassword(data.id);
    }
    console.error('Failed to create user:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('User created successfully!');
  console.log('  ID:', data.id);
  console.log('  Email:', data.email);
}

async function updateUserPassword(userId) {
  if (!userId) {
    console.log('Searching for user by email...');
    const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    });
    const listData = await listRes.json();
    const existing = (listData.users || []).find(u => u.email === EMAIL);
    if (!existing) {
      console.error('User not found.');
      process.exit(1);
    }
    userId = existing.id;
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({ password: PASSWORD, email_confirm: true }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('Failed to update password:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('Password updated successfully!');
}

createAdminUser().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
