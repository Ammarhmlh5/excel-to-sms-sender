# AI Assistant Guide — مرسال الهدهد (Excel-to-SMS)

## Project Overview

Excel-to-SMS sender platform. Users upload Excel files, map columns (phone/name/message), and send bulk SMS via Hudhud API (`hloov.com`). Built with React + Vite + Supabase (Auth + DB + Edge Functions).

**Vision:** Multi-user platform that connects to the **Universal SMS Gateway** mobile app (هدهد موبايل). Mobile app users authenticate here, register their devices, and receive SMS commands via Supabase Realtime.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      مرسال الهدهد (المنصة)                    │
├─────────────────────┬───────────────────────────────────────┤
│  الصفحة الرئيسية     │  لوحة تحكم المستخدم (/dashboard)       │
│                     │                                        │
│  • رفع Excel        │  • حملاتي + تفاصيل الحملة              │
│  • ربط الأعمدة      │  • سجل إرسال SMS                      │
│  • إرسال SMS        │  • مفاتيح API الخاصة بي               │
│                     │  • أجهزتي المسجلة                     │
│                     │  • حسابي وإعداداتي                     │
├─────────────────────┴───────────────────────────────────────┤
│              لوحة تحكم المشرف (/super-admin)                 │
│                                                               │
│  • إدارة كل المستخدمين + تفاصيل + حذف/تعطيل                 │
│  • عرض كل الحملات + سجلات SMS لجميع المستخدمين              │
│  • إدارة كل مفاتيح API + الأجهزة المسجلة                    │
│  • إدارة الأدوار والصلاحيات (role assignments)               │
└─────────────────────────────────────────────────────────────┘
```

### Route Structure
- `/` — Main page (upload, map, send)
- `/auth` — Login / signup / forgot password
- `/dashboard` — User dashboard (own data only, `DashboardLayout`)
- `/super-admin` — Super admin panel (all users, `SuperAdminLayout`, requires `super_admin` role)
- `*` — 404 Not Found

### Cross-Platform Redirect Flow
```
[هدهد ويب] ── JWT ──→ [مرسل Excel ?token=xxx]
                          │
                          ├──→ verify-jwks EF ──→ JWKS من هدهد
                          ├──→ إنشاء user_link
                          └──→ بدء جلسة المستخدم
```

## Key Files

### Pages & Layouts
| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | Main page: upload Excel, map columns, send + redirect flow |
| `src/pages/Auth.tsx` | Login / signup / forgot password |
| `src/pages/NotFound.tsx` | 404 page |
| `src/components/dashboard/DashboardLayout.tsx` | User dashboard shell (sidebar nav) |
| `src/components/super-admin/SuperAdminLayout.tsx` | Super admin shell (sidebar nav) |
| `src/components/ErrorBoundary.tsx` | React error boundary (lazy-loaded routes) |

### User Dashboard (`src/components/dashboard/`)
| File | Purpose |
|------|---------|
| `MyCampaigns.tsx` | User's campaigns with pagination + detail view |
| `MySmsLogs.tsx` | User's SMS logs with pagination |
| `MyApiKeys.tsx` | User's API keys (masked, create/delete) |
| `MyDevices.tsx` | User's registered devices (remove) |
| `AccountSettings.tsx` | Update password |

### Super Admin (`src/components/super-admin/`)
| File | Purpose |
|------|---------|
| `SuperAdminDashboard.tsx` | Stats overview (users, campaigns, messages, devices) |
| `UsersManagement.tsx` | List/search/filter users with pagination |
| `UserDetail.tsx` | Full user detail (profile, API keys, devices, campaigns, logs) |
| `AllCampaigns.tsx` | All campaigns across all users |
| `AllSmsLogs.tsx` | All SMS logs across all users |
| `AllApiKeys.tsx` | All API keys across all users |
| `AllDevices.tsx` | All devices across all users |
| `RolesManagement.tsx` | Manage role assignments |
| `index.ts` | Barrel export |

### Shared Components
| File | Purpose |
|------|---------|
| `src/components/ColumnMapper.tsx` | Auto-detect + manual column mapping |
| `src/lib/columnDetection.ts` | Column type detection utilities + ColumnMapping type |
| `src/components/RateLimitDisplay.tsx` | Hourly/daily rate limit usage with progress bars |
| `src/components/FileUploader.tsx` | Drag-and-drop Excel upload (MIME validated) |
| `src/components/SendButton.tsx` | Send button + loading state |
| `src/components/SendHistory.tsx` | Campaign history with Realtime updates |
| `src/components/LinkedAccounts.tsx` | Manage cross-platform linked accounts |
| `src/components/SettingsDialog.tsx` | API key + password + linked accounts management |
| `src/components/Pagination.tsx` | Reusable pagination (pageSize=50) |
| `src/components/ConfirmDialog.tsx` | Replaces window.confirm() |
| `src/components/Spinner.tsx` | Loading spinner with Arabic label |
| `src/hooks/useRealtimeCampaigns.ts` | Realtime subscription (channel name includes user.id) |
| `src/lib/formatDate.ts` | Locale-aware date formatting |

### Edge Functions (`supabase/functions/`)
| Function | Purpose |
|----------|---------|
| `send-sms/index.ts` | Validates, rate-limits, sends via hloov.com, tracks campaigns |
| `send-email/index.ts` | Sends campaign via email (JSON payload) |
| `retry-sms/index.ts` | Resends failed messages from a campaign (rate-limited) |
| `register-device/index.ts` | Mobile app device registration + auto user_link creation |
| `verify-jwks/index.ts` | JWT verification + account linking (IP-based rate limiting, JWKS cache) |
| `admin-manage-users/index.ts` | GET/PUT/DELETE users (admin-only, LIKE-safe search) |
| `manage-user-links/index.ts` | GET/DELETE linked accounts |
| `cleanup-old-data/index.ts` | Scheduled data cleanup |
| `create-admin/index.ts` | Creates super_admin user |
| `_shared/cors.ts` | Dynamic CORS (per-request origin check, supports GET/DELETE/OPTIONS) |

### Database (`supabase/migrations/`)
| Migration | Purpose |
|-----------|---------|
| `20260710000001` | campaigns + campaign_messages tables, RLS, indexes |
| `20260710000002` | device_push_tokens + user_links tables, RLS, indexes |
| `20260711000001` | RLS fixes: INSERT/DELETE/UPDATE policies |
| `20260711000002` | Unified `set_updated_at()`, GRANT statements, `cleanup_old_data()` |
| `20260711000003` | DROP old functions |
| `20260711000004` | `SET search_path = public` on `auto_confirm_email()` |
| `20260711000005` | pg_cron daily cleanup at 3:00 UTC |
| `20260711000006` | FK on `rate_limits.user_id`, fix CASCADE, indexes |
| `20260712000001` | Atomic rate limit: check hourly BEFORE upsert |
| `20260712000002` | CHECK constraints, covering index, `handle_new_user` fix |
| `20260715000001` | CHECK constraints, device limit trigger, campaign count trigger |

## Commands

```bash
npm run dev          # Start Vite dev server (main app, port 5180)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run deploy:db    # Push all pending migrations to Supabase
npm run deploy:functions  # Deploy all Edge Functions
npm run deploy:all   # Deploy DB + all Edge Functions
```

## Code Conventions

- Arabic-first UI (RTL layout, Arabic labels)
- Supabase client from `src/integrations/supabase/client.ts`
- Types from `src/integrations/supabase/types.ts`
- Toast notifications via `sonner`
- Phone validation: 9-15 digits, cleaned before send
- No `console.log` in production code
- No `any` types — use `unknown` or specific types
- `confirm()` calls replaced with `<ConfirmDialog>` component
- Error boundary wraps all lazy-loaded routes
- Pagination: `pageSize=50` with reusable `Pagination` component
- Search inputs use 300ms debounce
- All Edge Functions use service role `adminClient` for DB writes (bypasses RLS)

## Database (Supabase PostgreSQL)

Key tables: `api_keys`, `sms_logs`, `profiles`, `user_roles`, `rate_limits`, `campaigns`, `campaign_messages`, `device_push_tokens`, `user_links`.

## Security Notes

- API keys masked in UI (only last 8 chars shown)
- Rate limits: 1,000/request, 5,000/hour, 10,000/day (DB-based via `check_rate_limit_and_increment`)
- All times in UTC
- `confirm-email` Edge Function **deleted** (auto_confirm_email trigger handles it)
- CORS is dynamic: validates Origin header per-request (GET/DELETE/OPTIONS)
- `verify-jwks` only accepts hardcoded whitelisted JWKS URLs (SSRF prevention)
- `verify-jwks` rate limits: 10 requests/minute/IP (IP → deterministic UUID for DB)
- `verify-jwks` caches JWKS keys for 1 hour
- `verify_jwt = true` for send-sms, retry-sms, register-device
- `register-device` validates: device_id ≤ 255 chars, platform ∈ {android, ios}
- `auto_confirm_email()` has `SET search_path = public`
- `admin-manage-users` escapes `%` and `_` in ILIKE search
- Super admin routes require `super_admin` role in `user_roles` table
- DB constraints: `rate_limits.messages_sent >= 0`, `sms_logs.status IN (...)`
- Triggers: device count limit (5/user), campaign message count auto-update

## ⚠️ Setup Required

Before first deploy:
1. Enable `pg_cron` extension in Supabase Dashboard → Database → Extensions
2. Run `supabase db push` to apply all migrations (including `20260715000001`)
3. Deploy Edge Functions: `supabase functions deploy`
4. Set `CORS_ORIGIN` env var in Supabase Dashboard for production domain
