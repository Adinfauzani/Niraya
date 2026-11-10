import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  businesses,
  categories,
  inventory,
  products,
  productVariants,
  stores,
} from "@/server/db/schema";

async function loadDefaultBusinessAndStore() {
  const [business] = await db
    .select({ id: businesses.id, name: businesses.name, legalName: businesses.legalName })
    .from(businesses)
    .where(eq(businesses.status, "active"))
    .limit(1);
  if (!business) return { business: null, storeId: null };
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(and(eq(stores.businessId, business.id), eq(stores.isActive, true)))
    .limit(1);
  return { business, storeId: store?.id ?? null };
}

/** Public storefront catalog: active categories/products for the default business.
 *  Uses server-side DB reads only; no auth, no staff-only data, no cost/internal stock counts. */
export async function getPublicStorefrontCatalog() {
  let manualTransferEnabled = false;
  try {
    const rows = await db.execute(sql`select "QrManualTransferEnabled" as manual from "settings"."BusinessSettings" where "Id" = 'default' limit 1`);
    manualTransferEnabled = !!(rows as any)?.rows?.[0]?.manual;
  } catch {
    manualTransferEnabled = false;
  }
  const { business, storeId } = await loadDefaultBusinessAndStore();
  if (!business || !storeId) {
    return {
      business: { name: "Niraya", description: null, logoUrl: null, city: null },
      payment: {
        storefrontCheckoutEnabled: !!manualTransferEnabled,
        manualTransferEnabled: !!manualTransferEnabled,
        methods: manualTransferEnabled ? [{ id: "manual_transfer", label: "Transfer Manual" }] : [],
      },
      categories: [],
      products: [],
    };
  }
  const cats = await db
    .select({ id: categories.id, name: categories.name, sortOrder: categories.sortOrder })
    .from(categories)
    .where(and(eq(categories.businessId, business.id), eq(categories.status, "active"), sql`${categories.deletedAt} is null`));
  const prods = await db
    .select({
      id: products.id,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      sellingPrice: products.sellingPrice,
      imageUrl: products.imageUrl,
      isTaxable: products.isTaxable,
      isStockTracked: products.isStockTracked,
      stockQuantity: products.stockQuantity,
    })
    .from(products)
    .where(and(eq(products.businessId, business.id), eq(products.status, "active"), sql`${products.deletedAt} is null`));
  const ids = prods.map((p) => p.id);
  const vars = ids.length
    ? await db
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          name: productVariants.name,
          sellingPrice: productVariants.sellingPrice,
          isActive: productVariants.isActive,
        })
        .from(productVariants)
        .where(and(eq(productVariants.businessId, business.id), inArray(productVariants.productId, ids)))
    : [];
  const invRows = ids.length
    ? await db
        .select({
          productId: inventory.productId,
          stockQuantity: inventory.stockQuantity,
          reservedQuantity: inventory.reservedQuantity,
        })
        .from(inventory)
        .where(and(eq(inventory.storeId, storeId), inArray(inventory.productId, ids)))
    : [];
  const invBy = new Map(invRows.map((r) => [r.productId, r]));
  const varsBy = new Map<string, any[]>();
  for (const v of vars.filter((v) => v.isActive)) {
    const a = varsBy.get(v.productId) ?? [];
    a.push({ id: v.id, name: v.name, sellingPrice: v.sellingPrice ? Number(v.sellingPrice) : null });
    varsBy.set(v.productId, a);
  }
  return {
    business: { name: business.name, description: null, logoUrl: null, city: null },
    payment: {
      storefrontCheckoutEnabled: !!manualTransferEnabled,
      manualTransferEnabled: !!manualTransferEnabled,
      methods: manualTransferEnabled ? [{ id: "manual_transfer", label: "Transfer Manual" }] : [],
    },
    categories: cats.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name)),
    products: prods.map((p) => {
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