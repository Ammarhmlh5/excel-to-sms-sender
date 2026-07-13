# Supabase deployment steps

1. Prerequisites

- Install Node.js (includes `npm`).
- Install `supabase` CLI globally: `npm install -g supabase`.
- (Optional) Install `deno` to run the unit tests: see https://deno.land/manual@v1.36.0/getting_started/installation
- Ensure you have Supabase project credentials (service role key) and you're authenticated with `supabase login`.

2. Prepare environment variables

Copy `supabase/functions/.env.example` to `supabase/functions/.env` and fill values, or export env vars in your shell. Required values include:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `HUDHUD_API_KEY`
- `RESEND_API_KEY` (if using email)

3. Run migrations

```powershell
npm run deploy:db
```

4. Run tests (recommended)

If you installed `deno`, run the provider unit tests before deploying functions:

```powershell
./scripts/run-deno-tests.ps1
```

5. Deploy Edge Functions

```powershell
npm run deploy:functions
```

5. Verify

- Open Supabase dashboard → Database → Migrations to confirm migration applied.
- Open Supabase dashboard → Edge Functions to check each function is deployed and healthy.
- Test `send-sms` with a small payload via HTTP client (Postman/curl) using a valid user Authorization header.

6. Rollback / Troubleshooting

- If migrations fail, inspect the SQL in `supabase/migrations/*` and use `supabase db remote commit`/`supabase db reset` as appropriate for your environment. Be careful in production.
- For function logs, use `supabase functions logs <function>` or the dashboard logs.
