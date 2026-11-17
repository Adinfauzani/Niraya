/**
 * LOCAL/DEV-ONLY product seeder.
 *
 * Seeds up to 50 active products (free-plan limit) for a demo business so the
 * catalog/POS can be exercised with realistic data.
 *
 * Usage:
 *   bun scripts/seed-products.ts
 *
 * Optional env:
 *   DEMO_ADMIN_EMAIL   (default: demo@niraya.local) - owner whose business gets seeded
 *   BUSINESS_ID        - override target business id
 *   STORE_ID           - override target store id
 */
import { randomUUID } from "node:crypto";

import { and, eq, sql as dsql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  businesses,
  businessMembers,
  categories,
  inventory,
  products,
  stores,
  userProfiles,
} from "@/server/db/schema";

const EMAIL = (process.env.DEMO_ADMIN_EMAIL || "demo@niraya.local").toLowerCase();
const TARGET_COUNT = 50;

function assertNonProduction() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("Refusing to seed products in production. Local/dev only.");
  }
}

async function resolveWorkspace() {
  if (process.env.BUSINESS_ID) {
    const [business] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.id, process.env.BUSINESS_ID))
      .limit(1);
    if (!business) throw new Error("BUSINESS_ID not found");
    const storeId =
      process.env.STORE_ID ||
      (await db
        .select({ id: stores.id })
        .from(stores)
        .where(eq(stores.businessId, business.id))
        .limit(1))[0]?.id;
    if (!storeId) throw new Error("No store found for business");
    return { businessId: business.id, storeId };
  }

  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.email, EMAIL))
    .limit(1);
  if (!profile) throw new Error(`No user profile for ${EMAIL}; run seed-demo-admin first`);

  const [member] = await db
    .select({ businessId: businessMembers.businessId, storeId: businessMembers.storeId })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, profile.id), eq(businessMembers.role, "owner"), eq(businessMembers.status, "active")))
    .limit(1);
  if (!member?.businessId) throw new Error("No active owner business membership");

  const storeId =
    member.storeId ||
    (await db
      .select({ id: stores.id })
      .from(stores)
      .where(eq(stores.businessId, member.businessId))
      .limit(1))[0]?.id;
  if (!storeId) throw new Error("No store found for business");

  return { businessId: member.businessId, storeId };
}

const CATEGORY_NAMES = ["Minuman", "Makanan", "Snack", "Perlengkapan", "Lainnya"];

async function ensureCategories(businessId: string) {
  const ids: string[] = [];
  for (const name of CATEGORY_NAMES) {
    const [existing] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.businessId, businessId), eq(categories.name, name)))
      .limit(1);
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const id = randomUUID();
    await db.insert(categories).values({ id, businessId, name, status: "active" });
    ids.push(id);
  }
  return ids;
}

const UNITS = ["pcs", "botol", "pack", "box", "kg"];

async function main() {
  assertNonProduction();
  const { businessId, storeId } = await resolveWorkspace();
  const categoryIds = await ensureCategories(businessId);

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.businessId, businessId), eq(products.status, "active")));
  const existingSkus = new Set(
    (await db
      .select({ sku: products.sku })
      .from(products)
      .where(eq(products.businessId, businessId))).map((r) => r.sku),
  );

  let created = 0;
  for (let i = 1; i <= TARGET_COUNT; i++) {
    const sku = `PRD-${String(i).padStart(3, "0")}`;
    if (existingSkus.has(sku)) continue;
    if (existing.length + created >= TARGET_COUNT) break;

    const id = randomUUID();
    const categoryId = categoryIds[(i - 1) % categoryIds.length];
    const price = 5000 + (i % 10) * 2500;
    const cost = Math.round(price * 0.6);
    const stock = 10 + (i % 15) * 3;
    const minStock = 3 + (i % 5);
    const unit = UNITS[i % UNITS.length];

    await db.transaction(async (tx) => {
      await tx.insert(products).values({
        id,
        businessId,
        categoryId,
        name: `Produk Demo ${i}`,
        sku,
        sellingPrice: price.toFixed(2),
        costPrice: cost.toFixed(2),
        stockQuantity: stock,
        minimumStock: minStock,
        unit,
        status: "active",
      });
      await tx
        .insert(inventory)
        .values({
          businessId,
          storeId,
          productId: id,
          stockQuantity: stock,
          minimumStock: minStock,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [inventory.productId, inventory.storeId],
          set: { stockQuantity: stock, minimumStock: minStock, updatedAt: new Date() },
        });
    });
    created++;
  }

  const total = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.businessId, businessId), eq(products.status, "active")));

  console.log(`Business: ${businessId}`);
  console.log(`Store   : ${storeId}`);
  console.log(`Created : ${created} new products`);
  console.log(`Total   : ${total.length} active products (free limit 50)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-products] failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
