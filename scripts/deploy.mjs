import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = 'jqilueudbhgcgskvkvhe';
const FUNCTIONS = ['send-sms', 'register-device', 'verify-jwks', 'cleanup-old-data', 'admin-manage-users', 'manage-user-links'];
const MIGRATIONS_DIR = join(__dirname, '..', 'supabase', 'migrations');
const TOKEN_FILE = join(__dirname, '..', '.supabase_token');

async function promptToken() {
  if (existsSync(TOKEN_FILE)) {
    const stored = readFileSync(TOKEN_FILE, 'utf-8').trim();
    if (stored) return stored;
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const token = await new Promise(resolve => {
    rl.question('SUPABASE_ACCESS_TOKEN: ', resolve);
  });
  rl.close();
  writeFileSync(TOKEN_FILE, token.trim(), 'utf-8');
  return token.trim();
}

async function api(endpoint, options = {}) {
  const token = await promptToken();
  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

async function deployFunction(name) {
  console.log(`\n🚀 رفع ${name}...`);
  const fnDir = join(__dirname, '..', 'supabase', 'functions', name);
  const code = readFileSync(join(fnDir, 'index.ts'), 'utf-8');

  const config = { verify_jwt: false };
  const configPath = join(__dirname, '..', 'supabase', 'config.toml');
  const toml = readFileSync(configPath, 'utf-8');
  const match = toml.match(new RegExp(`\\[functions\\.${name}\\][^[]*verify_jwt\\s*=\\s*(true|false)`));
  if (match) config.verify_jwt = match[1] === 'true';

  try {
    await api(`/functions/${name}`, { method: 'GET' });
    console.log(`  ↳ التحديث...`);
    await api(`/functions/${name}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, source: code, verify_jwt: config.verify_jwt }),
    });
  } catch (e) {
    if (e.message.includes('404')) {
      console.log(`  ↳ الإنشاء...`);
      await api('/functions', {
        method: 'POST',
        body: JSON.stringify({ slug: name, name, source: code, verify_jwt: config.verify_jwt }),
      });
    } else {
      throw e;
    }
  }
  console.log(`  ✅ ${name} منشور`);
}

async function applyMigrations() {
  console.log(`\n📦 تطبيق الترحيلات...`);
  const files = readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();

  const response = await api('/database/migrations', { method: 'GET' });
  const applied = new Set((response || []).map(m => m.version));

  for (const file of files) {
    const version = file.replace(/^(\d+).*/, '$1');
    if (applied.has(version)) {
      console.log(`  ↪ ${file} — مطبق مسبقًا، تخطي`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    console.log(`  ↳ تطبيق ${file}...`);
    await api('/database/migrations', {
      method: 'POST',
      body: JSON.stringify({ version, statements: sql, name: file }),
    });
    console.log(`  ✅ ${file} مطبق`);
  }
}

async function main() {
  console.log('=== نشر مشروع Excel-to-SMS إلى Supabase ===\n');

  try {
    const token = await promptToken();
    console.log(`🔑 تم التعرف على التوكن`);

    for (const fn of FUNCTIONS) {
      await deployFunction(fn);
    }

    await applyMigrations();

    console.log(`\n🎉 تم النشر بنجاح!`);
    console.log(`تم رفع ${FUNCTIONS.length} دوال Edge`);

  } catch (e) {
    console.error(`\n❌ خطأ: ${e.message}`);
    process.exit(1);
  }
}

main();
