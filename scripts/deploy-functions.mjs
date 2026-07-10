import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';

const PROJECT_REF = 'jqilueudbhgcgskvkvhe';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxaWx1ZXVkYmhnY2dza3ZrdmhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NDkzOTgsImV4cCI6MjA5OTEyNTM5OH0.rW1lXbfKiRMLrwb7hjxiNTsQxobT2Dz4Q32BMMa6CkI';
const FUNCTIONS_DIR = resolve(import.meta.dirname, '..', 'supabase', 'functions');

const FUNCTIONS = [
  'send-sms',
  'register-device',
  'verify-jwks',
  'cleanup-old-data',
  'manage-user-links',
  'admin-manage-users',
];

function collectFiles(dir, baseDir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
      results.push({
        relativePath: relative(baseDir, fullPath).replace(/\\/g, '/'),
        fullPath,
      });
    }
  }
  return results;
}

async function deployFunction(slug, token) {
  const funcDir = join(FUNCTIONS_DIR, slug);
  const files = collectFiles(funcDir, FUNCTIONS_DIR);

  const metadata = {
    entrypoint_path: files.find(f => f.relativePath.endsWith('/index.ts'))?.relativePath || `${slug}/index.ts`,
    name: slug,
  };

  const formData = new FormData();
  formData.append('metadata', JSON.stringify(metadata));

  for (const file of files) {
    const content = readFileSync(file.fullPath, 'utf-8');
    const blob = new Blob([content], { type: 'application/octet-stream' });
    formData.append('file', blob, file.relativePath);
  }

  const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/deploy?slug=${slug}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

// Step 1: Check if functions already exist
async function checkExisting() {
  console.log('Checking existing functions...');
  for (const slug of FUNCTIONS) {
    try {
      const res = await fetch(`https://${PROJECT_REF}.supabase.co/functions/v1/${slug}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      console.log(`  ${slug}: ${res.status} ${res.statusText}`);
    } catch (e) {
      console.log(`  ${slug}: UNREACHABLE (${e.message})`);
    }
  }
}

// Step 2: Deploy
async function deploy(token) {
  console.log(`\nDeploying ${FUNCTIONS.length} functions...\n`);
  let ok = 0, fail = 0;
  for (const slug of FUNCTIONS) {
    try {
      const result = await deployFunction(slug, token);
      if (result.ok) { console.log(`  ${slug} ✓`); ok++; }
      else { console.error(`  ${slug} ✗ (${result.status}): ${result.body.substring(0, 200)}`); fail++; }
    } catch (e) {
      console.error(`  ${slug} ERROR: ${e.message}`); fail++;
    }
  }
  console.log(`\n${ok} deployed, ${fail} failed`);
  return fail;
}

async function main() {
  await checkExisting();

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (token) {
    const fail = await deploy(token);
    process.exit(fail > 0 ? 1 : 0);
  } else {
    console.log('\nTo deploy, run:');
    console.log('  $env:SUPABASE_ACCESS_TOKEN="sbp_xxx"; node scripts/deploy-functions.mjs');
    console.log('Get token from: https://supabase.com/account/tokens');
  }
}

main();
