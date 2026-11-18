import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { slugifyStoreName } from "@/lib/storeSlug";
import { db } from "@/server/db";
import {
  businessCategories,
  businessProfile,
  businesses,
  categories,
  discounts,
  orderItems,
  orders,
  products,
  stores,
  transactionItems,
  transactions,
} from "@/server/db/schema";
import { resolveStoreBySlug } from "@/server/stores/slug";

export type DiscoveryStoreDetail = {
  id: string;
  name: string;
  slug: string;
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  description: string | null;
  location: string | null;
  phone: string | null;
  storeAddress: string | null;
  categoryLabel: string | null;
  hasPromotion: boolean;
  promoLabels: string[];
  productCount: number;
  soldCount: number;
  categories: { id: string; name: string }[];
  products: {
    id: string;
    name: string;
    imageUrl: string | null;
    price: number;
    currency: string;
    categoryName: string | null;
    available: boolean;
    description: string | null;
  }[];
};

export async function getDiscoveryStoreDetail(slug: string): Promise<DiscoveryStoreDetail | null> {
  const normalized = slugifyStoreName(slug);
  if (!normalized) return null;

  const resolved = await resolveStoreBySlug(normalized);
  if (!resolved) return null;

  try {
    const [[storeRow], profileRows, promoRows, categoryRows, productRows, posSales, sfSales] = await Promise.all([
      db
        .select({
          id: stores.id,
          name: stores.name,
          businessId: stores.businessId,
          currency: businesses.currency,
          storeAddress: stores.address,
          storePhone: stores.phone,
        })
        .from(stores)
        .innerJoin(businesses, eq(businesses.id, stores.businessId))
        .where(and(eq(stores.id, resolved.id), eq(stores.isActive, true), isNull(stores.deletedAt)))
        .limit(1),
      db.select().from(businessProfile).where(eq(businessProfile.businessId, resolved.businessId)),
      db
        .select({ name: discounts.name, type: discounts.type, value: discounts.value, code: discounts.code })
        .from(discounts)
        .where(and(eq(discounts.businessId, resolved.businessId), eq(discounts.isActive, true)))
        .limit(10),
      db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(and(eq(categories.businessId, resolved.businessId), eq(categories.status, "active"), isNull(categories.deletedAt))),
      db
        .select({
          id: products.id,
          name: products.name,
          imageUrl: products.imageUrl,
          sellingPrice: products.sellingPrice,
          stockQuantity: products.stockQuantity,
          isStockTracked: products.isStockTracked,
          categoryId: products.categoryId,
          description: products.description,
        })
        .from(products)
        .where(and(eq(products.businessId, resolved.businessId), eq(products.status, "active"), isNull(products.deletedAt)))
        .orderBy(desc(products.createdAt))
        .limit(60),
      db
        .select({ productId: transactionItems.productId, qty: sql<number>`sum(${transactionItems.quantity})::int` })
        .from(transactionItems)
        .innerJoin(transactions, eq(transactions.id, transactionItems.transactionId))
        .where(and(eq(transactions.storeId, resolved.id), eq(transactions.status, "completed")))
        .groupBy(transactionItems.productId),
      db
        .select({ productId: orderItems.productId, qty: sql<number>`sum(${orderItems.quantity})::int` })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(and(eq(orders.storeId, resolved.id), eq(orders.orderStatus, "COMPLETED")))
        .groupBy(orderItems.productId),
    ]);

    if (!storeRow) return null;

    const ownProfile = profileRows.find((p) => p.businessId === resolved.businessId) ?? profileRows.find((p) => p.id === "default") ?? profileRows[0] ?? null;
    const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
    const soldByProduct = new Map<string, number>();
    for (const r of [...posSales, ...sfSales]) soldByProduct.set(r.productId, (soldByProduct.get(r.productId) ?? 0) + Number(r.qty ?? 0));
    const soldCount = [...soldByProduct.values()].reduce((a, b) => a + b, 0);

    const catFreq = new Map<string, number>();
    for (const p of productRows) {
      const name = p.categoryId ? categoryNameById.get(p.categoryId) : null;
      if (name) catFreq.set(name, (catFreq.get(name) ?? 0) + 1);
    }
    const categoryLabel = [...catFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const promoLabels = promoRows.map((p) => {
      if (p.type === "percentage") return `${p.name} (${Number(p.value)}%)`;
      return p.name;
    }).filter(Boolean);

    return {
      id: storeRow.id,
      name: storeRow.name,
      slug: slugifyStoreName(storeRow.name),
      businessId: resolved.businessId,
      businessName: ownProfile?.businessName?.trim() || resolved.businessName,
      logoUrl: ownProfile?.logoUrl ?? null,
      description: ownProfile?.description?.trim() || null,
      location: ownProfile?.address?.trim() || storeRow.storeAddress?.trim() || null,
      phone: storeRow.storePhone?.trim() || ownProfile?.phone?.trim() || null,
      storeAddress: storeRow.storeAddress?.trim() || null,
      categoryLabel,
      hasPromotion: promoRows.length > 0,
      promoLabels,
      productCount: productRows.length,
      soldCount,
      categories: categoryRows.map((c) => ({ id: c.id, name: c.name })),
      products: productRows.map((p) => ({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        price: Number(p.sellingPrice ?? 0),
        currency: storeRow.currency || "IDR",
        categoryName: p.categoryId ? categoryNameById.get(p.categoryId) ?? null : null,
        available: !p.isStockTracked || Number(p.stockQuantity ?? 0) > 0,
        description: p.description ?? null,
      })),
    };
  } catch {
    return null;
  }
}

export async function getDiscoveryProductContext(productId: string, storeSlug?: string | null) {
  if (!productId) return null;
  try {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        imageUrl: products.imageUrl,
        sellingPrice: products.sellingPrice,
        stockQuantity: products.stockQuantity,
        isStockTracked: products.isStockTracked,
        description: products.description,
        businessId: products.businessId,
        categoryId: products.categoryId,
      })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.status, "active"), isNull(products.deletedAt)))
      .limit(1);
    const p = rows[0];
    if (!p) return null;

    const [storeRows, catRows, bizRows] = await Promise.all([
      db
        .select({ id: stores.id, name: stores.name, businessId: stores.businessId })
        .from(stores)
        .innerJoin(businesses, eq(businesses.id, stores.businessId))
        .where(and(eq(stores.businessId, p.businessId), eq(stores.isActive, true), isNull(stores.deletedAt), eq(businesses.status, "active"), isNull(businesses.deletedAt)))
        .limit(10),
      p.categoryId ? db.select({ name: categories.name }).from(categories).where(eq(categories.id, p.categoryId)).limit(1) : Promise.resolve([] as any[]),
      db.select({ name: businesses.name, currency: businesses.currency }).from(businesses).where(eq(businesses.id, p.businessId)).limit(1),
    ]);

    let store = storeRows[0] ?? null;
    if (storeSlug) {
      const norm = slugifyStoreName(storeSlug);
      store = storeRows.find((s) => slugifyStoreName(s.name) === norm) ?? store;
    }
    if (!store) return null;
    const biz = bizRows[0] ?? null;
    return {
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      price: Number(p.sellingPrice ?? 0),
      currency: biz?.currency || "IDR",
      description: p.description ?? null,
      categoryName: (catRows as any[])[0]?.name ?? null,
      available: !p.isStockTracked || Number(p.stockQuantity ?? 0) > 0,
      storeName: store.name,
      storeSlug: slugifyStoreName(store.name),
      businessName: biz?.name || "",
    };
  } catch {
    return null;
  }
}
