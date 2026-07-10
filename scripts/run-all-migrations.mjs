import { Client } from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS = [
  { file: '20260711000001_security_fixes.sql', desc: 'RLS Security Fixes' },
  { file: '20260711000002_infra_cleanup.sql', desc: 'Infrastructure Cleanup' },
  { file: '20260711000003_cleanup_old_functions.sql', desc: 'Drop Old Functions' },
  { file: '20260711000004_hardening_auto_confirm.sql', desc: 'Hardening auto_confirm_email' },
  { file: '20260711000005_setup_cron_cleanup.sql', desc: 'pg_cron Cleanup' },
  { file: '20260711000006_final_db_fixes.sql', desc: 'Final DB Fixes' },
];

const SQL_CONTENT = MIGRATIONS.map(m => {
  const content = readFileSync(resolve(__dirname, '..', 'supabase', 'migrations', m.file), 'utf-8');
  return `-- === ${m.desc} ===\n${content}`;
}).join('\n\n');

function askPassword() {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question('Enter your Supabase DB password: ', answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const password = await askPassword();
  if (!password) {
    console.error('No password provided.');
    process.exit(1);
  }

  const client = new Client({
    host: 'aws-0-us-east-2.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.jqilueudbhgcgskvkvhe',
    password,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const statements = SQL_CONTENT
      .split(/\n(?=-- === )/)
      .filter(s => s.trim());

    for (const block of statements) {
      const match = block.match(/^-- === (.+?) ===/);
      const desc = match ? match[1] : 'Unknown';
      console.log(`\nRunning: ${desc}`);

      const sql = block.replace(/^-- === .+? ===\n/, '');

      const sqlStatements = sql
        .split(/(?<=;)\s*\n/)
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s !== ';');

      for (const stmt of sqlStatements) {
        if (stmt.trim().startsWith('--')) continue;
        try {
          await client.query(stmt);
        } catch (err) {
          if (err.code === '42710' || err.code === '42P07' || err.code === '42701' || err.code === 'P0001') {
            console.log(`  Skip: ${err.message.substring(0, 100)}`);
          } else {
            console.error(`  Error: ${err.message.substring(0, 200)}`);
          }
        }
      }
      console.log(`  Done: ${desc}`);
    }

    console.log('\nAll migrations completed.');
  } catch (err) {
    console.error('Connection failed:', err.message);
    console.error('Check your password and try again.');
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
