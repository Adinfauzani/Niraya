<!--
Cara pakai: copy seluruh isi file ini ke ChatGPT untuk konteks lengkap sistem Niraya POS.
File ini mendokumentasikan arsitektur, fitur, dan alur implementasi terkini.
-->

# Niraya POS — System Documentation for ChatGPT

## Project Overview

**Niraya** is a self-hosted retail operating system: POS, inventory, customers, staff, reports, and public storefront. Built for Indonesian market (warung, kafe, toko).

**Stack:**
- Next.js 16 App Router, React 19, TypeScript strict
- Bun package manager
- Tailwind CSS v4 + shadcn/ui
- Drizzle ORM + PostgreSQL (Supabase)
- Supabase Auth (email/password, Google OAuth, Apple OAuth coming soon)
- TanStack Query + Zustand for state
- Gumroad for billing (3 membership tiers)

---

## Database Schema (13 domains)

Located in `drizzle/schema/` — source of truth:

| Schema | Tables | Description |
|--------|--------|-------------|
| `core` | UserProfiles, BusinessMembers, BusinessCategories | Users, RBAC, business membership |
| `products` | Categories, Products, ProductImages | Catalog, variants, pricing |
| `inventory` | Inventory, StockAdjustments, StockMovements, Reservations | Multi-store stock, reservations for QR ordering |
| `customers` | Customers, CustomerAddresses | CRM |
| `staff` | Staff, StaffSessions | Team management |
| `suppliers` | Suppliers, PurchaseOrders, PurchaseOrderItems | Procurement |
| `purchases` | PurchaseReceipts, PurchaseReceiptItems | Receiving |
| `transactions` | Transactions, TransactionItems | POS sales |
| `payments` | Payments, PaymentMethods, PaymentProofs | Payment tracking |
| `lookups` | Units, PaymentMethods, TaxRates, BusinessCategories | Reference data |
| `settings` | BusinessProfile, NotificationSettings, PrivacySecuritySettings, AccountSettings, AppearanceSettings, OperationalSettings, PaymentSettings, SystemSettings, ReceiptSettings | 9 split tables (was single BusinessSettings) |
| `audit` | AuditLogs | Full audit trail |
| `platform` | Plans, Subscriptions, WebhookEvents | Gumroad subscription mirror |

**Key constants:** `DEFAULT_BUSINESS_ID = 00000000-0000-0000-0000-000000000001`, `DEFAULT_STORE_ID = 00000000-0000-0000-0000-000000000002`

---

## Authentication Flow

**Supabase Auth** (migrated from Neon Auth):
- Email/password signup → email confirmation → `/auth/callback` → `/onboarding`
- Email/password login → `/dashboard` → auto-check onboarding status
- Google OAuth → `/auth/callback` → `/onboarding` (if new) or `/dashboard`
- Apple OAuth button shows "Coming Soon" toast
- Forgot password → `/forgot-password` → email link → `/reset-password`
- Session via Supabase SSR (`@supabase/ssr`)

**Middleware** (`src/proxy.ts`):
- Public routes: `/`, `/login`, `/signup`, `/register`, `/menu*`, `/plans`, `/profile`, `/api/business`, `/api/demo/seed`, `/api/public/*`, `/api/internal/jobs/*`
- Everything else requires session
- Onboarding check moved to dashboard layout (client-side)

---

## Onboarding Wizard (6 Steps)

Route: `/onboarding` (protected, redirects if already completed)

| Step | Endpoint | Data Collected |
|------|----------|----------------|
| 1 | `/api/onboarding/one` | Business name, slug (auto-generated), category, phone, email, address |
| 2 | `/api/onboarding/two` | Owner name, owner email, owner phone |
| 3 | `/api/onboarding/three` | Store name, store slug, store address, phone, timezone |
| 4 | `/api/onboarding/four` | Currency, tax rate, receipt footer, low stock threshold |
| 5 | `/api/onboarding/five` | Payment methods (cash, card, QRIS), gateway config placeholder |
| - | `/api/onboarding/status` | Returns `{ needsOnboarding: boolean }` |
| - | `/api/onboarding/complete` | Finalizes, creates BusinessMembers owner record |

**BusinessCategories** seeded in `core.sql`: Makanan & Minuman, Fashion, Kesehatan & Kecantikan, Elektronik, Lainnya

---

## Membership Tiers (Gumroad)

| Tier | Price | Recurrence | Gumroad Permalink | Limits |
|------|-------|------------|-------------------|--------|
| Starter | Rp130,000 | Monthly | `opghbu` | 1 store, 3 users, 100 products |
| Plus | Rp780,000 | Every 6 months | `ebwsuv` | 2 stores, 10 users, 500 products |
| Pro | Rp1,560,000 | Yearly | `wpartz` | 5 stores, 25 users, 2,000 products, API access |

Webhook: `/api/webhooks/gumroad` → creates/updates `platform.Subscriptions`

---

## Landing Page (`/`)

**Sections:**
1. Hero — headline, CTA Daftar/Lihat Fitur
2. Tentang — "Apa itu Niraya POS?"
3. **Cara Kerja** (5 langkah) — Daftar → Setup Katalog → Buka Kasir → Terima Pesanan QR → Pantau & Skala
4. Fitur — 6 cards: POS, Katalog, QR, Tim, Inventori, Laporan
5. CTA — Mulai Gratis / Lihat Paket

**Footer:** 4 columns — Brand+Social+Copyright+Legal | Produk | Perusahaan | Sumber
**Legal links:** Privacy, Terms, Cookie Policy (placeholder routes)
**Cookie Consent:** Floating pill bar with cookie icon, description, Settings/Reject/Accept (blue Accept button)

---

## Mobile Navigation

- **Bottom Nav** (`xl:hidden`): Beranda | Plans | Profil/Masuk (dynamic based on auth)
- **Desktop Nav** (`xl:flex`): Beranda, Fitur, Plans + Masuk/Daftar buttons
- No hamburger drawer

---

## Dashboard (`/dashboard`)

**Layout** (`src/app/(dashboard)/layout.tsx`):
- Role check: `user` → redirect to `/profile`
- Onboarding check: calls `/api/onboarding/status` → redirect to `/onboarding` if `needsOnboarding`

**Page** (`src/features/dashboard/dashboard-page.tsx`):
- Metrics cards (revenue, orders, avg order, customers)
- Revenue chart (14 days)
- Transaction overview
- Top products
- Recent activity
- Low stock alert banner
- Recent transactions table

**Data flow:** TanStack Query (`useBusinessQuery`) → `BusinessDataProvider` → Zustand `useBusinessStore` → components

---

## POS Checkout (`/pos`)

Server-side validation (`/api/pos/checkout`):
- `pg_advisory_xact_lock` for concurrency
- Request hash for idempotency
- `FOR UPDATE` on inventory rows
- Server-side pricing, tax, stock validation
- Payment proof upload (dev: `.data/payment-proofs`)

---

## Storefront (`/menu`)

Public catalog + QR ordering:
- `/menu` — store selector
- `/menu/order/[orderId]` — customer ordering UI
- `/menu/order/[orderId]/payment` — payment page
- Guest tokens for orders/payments

---

## Key Files Reference

| Area | File |
|------|------|
| Auth server | `src/server/auth/supabase.ts` |
| Auth client | `src/lib/auth-client.ts`, `src/lib/supabase/client.ts` |
| Auth API routes | `src/app/api/auth/{signin,signup,signout,user,callback}/route.ts` |
| Middleware | `src/proxy.ts` |
| Onboarding API | `src/app/api/onboarding/{one,two,three,four,five,status,complete}/route.ts` |
| Onboarding UI | `src/features/onboarding/onboarding-wizard.tsx` |
| Dashboard layout | `src/app/(dashboard)/layout.tsx` |
| Dashboard page | `src/features/dashboard/dashboard-page.tsx` |
| Landing page | `src/components/landing/landing-page.tsx` |
| Mobile bottom nav | `src/components/ui/bottom-nav.tsx` |
| Auth hook | `src/hooks/use-auth.ts` |
| Business API | `src/app/api/business/route.ts` |
| Business service | `src/server/business/service.ts` |
| Database schema | `drizzle/schema/*.sql` (13 files) |
| Init SQL | `drizzle/init.sql` (concatenated) |
| Plans config | `src/lib/plans.ts` |
| Cookie consent | `src/components/landing/landing-page.tsx` (lines 488-520) |

---

## Commands

```bash
bun dev              # Development
bun run build        # Production build
bun start            # Production server
bun lint             # oxlint
bun run typecheck    # tsc --noEmit
bun test             # Tests
bun db:generate      # Drizzle generate
bun db:migrate       # Drizzle migrate
bun db:push          # Drizzle push (dev only)
bun db:studio        # Drizzle Studio
bun db:seed          # Seed business data
bun db:seed:platform # Seed Gumroad plans
```

---

## Current State (as of latest commit)

✅ Landing page polished (Cara Kerja, footer Legal, cookie consent blue button)
✅ Mobile bottom nav (3 buttons, auth-aware)
✅ Auth migrated to Supabase (email/password, Google OAuth, forgot/reset password)
✅ Onboarding wizard (6 steps, API + UI)
✅ Dashboard onboarding redirect logic
✅ 13-domain schema in `drizzle/schema/`
✅ `drizzle/init.sql` consolidated
✅ No `/verify` page needed (email confirmation → onboarding directly)
✅ Build passes, typecheck passes, lint passes (pre-existing warnings only)

---

## Environment Variables Required

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SECRET_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Gumroad
GUMROAD_WEBHOOK_SECRET=
GUMROAD_PRODUCT_STARTER=opghbu
GUMROAD_PRODUCT_PLUS=ebwsuv
GUMROAD_PRODUCT_PRO=wpartz

# Database (Supabase pooler)
DATABASE_URL=postgres://...:6543/postgres?pgbouncer=true&prepare=false
```

---

## Notes for ChatGPT

- This is a **self-hosted** POS, not SaaS multi-tenant (single business per install)
- Supabase Auth is the identity provider; `core.UserProfiles` links via FK to `auth.users`
- RLS policies on `UserProfiles`: users can only access own profile
- Gumroad is billing source of truth; `platform` schema mirrors for entitlements
- No Hono/Vite/tRPC — pure Next.js App Router
- Demo mode exists via cookie `niraya_demo=1` (returns static seed data)
- Payment proofs stored locally in dev; production S3 adapter not implemented

---

## Recent Changes Summary

1. Added "Cara Kerja" section (5 steps) to landing page
2. Footer restructured: 4 columns, Legal links at bottom (Privacy, Terms, Cookie Policy)
3. Cookie consent: cookie icon + description, blue Accept button
4. Mobile bottom nav: Beranda | Plans | Profil/Masuk (no hamburger)
5. Auth callback redirects to `/onboarding` (not `/dashboard`)
6. Login goes to `/dashboard` → layout checks onboarding status
7. Removed `/verify` page from flow
8. Email confirmation → `/auth/callback` → `/onboarding`

---

*Generated for ChatGPT context sharing. Update as system evolves.*