# Supabase Edge Functions

This folder contains Supabase Edge Functions used by the Excel-to-SMS platform.

Quick actions:

- Run unit tests (Deno):

```bash
deno test --allow-net --allow-env supabase/functions/_shared/providers/hudhud_test.ts
```

Additional tests:

```bash
deno test --allow-env supabase/functions/_shared/providers/fcm_test.ts
```

Deployment checklist:

- Ensure `supabase` CLI is installed and you are logged in.
- Populate `supabase/functions/.env` from `.env.example` with real keys.
- Run database migrations:

```bash
npm run deploy:db
```

- Deploy functions:

```bash
npm run deploy:functions
```

If you prefer, I can run the deploy commands here if you provide Supabase credentials or install the CLI on this machine.

- Deploy functions: use the repository scripts (requires Supabase CLI & credentials):

```bash
npm run deploy:functions
```

Notes:
- Tests are Deno-based and expect no live network calls (they mock `fetch`).
- Apply DB migrations before deploying functions. Use `npm run deploy:db` or the scripts in `scripts/`.
