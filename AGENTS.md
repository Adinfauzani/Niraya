# AGENTS.md

## Stack
- Next.js 16 App Router, React 19, TypeScript strict (`~7.0.2`); alias `@/*` -> `src/*`.
- Bun only (`bun.lock`): use `bun dev`, `bun run build`, `bun start`, `bun lint`, `bun test`; not npm/pnpm.
- Tailwind v4 via `@tailwindcss/postcss`; shadcn/ui in `src/components/ui`; global CSS is `src/app/globals.css` (`components.json` still points at the missing `src/index.css`).
- `reactCompiler: true` in `next.config.ts`.
- Drizzle ORM + `pg`; Neon Auth. There is no Hono/Vite/tRPC server in this tree despite older docs and Docker files.

## Commands
- `bun dev` / `bun run build` / `bun start`
- `bun lint` -> oxlint only. `eslint.config.mjs` exists but has no script; run `bunx eslint .` manually if needed.
- `bun run typecheck` -> `tsc --noEmit`; test files are excluded.
- `bun test`; single file e.g. `bun test src/server/pos/checkout-phase7.test.ts`.
- `bun db:generate|db:migrate|db:push|db:studio`; `bun db:seed` seeds real tables via `src/server/db/seed-business.ts`; `bun db:seed:platform` seeds the SaaS plan catalog (`src/server/db/seed-platform.ts`).
- For server/route changes: typecheck -> lint -> targeted tests; use `bun run build` to validate Next route/RSC boundaries.

## Database
- Domain schemas: `core`, `products`, `inventory`, `customers`, `staff`, `suppliers`, `purchases`, `transactions`, `payments`, `lookups`, `settings`, `audit`, `demo`, `platform`.
- `platform` is SaaS billing: `Plans`, `Subscriptions`, `WebhookEvents`. Gumroad remains the billing source of truth; the tables mirror plan/subscription state for entitlements. `platform.Subscriptions.BusinessId` is nullable until the buyer claims the subscription with the purchase email.
- `src/server/db/schema/schema.ts` defines the `pgSchema` objects and `DEFAULT_BUSINESS_ID`/`DEFAULT_STORE_ID`; each domain file exports its tables. Domain table/column names are PascalCase.
- Query through the exported Drizzle table objects; names are fully schema-qualified, so no `search_path` is used.
- `auth` is owned by Neon Auth and is excluded from `schemaFilter`; do not add or migrate auth tables.
- Runtime uses `DATABASE_URL` from `src/server/db/index.ts`, with a dummy fallback. `drizzle.config.ts` also reads only `DATABASE_URL`; `DATABASE_URL_UNPOOLED` is not wired.
- Migrations are `drizzle/0000_init.sql` plus additive `0001`–`0004`; `drizzle/meta/_journal.json` only knows `0000`. `bun db:migrate` will not replay `0001`–`0004`. Never destructive-push/reset a shared Neon DB; apply reviewed SQL on a dev branch.
- `drizzle/schema/` is a fresh per-schema baseline (one file per schema; apply in the order listed in `drizzle/schema/README.md` on an empty DB). The legacy `0000`–`0004` files and journal are unchanged.
- `demo` schema is declared/filtered but has no tables yet.

## Auth & access
- Neon Auth server `src/server/auth/index.ts`; catch-all handler `src/app/api/auth/[...path]/route.ts`; client `authClient` in `src/lib/auth-client.ts`.
- `getSession()` in `src/lib/auth.ts`; the user is at `session.user` or `session.data.user` — handle both.
- `src/proxy.ts` is the Next 16 proxy (not `middleware.ts`). Public routes include `/`, `/login`, `/signup`, `/register`, `/menu*`, `/plans`, `/profile`, `/api/business`, `/api/demo/seed`, `/api/public/*`, `/api/internal/jobs/*` (see file for exact list). Everything else, including `/api/health`, requires a session.
- Roles `user|cashier|manager|admin|owner` live in `core.UserProfiles`, not Neon Auth tables. `ensureUserProfile` creates `user` on first login; `requireRole` + `ACTION_ROLES` gate mutations in `src/server/auth/session.ts`. `(dashboard)/layout.tsx` redirects role `user` to `/profile`.
- Add a mutation action in both `mutateBusiness` (`src/server/business/service.ts`) and `ACTION_ROLES`; the client posts `{action,payload}` to `/api/business`.

## App map
- `(dashboard)` authenticated POS/admin; `(auth)` login/signup; `/menu` public storefront + order/payment; `/profile`.
- `/api/business` is the single CRUD dispatcher; `/api/pos/checkout` is authenticated POS; `/api/public/storefront/*` is guest catalog/checkout; `/api/public/orders|payments` use guest tokens; `/api/staff/users` manages app roles; `/api/settings/business` manages settings.
- `/api/internal/jobs/expire-reservations` is public in `proxy.ts` but checks `Authorization: Bearer $INTERNAL_CRON_SECRET` when set.
- Server: `src/server/{business,pos,storefront,auth,security,storage,db}`; feature UI: `src/features/*`; shared UI: `src/components/*`.

## Demo & operational gotchas
- `/api/business` trusts cookie `niraya_demo=1`: GET returns static `createSeedData()`, POST returns `{ok:true}`, with no auth/DB. No UI sets this cookie.
- `/api/demo/seed` is a no-op placeholder. Do not assume demo data is in the `demo` schema.
- Rate limiting uses Upstash when `UPSTASH_REDIS_REST_*` is set, otherwise in-memory (not safe on multi-instance/serverless). Payment proofs use `.data/payment-proofs` in dev; production storage currently fails closed (the S3 adapter is not implemented).

## Testing quirks
- `src/server/business/*` and `src/server/pos/*` tests hit the real DB and insert/clean rows. Use a dev-branch `DATABASE_URL`, never production; the dummy fallback will fail.
- `src/server/auth/session.test.ts` and `src/server/security/rate-limit.test.ts` are pure unit tests.
- `tsc` excludes `**/*.test.ts`, so typecheck misses test-only type errors.

## Stale sources
- `docs/TECH_STACK.md`, `docs/PROJECT_STRUCTURE.md`, and `docs/DESIGN.md` describe an older Vite/Hono layout (and missing `src/styles/*`); trust `src/` and config. `docs/refactor/REFACTOR_STATUS.md` has the useful refactor/security history.
- Root `Dockerfile`/`docker-compose.yml` reference an old Vite/nginx build and missing `Dockerfile.api`/`Dockerfile.web`; not the current deployment path.
