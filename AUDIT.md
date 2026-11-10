# Niraya POS — Comprehensive Audit Report

**Date:** 2026-11-10
**Commit:** Current working tree
**Branch:** master

---

## 1. Repository Discovery Summary

### Stack Verification (from source code)
- **Framework:** Next.js 16.4.4 (App Router, React 19, `reactCompiler: true`)
- **Language:** TypeScript strict (`~7.0.2`), path alias `@/*` → `src/*`
- **Package Manager:** Bun only (`bun.lock`, scripts use `bun`)
- **Styling:** Tailwind v4 via `@tailwindcss/postcss`, shadcn/ui in `src/components/ui`
- **Database:** Drizzle ORM + `pg` (node-postgres Pool), **Supabase PostgreSQL** (pooler port 6543)
- **Auth:** **Supabase Auth** (SSR via `@supabase/ssr`, middleware in `src/proxy.ts`) — NOT Neon Auth despite docs mentioning it
- **State:** TanStack Query v5 + Zustand v5
- **Billing:** Gumroad (webhook + checkout integration)
- **Deployment Target:** Vercel (implied by Next.js 16, serverless functions)

### Project Structure (276 source files)
```
src/
├── app/                    # Next.js routing (route groups: (dashboard), (auth))
│   ├── api/               # 23 API routes (business, pos, billing, maintenance, etc.)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── (auth)/            # Auth pages (login, signup, register)
│   ├── menu/              # Public storefront
│   ├── onboarding/        # Redirects to /dashboard/onboarding
│   └── profile/           # User profile
├── components/             # Shared UI (ui/, layout/, pos/, maintenance/, shared/, landing/)
├── features/               # Domain features (pos, products, inventory, customers, staff, etc.)
├── server/                 # Server-side logic
│   ├── auth/              # Session, RBAC, initialization, business-context
│   ├── billing/           # Subscriptions, plans, Gumroad events
│   ├── business/          # Business service (CRUD, mutations)
│   ├── db/                # Drizzle client, schema, seeds
│   ├── entitlements/      # Plan limit checks
│   ├── pos/               # POS checkout core
│   ├── security/          # Rate limiting
│   ├── storefront/        # Storefront checkout, catalog, payments
│   └── storage/           # Payment proof storage
├── lib/                    # Shared utilities (auth, api, env, utils, supabase client/server)
├── hooks/                  # Shared React hooks
├── stores/                 # Zustand stores (business-store, ui-store)
└── types/                  # Shared TypeScript types
```

### Database (13 domain schemas in `src/server/db/schema/`)
| Schema | Tables | Notes |
|--------|--------|-------|
| core | Roles, Permissions, RolePermissions, Businesses, Stores, UserProfiles, BusinessMembers | Foundation |
| products | Products, ProductVariants, ProductBarcodes, Categories | Catalog |
| inventory | Inventory, StockMovements, StockAdjustments | Stock tracking |
| lookups | TaxRates | Reference data |
| customers | Customers | CRM |
| staff | Staff | Operational staff |
| suppliers | Suppliers | Procurement |
| purchases | PurchaseOrders, PurchaseOrderItems | Procurement |
| transactions | Transactions, TransactionItems, TransactionDiscounts, CheckoutIdempotency | Financial |
| orders | Orders, OrderItems, OrderStatusHistory | Operational (QR/POS unified) |
| payments | Payments, TransactionRefunds, RefundItems, WebhookEvents | Payments |
| settings | 10 tables (BusinessSettings, StoreSettings, ReceiptSettings, BusinessProfile, NotificationSettings, PrivacySecuritySettings, AccountSettings, AppearanceSettings, OperationalSettings, PaymentSettings, SystemSettings) | Config |
| audit | AuditLogs | Audit trail |
| platform | Plans, Subscriptions, WebhookEvents, MaintenanceConfig | SaaS platform |

---

## 2. Product & Business Architecture Audit

### Current Domain Model
```
User (Supabase Auth)
  └── UserProfiles (core) — role: user|owner|admin|manager|cashier
        └── BusinessMembers (core) — links User → Business with role + optional storeId
              └── Business (core) — owns Stores, has Settings, Subscriptions
                    └── Store (core) — operational location
                          └── Products, Customers, Staff, Inventory, Transactions, Orders
```

### Identified Issues

| Issue | Severity | Description |
|-------|----------|-------------|
| **Dual maintenance config** | High | `SystemSettings.maintenanceMode` (per-business) conflicts with `platform.MaintenanceConfig` (platform-wide). Both exist but serve different scopes without clear boundary. |
| **DEFAULT_BUSINESS_ID/STORE_ID leakage** | High | Used as fallback in POS checkout, storefront checkout, business service. Should be validated membership context, not global defaults. |
| **Subscription ↔ Business ownership unclear** | Medium | `Subscriptions.businessId` nullable until claimed. Business creation doesn't auto-link subscription. `getPrimaryBusinessForUser` prioritizes owner/admin but subscription may belong to different business. |
| **Role system duplication** | Medium | `core.Roles/Permissions/RolePermissions` exists but `ACTION_ROLES` in `session.ts` is hardcoded map. No dynamic RBAC from DB. |
| **Staff vs BusinessMembers confusion** | Medium | `staff.Staff` table (operational staff for POS) vs `core.BusinessMembers` (login users with roles). Different purposes but overlapping concepts. |
| **No tenant isolation in queries** | High | Many queries use `DEFAULT_BUSINESS_ID` without validating user membership. Risk of cross-tenant data access. |
| **Plan entitlements not enforced in UI** | Medium | `resolveEntitlements` exists but UI doesn't gate features by plan (maxUsers, maxStores, maxProducts). |
| **Subscription status sync** | Medium | Webhook processes Gumroad events but no scheduled reconciliation job for missed webhooks. |

### Business Policies Needing Clarification
1. **Can one Supabase user own multiple Businesses?** Current: Yes (BusinessMembers allows multiple), but onboarding only creates one.
2. **Can a Business have multiple Stores?** Current: Yes (Stores table), but POS/checkout uses `DEFAULT_STORE_ID`.
3. **What happens when subscription expires?** Current: `isSubscriptionUsable` has 3-day grace, but no UI enforcement or feature gating.
4. **Staff (operational) vs Members (login) relationship?** Current: Separate tables, no link. Staff email ≠ auth user email.
5. **Platform-wide vs per-business maintenance?** Current: Both exist. Platform config in `platform.MaintenanceConfig`, per-business in `SystemSettings`.

---

## 3. Application Architecture Audit

### Current vs Target Structure

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| **API Routes** | 23 routes, mixed patterns | Thin handlers → Service layer | `/api/business` is dispatcher with 40+ actions; others direct |
| **Service Layer** | `server/business/service.ts` (906 lines, monolithic) | Domain services per feature | Single file handles categories, products, customers, staff, stock, transactions, stores |
| **Repository Layer** | `server/repositories/` empty | Query builders per domain | Direct Drizzle queries in services |
| **Feature Modules** | `features/` has pages + components + hooks mixed | Colocate feature logic | Hooks in `features/pos/hooks/`, components in `features/pos/components/` and `components/pos/` |
| **Shared Components** | `components/ui/` (shadcn), `components/shared/`, `components/pos/`, `components/maintenance/` | Consolidate | Duplicate theme toggles, scattered POS components |
| **State Management** | Zustand (business-store) + TanStack Query | Keep, but separate server/client state | Business-store mixes optimistic UI + server sync |
| **Types** | `types/business.ts`, `types/dashboard.ts`, `types/pos.ts` | Shared `types/` + feature types | Some types duplicated between server/client |

### Architecture Violations
1. **Business logic in API routes**: `/api/business/route.ts` has 239 lines with inline queries
2. **Direct DB access in services**: No repository abstraction, raw Drizzle everywhere
3. **Mixed client/server code**: `features/pos/lib/order.ts` imported in client components
4. **No validation layer**: Zod schemas in API routes only, not shared
5. **Circular dependency risk**: `server/business/service.ts` imports from `server/entitlements/check.ts` which imports from `server/db/schema` which imports from `server/business/service.ts` (via types)

---

## 4. Naming & Directory Convention Audit

### Directory Naming Issues
| Current | Target | Issue |
|---------|--------|-------|
| `components/landing-page/` → `components/landing/` | ✅ Already `landing-page.tsx` in root | Kebab-case dir vs file |
| `features/product-management/` → `features/product/` | Not present | Would need renaming |
| `features/user-management/` → `features/user/` | Not present | Would need renaming |
| `src/app/(dashboard)/dashboard/` | Redundant | Route group + folder same name |

### File Naming Issues (kebab-case found)
```
src/components/landing/landing-page.tsx          → landingPage.tsx
src/components/pos/payment-method-selector.tsx   → paymentMethodSelector.tsx
src/components/pos/revenue-metric.tsx            → revenueMetric.tsx
src/components/pos/transaction-status.tsx        → transactionStatus.tsx
src/features/pos/components/checkout-dialog.tsx  → checkoutDialog.tsx
src/features/pos/components/product-catalog.tsx  → productCatalog.tsx
src/features/pos/components/pos-toolbar.tsx      → posToolbar.tsx
src/features/pos/lib/order.ts                    → order.ts ✅
src/features/pos/lib/pricing.ts                  → pricing.ts ✅
src/features/pos/lib/print.ts                    → print.ts ✅
src/features/pos/lib/qris.ts                     → qris.ts ✅
src/features/pos/data/catalog.ts                 → catalog.ts ✅
src/features/storefront/order-pages.tsx          → orderPages.tsx
src/features/storefront/storefront-menu.tsx      → storefrontMenu.tsx
src/features/customers/customer-form-dialog.tsx  → customerFormDialog.tsx
src/features/customers/customer-detail-sheet.tsx → customerDetailSheet.tsx
src/features/staff/staff-form-dialog.tsx         → staffFormDialog.tsx
src/features/staff/staff-detail-sheet.tsx        → staffDetailSheet.tsx
src/features/settings/profile-page.tsx           → profilePage.tsx
src/features/settings/settings-page.tsx          → settingsPage.tsx
src/features/reports/reports-page.tsx            → reportsPage.tsx
src/features/transactions/void-transaction-dialog.tsx → voidTransactionDialog.tsx
src/features/transactions/transaction-detail-sheet.tsx → transactionDetailSheet.tsx
src/features/transactions/transactions-page.tsx  → transactionsPage.tsx
src/features/inventory/stock-adjust-dialog.tsx   → stockAdjustDialog.tsx
src/features/inventory/inventory-page.tsx        → inventoryPage.tsx
src/features/categories/category-form-dialog.tsx → categoryFormDialog.tsx
src/features/categories/categories-page.tsx      → categoriesPage.tsx
src/features/products/product-form-dialog.tsx    → productFormDialog.tsx
src/features/products/product-detail-sheet.tsx   → productDetailSheet.tsx
src/features/products/products-page.tsx          → productsPage.tsx
src/features/menu/menu-page.tsx                  → menuPage.tsx
src/features/auth/login-page.tsx                 → loginPage.tsx
src/features/dashboard/dashboard-page.tsx        → dashboardPage.tsx
src/components/themeprovider.tsx                 → themeProvider.tsx
src/components/navuser.tsx                       → navUser.tsx
src/components/appsidebar.tsx                    → appSidebar.tsx
src/components/shared/theme-toggle.tsx           → themeToggle.tsx (duplicate of themetoggle.tsx)
src/components/shared/themetoggle.tsx            → themeToggle.tsx (duplicate)
```

### Special Next.js Files (must keep)
- `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `template.tsx`, `default.tsx`
- `middleware.ts` / `proxy.ts` (current: `proxy.ts`)

---

## 5. Database Architecture Audit

### Schema Quality Issues

| Schema | Issue | Severity |
|--------|-------|----------|
| `settings/*` | 11 tables with `DEFAULT_BUSINESS_ID` default — encourages missing business context | High |
| `core.Businesses` | `ownerUserId` is text (not FK to auth), `status` check constraint but no deletedAt index | Medium |
| `core.Stores` | No unique constraint on `BusinessId + Name` (only `BusinessId + Code`) | Medium |
| `products.Products` | `stockQuantity` duplicated with `inventory.StockQuantity` (cache vs source of truth unclear) | High |
| `inventory.Inventory` | Composite PK `(productId, storeId)` but no FK to Products (only implied) | Medium |
| `transactions.Transactions` | `businessId` + `storeId` but no FK to Businesses/Stores in some envs | Medium |
| `orders.Orders` | `customerId` nullable, `diningTableId` nullable — operational vs financial confusion | Medium |
| `payments.Payments` | `transactionId` nullable (QR orders), `orderId` added — dual reference confusing | Medium |
| `platform.Subscriptions` | `businessId` nullable, `providerUserId` text — no FK to auth users | Medium |

### Migration Status
- `drizzle/0000_init.sql` — baseline
- `drizzle/0001_unified_core.sql` — applied on **dev branch only** (Orders, OrderItems, OrderStatusHistory, DiningTables, InventoryReservations, settings extensions, payments extensions)
- `drizzle/0002_qr_ordering.sql` — dev branch only
- `drizzle/0003_qr_payments_nullable_tx.sql` — dev branch only
- `drizzle/0004_guest_order_access.sql` — dev branch only
- **Production DB has ONLY `0000_init`** — no migration table in DB, journal only knows `0000`

### Critical: No Drizzle Migration Tracking in Production
- DB has no `__drizzle_migrations` table
- `drizzle/meta/_journal.json` only has `0000`
- All additive migrations (`0001`–`0004`) exist only on dev branch
- **Any production migration requires explicit SQL application + manual journal handling**

---

## 6. Authentication & Security Audit

### Current Implementation
- **Provider:** Supabase Auth (NOT Neon Auth — docs outdated)
- **Middleware:** `src/proxy.ts` → `src/lib/supabase/middleware.ts` (SSR cookie handling)
- **Session:** `getSession()` → `supabase.auth.getUser()`
- **RBAC:** `core.UserProfiles.role` + `ACTION_ROLES` map in `session.ts`
- **Profile Creation:** `ensureUserProfile()` auto-creates `user` role on first login

### Security Issues

| Issue | Severity | Location |
|-------|----------|----------|
| **No tenant validation in middleware** | High | Middleware checks auth but not business membership for protected routes |
| **DEFAULT_BUSINESS_ID in POS/checkout** | High | `checkout-core.ts`, `storefront/checkout.ts` use hardcoded defaults |
| **Rate limiting in-memory only** | High | `server/security/rate-limit.ts` — not distributed (Vercel multi-instance unsafe) |
| **No CSRF protection** | Medium | Forms/mutations lack CSRF tokens |
| **Webhook verification optional** | Medium | `GUMROAD_VERIFY_WEBHOOK=false` by default |
| **Payment proof storage local only** | High | `.data/payment-proofs` — not durable on Vercel |
| **Auth callback redirect loop risk** | Medium | `/auth/callback` redirects to `/dashboard/onboarding` which checks init status |

### Positive Patterns
- `requireRole()` / `hasRole()` server-side enforcement
- `ACTION_ROLES` map centralizes mutation permissions
- `ensureUserProfile()` idempotent
- Middleware bypasses auth for public routes correctly

---

## 7. Billing & Subscription Audit

### Gumroad Integration
- **Products:** Starter (monthly), Plus (6-month), Pro (yearly) → mapped to `platform.Plans`
- **Webhook:** `/api/webhooks/gumroad` — processes `sale` events, idempotent via `WebhookEvents.eventKey`
- **Subscription Sync:** `claimSubscriptionsForUser()` links purchases by email to Business
- **Entitlements:** `PlanEntitlements` JSONB (maxUsers, maxStores, maxProducts, features)

### Issues
| Issue | Severity |
|-------|----------|
| No scheduled reconciliation for missed webhooks | High |
| `GUMROAD_VERIFY_WEBHOOK=false` default | Medium |
| No grace period UI / feature gating by entitlements | Medium |
| Subscription status only checked on billing page, not enforced in features | Medium |
| Plan mapping hardcoded in env (`GUMROAD_PRODUCT_*`) | Low |

---

## 8. Feature & UX Audit

### Pages Inventory (Dashboard)
| Page | Feature | Status |
|------|---------|--------|
| `/dashboard` | Dashboard with metrics, charts, recent activity | ✅ |
| `/dashboard/products` | Product CRUD, categories | ✅ |
| `/dashboard/categories` | Category CRUD | ✅ |
| `/dashboard/inventory` | Stock view, adjustments | ✅ |
| `/dashboard/customers` | Customer CRUD | ✅ |
| `/dashboard/staff` | Staff CRUD (operational), role management (login users) | ✅ |
| `/dashboard/transactions` | Transaction list, void | ✅ |
| `/dashboard/reports` | Sales reports, export | ✅ |
| `/dashboard/settings` | 7 tabs: profile, notifications, privacy, account, appearance, operational, payment, system | ✅ |
| `/dashboard/pos` | POS interface, cart, checkout | ✅ |
| `/dashboard/help` | Help center | ✅ |

### Public Pages
| Page | Feature | Status |
|------|---------|--------|
| `/` | Landing → redirect to dashboard/login | ✅ |
| `/login`, `/signup`, `/register` | Auth | ✅ |
| `/menu` | Public catalog | ✅ |
| `/menu/order/[orderId]` | Order tracking (QR) | ✅ (dev branch) |
| `/qr/[token]` | QR table ordering | ✅ (dev branch) |
| `/plans` | Pricing page | ✅ |
| `/profile` | User profile | ✅ |
| `/onboarding` | Redirects to `/dashboard/onboarding` | ✅ |

### UI/UX Issues
- **Duplicate components:** `theme-toggle.tsx` and `themetoggle.tsx` both exist
- **Inconsistent loading states:** Some pages use skeleton, others spinner
- **Mobile POS:** Not optimized (sidebar collision, small touch targets)
- **Empty states:** Generic, not feature-specific
- **Error boundaries:** Only root layout has error handling

---

## 9. Maintenance Mode Status

### Implementation (Recent)
- **Database:** `platform.MaintenanceConfig` table (single row `id="default"`)
- **API:** `GET /api/maintenance/status` (public), `PATCH /api/maintenance/config` (admin, `settings.update`)
- **Middleware:** Blocks non-GET API mutations with 503 when enabled
- **Client:** `MaintenanceDialog` — fullscreen, countdown from `estimatedEndAt` (48h default)
- **Dashboard Layout:** Fetches on mount, shows loading until check complete
- **Onboarding Page:** Checks before initialization flow

### Verified Behaviors
- ✅ Login succeeds, session created, then maintenance check runs
- ✅ Countdown uses server `estimatedEndAt`, not client-local time
- ✅ Refresh preserves countdown (fetches fresh from API)
- ✅ Direct dashboard URL blocked (middleware + client dialog)
- ✅ Admin can disable via PATCH → dashboard accessible without re-login

### Minor Issue
- `SystemSettings.maintenanceMode` (per-business) still exists — dual config confusion

---

## 10. Technical Debt Summary

### High Priority
1. **Remove `DEFAULT_BUSINESS_ID/STORE_ID` fallbacks** — validate membership in all server queries
2. **Consolidate maintenance config** — decide platform-wide vs per-business, remove duplicate
3. **Add tenant validation to middleware** — check business membership for protected routes
4. **Distributed rate limiting** — integrate Upstash Redis (config exists in env)
5. **Durable payment proof storage** — implement S3-compatible adapter

### Medium Priority
6. **Split `server/business/service.ts`** — domain services per feature
7. **Add repository layer** — abstract Drizzle queries
8. **Dynamic RBAC from DB** — use `Roles/Permissions/RolePermissions` tables
9. **Entitlement enforcement in UI** — gate features by plan limits
10. **Scheduled webhook reconciliation** — cron job for missed Gumroad events

### Low Priority
11. **Rename files to camelCase** — eliminate kebab-case
12. **Remove duplicate theme toggle** — keep one
13. **Consolidate POS components** — `components/pos/` vs `features/pos/components/`
14. **Add validation layer** — shared Zod schemas
15. **Improve empty/error/loading states** — feature-specific

---

## 11. Recommended Refactor Roadmap

### Phase 1: Foundation (Safe, Non-Breaking)
1. Create `AUDIT.md` (this document)
2. Remove duplicate `themetoggle.tsx`
3. Add repository layer interfaces
4. Extract validation schemas to shared `lib/validators/`
5. Add tenant context validation helper

### Phase 2: Service Layer Refactor
1. Split `business/service.ts` into:
   - `server/business/category-service.ts`
   - `server/business/product-service.ts`
   - `server/business/customer-service.ts`
   - `server/business/staff-service.ts`
   - `server/business/stock-service.ts`
   - `server/business/transaction-service.ts`
   - `server/business/store-service.ts`
   - `server/business/settings-service.ts`
2. Create `server/repositories/` with query builders
3. Update `/api/business/route.ts` to use new services

### Phase 3: Database & Tenant Safety
1. Add membership validation to all server queries
2. Remove `DEFAULT_BUSINESS_ID/STORE_ID` from checkout cores
3. Consolidate maintenance config (decide: platform-wide only)
4. Add distributed rate limiting (Upstash)
5. Implement S3 storage adapter for payment proofs

### Phase 4: Naming & Structure Cleanup
1. Rename all kebab-case files to camelCase
2. Consolidate POS components
3. Reorganize `features/` to colocate hooks/components/types
4. Update all imports

### Phase 5: Billing & Entitlements
1. Add scheduled webhook reconciliation
2. Enforce entitlements in UI (maxUsers, maxStores, maxProducts)
3. Add feature gating by plan tier
4. Dynamic RBAC from DB tables

### Phase 6: Testing & Validation
1. Run full test suite on dev branch
2. Typecheck + build + lint
3. Manual regression: auth, onboarding, POS, dashboard, settings, billing, maintenance
4. Document remaining debt in `DECISIONS.md`

---

## 12. Environment & Configuration

### Required Env Vars (from `.env`)
```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Supabase Pooler)
DATABASE_URL="postgresql://postgres.xxx:xxx@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_SECRET_KEY=sb_secret_xxx
SUPABASE_JWKS_URL=https://xxx.supabase.co/auth/v1/.well-known/jwks.json

# Gumroad Billing
GUMROAD_SELLER_ID=xxx
GUMROAD_ACCESS_TOKEN=xxx
GUMROAD_PRODUCT_STARTER=xxx
GUMROAD_PRODUCT_PLUS=xxx
GUMROAD_PRODUCT_PRO=xxx
GUMROAD_VERIFY_WEBHOOK=false

# Upstash (Rate Limiting - configured but not used)
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"
```

### Unused Dependencies (package.json)
- `@neon/auth`, `@neon/config`, `@neon/env`, `@neon/realtime*` — **Neon packages installed but Supabase used** (removed 2026-11-09)
- `@freemius/checkout`, `@freemius/sdk` — **Freemius installed but Gumroad used**
- `better-auth`, `@better-auth-ui/*` — **Better Auth installed but Supabase Auth used**
- `bcryptjs`, `jose` — May be unused (verify)
- `postgres` — Raw pg driver, Drizzle uses `pg` internally

---

## 13. Testing Status

### Current Test Files (found via `bun test` discovery)
- `src/server/business/service.test.ts` — DB-coupled integration tests
- `src/server/pos/checkout-phase7.test.ts` — POS checkout tests
- `src/server/auth/session.test.ts` — Unit tests
- `src/server/security/rate-limit.test.ts` — Unit tests
- `src/server/qr/phase8.test.ts` — QR ordering tests (dev branch)
- `src/server/qr/phase8g.test.ts` — QR hardening tests (dev branch)
- `src/server/qr/phase8g-api.test.ts` — API authz tests (dev branch)
- `src/server/qr/request-security.test.ts` — CSRF/same-origin tests (dev branch)
- `src/server/qr/phase8h-api.test.ts` — UI API tests (dev branch)

### Test Commands
```bash
bun test                              # All tests (currently 0 found in root)
bun test src/server/pos/checkout-phase7.test.ts
bun test src/server/auth/session.test.ts
bun run typecheck                     # tsc --noEmit
bun run lint                          # oxlint
bun run build                         # next build
```

### Known Test Limitations
- Tests hit **real DB** (require dev branch `DATABASE_URL`)
- `tsc` excludes `**/*.test.ts` — type errors in tests not caught
- No E2E/UI tests (Playwright not configured)

---

## 14. Known Limitations & Blockers

| Limitation | Impact | Resolution |
|------------|--------|------------|
| No Drizzle migration table in production | Cannot track/apply migrations safely | Apply additive SQL manually on dev branch first; explicit approval for production |
| Neon packages installed but unused | Confusion, bundle size | Removed 2026-11-09 (packages + `neon.ts` config + stale "Neon Auth" copy) |
| Better Auth / Freemius packages installed but unused | Confusion, bundle size | Remove if confirmed unused |
| In-memory rate limiting | Unsafe on Vercel multi-instance | Implement Upstash adapter (env vars exist) |
| Local payment proof storage | Not durable on Vercel | Implement S3-compatible adapter |
| No CSRF protection | Mutation vulnerability | Add CSRF tokens or same-origin enforcement |
| `DEFAULT_BUSINESS_ID` in checkout | Cross-tenant risk | Validate membership, remove defaults |
| Dual maintenance config | Confusion, potential conflict | Decide scope, remove one |
| Staff vs BusinessMembers separation | Operational complexity | Document or unify |
| No scheduled webhook reconciliation | Missed Gumroad events = lost revenue | Add cron job |

---

## 15. Next Steps

1. **Immediate:** Review this audit with stakeholders, clarify business policies (Section 2)
2. **Week 1:** Phase 1 Foundation — remove duplicates, add validators, tenant helpers
3. **Week 2:** Phase 2 Service Layer — split monolithic service
4. **Week 3:** Phase 3 Database Safety — tenant validation, rate limiting, storage
5. **Week 4:** Phase 4 Naming Cleanup — rename files, consolidate components
6. **Week 5:** Phase 5 Billing — reconciliation, entitlement enforcement
7. **Week 6:** Phase 6 Testing — full regression, documentation

---

**Prepared by:** Kilo AI Assistant
**Review Status:** Draft — pending stakeholder review of business policy questions