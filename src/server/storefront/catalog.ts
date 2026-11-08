import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  DEFAULT_BUSINESS_ID,
  DEFAULT_STORE_ID,
  businesses,
  categories,
  inventory,
  products,
  productVariants,
} from "@/server/db/schema";

/** Public storefront catalog: active categories/products for the default business.
 *  Uses server-side DB reads only; no auth, no staff-only data, no cost/internal stock counts. */
export async function getPublicStorefrontCatalog() {
  let manualTransferEnabled = false;
  try {
    // Select specific columns to avoid failing on schema drift (QR columns may not exist on all envs).
    const rows = await db.execute(sql`select "QrManualTransferEnabled" as manual from "settings"."BusinessSettings" where "Id" = 'default' limit 1`);
    manualTransferEnabled = !!(rows as any)?.rows?.[0]?.manual;
  } catch {
    manualTransferEnabled = false;
  }
  const [business] = await db.select({ id: businesses.id, name: businesses.name, legalName: businesses.legalName }).from(businesses).where(eq(businesses.id, DEFAULT_BUSINESS_ID)).limit(1);
  const cats = await db.select({ id: categories.id, name: categories.name, sortOrder: categories.sortOrder })
    .from(categories).where(and(eq(categories.businessId, DEFAULT_BUSINESS_ID), eq(categories.status, "active"), sql`${categories.deletedAt} is null`));
  const prods = await db.select({
    id: products.id, name: products.name, description: products.description, categoryId: products.categoryId, sellingPrice: products.sellingPrice, imageUrl: products.imageUrl, isTaxable: products.isTaxable, isStockTracked: products.isStockTracked, stockQuantity: products.stockQuantity,
  }).from(products).where(and(eq(products.businessId, DEFAULT_BUSINESS_ID), eq(products.status, "active"), sql`${products.deletedAt} is null`));
  const ids = prods.map(p => p.id);
  const vars = ids.length ? await db.select({ id: productVariants.id, productId: productVariants.productId, name: productVariants.name, sellingPrice: productVariants.sellingPrice, isActive: productVariants.isActive }).from(productVariants).where(and(eq(productVariants.businessId, DEFAULT_BUSINESS_ID), inArray(productVariants.productId, ids))) : [];
  const invRows = ids.length ? await db.select({ productId: inventory.productId, stockQuantity: inventory.stockQuantity, reservedQuantity: inventory.reservedQuantity }).from(inventory).where(and(eq(inventory.storeId, DEFAULT_STORE_ID), inArray(inventory.productId, ids))) : [];
  const invBy = new Map(invRows.map(r => [r.productId, r]));
  const varsBy = new Map<string, any[]>(); for (const v of vars.filter(v => v.isActive)) { const a = varsBy.get(v.productId) ?? []; a.push({ id: v.id, name: v.name, sellingPrice: v.sellingPrice ? Number(v.sellingPrice) : null }); varsBy.set(v.productId, a); }
  return {
    business: { name: business?.name || "Niraya", description: null, logoUrl: null, city: null },
    payment: {
      storefrontCheckoutEnabled: !!manualTransferEnabled,
      manualTransferEnabled: !!manualTransferEnabled,
      methods: manualTransferEnabled ? [{ id: "manual_transfer", label: "Transfer Manual" }] : [],
    },
    categories: cats.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name)),
    products: prods.map(p => {
      const inv = invBy.get(p.id);
      const onHand = inv?.stockQuantity ?? p.stockQuantity ?? 0;
      const reserved = inv?.reservedQuantity ?? 0;
      const availableQuantity = p.isStockTracked ? Math.max(0, onHand - reserved) : null;
      const available = availableQuantity === null || availableQuantity > 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        sellingPrice: Number(p.sellingPrice),
        imageUrl: p.imageUrl,
        isTaxable: !!p.isTaxable,
        available,
        maxQuantity: availableQuantity,
        variants: varsBy.get(p.id) ?? [],
      };
    }),
  };
}
