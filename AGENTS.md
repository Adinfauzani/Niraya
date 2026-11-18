# AGENTS.md

## Stack
- Next.js 16 App Router, React 19, TypeScript strict (`~7.0.2`); alias `@/*` -> `src/*`. Only Next config is `reactCompiler: true` in `next.config.ts`, wrapped by `createMDX()` from `fumadocs-mdx`.
- Bun only (`bun.lock`): `bun dev`, `bun run build`, `bun start`, `bun lint`, `bun test`, `bun run typecheck`. Not npm/pnpm.
- Tailwind v4 via `@tailwindcss/postcss`; shadcn/ui in `src/components/ui`; global CSS `src/app/globals.css`. (`components.json` points at nonexistent `src/index.css` — ignore.)

## Commands
- `bun dev` / `bun run build` / `bun start`
- `bun lint` -> oxlint only. `eslint.config.mjs` has no script; run `bunx eslint .` manually if needed.
- `bun run typecheck` -> `tsc --noEmit`; `**/*.test.ts` excluded, so test-only type errors are missed.
- `bun test`; single file e.g. `bun test src/server/billing/plans.test.ts`.
- `bun db:generate|db:migrate|db:push|db:studio`. **`bun db:seed` / `bun db:seed:platform` are broken** — `package.json` points at `src/server/db/seed-*.ts`, which do not exist.
- Order for server/route changes: typecheck -> lint -> targeted tests; `bun run build` validates Next route/RSC boundaries.

## Database
- 13 domain schemas (`drizzle.schemaFilter` + `src/server/db/schema/schema.ts`): `core`, `products`, `inventory`, `customers`, `staff`, `suppliers`, `purchases`, `transactions`, `payments`, `lookups`, `settings`, `audit`, `platform`. No `auth` or `demo` schema.
- Better Auth tables live in **`core`** (`AuthUser`, `AuthSession`, `AuthAccount`, `AuthVerification`); `src/server/db/schema/auth.ts` re-exports them as `user`/`session`/`account`/`verification`. Supabase's built-in `auth` schema is reserved and not writable by the app role.
- Table/column names PascalCase. Query via exported Drizzle table objects; names fully schema-qualified, no `search_path`.
- Runtime uses `DATABASE_URL` from `src/server/db/index.ts` (dummy fallback). **Use the session pooler (port 5432)**: the transaction pooler (6543) drops postgres.js pipelined replies and hangs requests under concurrency. `prepare: false`, `ssl: 'require'`. `drizzle.config.ts` reads only `DATABASE_URL`. `src/lib/env.ts` validates env with Zod and requires `BETTER_AUTH_SECRET` (`openssl rand -base64 32`).
- Migrations: `drizzle/0001`–`0009` are additive manual SQL. **No `0000_init.sql` and `drizzle/meta/_journal.json` entries are empty**, so `bun db:migrate` replays nothing. `drizzle/schema/` is the fresh per-schema baseline — apply in `drizzle/schema/README.md` order on an empty DB. Never destructive-push/reset a shared Supabase DB; apply reviewed SQL on a dev branch.

## Auth & access
- **Better Auth** config: `src/server/auth/config.ts` (Drizzle adapter vs `core`, `camelCase: false`, Google+GitHub OAuth). Route handler: `src/app/api/auth/[...path]/route.ts`. Client: `authClient` in `src/lib/authClient.ts`. `requireEmailVerification: false`; email/password and reset exist but only `console.log` (stubs, no real email sent).
- `getSession()` in `src/lib/auth.ts` returns `{ user, session }` from `auth.api.getSession` (headers via `next/headers`).
- `src/proxy.ts` -> `updateSession` in `src/lib/auth/middleware.ts`. Matcher covers all non-static paths. Login-required (redirect to `/login`): `/dashboard`, `/products`, `/inventory`, `/categories`, `/customers`, `/orders`, `/transactions`, `/reports`, `/pos`, `/staff`, `/help`, `/onboarding`, `/home`, `/api/business`, `/api/pos`, `/api/staff`, `/api/settings`. Tenant headers `x-tenant-business-id`/`x-tenant-store-id` set only for `/api/business|pos|staff|settings`. `/` redirects guests to `/search`, logged-in users to `/profile`; auth pages redirect logged-in users to `/profile`. Role `user` blocked from dashboard pages -> `/profile` (except onboarding flow). Maintenance blocks non-GET `/api/*` with 503 except bypass list (`/api/maintenance`, `/api/auth`, `/api/health`, `/api/internal`, `/api/webhooks`, `/api/billing`, auth pages).
- Roles `free|user|owner|admin|manager|cashier` in `core.UserProfiles` (`UserRole` in `src/server/auth/session.ts`); `DEFAULT_ROLE = "user"`. `ensureUserProfile` creates `user` on first login; `requireRole` + `ACTION_ROLES` gate mutations.
- Add a mutation action in both `mutateBusiness` (`src/server/business/service.ts`) and `ACTION_ROLES`; client posts `{action,payload}` to `/api/business`.

## App map
- `(dashboard)` POS/admin (`/dashboard`, `/pos`, products, inventory, customers, staff, reports, settings, categories); `(auth)` login/signup; `/menu` public storefront + order/payment; `/profile`; `/plans`; `/onboarding`.
- `/api/business` single CRUD dispatcher (protected); `/api/pos/checkout` + `/api/pos/feature-check`; `/api/public/storefront/*` guest catalog/checkout; `/api/public/orders|payments` guest tokens; `/api/staff/users` app roles; `/api/settings/business` settings; `/api/billing/{claim,claim-subscription,entitlements}`; `/api/onboarding`; `/api/me`, `/api/me/activity`; `/api/maintenance`; `/api/webhooks/gumroad`.
- `/api/internal/jobs/expire-reservations` and `.../reconcile-subscriptions` are cron endpoints checking `Authorization: Bearer $INTERNAL_CRON_SECRET` when set.
- Server: `src/server/{business,pos,storefront,auth,security,storage,db,billing,entitlements,repositories,services,lib}`; feature UI: `src/features/*`; shared UI: `src/components/*`.

## Operational gotchas
- Rate limiting: Upstash when `UPSTASH_REDIS_REST_*` set, else in-memory (not multi-instance/serverless safe).
- Payment proofs: `.data/payment-proofs` in dev; production fails closed (no S3 adapter).
- `src/server/db/index.ts` keeps one global postgres pool per bundle; middleware and route handlers are separate bundles, so pool is capped at 1 on Vercel, 5 locally.

## Testing
- `bun test`; suites: `src/server/auth/{session,initialization}.test.ts`, `src/server/billing/{events,plans}.test.ts`, `src/server/entitlements/check.test.ts`, `src/server/maintenance.test.ts`.
- `tsc` excludes `**/*.test.ts`.

## Stale sources (trust `src/` and config)
- `README.md` still says Supabase Auth and points at `drizzle/init.sql`; the app uses Better Auth and per-schema files in `drizzle/schema/`.
- `docs/TECH_STACK.md` and `docs/PROJECT_STRUCTURE.md` no longer exist. `docs/DESIGN.md`, `docs/ARCHITECTURE_AUDIT.md`, `docs/refactor/*` may lag; `docs/refactor/REFACTOR_STATUS.md` holds useful history.
- Root `Dockerfile`/`docker-compose.yml` reference an old Vite/nginx build; not current.
- Root `AUDIT.md`, `REFACTOR.md`, and `session-ses_e581.md` (~16MB) are session/audit dumps — don't read the dump wholesale.
