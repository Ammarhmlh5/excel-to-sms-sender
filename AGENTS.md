# AI Assistant Guide — مرسال الهدهد (Excel-to-SMS)

## Project Overview

Excel-to-SMS sender. Users upload Excel files, map columns (phone/name/message), and send bulk SMS via Hudhud API (`hloov.com`). Built with React + Vite + Supabase (Auth + DB + Edge Functions).

**Vision:** This is one "platform" that connects to the **Universal SMS Gateway** mobile app (هدهد موبايل). Mobile app users authenticate here, register their devices, and receive SMS commands via Supabase Realtime.

## Architecture

```
[Web App (React)] ───→ [Supabase Edge Function: send-sms] ───→ [Hudhud API (hloov.com)]
                          │                                        ↑
                          ├──→ [campaigns + campaign_messages] ─────┘
                          │
                          ├──→ [Supabase Realtime] ─────→ [هدهد موبايل] (notifications)
                          │
                          └──→ [device_push_tokens] ←─── [register-device EF] ←── [هدهد موبايل]
```

### Cross-Platform Redirect Flow
```
[هدهد ويب] ── JWT ──→ [مرسل Excel ?token=xxx]
                          │
                          ├──→ verify-jwks EF ──→ JWKS من هدهد
                          ├──→ إنشاء user_link
                          └──→ بدء جلسة المستخدم
```

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Main page: upload Excel, map columns, send + redirect flow from Hudhud |
| `src/pages/Auth.tsx` | Login / signup / forgot password |
| `src/components/ColumnMapper.tsx` | Auto-detect + manual column mapping |
| `src/components/FileUploader.tsx` | Drag-and-drop Excel upload |
| `src/components/SendButton.tsx` | Send button + loading state |
| `src/components/SendHistory.tsx` | Campaign history with Realtime updates |
| `src/components/LinkedAccounts.tsx` | Manage cross-platform linked accounts |
| `src/components/SettingsDialog.tsx` | API key + password + linked accounts management |
| `src/hooks/useRealtimeCampaigns.ts` | Realtime subscription for campaign status updates |
| `supabase/functions/send-sms/index.ts` | Edge Function: validates, rate-limits, sends via hloov.com, tracks campaigns |
| `supabase/functions/register-device/index.ts` | Edge Function: mobile app device registration + auto user_link creation |
| `supabase/functions/verify-jwks/index.ts` | Edge Function: JWT verification + account linking (rate-limited) |
| `supabase/functions/manage-user-links/index.ts` | Edge Function: GET/DELETE linked accounts |
| `supabase/functions/cleanup-old-data/index.ts` | Edge Function: scheduled data cleanup |
| `supabase/functions/_shared/cors.ts` | Dynamic CORS validation (per-request origin check) |
| `supabase/migrations/*.sql` | DB schema + RLS policies + cron setup |

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run lint         # Run ESLint
supabase db push     # Push all pending migrations to Supabase
```

## Code Conventions

- Arabic-first UI (RTL layout, Arabic labels)
- Supabase client from `src/integrations/supabase/client.ts`
- Types from `src/integrations/supabase/types.ts`
- Toast notifications via `sonner` (`useToast` hook)
- Phone validation: 9-15 digits, cleaned before send
- No `console.log` in production code
- No `any` types — use `unknown` or specific types

## Database (Supabase PostgreSQL)

Key tables: `api_keys`, `sms_logs`, `profiles`, `user_roles`, `rate_limits`.
New tables: `campaigns`, `campaign_messages`, `device_push_tokens`, `user_links`.

### Migrations (supabase/migrations/)

| Migration | Purpose |
|-----------|---------|
| `20260710000001` | campaigns + campaign_messages tables, RLS, indexes |
| `20260710000002` | device_push_tokens + user_links tables, RLS, indexes |
| `20260711000001` | RLS fixes: INSERT/DELETE/UPDATE policies for device_push_tokens, campaign_messages, campaigns, user_links |
| `20260711000002` | Unified `set_updated_at()`, GRANT statements, `cleanup_old_data()` function |
| `20260711000003` | DROP old functions: `update_campaign_updated_at()`, `update_updated_at_column()` |
| `20260711000004` | `SET search_path = public` on `auto_confirm_email()` trigger |
| `20260711000005` | pg_cron daily cleanup at 3:00 UTC (requires pg_cron extension) |
| `20260711000006` | FK on `rate_limits.user_id`, fix `cleanup_old_data()` CASCADE, indexes on `sms_logs` and `campaign_messages` |
| `20260712000001` | Atomic rate limit: check hourly BEFORE upsert (prevents counting rejected requests) |
| `20260712000002` | CHECK constraints on `rate_limits` and `sms_logs`, covering index, `handle_new_user` fix |

## Security Notes

- The Hudhud SMS API key is stored in `api_keys` table (never exposed to client)
- Rate limits: 1,000/request, 5,000/hour, 10,000/day
- All times in UTC
- Edge Functions use service role key for all DB writes via `adminClient` — bypasses RLS
- `confirm-email` Edge Function was **deleted** (security vulnerability — `auto_confirm_email` trigger handles it)
- CORS is **dynamic**: validates Origin header per-request (supports localhost, Vercel/Netlify, `CORS_ORIGIN` env var)
- `verify-jwks` only accepts hardcoded whitelisted JWKS URLs (no arbitrary `jwks_url` param — SSRF prevention)
- `verify-jwks` has rate limiting: 10 requests/minute/IP
- `verify_jwt = true` for send-sms and register-device (Supabase Gateway level)
- `register-device` validates: device_id ≤ 255 chars, platform ∈ {android, ios}
- `register-device` auto-creates `user_link` with `linked_via: 'device_registration'`
- `send-sms` uses `adminClient` (service role) for all DB writes — bypasses RLS
- `auto_confirm_email()` has `SET search_path = public` to prevent search path hijacking
- pg_cron runs daily cleanup at 3:00 UTC (requires pg_cron extension enabled in Dashboard)

## Edge Functions CORS

All Edge Functions use shared CORS from `supabase/functions/_shared/cors.ts`:
- Allows: `localhost`, `127.0.0.1`, `*.vercel.app`, `*.netlify.app`
- Env var: `CORS_ORIGIN` for custom production domain
- All responses include `Access-Control-Allow-Credentials: true`

## ⚠️ Setup Required

Before first deploy:
1. Enable `pg_cron` extension in Supabase Dashboard → Database → Extensions
2. Run `supabase db push` to apply all migrations
3. Deploy Edge Functions: `supabase functions deploy`
4. Set `CORS_ORIGIN` env var in Supabase Dashboard for production domain
