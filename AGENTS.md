# AI Assistant Guide — مرسال الهدهد (Excel-to-SMS)

## Project Overview

Excel-to-SMS sender platform. Users upload Excel files, map columns (phone/name/message), and send bulk SMS via Hudhud API (`hloov.com`). Built with React + Vite + Supabase (Auth + DB + Edge Functions).

**Vision:** Multi-user platform that connects to the **Universal SMS Gateway** mobile app (هدهد موبايل). Mobile app users authenticate here, register their devices, and receive SMS commands via Supabase Realtime.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      مرسال الهدهد (المنصة)                    │
├─────────────────────┬───────────────────────────────────────┤
│  واجهة المستخدم     │  لوحة تحكم المستخدم (/dashboard)       │
│  (User App)         │                                        │
│                     │  • حملاتي + تفاصيل الحملة              │
│  • رفع Excel        │  • سجل إرسال SMS                      │
│  • ربط الأعمدة      │  • مفاتيح API الخاصة بي               │
│  • إرسال SMS        │  • أجهزتي المسجلة                     │
│                     │  • حسابي وإعداداتي                     │
├─────────────────────┴───────────────────────────────────────┤
│              لوحة تحكم المشرف (/super-admin)                 │
│              (Admin App - منفصل تماماً)                       │
│                                                               │
│  • إدارة كل المستخدمين + تفاصيل + حذف/تعطيل                 │
│  • عرض كل الحملات + سجلات SMS لجميع المستخدمين              │
│  • إدارة كل مفاتيح API + الأجهزة المسجلة                    │
│  • إدارة الأدوار والصلاحيات (role assignments)               │
└─────────────────────────────────────────────────────────────┘
```

### عزل الواجهات (Interface Isolation)

```
src/
├── shared/                    ← مكونات مشتركة بين التطبيقين
│   ├── components/
│   │   ├── ui/               (shadcn/ui primitives)
│   │   ├── CampaignDetail.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── PasswordInput.tsx
│   │   ├── Spinner.tsx
│   │   ├── StatusBadges.tsx
│   │   └── Pagination.tsx
│   ├── hooks/
│   │   ├── useAuth.tsx
│   │   └── use-toast.ts
│   ├── lib/
│   │   ├── formatDate.ts
│   │   ├── statusData.ts
│   │   └── utils.ts
│   ├── types/
│   │   └── campaign.ts
│   └── integrations/
│       └── supabase/
│           ├── client.ts
│           └── types.ts
│
├── user/                      ← واجهة المستخدم فقط
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ColumnMapper.tsx
│   │   ├── DataPreview.tsx
│   │   ├── FileUploader.tsx
│   │   ├── SendButton.tsx
│   │   └── dashboard/
│   │       ├── DashboardLayout.tsx
│   │       ├── MyCampaigns.tsx
│   │       ├── MySmsLogs.tsx
│   │       ├── MyApiKeys.tsx
│   │       ├── MyDevices.tsx
│   │       ├── AccountSettings.tsx
│   │       └── NewCampaignDialog.tsx
│   ├── lib/
│   │   └── columnDetection.ts
│   └── pages/
│       ├── Auth.tsx
│       ├── ResetPassword.tsx
│       └── NotFound.tsx
│
├── admin/                     ← واجهة المشرف فقط (معزولة تماماً)
│   ├── AdminApp.tsx
│   ├── main.tsx
│   ├── AdminAuth.tsx
│   ├── hooks/
│   │   └── useIsAdmin.tsx
│   ├── lib/
│   │   └── adminActions.ts
│   └── components/
│       ├── SuperAdminLayout.tsx
│       ├── SuperAdminDashboard.tsx
│       ├── UsersManagement.tsx
│       ├── UserDetail.tsx
│       ├── AllCampaigns.tsx
│       ├── AllSmsLogs.tsx
│       ├── AllApiKeys.tsx
│       ├── AllDevices.tsx
│       ├── RolesManagement.tsx
│       └── index.ts
```

### قواعد العزل
- **كود المشرف** (`src/admin/`) لا يُستورد من تطبيق المستخدم
- **كود المستخدم** (`src/user/`) لا يُستورد من تطبيق المشرف
- **المكونات المشتركة** (`src/shared/`) تُستخدم من كلا التطبيقين
- كل تطبيق له **نقطة دخول منفصلة** و **بناء منفصل** (dist/ vs dist-admin/)
- **لا توجد مسارات `/super-admin`** في تطبيق المستخدم

### Route Structure
- `/` — Main page (redirects to /dashboard)
- `/auth` — Login / signup / forgot password
- `/reset-password` — Password reset via email link
- `/dashboard` — User dashboard (own data only, `DashboardLayout`)
  - `/dashboard` — My campaigns
  - `/dashboard/sms-logs` — SMS logs
  - `/dashboard/api-keys` — API keys
  - `/dashboard/devices` — Registered devices
  - `/dashboard/settings` — Account settings
- `/super-admin` — Super admin panel (requires `admin` role, separate app)
  - `/super-admin` — Dashboard overview
  - `/super-admin/users` — User management
  - `/super-admin/users/:userId` — User detail
  - `/super-admin/campaigns` — All campaigns
  - `/super-admin/logs` — All SMS logs
  - `/super-admin/api-keys` — All API keys
  - `/super-admin/devices` — All devices
  - `/super-admin/roles` — Role management
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

### Entry Points
| File | Purpose |
|------|---------|
| `src/user/main.tsx` | User app React entry point |
| `src/user/App.tsx` | User app Router + providers |
| `src/user/index.html` | User app HTML shell (Vite root) |
| `src/admin/main.tsx` | Admin app React entry point |
| `src/admin/AdminApp.tsx` | Admin app Router + providers + lazy loading |
| `src/admin/AdminAuth.tsx` | Admin login page with role check |
| `src/admin/index.html` | Admin app HTML shell (Vite root) |

### Pages (User)
| File | Purpose |
|------|---------|
| `src/user/pages/Auth.tsx` | Login / signup / forgot password |
| `src/user/pages/ResetPassword.tsx` | Password reset via email recovery link |
| `src/user/pages/NotFound.tsx` | 404 page |

### User Dashboard (`src/user/components/dashboard/`)
| File | Purpose |
|------|---------|
| `DashboardLayout.tsx` | User dashboard shell (sidebar nav) |
| `MyCampaigns.tsx` | User's campaigns with pagination + detail view |
| `MySmsLogs.tsx` | User's SMS logs with pagination |
| `MyApiKeys.tsx` | User's API keys (masked, create/delete) |
| `MyDevices.tsx` | User's registered devices (remove) |
| `AccountSettings.tsx` | Update password |
| `NewCampaignDialog.tsx` | Campaign creation wizard dialog |

### Super Admin (`src/admin/components/`)
| File | Purpose |
|------|---------|
| `SuperAdminLayout.tsx` | Admin shell (sidebar nav) |
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
| `src/shared/components/CampaignDetail.tsx` | Campaign detail dialog (has `adminMode` prop) |
| `src/shared/components/ConfirmDialog.tsx` | Reusable confirmation dialog |
| `src/shared/components/ErrorBoundary.tsx` | React error boundary |
| `src/shared/components/Pagination.tsx` | Reusable pagination (pageSize=50) |
| `src/shared/components/PasswordInput.tsx` | Password field with show/hide toggle |
| `src/shared/components/Spinner.tsx` | Loading spinner with Arabic label |
| `src/shared/components/StatusBadges.tsx` | Campaign/message status badges + icons |
| `src/shared/components/ui/*` | shadcn/ui primitives (button, card, dialog, etc.) |
| `src/shared/hooks/useAuth.tsx` | Auth context provider + useAuth hook |
| `src/shared/hooks/use-toast.ts` | Toast hook |
| `src/shared/lib/formatDate.ts` | Locale-aware date formatting |
| `src/shared/lib/statusData.ts` | Status label/variant mappings |
| `src/shared/lib/utils.ts` | `cn()` utility for Tailwind class merging |
| `src/shared/types/campaign.ts` | CampaignInfo, CampaignMessage interfaces |
| `src/shared/integrations/supabase/client.ts` | Supabase client |
| `src/shared/integrations/supabase/types.ts` | DB type definitions |
| `src/user/components/ColumnMapper.tsx` | Auto-detect + manual column mapping |
| `src/user/components/DataPreview.tsx` | Excel data preview table |
| `src/user/components/FileUploader.tsx` | Drag-and-drop Excel upload (MIME validated) |
| `src/user/components/SendButton.tsx` | Send button + loading state |
| `src/user/lib/columnDetection.ts` | Column type detection utilities + ColumnMapping type |

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
| `create-admin/index.ts` | Creates admin user |
| `verify-api-key/index.ts` | Public API key verification for external platforms (IP rate-limited) |
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
npm run dev          # Start Vite dev server (user app, port 5180)
npm run dev:admin    # Start Vite dev server (admin app, port 5181)
npm run build        # Build user app for production (dist/)
npm run build:admin  # Build admin app for production (dist-admin/)
npm run lint         # Run ESLint
npm run deploy:db    # Push all pending migrations to Supabase
npm run deploy:functions  # Deploy all Edge Functions
npm run deploy:all   # Deploy DB + all Edge Functions
```

## Code Conventions

- Arabic-first UI (RTL layout, Arabic labels)
- Supabase client from `src/shared/integrations/supabase/client.ts`
- Types from `src/shared/integrations/supabase/types.ts`
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

- **Interface isolation**: Admin UI and user UI are completely separate Vite builds
- Admin role is `admin` in DB enum (not `super_admin`)
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
- Super admin routes require `admin` role in `user_roles` table
- DB constraints: `rate_limits.messages_sent >= 0`, `sms_logs.status IN (...)`
- Triggers: device count limit (5/user), campaign message count auto-update
- Admin app runs on separate port/build — no admin code in user bundle
- `verify-api-key` is public (no auth), rate limits: 10 requests/hour/IP, returns user info on valid key

## ⚠️ Setup Required

Before first deploy:
1. Enable `pg_cron` extension in Supabase Dashboard → Database → Extensions
2. Run `supabase db push` to apply all migrations (including `20260715000001`)
3. Deploy Edge Functions: `supabase functions deploy`
4. Set `CORS_ORIGIN` env var in Supabase Dashboard for production domain
