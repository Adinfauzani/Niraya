<!--
Cara pakai: copy seluruh isi file ini ke ChatGPT yang sudah terhubung ke Gumroad MCP.
Semua copy produk di bawah sudah dalam bahasa Inggris.
Jangan publish sebelum Riu setuju.
-->

# Prompt for ChatGPT — Create Niraya Membership Products on Gumroad

## Your role

You are operating the **Rynex Studio** Gumroad account through the Gumroad MCP integration.

Your job is to create **three separate membership products** for **Niraya** as **drafts**. Do not publish anything. Do not modify or delete existing products.

## Context

- **Niraya** is a retail operating system: POS, inventory, customers, staff, reports, and a public storefront.
- Billing is handled by **Gumroad**.
- We use **Cara A**: three separate products, one recurrence each.
- Do **not** create one tiered product with three recurrences.
- All customer-facing copy must be in **English**.
- Currency: **IDR**.
- Prices are final:
  - **Starter**: Rp130,000 per month
  - **Plus**: Rp780,000 every 6 months
  - **Pro**: Rp1,560,000 per year

## Hard rules

1. Create exactly **3 new products**.
2. Product type must be **membership / recurring subscription**.
3. Each product must have **exactly one recurrence**:
   - Starter: **monthly**
   - Plus: **every 6 months (biannually)**
   - Pro: **yearly**
4. Do **not** create additional tiers. If Gumroad requires a tier, use the product name as the single tier.
5. Create each product as a **draft / unpublished**. Do **not** publish.
6. Do **not** change existing products, prices, or account settings.
7. There is an older product named **Niraya** (permalink `ulqvnw`). Do **not** edit, rename, unpublish, or delete it. Leave it untouched.
8. If a product with the same name as one of the three new products already exists, stop and report it. Do not duplicate it.
9. If the MCP cannot set recurrence, price, or product type, stop and report the exact missing field. Do not guess or use a workaround.
10. Return the raw product IDs exactly as Gumroad provides them, including any `=` characters.
11. Ask for explicit approval before publishing.
12. Do not configure Ping, webhooks, or resource subscriptions in this task. That is handled separately.

## Product 1 — Niraya Starter

- **Name:** `Niraya Starter`
- **Type:** Membership
- **Billing:** Monthly
- **Price:** `Rp130,000`
- **Currency:** IDR
- **Recurrence:** Monthly only
- **Tagline:** `Run your first store with confidence.`
- **Short description:** `A complete point-of-sale and inventory toolkit for independent stores.`

**Long description (English):**

```text
Niraya Starter gives independent retailers everything they need to sell in person and online without juggling spreadsheets. Ring up sales, track stock, manage customers, and see what is actually selling — all from one clean dashboard.

Built for single-store businesses that want a fast, reliable POS without enterprise complexity.

What's included:
• 1 store
• Up to 3 team members
• Up to 100 products
• POS checkout and receipts
• Inventory tracking and stock adjustments
• Customer management
• Sales and product reports
• Public storefront and QR menu
• Email support
```

- **CTA:** `Start with Starter`

## Product 2 — Niraya Plus

- **Name:** `Niraya Plus`
- **Type:** Membership
- **Billing:** Every 6 months (biannually)
- **Price:** `Rp780,000`
- **Currency:** IDR
- **Recurrence:** Every 6 months only
- **Tagline:** `Built for growing retail teams.`
- **Short description:** `Multi-store POS, deeper reports, and room to grow.`

**Long description (English):**

```text
Niraya Plus is for businesses that have outgrown a single counter. Run multiple stores, give your team the access they need, and get a clearer view of performance across locations.

Everything in Starter, plus multi-store management and advanced reporting.

What's included:
• Everything in Starter
• Up to 2 stores
• Up to 10 team members
• Up to 500 products
• Multi-store inventory and reporting
• Advanced sales and inventory reports
• Priority email support
```

- **CTA:** `Upgrade to Plus`

## Product 3 — Niraya Pro

- **Name:** `Niraya Pro`
- **Type:** Membership
- **Billing:** Yearly
- **Price:** `Rp1,560,000`
- **Currency:** IDR
- **Recurrence:** Yearly only
- **Tagline:** `Full control for serious retail operations.`
- **Short description:** `Maximum stores, users, products, and API access.`

**Long description (English):**

```text
Niraya Pro is the complete Niraya stack for established retailers. Manage more locations, onboard a larger team, and connect Niraya to the rest of your business with API access.

Everything in Plus, plus higher limits and API access.

What's included:
• Everything in Plus
• Up to 5 stores
• Up to 25 team members
• Up to 2,000 products
• API access
• Priority support
```

- **CTA:** `Go Pro`

## Cover images

If image upload is supported by the MCP:

- Use a clean, minimal cover with the **Niraya** wordmark and the package name.
- Palette: deep green, warm cream, soft gold accent.
- Do not use stock photos, neon colors, or busy gradients.
- Keep the package name readable at small sizes.

If image upload is not supported, skip it and report that covers need to be added manually.

## Execution steps

1. Search the account for existing products named:
   - `Niraya Starter`
   - `Niraya Plus`
   - `Niraya Pro`
2. Create the three products as drafts with the fields above.
3. Verify each product:
   - Product type is membership
   - Recurrence is correct
   - Price is correct
   - Currency is IDR
   - Status is draft / unpublished
4. Do not publish.
5. Return this table with the real values:

| Product | Product ID | Permalink | Checkout URL | Status | Recurrence | Price |
|---|---|---|---|---|---|---|
| Niraya Starter | ... | ... | ... | draft | monthly | Rp130,000 |
| Niraya Plus | ... | ... | ... | draft | every 6 months | Rp780,000 |
| Niraya Pro | ... | ... | ... | draft | yearly | Rp1,560,000 |

6. End with:

> All three Niraya drafts are ready. Nothing has been published. Do you want me to publish them?

## Stop conditions

Stop immediately and report if:

- The MCP cannot create membership products.
- The MCP cannot set a recurrence.
- The MCP cannot set the price or currency.
- A product with the same name already exists.
- Gumroad rejects the request because of tier/recurrence rules.
- You are asked to publish without explicit approval.

## Final report format

Return:

1. **Created products** — one line per product.
2. **Product IDs** — exact raw IDs.
3. **Permalinks and checkout URLs** — if available.
4. **Missing capabilities** — any field the MCP could not set.
5. **Publish status** — explicitly state that nothing was published.
6. **Approval question** — ask whether to publish.

Do not invent product IDs, URLs, or success messages. If a step fails, say exactly what failed.
