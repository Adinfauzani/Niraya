import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { slugifyStoreName } from "@/lib/storeSlug";
import { db } from "@/server/db";
import {
  businesses,
  businessProfile,
  orderItems,
  orders,
  products,
  stores,
  transactionItems,
  transactions,
} from "@/server/db/schema";

export type StorePopularProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  sold: number;
};

export type StoreDirectoryEntry = {
  id: string;
  name: string;
  slug: string;
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  location: string | null;
  description: string | null;
  phone: string | null;
  popular: StorePopularProduct[];
};

/** Daftar toko aktif untuk direktori menu publik, diperkaya lokasi, deskripsi,
 *  dan 3 produk paling laku (gabungan penjualan POS + storefront). */
export async function getStoreDirectory(): Promise<StoreDirectoryEntry[]> {
  const storeRows = await db
    .select({
      id: stores.id,
      name: stores.name,
      businessId: stores.businessId,
      businessName: businesses.name,
      storeAddress: stores.address,
      storePhone: stores.phone,
    })
    .from(stores)
    .innerJoin(businesses, eq(businesses.id, stores.businessId))
    .where(
      and(
        eq(stores.isActive, true),
        isNull(stores.deletedAt),
        eq(businesses.status, "active"),
        isNull(businesses.deletedAt),
      ),
    )
    .orderBy(asc(businesses.name), asc(stores.name));

  if (!storeRows.length) return [];

  const storeIds = storeRows.map((s) => s.id);
  const businessIds = [...new Set(storeRows.map((s) => s.businessId))];

  const [profileRows, activeProducts, posSales, sfSales] = await Promise.all([
    db.select().from(businessProfile).where(inArray(businessProfile.businessId, businessIds)),
    db
      .select({
        id: products.id,
        name: products.name,
        imageUrl: products.imageUrl,
        businessId: products.businessId,
      })
      .from(products)
      .where(
        and(
          inArray(products.businessId, businessIds),
          eq(products.status, "active"),
          isNull(products.deletedAt),
        ),
      ),
    db
      .select({
        storeId: transactions.storeId,
        productId: transactionItems.productId,
        qty: sql<number>`sum(${transactionItems.quantity})::int`,
      })
      .from(transactionItems)
      .innerJoin(transactions, eq(transactions.id, transactionItems.transactionId))
      .where(and(inArray(transactions.storeId, storeIds), eq(transactions.status, "completed")))
      .groupBy(transactions.storeId, transactionItems.productId),
    db
      .select({
        storeId: orders.storeId,
        productId: orderItems.productId,
        qty: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(inArray(orders.storeId, storeIds), eq(orders.orderStatus, "COMPLETED")))
      .groupBy(orders.storeId, orderItems.productId),
  ]);

  const profileByBusiness = new Map(profileRows.map((p) => [p.businessId, p]));
  const defaultProfile = profileRows.find((p) => p.id === "default") ?? profileRows[0] ?? null;

  const productById = new Map(activeProducts.map((p) => [p.id, p]));
  const productsByBusiness = new Map<string, typeof activeProducts>();
  for (const product of activeProducts) {
    const list = productsByBusiness.get(product.businessId) ?? [];
    list.push(product);
    productsByBusiness.set(product.businessId, list);
  }

  // Merge POS + storefront sales into per-store product quantities.
  const soldByStore = new Map<string, Map<string, number>>();
  for (const row of [...posSales, ...sfSales]) {
    const perStore = soldByStore.get(row.storeId) ?? new Map<string, number>();
    perStore.set(row.productId, (perStore.get(row.productId) ?? 0) + Number(row.qty ?? 0));
    soldByStore.set(row.storeId, perStore);
  }

  const shuffle = <T,>(arr: readonly T[]) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  return storeRows.map((store) => {
    const ownProfile = profileByBusiness.get(store.businessId);
    const profile = ownProfile ?? defaultProfile;
    const profileName = ownProfile?.businessName?.trim();
    const location = profile?.address?.trim() || store.storeAddress?.trim() || null;
    const description = profile?.description?.trim() || null;
    const phone = store.storePhone?.trim() || profile?.phone?.trim() || null;

    let popular: StorePopularProduct[] = [];
    const sold = soldByStore.get(store.id);
    const businessProducts = productsByBusiness.get(store.businessId) ?? [];
    const soldIds = new Set(sold?.keys() ?? []);

    if (sold && sold.size) {
      const soldRanked = [...sold.entries()]
        .sort((a, b) => b[1] - a[1] || Math.random() - 0.5)
        .flatMap(([productId, qty]) => {
          const product = productById.get(productId);
          return product
            ? [{ id: product.id, name: product.name, imageUrl: product.imageUrl, sold: qty }]
            : [];
        });
      // Prefer produk paling sering dipesan; isi sisa slot (jika < 3) secara acak.
      const filler = shuffle(businessProducts.filter((p) => !soldIds.has(p.id))).map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        sold: 0,
      }));
      popular = [...soldRanked, ...filler].slice(0, 3);
    } else {
      // Belum ada penjualan: tampilkan produk acak.
      popular = shuffle(businessProducts).slice(0, 3).map((product) => ({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        sold: 0,
      }));
    }

    return {
      id: store.id,
      name: store.name,
      slug: slugifyStoreName(store.name),
      businessId: store.businessId,
      businessName: profileName || store.businessName,
      logoUrl: ownProfile?.logoUrl ?? null,
      location,
      description,
      phone,
      popular,
    };
  });
}