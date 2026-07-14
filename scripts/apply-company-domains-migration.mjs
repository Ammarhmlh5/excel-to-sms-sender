import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const password = process.env.SUPABASE_DB_PASSWORD || process.argv[2] || 'Ammar1983hmlh##';
const sql = readFileSync(resolve(__dirname, '..', 'supabase', 'migrations', '20260714000001_create_allowed_company_domains.sql'), 'utf8');

const client = new Client({
  connectionString: `postgresql://postgres:${encodeURIComponent(password)}@db.jqilueudbhgcgskvkvhe.supabase.co:5432/postgres?sslmode=require`,
});

async function main() {
  try {
    await client.connect();
    console.log('Connected to Supabase database.');
    await client.query(sql);
    console.log('Migration applied successfully.');

    const { rows } = await client.query("SELECT to_regclass('public.allowed_company_domains') as table_name;");
    console.log('Verification:', rows[0]);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
