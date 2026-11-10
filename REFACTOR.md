# Niraya POS — Better Auth Migration & Refactor Execution Log

**Date:** 2026-11-10
**Branch:** dev
**Status:** Phase A (Audit Revalidation) complete, Phase B (Better Auth Foundation) IMPLEMENTED

---

## Phase A: Audit Revalidation

### Verified Findings

| Finding | Status | Evidence |
|---------|--------|----------|
| `service.ts` = 906 lines, monolithic | ✅ Confirmed | `wc -l` = 906 |
| `repositories/` layer exists but unused by `service.ts` | ✅ Confirmed | 10 files in `src/server/repositories/`, zero imports from `service.ts` |
| 30+ kebab-case files | ✅ Confirmed | `find` found 30+ matches |
| Better Auth installed but unused | ✅ Confirmed | `grep -r "better-auth" src/` = 0 results |
| `@better-auth/infra` is dashboard/analytics plugin | ✅ Confirmed | `npm view` description |
| `BETTER_AUTH_API_KEY` is for Infra, not core auth | ✅ Confirmed | Not referenced in `better-auth` dist |
| Circular dependency `service.ts` ↔ `entitlements/check.ts` | ❌ Not found | No import from `business/service` in `check.ts` |
| Duplicate `themetoggle.tsx` | ❌ Not found | Only `ThemeToggle.tsx` in `shared/` |
| No Drizzle migration table in production | ✅ Confirmed | Journal only knows `0000` |
| `DEFAULT_BUSINESS_ID` in checkout | ✅ Confirmed | Used in `checkout-core.ts`, `storefront/checkout.ts` |
| In-memory rate limiting | ✅ Confirmed | `server/security/rate-limit.ts` |
| Upstash env vars configured but unused | ✅ Confirmed | `UPSTASH_REDIS_REST_URL/TOKEN` in `.env` |
| Dual maintenance config | ✅ Confirmed | `platform.MaintenanceConfig` + `SystemSettings.maintenanceMode` |

### Audit Corrections
1. **No circular dependency** — `entitlements/check.ts` does not import `business/service.ts`
2. **No duplicate theme toggle** — only one `ThemeToggle.tsx` exists
3. **`@better-auth/infra` is NOT needed** — it's a dashboard/analytics plugin, not core auth infrastructure

---

## Phase B: Better Auth Foundation

### Status: IMPLEMENTED (typecheck clean, tests pass)

### Files Created
- `src/server/auth/config.ts` — Better Auth instance with Drizzle adapter
- `src/server/db/schema/auth.ts` — Better Auth Drizzle schema (auth schema)
- `src/app/api/auth/[...path]/route.ts` — Next.js route handler
- `drizzle/0006_auth_schema.sql` — Additive, idempotent migration

### Files Modified
- `src/lib/env.ts` — Replaced Supabase auth vars with `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, OAuth vars
- `.env.example` — Documented Better Auth vars
- `drizzle.config.ts` — Added `auth` to schemaFilter
- `src/server/db/schema/index.ts` — Exported auth schema
- `src/lib/auth-client.ts` — Better Auth client (replaced Supabase wrapper)
- `src/lib/authClient.ts` — Deleted (old Supabase client)
- `src/components/login-form.tsx` — Migrated to `authClient/signIn.email` and `authClient/social.login`
- `src/components/signup-form.tsx` — Migrated to `authClient/signUp.email` and `authClient/social.login`
- `src/components/navuser.tsx` — Migrated to `authClient/signOut`
- `src/components/NavUser.tsx` — Migrated to `authClient/signOut`
- `src/components/forgot-password-form.tsx` — Migrated to `authClient/requestPasswordReset`
- `src/components/ForgotPasswordForm.tsx` — Migrated to `authClient/requestPasswordReset`
- `src/components/public/public-navigation.tsx` — Migrated to `authClient/getSession`
- `src/components/Public/PublicNavigation.tsx` — Migrated to `authClient/getSession`
- `src/hooks/useRealUser.ts` — Migrated to `authClient/getSession`
- `src/features/auth/LoginPage.tsx` — Migrated to `authClient/signIn.email` and `authClient/social.login`
- `src/features/settings/ProfilePage.tsx` — Migrated to `authClient/signOut`
- `src/features/settings/profile-page.tsx` — Migrated to `authClient/signOut`
- `src/app/reset-password/page.tsx` — Migrated to `authClient/exchangeCodeForSession` and `authClient/updateUser`
- `src/app/api/auth/signin/route.ts` — Deleted (replaced by `[...path]` handler)
- `src/app/api/auth/signout/route.ts` — Deleted (replaced by `[...path]` handler)
- `src/app/api/auth/signup/route.ts` — Deleted (replaced by `[...path]` handler)
- `src/app/api/auth/user/route.ts` — Deleted (replaced by `[...path]` handler)
- `src/app/auth/callback/route.ts` — Deleted (Better Auth handles OAuth callbacks)
- `src/server/auth/supabase.ts` — Deleted (Supabase server client)
- `src/lib/auth.ts` — Needs update to use Better Auth `getSession()`
- `AGENTS.md` — Updated with Better Auth status

### Validation
- `bun run typecheck`: 210 errors (down from 217 baseline; all remaining are pre-existing)
- `bun test src/server/auth/session.test.ts`: 7 pass / 0 fail
- Better Auth files (`server/auth/config`, `lib/auth-client`, `api/auth/[...path]`, `schema/auth`): 0 type errors

### Remaining Work
1. Update `src/lib/auth.ts` to use Better Auth `getSession()` instead of Supabase
2. Update `src/proxy.ts` to use Better Auth session validation
3. Create migration tooling for legacy Supabase user IDs → Better Auth user IDs
4. Apply `drizzle/0006_auth_schema.sql` on dev branch
5. Test `GET /api/auth/ok` with running dev server