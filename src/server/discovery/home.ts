import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";

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

export type DiscoveryStore = {
  id: string;
  name: string;
  slug: string;
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  location: string | null;
  description: string | null;
  categoryLabel: string | null;
  productCount: number;
  soldCount: number;
  hasPromotion: boolean;
  createdAt: string;
};

export type DiscoveryProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  businessName: string;
  categoryName: string | null;
  available: boolean;
  sold: number;
  createdAt: string;
};

export type DiscoveryCategory = {
  id: string;
  name: string;
  count: number;
};

export type DiscoveryBanner = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  label: string;
  imageUrl: string | null;
};

export type HomeDiscoveryData = {
  stores: DiscoveryStore[];
  featuredStores: DiscoveryStore[];
  nearbyStores: DiscoveryStore[];
  recommendedStores: DiscoveryStore[];
  recentStores: DiscoveryStore[];
  popularProducts: DiscoveryProduct[];
  recentProducts: DiscoveryProduct[];
  categories: DiscoveryCategory[];
  banners: DiscoveryBanner[];
  hasLocation: boolean;
};

export type DiscoverySearchParams = {
  q?: string;
  category?: string;
  nearLat?: number | null;
  nearLng?: number | null;
  limit?: number;
};

export type DiscoverySearchResult = {
  stores: DiscoveryStore[];
  products: DiscoveryProduct[];
  categories: DiscoveryCategory[];
  query: string;
  category: string | null;
  usedLocation: boolean;
};

function iso(v: Date | string | null | undefined) {
  if (!v) return new Date(0).toISOString();
  return new Date(v).toISOString();
}

const EMPTY: HomeDiscoveryData = {
  stores: [],
  featuredStores: [],
  nearbyStores: [],
  recommendedStores: [],
  recentStores: [],
  popularProducts: [],
  recentProducts: [],
  categories: [],
  banners: [],
  hasLocation: false,
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

type LocationHint = { lat: number; lng: number; label: string };

const LOCATION_HINTS: LocationHint[] = [
  { lat: -6.2, lng: 106.816666, label: "Jakarta" },
  { lat: -6.9175, lng: 107.6191, label: "Bandung" },
  { lat: -7.2575, lng: 112.7521, label: "Surabaya" },
  { lat: -7.7956, lng: 110.3695, label: "Yogyakarta" },
  { lat: -6.966667, lng: 110.416664, label: "Semarang" },
  { lat: -8.65, lng: 115.216667, label: "Denpasar" },
  { lat: 3.5952, lng: 98.6722, label: "Medan" },
  { lat: -5.147665, lng: 119.432731, label: "Makassar" },
  { lat: -0.0277, lng: 109.3425, label: "Pontianak" },
  { lat: -6.595038, lng: 106.816635, label: "Bogor" },
  { lat: -6.402484, lng: 106.794243, label: "Depok" },
  { lat: -6.178306, lng: 106.631889, label: "Tangerang" },
  { lat: -6.23827, lng: 106.975571, label: "Bekasi" },
];

function parseLocationCoords(text?: string | null): { lat: number; lng: number } | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const m = lower.match(/(-?\d{1,2}\.\d{2,})\s*[,/ ]\s*(-?\d{1,3}\.\d{2,})/);
  if (m) {
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }
  for (const hint of LOCATION_HINTS) {
    if (lower.includes(hint.label.toLowerCase())) return { lat: hint.lat, lng: hint.lng };
  }
  return null;
}

function normalizeQ(q?: string | null) {
  return (q || "").trim().toLowerCase();
}

export async function getHomeDiscoveryData(): Promise<HomeDiscoveryData> {
  try {
    const storeRows = await db
      .select({
        id: stores.id,
        name: stores.name,
        businessId: stores.businessId,
        businessName: businesses.name,
        currency: businesses.currency,
        storeAddress: stores.address,
        storePhone: stores.phone,
        storeCreatedAt: stores.createdAt,
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
      .orderBy(desc(stores.createdAt))
      .limit(40);

    if (!storeRows.length) return EMPTY;

    const storeIds = storeRows.map((s) => s.id);
    const businessIds = [...new Set(storeRows.map((s) => s.businessId))];

    const q = <T>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

    const [profileRows, categoryRows, lookupCategoryRows, productRows, posSales, sfSales, promoRows] = await Promise.all([
      q(
        db
          .select({
            id: businessProfile.id,
            businessId: businessProfile.businessId,
            businessName: businessProfile.businessName,
            logoUrl: businessProfile.logoUrl,
            address: businessProfile.address,
            description: businessProfile.description,
            phone: businessProfile.phone,
          })
          .from(businessProfile)
          .where(inArray(businessProfile.businessId, businessIds)),
        [] as any[],
      ),
      q(
        db
          .select({ id: categories.id, name: categories.name, businessId: categories.businessId })
          .from(categories)
          .where(and(inArray(categories.businessId, businessIds), eq(categories.status, "active"), isNull(categories.deletedAt))),
        [] as any[],
      ),
      q(db.select({ code: businessCategories.code, name: businessCategories.name }).from(businessCategories).where(eq(businessCategories.isActive, true)), [] as any[]),
      q(
        db
          .select({
            id: products.id,
            name: products.name,
            imageUrl: products.imageUrl,
            sellingPrice: products.sellingPrice,
            stockQuantity: products.stockQuantity,
            isStockTracked: products.isStockTracked,
            businessId: products.businessId,
            categoryId: products.categoryId,
            createdAt: products.createdAt,
          })
          .from(products)
          .where(and(inArray(products.businessId, businessIds), eq(products.status, "active"), isNull(products.deletedAt)))
          .orderBy(desc(products.createdAt))
          .limit(200),
        [] as any[],
      ),
      q(
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
        [] as any[],
      ),
      q(
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
        [] as any[],
      ),
      q(
        db
          .select({ businessId: discounts.businessId, id: discounts.id })
          .from(discounts)
          .where(and(inArray(discounts.businessId, businessIds), eq(discounts.isActive, true)))
          .limit(120),
        [] as any[],
      ),
    ]);

    const profileByBusiness = new Map(profileRows.map((p) => [p.businessId, p]));
    const defaultProfile = profileRows.find((p) => p.id === "default") ?? profileRows[0] ?? null;
    const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
    const lookupNames = lookupCategoryRows.map((c) => c.name);
    const promoBiz = new Set(promoRows.map((p) => p.businessId));

    const soldByStore = new Map<string, Map<string, number>>();
    for (const row of [...posSales, ...sfSales]) {
      const perStore = soldByStore.get(row.storeId) ?? new Map<string, number>();
      perStore.set(row.productId, (perStore.get(row.productId) ?? 0) + Number(row.qty ?? 0));
      soldByStore.set(row.storeId, perStore);
    }

    const productsByBusiness = new Map<string, typeof productRows>();
    for (const p of productRows) {
      const list = productsByBusiness.get(p.businessId) ?? [];
      list.push(p);
      productsByBusiness.set(p.businessId, list);
    }

    function inferBizCategoryLabel(businessId: string): string | null {
      const names = (productsByBusiness.get(businessId) ?? [])
        .map((p) => (p.categoryId ? categoryNameById.get(p.categoryId) : null))
        .filter((n): n is string => !!n);
      if (names.length) {
        const freq = new Map<string, number>();
        for (const n of names) freq.set(n, (freq.get(n) ?? 0) + 1);
        return [...freq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      }
      return lookupNames[0] ?? null;
    }

    const storesMapped: DiscoveryStore[] = storeRows.map((store) => {
      const ownProfile = profileByBusiness.get(store.businessId);
      const profile = ownProfile ?? defaultProfile;
      const profileName = ownProfile?.businessName?.trim();
      const location = profile?.address?.trim() || store.storeAddress?.trim() || null;
      const description = profile?.description?.trim() || null;
      const bizProducts = productsByBusiness.get(store.businessId) ?? [];
      const sold = soldByStore.get(store.id);
      const soldCount = sold ? [...sold.values()].reduce((a, b) => a + b, 0) : 0;
      return {
        id: store.id,
        name: store.name,
        slug: slugifyStoreName(store.name),
        businessId: store.businessId,
        businessName: profileName || store.businessName,
        logoUrl: ownProfile?.logoUrl ?? null,
        location,
        description,
        categoryLabel: inferBizCategoryLabel(store.businessId),
        productCount: bizProducts.length,
        soldCount,
        hasPromotion: promoBiz.has(store.businessId),
        createdAt: iso(store.storeCreatedAt),
      };
    });

    const currencyByBusiness = new Map(storeRows.map((s) => [s.businessId, s.currency || "IDR"]));
    const repStoreByBusiness = new Map<string, DiscoveryStore>();
    for (const s of storesMapped) {
      const cur = repStoreByBusiness.get(s.businessId);
      if (!cur || s.productCount > cur.productCount) repStoreByBusiness.set(s.businessId, s);
    }

    const allProducts: DiscoveryProduct[] = [];
    for (const p of productRows) {
      const rep = repStoreByBusiness.get(p.businessId);
      if (!rep) continue;
      const sold = soldByStore.get(rep.id)?.get(p.id) ?? 0;
      const available = !p.isStockTracked || Number(p.stockQuantity ?? 0) > 0;
      allProducts.push({
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        price: Number(p.sellingPrice ?? 0),
        currency: currencyByBusiness.get(p.businessId) || "IDR",
        storeId: rep.id,
        storeName: rep.name,
        storeSlug: rep.slug,
        businessName: rep.businessName,
        categoryName: p.categoryId ? categoryNameById.get(p.categoryId) ?? null : null,
        available,
        sold,
        createdAt: iso(p.createdAt),
      });
    }

    const popularProducts = [...allProducts].sort((a, b) => b.sold - a.sold || b.price - a.price).slice(0, 16);
    const recentProducts = [...allProducts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 16);

    const bySales = [...storesMapped].sort((a, b) => b.soldCount - a.soldCount || b.productCount - a.productCount);
    const featuredStores = bySales.filter((s) => s.productCount > 0 || s.hasPromotion).slice(0, 10);
    const recommendedStores = [...storesMapped].sort((a, b) => b.productCount - a.productCount || b.soldCount - a.soldCount).slice(0, 10);
    const recentStores = [...storesMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    const hasLocation = storesMapped.some((s) => !!s.location);
    const nearbyStores = [...storesMapped].sort((a, b) => (a.location ? 0 : 1) - (b.location ? 0 : 1) || b.soldCount - a.soldCount).slice(0, 10);

    const catCount = new Map<string, { id: string; name: string; count: number }>();
    for (const p of allProducts) {
      if (!p.categoryName) continue;
      const key = p.categoryName.trim().toLowerCase();
      if (!key) continue;
      const cur = catCount.get(key) ?? { id: key, name: p.categoryName.trim(), count: 0 };
      cur.count += 1;
      catCount.set(key, cur);
    }
    // Include lookup categories (UMKM types) even if no product count, for discoverability.
    for (const lc of lookupNames) {
      const key = lc.trim().toLowerCase();
      if (!key || catCount.has(key)) continue;
      catCount.set(key, { id: `lookup:${key}`, name: lc.trim(), count: 0 });
    }
    const discoveryCategories = [...catCount.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 20);

    const banners: DiscoveryBanner[] = (featuredStores.length ? featuredStores : storesMapped).slice(0, 6).map((s, i) => ({
      id: `featured-${s.id}`,
      title: s.name,
      subtitle: s.hasPromotion ? `Promo tersedia · ${s.description?.slice(0, 60) || s.location || s.businessName}` : (s.description?.slice(0, 80) || s.location || `Temukan produk dari ${s.businessName}`),
      href: `/${s.slug}/menu`,
      label: s.hasPromotion ? "Promo" : i === 0 ? "Sorotan" : "Pilihan",
      imageUrl: s.logoUrl,
    }));

    return { stores: storesMapped, featuredStores, nearbyStores, recommendedStores, recentStores, popularProducts, recentProducts, categories: discoveryCategories, banners, hasLocation };
  } catch {
    return EMPTY;
  }
}

export async function searchDiscovery(params: DiscoverySearchParams): Promise<DiscoverySearchResult> {
  const q = normalizeQ(params.q);
  const category = params.category?.trim() || null;
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 60);
  const nearLat = typeof params.nearLat === "number" && Number.isFinite(params.nearLat) ? params.nearLat : null;
  const nearLng = typeof params.nearLng === "number" && Number.isFinite(params.nearLng) ? params.nearLng : null;
  const usedLocation = nearLat !== null && nearLng !== null;

  if (!q && !category && !usedLocation) {
    return { stores: [], products: [], categories: [], query: "", category: null, usedLocation: false };
  }

  try {
    // Base visible stores
    const storeRows = await db
      .select({
        id: stores.id,
        name: stores.name,
        businessId: stores.businessId,
        businessName: businesses.name,
        currency: businesses.currency,
        storeAddress: stores.address,
        storeLatitude: stores.latitude,
        storeLongitude: stores.longitude,
        storeCreatedAt: stores.createdAt,
      })
      .from(stores)
      .innerJoin(businesses, eq(businesses.id, stores.businessId))
      .where(and(eq(stores.isActive, true), isNull(stores.deletedAt), eq(businesses.status, "active"), isNull(businesses.deletedAt)))
      .limit(120);

    if (!storeRows.length) return { stores: [], products: [], categories: [], query: q, category, usedLocation };

    const storeIds = storeRows.map((s) => s.id);
    const businessIds = [...new Set(storeRows.map((s) => s.businessId))];

    const pattern = q ? `%${q.replace(/[%_]/g, "\\$&")}%` : null;

    const [profileRows, categoryRows, matchedProducts, promoRows, posSales, sfSales] = await Promise.all([
      db.select({ id: businessProfile.id, businessId: businessProfile.businessId, businessName: businessProfile.businessName, logoUrl: businessProfile.logoUrl, address: businessProfile.address, description: businessProfile.description }).from(businessProfile).where(inArray(businessProfile.businessId, businessIds)),
      db.select({ id: categories.id, name: categories.name, businessId: categories.businessId }).from(categories).where(and(inArray(categories.businessId, businessIds), eq(categories.status, "active"), isNull(categories.deletedAt))),
      db
        .select({ id: products.id, name: products.name, imageUrl: products.imageUrl, sellingPrice: products.sellingPrice, stockQuantity: products.stockQuantity, isStockTracked: products.isStockTracked, businessId: products.businessId, categoryId: products.categoryId, createdAt: products.createdAt })
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(
          and(
            inArray(products.businessId, businessIds),
            eq(products.status, "active"),
            isNull(products.deletedAt),
            ...(pattern ? [or(ilike(products.name, pattern), ilike(categories.name, pattern))] : []),
            ...(category ? [ilike(categories.name, `%${category.replace(/[%_]/g, "\\$&")}%`)] : []),
          ) as any,
        )
        .orderBy(desc(products.createdAt))
        .limit(q || category ? limit : 80),
      db.select({ businessId: discounts.businessId }).from(discounts).where(and(inArray(discounts.businessId, businessIds), eq(discounts.isActive, true))).limit(200),
      db.select({ storeId: transactions.storeId, productId: transactionItems.productId, qty: sql<number>`sum(${transactionItems.quantity})::int` }).from(transactionItems).innerJoin(transactions, eq(transactions.id, transactionItems.transactionId)).where(and(inArray(transactions.storeId, storeIds), eq(transactions.status, "completed"))).groupBy(transactions.storeId, transactionItems.productId),
      db.select({ storeId: orders.storeId, productId: orderItems.productId, qty: sql<number>`sum(${orderItems.quantity})::int` }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(inArray(orders.storeId, storeIds), eq(orders.orderStatus, "COMPLETED"))).groupBy(orders.storeId, orderItems.productId),
    ]);

    const profileByBusiness = new Map(profileRows.map((p) => [p.businessId, p]));
    const defaultProfile = profileRows.find((p) => p.id === "default") ?? profileRows[0] ?? null;
    const categoryNameById = new Map(categoryRows.map((c) => [c.id, c.name]));
    const promoBiz = new Set(promoRows.map((p) => p.businessId));

    const soldByStore = new Map<string, Map<string, number>>();
    for (const row of [...posSales, ...sfSales]) {
      const perStore = soldByStore.get(row.storeId) ?? new Map<string, number>();
      perStore.set(row.productId, (perStore.get(row.productId) ?? 0) + Number(row.qty ?? 0));
      soldByStore.set(row.storeId, perStore);
    }

    // Count products per business (lightweight) for store cards
    const prodCountRows = await db.select({ businessId: products.businessId, count: sql<number>`count(*)::int` }).from(products).where(and(inArray(products.businessId, businessIds), eq(products.status, "active"), isNull(products.deletedAt))).groupBy(products.businessId);
    const prodCountByBiz = new Map(prodCountRows.map((r) => [r.businessId, Number(r.count)]));

    let storesMapped: (DiscoveryStore & { _lat?: number; _lng?: number; _distanceKm?: number })[] = storeRows.map((store) => {
      const ownProfile = profileByBusiness.get(store.businessId);
      const profile = ownProfile ?? defaultProfile;
      const location = profile?.address?.trim() || store.storeAddress?.trim() || null;
      const hasStoredCoords = typeof store.storeLatitude === "number" && typeof store.storeLongitude === "number";
      const coords = hasStoredCoords
        ? { lat: store.storeLatitude as number, lng: store.storeLongitude as number }
        : parseLocationCoords(location);
      const sold = soldByStore.get(store.id);
      const soldCount = sold ? [...sold.values()].reduce((a, b) => a + b, 0) : 0;
      return {
        id: store.id,
        name: store.name,
        slug: slugifyStoreName(store.name),
        businessId: store.businessId,
        businessName: (ownProfile?.businessName?.trim() || store.businessName),
        logoUrl: ownProfile?.logoUrl ?? null,
        location,
        description: profile?.description?.trim() || null,
        categoryLabel: null,
        productCount: prodCountByBiz.get(store.businessId) ?? 0,
        soldCount,
        hasPromotion: promoBiz.has(store.businessId),
        createdAt: iso(store.storeCreatedAt),
        _lat: coords?.lat,
        _lng: coords?.lng,
      };
    });

    if (q) {
      storesMapped = storesMapped.filter((s) => [s.name, s.businessName, s.location || "", s.description || ""].some((v) => v.toLowerCase().includes(q)));
    }
    if (usedLocation) {
      storesMapped = storesMapped.map((s) => ({ ...s, _distanceKm: typeof s._lat === "number" && typeof s._lng === "number" ? haversineKm(nearLat!, nearLng!, s._lat, s._lng) : undefined }));
      storesMapped.sort((a, b) => (a._distanceKm ?? Number.POSITIVE_INFINITY) - (b._distanceKm ?? Number.POSITIVE_INFINITY) || b.soldCount - a.soldCount);
    } else {
      storesMapped.sort((a, b) => b.soldCount - a.soldCount || b.productCount - a.productCount);
    }

    const repStoreByBusiness = new Map<string, DiscoveryStore>();
    for (const s of storesMapped.length ? storesMapped : storeRows.map((r) => ({ id: r.id, name: r.name, slug: slugifyStoreName(r.name), businessId: r.businessId, businessName: r.businessName, logoUrl: null, location: r.storeAddress, description: null, categoryLabel: null, productCount: 0, soldCount: 0, hasPromotion: false, createdAt: iso(r.storeCreatedAt) } as DiscoveryStore))) {
      const cur = repStoreByBusiness.get(s.businessId);
      if (!cur || s.productCount > cur.productCount) repStoreByBusiness.set(s.businessId, s);
    }
    const currencyByBusiness = new Map(storeRows.map((s) => [s.businessId, s.currency || "IDR"]));

    let resultProducts: DiscoveryProduct[] = matchedProducts.map((p) => {
      const rep = repStoreByBusiness.get(p.businessId) || storesMapped.find((s) => s.businessId === p.businessId);
      if (!rep) return null as any;
      const sold = soldByStore.get(rep.id)?.get(p.id) ?? 0;
      const available = !p.isStockTracked || Number(p.stockQuantity ?? 0) > 0;
      return {
        id: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        price: Number(p.sellingPrice ?? 0),
        currency: currencyByBusiness.get(p.businessId) || "IDR",
        storeId: rep.id,
        storeName: rep.name,
        storeSlug: rep.slug,
        businessName: rep.businessName,
        categoryName: p.categoryId ? categoryNameById.get(p.categoryId) ?? null : null,
        available,
        sold,
        createdAt: iso(p.createdAt),
      } as DiscoveryProduct;
    }).filter(Boolean);

    // If no text/category filter but location requested, surface popular products near sorted stores.
    if (!q && !category && usedLocation) {
      const allowedBiz = new Set(storesMapped.slice(0, limit).map((s) => s.businessId));
      // quick fetch popular products for allowed businesses
      const nearProds = await db
        .select({ id: products.id, name: products.name, imageUrl: products.imageUrl, sellingPrice: products.sellingPrice, stockQuantity: products.stockQuantity, isStockTracked: products.isStockTracked, businessId: products.businessId, categoryId: products.categoryId, createdAt: products.createdAt })
        .from(products)
        .where(and(inArray(products.businessId, [...allowedBiz].length ? [...allowedBiz] : businessIds.slice(0, 1)), eq(products.status, "active"), isNull(products.deletedAt)))
        .orderBy(desc(products.createdAt))
        .limit(limit);
      resultProducts = nearProds.map((p) => {
        const rep = repStoreByBusiness.get(p.businessId) || storesMapped.find((s) => s.businessId === p.businessId);
        if (!rep) return null as any;
        const sold = soldByStore.get(rep.id)?.get(p.id) ?? 0;
        const available = !p.isStockTracked || Number(p.stockQuantity ?? 0) > 0;
        return { id: p.id, name: p.name, imageUrl: p.imageUrl, price: Number(p.sellingPrice ?? 0), currency: currencyByBusiness.get(p.businessId) || "IDR", storeId: rep.id, storeName: rep.name, storeSlug: rep.slug, businessName: rep.businessName, categoryName: p.categoryId ? categoryNameById.get(p.categoryId) ?? null : null, available, sold, createdAt: iso(p.createdAt) } as DiscoveryProduct;
      }).filter(Boolean);
    }

    const catCount = new Map<string, { id: string; name: string; count: number }>();
    for (const p of resultProducts) {
      if (!p.categoryName) continue;
      const key = p.categoryName.trim().toLowerCase();
      if (!key) continue;
      const cur = catCount.get(key) ?? { id: key, name: p.categoryName.trim(), count: 0 };
      cur.count += 1;
      catCount.set(key, cur);
    }

    return {
      stores: storesMapped.slice(0, limit).map(({ _lat, _lng, _distanceKm, ...s }) => s),
      products: resultProducts.slice(0, limit),
      categories: [...catCount.values()].sort((a, b) => b.count - a.count).slice(0, 12),
      query: q,
      category,
      usedLocation,
    };
  } catch {
    return { stores: [], products: [], categories: [], query: q, category, usedLocation };
  }
}
