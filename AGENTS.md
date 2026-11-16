# AGENTS.md

## Stack
- Next.js 16 App Router, React 19, TypeScript strict (`~7.0.2`); alias `@/*` -> `src/*`.
- Bun only (`bun.lock`): use `bun dev`, `bun run build`, `bun start`, `bun lint`, `bun test`; not npm/pnpm.
- Tailwind v4 via `@tailwindcss/postcss`; shadcn/ui in `src/components/ui`; real global CSS is `src/app/globals.css` (`components.json` points at a nonexistent `src/index.css` — ignore that).
- `reactCompiler: true` in `next.config.ts` (that is the only Next config).
- Drizzle ORM + `postgres-js` + **Supabase Postgres** (transaction pooler port 6543, `prepare: false`, `ssl: 'require'`). Supabase is Postgres only.
- **Better Auth** is the app auth; Supabase Auth is legacy/migration only. No `@neon/*` deps.

## Commands
- `bun dev` / `bun run build` / `bun start`
- `bun lint` -> oxlint only. `eslint.config.mjs` exists but has no script; run `bunx eslint .` manually if needed.
- `bun run typecheck` -> `tsc --noEmit`; test files are excluded (`**/*.test.ts`), so typecheck misses test-only errors.
- `bun test`; single file e.g. `bun test src/server/billing/plans.test.ts`.
- `bun db:generate|db:migrate|db:push|db:studio`. **`bun db:seed` / `bun db:seed:platform` are broken** — `package.json` points at `src/server/db/seed-*.ts`, which no longer exist.
- For server/route changes: typecheck -> lint -> targeted tests; use `bun run build` to validate Next route/RSC boundaries.

## Database
- Domain schemas (drizzle `schemaFilter` + `src/server/db/schema/schema.ts`): `core`, `products`, `inventory`, `customers`, `staff`, `suppliers`, `purchases`, `transactions`, `payments`, `lookups`, `settings`, `audit`, `platform`. No `auth` or `demo` schema.
- Better Auth tables live in **`core`** (`AuthUser`, `AuthSession`, `AuthAccount`, `AuthVerification`); `src/server/db/schema/auth.ts` re-exports them as `user`/`session`/`account`/`verification`. The Supabase built-in `auth` schema is reserved and not writable by the app role.
- `platform` is SaaS billing: `Plans`, `Subscriptions`, `WebhookEvents`. **Gumroad is the billing source of truth** (`/api/webhooks/gumroad`, `src/server/billing/*`); the tables mirror plan/subscription state for entitlements. `platform.Subscriptions.BusinessId` is nullable until the buyer claims with the purchase email. `src/lib/freemius.ts` exists but Freemius is not wired.
- Table/column names are PascalCase. Query through the exported Drizzle table objects; names are fully schema-qualified, so no `search_path`.
- Runtime uses `DATABASE_URL` from `src/server/db/index.ts` (dummy fallback). `drizzle.config.ts` reads only `DATABASE_URL` (`DATABASE_URL_UNPOOLED` is not wired). `src/lib/env.ts` validates env with Zod and requires `BETTER_AUTH_SECRET`.
- Migrations: `drizzle/0001`–`0006` are additive manual SQL. **There is no `0000_init.sql` and `drizzle/meta/_journal.json` has empty entries**, so `bun db:migrate` replays nothing. `drizzle/schema/` is the fresh per-schema baseline (apply in `drizzle/schema/README.md` order on an empty DB). Never destructive-push/reset a shared Supabase DB; apply reviewed SQL on a dev branch.

## Auth & access
- **Better Auth** centralized config: `src/server/auth/config.ts` (Drizzle adapter against `core`, `camelCase: false`, Google+GitHub OAuth). Route handler: `src/app/api/auth/[...path]/route.ts`. Client: `authClient` in `src/lib/auth-client.ts`.
- `getSession()` in `src/lib/auth.ts` returns `{ user, session }` from `auth.api.getSession` (user at `session.user`).
- `src/proxy.ts` is a thin wrapper delegating to `updateSession` in `src/lib/auth/middleware.ts`. Proxy-protected (redirect to `/login` if no user): `/dashboard`, `/api/business`, `/api/pos`, `/api/staff`, `/api/settings`. Other paths pass through the proxy (route handlers still enforce their own auth). Maintenance mode blocks non-GET `/api/*` mutations with 503 except a bypass list (`/api/auth`, `/api/health`, `/api/internal`, `/api/webhooks`, `/api/billing`, `/api/maintenance`, auth pages). Sets `x-tenant-business-id`/`x-tenant-store-id` headers; `/` redirects authed users to `/dashboard`; role `user` is redirected to `/profile` (except the onboarding flow).
- Roles `free|user|cashier|manager|admin|owner` live in `core.UserProfiles` (`UserRole` in `src/server/auth/session.ts`); `DEFAULT_ROLE = "user"`. `ensureUserProfile` creates `user` on first login; `requireRole` + `ACTION_ROLES` gate mutations in `src/server/auth/session.ts`.
- Add a mutation action in both `mutateBusiness` (`src/server/business/service.ts`) and `ACTION_ROLES`; the client posts `{action,payload}` to `/api/business`.
- Better Auth is configured with `requireEmailVerification: true` and email/password, but no real email is sent (password reset only `console.log`s) — verify/reset flows are stubs.

## App map
- `(dashboard)` authenticated POS/admin (`/dashboard`, `/pos`, products, inventory, customers, staff, reports, settings, categories); `(auth)` login/signup; `/menu` public storefront + order/payment; `/profile`; `/plans`; `/onboarding`.
- `/api/business` is the single CRUD dispatcher (protected); `/api/pos/checkout` + `/api/pos/feature-check` (protected); `/api/public/storefront/*` guest catalog/checkout; `/api/public/orders|payments` use guest tokens; `/api/staff/users` manages app roles; `/api/settings/business` manages settings; `/api/billing/{claim,claim-subscription,entitlements}`; `/api/onboarding`; `/api/me`, `/api/me/activity`; `/api/maintenance`; `/api/webhooks/gumroad`.
- `/api/internal/jobs/expire-reservations` and `.../reconcile-subscriptions` are cron endpoints that check `Authorization: Bearer $INTERNAL_CRON_SECRET` when set.
- Server: `src/server/{business,pos,storefront,auth,security,storage,db,billing,entitlements,repositories,services,lib}`; feature UI: `src/features/*`; shared UI: `src/components/*`.

## Operational gotchas
- Rate limiting uses Upstash when `UPSTASH_REDIS_REST_*` is set, otherwise in-memory (not safe on multi-instance/serverless).
- Payment proofs use `.data/payment-proofs` in dev; production fails closed (the S3 adapter is not implemented).

## Testing
- `bun test`; current suites are mostly pure unit tests: `src/server/auth/{session,initialization}.test.ts`, `src/server/billing/{events,plans}.test.ts`, `src/server/entitlements/check.test.ts`, `src/server/maintenance.test.ts`.
- `tsc` excludes `**/*.test.ts`, so typecheck misses test-only type errors.

## Stale sources (trust `src/` and config)
- `docs/TECH_STACK.md` and `docs/PROJECT_STRUCTURE.md` no longer exist. `docs/DESIGN.md`, `docs/ARCHITECTURE_AUDIT.md`, and `docs/refactor/*` may lag the code; `docs/refactor/REFACTOR_STATUS.md` holds the useful refactor/security history.
- Root `Dockerfile`/`docker-compose.yml` still reference an old Vite/nginx build (missing `Dockerfile.api`/`Dockerfile.web`); not the current path.
- Root `AUDIT.md`, `REFACTOR.md`, and the ~16MB `session-ses_e581.md` are session/audit dumps — do not read the session dump wholesale.