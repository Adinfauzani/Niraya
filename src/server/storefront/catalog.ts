import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  businesses,
  businessProfile,
  categories,
  inventory,
  products,
  productVariants,
  stores,
} from "@/server/db/schema";

async function loadStoreContext(storeId?: string | null) {
  if (storeId) {
    const [store] = await db
      .select({
        id: stores.id,
        businessId: stores.businessId,
        name: stores.name,
        address: stores.address,
      })
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.isActive, true),
          sql`${stores.deletedAt} is null`,
        ),
      )
      .limit(1);
    if (!store) {
      throw Object.assign(new Error("Toko tidak ditemukan."), { status: 404 });
    }
    const [business] = await db
      .select({ id: businesses.id, name: businesses.name, legalName: businesses.legalName })
      .from(businesses)
      .where(and(eq(businesses.id, store.businessId), eq(businesses.status, "active")))
      .limit(1);
    if (!business) {
      throw Object.assign(new Error("Toko tidak ditemukan."), { status: 404 });
    }
    const [profile] = await db
      .select({
        businessName: businessProfile.businessName,
        logoUrl: businessProfile.logoUrl,
        description: businessProfile.description,
      })
      .from(businessProfile)
      .where(eq(businessProfile.businessId, store.businessId))
      .limit(1);
    const [storeCountRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(stores)
      .where(
        and(
          eq(stores.businessId, store.businessId),
          eq(stores.isActive, true),
          sql`${stores.deletedAt} is null`,
        ),
      );
    return {
      business: { ...business, profile: profile ?? null, storeCount: Number(storeCountRow?.count ?? 1) },
      store: { id: store.id, name: store.name, address: store.address },
    };
  }

  const [business] = await db
    .select({ id: businesses.id, name: businesses.name, legalName: businesses.legalName })
    .from(businesses)
    .where(eq(businesses.status, "active"))
    .limit(1);
  if (!business) return { business: null, store: null };
  const [profile] = await db
    .select({
      businessName: businessProfile.businessName,
      logoUrl: businessProfile.logoUrl,
      description: businessProfile.description,
    })
    .from(businessProfile)
    .where(eq(businessProfile.businessId, business.id))
    .limit(1);
  const [store] = await db
    .select({ id: stores.id, name: stores.name, address: stores.address })
    .from(stores)
    .where(
      and(
        eq(stores.businessId, business.id),
        eq(stores.isActive, true),
        sql`${stores.deletedAt} is null`,
      ),
    )
    .limit(1);
  const [storeCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stores)
    .where(
      and(
        eq(stores.businessId, business.id),
        eq(stores.isActive, true),
        sql`${stores.deletedAt} is null`,
      ),
    );
  return {
    business: { ...business, profile: profile ?? null, storeCount: Number(storeCountRow?.count ?? 1) },
    store: store ? { id: store.id, name: store.name, address: store.address } : null,
  };
}

/** Public storefront catalog. When `storeId` is given the catalog is scoped to
 *  that store (its business + per-store inventory); otherwise the default
 *  business/first active store is used. Uses server-side DB reads only; no auth,
 *  no staff-only data, no cost/internal stock counts. */
async function loadPaymentConfig(businessId: string) {
  const fallback = {
    manualTransferEnabled: true,
    instructions: { bankName: null as string | null, accountName: null as string | null, accountNumber: null as string | null, instructions: null as string | null, qrisImageUrl: null as string | null },
  };
  try {
    const rows = await db.execute(sql`
      select
        coalesce(ps."QrManualTransferEnabled", bs."QrManualTransferEnabled", true) as manual,
        coalesce(ps."ManualTransferBankName", bs."ManualTransferBankName") as bank,
        coalesce(ps."ManualTransferAccountName", bs."ManualTransferAccountName") as acc_name,
        coalesce(ps."ManualTransferAccountNumber", bs."ManualTransferAccountNumber") as acc_no,
        coalesce(ps."ManualTransferInstructions", bs."ManualTransferInstructions") as instructions,
        coalesce(ps."ManualTransferQrisImageUrl", bs."ManualTransferQrisImageUrl") as qris_image
      from "core"."Businesses" b
      left join "settings"."PaymentSettings" ps on ps."BusinessId" = b."Id"
      left join "settings"."BusinessSettings" bs on bs."Id" = 'default'
      where b."Id" = ${businessId}::uuid
      limit 1
    `);
    const row = (rows as any)?.rows?.[0] ?? (Array.isArray(rows) ? rows[0] : null);
    if (row) {
      return {
        manualTransferEnabled: !!row.manual,
        instructions: { bankName: row.bank ?? null, accountName: row.acc_name ?? null, accountNumber: row.acc_no ?? null, instructions: row.instructions ?? null, qrisImageUrl: row.qris_image ?? null },
      };
    }
  } catch {
    try {
      const rows = await db.execute(sql`select "QrManualTransferEnabled" as manual, "ManualTransferBankName" as bank, "ManualTransferAccountName" as acc_name, "ManualTransferAccountNumber" as acc_no, "ManualTransferInstructions" as instructions, "ManualTransferQrisImageUrl" as qris_image from "settings"."BusinessSettings" where "Id" = 'default' limit 1`);
      const row = (rows as any)?.rows?.[0] ?? (Array.isArray(rows) ? rows[0] : null);
      if (row) return { manualTransferEnabled: !!row.manual, instructions: { bankName: row.bank ?? null, accountName: row.acc_name ?? null, accountNumber: row.acc_no ?? null, instructions: row.instructions ?? null, qrisImageUrl: row.qris_image ?? null } };
    } catch {
      try {
        const rows = await db.execute(sql`select "QrManualTransferEnabled" as manual, "ManualTransferBankName" as bank, "ManualTransferAccountName" as acc_name, "ManualTransferAccountNumber" as acc_no, "ManualTransferInstructions" as instructions from "settings"."BusinessSettings" where "Id" = 'default' limit 1`);
        const row = (rows as any)?.rows?.[0] ?? (Array.isArray(rows) ? rows[0] : null);
        if (row) return { manualTransferEnabled: !!row.manual, instructions: { bankName: row.bank ?? null, accountName: row.acc_name ?? null, accountNumber: row.acc_no ?? null, instructions: row.instructions ?? null, qrisImageUrl: null } };
      } catch {}
    }
  }
  return fallback;
}

export async function getPublicStorefrontCatalog(storeId?: string | null) {
  const { business, store } = await loadStoreContext(storeId);
  // Default aktif: storefront checkout (transfer manual) tersedia sampai bisnis
  // secara eksplisit menonaktifkannya lewat setting "Transfer manual".
  let manualTransferEnabled = true;
  let paymentInstructions = { bankName: null as string | null, accountName: null as string | null, accountNumber: null as string | null, instructions: null as string | null, qrisImageUrl: null as string | null };
  if (business) {
    const cfg = await loadPaymentConfig(business.id);
    manualTransferEnabled = cfg.manualTransferEnabled;
    paymentInstructions = cfg.instructions;
  }
  if (!business || !store) {
    return {
      business: { name: "Niraya", description: null, logoUrl: null, city: null, storeCount: 0 },
      store: null,
      payment: {
        storefrontCheckoutEnabled: !!manualTransferEnabled,
        manualTransferEnabled: !!manualTransferEnabled,
        methods: manualTransferEnabled ? [{ id: "manual_transfer", label: "Transfer Manual" }] : [],
        instructions: paymentInstructions,
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
        .where(and(eq(inventory.storeId, store.id), inArray(inventory.productId, ids)))
    : [];
  const invBy = new Map(invRows.map((r) => [r.productId, r]));
  const varsBy = new Map<string, any[]>();
  for (const v of vars.filter((v) => v.isActive)) {
    const a = varsBy.get(v.productId) ?? [];
    a.push({ id: v.id, name: v.name, sellingPrice: v.sellingPrice ? Number(v.sellingPrice) : null });
    varsBy.set(v.productId, a);
  }
  return {
    business: {
      name: business.profile?.businessName?.trim() || business.name,
      description: business.profile?.description?.trim() || null,
      logoUrl: business.profile?.logoUrl ?? null,
      city: null,
      storeCount: business.storeCount ?? 1,
    },
    store: { id: store.id, name: store.name, address: store.address },
    payment: {
      storefrontCheckoutEnabled: !!manualTransferEnabled,
      manualTransferEnabled: !!manualTransferEnabled,
      methods: manualTransferEnabled ? [{ id: "manual_transfer", label: "Transfer Manual" }] : [],
      instructions: paymentInstructions,
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