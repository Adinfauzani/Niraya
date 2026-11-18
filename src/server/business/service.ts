import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

import type {
  BusinessSettings,
  Category,
  Customer,
  EntityStatus,
  Product,
  Staff,
  StockMovement,
  Transaction,
  TransactionItem,
} from "@/types/business";
import { db } from "@/server/db";
import {
  businessSettings,
  categories,
  customers,
  inventory,
  products,
  receiptSettings,
  staff,
  stockAdjustments,
  stockMovements,
  transactionItems,
  transactions,
  stores,
} from "@/server/db/schema";
import { checkUserLimit, checkStoreLimit, assertProductLimitInTx } from "@/server/entitlements/check";

const money = (value: number) => value.toFixed(2);
const number = (value: string | null | undefined) => Number(value ?? 0);
const iso = (value: Date | string) => new Date(value).toISOString();

export type BusinessData = {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  staff: Staff[];
  transactions: Transaction[];
  movements: StockMovement[];
  /** Null when persisted business settings are not initialized yet. */
  settings: BusinessSettings | null;
  settingsState: "ready" | "uninitialized";
};

export type BusinessQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  status?: string;
  stockFilter?: string;
  payment?: string;
  from?: string;
  to?: string;
};

export type ActingUser = {
  actingUserId?: string;
  actingUserRole?: string;
};

/**
 * Upsert stok toko default. Tabel `Inventory` adalah sumber kebenaran per
 * toko; `Products.StockQuantity` tetap diperbarui sebagai cache kompatibilitas
 * untuk alur POS lama.
 */
async function upsertInventory(
  tx: any,
  businessId: string,
  storeId: string,
  productId: string,
  stockQuantity: number,
  minimumStock: number
) {
  await tx
    .insert(inventory)
    .values({
      businessId,
      storeId,
      productId,
      stockQuantity,
      minimumStock,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [inventory.productId, inventory.storeId],
      set: {
        stockQuantity,
        minimumStock,
        updatedAt: new Date(),
      },
    });
}

async function loadBusinessSettingsSafe(businessId: string): Promise<Record<string, any> | null> {
  try {
    const rows = await db
      .select()
      .from(businessSettings)
      .where(and(eq(businessSettings.id, "default"), eq(businessSettings.businessId, businessId)))
      .limit(1);
    return (rows[0] as any) ?? null;
  } catch {
    try {
      const result = await db.execute(sql`
        select "Id", "BusinessId", "BusinessName", "Address", "Phone", "Email", "Currency", "Timezone",
               "TaxRate", "MemberDiscountRate", "LowStockThreshold", "LegacyReceiptFooter",
               "QrOrderingEnabled", "QrManualTransferEnabled", "ManualTransferBankName",
               "ManualTransferAccountName", "ManualTransferAccountNumber", "ManualTransferInstructions",
               "ReservationExpiryMinutes", "PaymentGatewayModuleStatus", "CreatedAt", "UpdatedAt"
        from "settings"."BusinessSettings" where "Id" = 'default' and "BusinessId" = ${businessId}::uuid limit 1
      `);
      const row = (result as any)?.rows?.[0] ?? (Array.isArray(result) ? result[0] : null);
      if (row) return row;
    } catch {}
    try {
      const result = await db.execute(sql`
        select "Id", "BusinessName", "Address", "Phone", "Email", "Currency", "Timezone",
               "TaxRate", "MemberDiscountRate", "LowStockThreshold", "LegacyReceiptFooter"
        from "settings"."BusinessSettings" where "Id" = 'default' and "BusinessId" = ${businessId}::uuid limit 1
      `);
      const row = (result as any)?.rows?.[0] ?? (Array.isArray(result) ? result[0] : null);
      return row ?? null;
    } catch (error: any) {
      console.error("BusinessSettings load fallback failed:", error?.message || error);
      return null;
    }
  }
}

async function loadReceiptFooterSafe(businessId: string, storeId: string): Promise<string | null> {
  try {
    const rows = await db
      .select()
      .from(receiptSettings)
      .where(
        and(
          eq(receiptSettings.businessId, businessId),
          eq(receiptSettings.storeId, storeId)
        )
      )
      .limit(1);
    return rows[0]?.footer ?? null;
  } catch {
    try {
      const result = await db.execute(sql`
        select "Footer" as footer from "settings"."ReceiptSettings"
        where "BusinessId" = ${businessId}::uuid and "StoreId" = ${storeId}::uuid
        limit 1
      `);
      const row = (result as any)?.rows?.[0] ?? (Array.isArray(result) ? result[0] : null);
      return (row?.footer ?? row?.Footer ?? null) as string | null;
    } catch {
      return null;
    }
  }
}

export async function getBusinessData(
  query: BusinessQuery = {},
  businessId: string,
  storeId: string
): Promise<BusinessData> {
  const {
    page = 1,
    pageSize = 20,
    search,
    categoryId,
    status,
    stockFilter: _stockFilter,
    payment,
    from,
    to,
  } = query;

  const offset = (page - 1) * pageSize;

  const transactionFilters: any[] = [
    eq(transactions.businessId, businessId),
  ];
  if (search) {
    transactionFilters.push(
      or(
        ilike(transactions.transactionNumber, `%${search}%`),
        ilike(transactions.customerName, `%${search}%`),
        ilike(transactions.cashierName, `%${search}%`)
      )
    );
  }
  if (status) transactionFilters.push(eq(transactions.status, status));
  if (payment) transactionFilters.push(eq(transactions.paymentMethod, payment));
  if (from) transactionFilters.push(gte(transactions.createdAt, new Date(from)));
  if (to) transactionFilters.push(lte(transactions.createdAt, new Date(to)));

  const productFilters: any[] = [
    eq(products.businessId, businessId),
  ];
  if (search) {
    productFilters.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.sku, `%${search}%`),
        ilike(products.barcode ?? "", `%${search}%`)
      )
    );
  }
  if (categoryId) productFilters.push(eq(products.categoryId, categoryId));
  if (status) productFilters.push(eq(products.status, status));

  const customerFilters: any[] = [
    eq(customers.businessId, businessId),
  ];
  if (search) {
    customerFilters.push(
      or(
        ilike(customers.name, `%${search}%`),
        ilike(customers.phone, `%${search}%`),
        ilike(customers.email, `%${search}%`)
      )
    );
  }

  const staffFilters: any[] = [eq(staff.businessId, businessId)];
  if (search) {
    staffFilters.push(
      or(
        ilike(staff.name, `%${search}%`),
        ilike(staff.email, `%${search}%`)
      )
    );
  }
  if (status) staffFilters.push(eq(staff.status, status));

  const [
    categoryRows,
    productRows,
    customerRows,
    staffRows,
    settingsRowRaw,
    receiptFooterRaw,
    transactionRows,
    itemRows,
    movementRows,
  ] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.businessId, businessId)),
    db
      .select()
      .from(products)
      .where(and(...productFilters)),
    db
      .select()
      .from(customers)
      .where(and(...customerFilters))
      .limit(pageSize)
      .offset(offset),
    db
      .select()
      .from(staff)
      .where(and(...staffFilters))
      .limit(pageSize)
      .offset(offset),
    loadBusinessSettingsSafe(businessId),
    loadReceiptFooterSafe(businessId, storeId),
    db
      .select()
      .from(transactions)
      .where(and(...transactionFilters))
      .orderBy(desc(transactions.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select().from(transactionItems),
    db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.businessId, businessId)),
  ]);

  const productIds = productRows.map((row) => row.id);
  const inventoryRows =
    productIds.length > 0
      ? await db
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.storeId, storeId),
              inArray(inventory.productId, productIds)
            )
          )
      : [];
  const inventoryByProduct = new Map(
    inventoryRows.map((row) => [row.productId, row])
  );

  const itemsByTransaction = new Map<string, TransactionItem[]>();
  for (const item of itemRows) {
    const list = itemsByTransaction.get(item.transactionId) ?? [];
    list.push({
      productId: item.productId,
      name: item.productName,
      sku: item.sku ?? "",
      quantity: item.quantity,
      unitPrice: number(item.unitPrice),
      lineTotal: number(item.lineTotal),
    });
    itemsByTransaction.set(item.transactionId, list);
  }

  const mappedTransactions: Transaction[] = transactionRows
    .map((row) => ({
      id: row.id,
      number: row.transactionNumber,
      createdAt: iso(row.createdAt),
      cashier: row.cashierName ?? "Kasir",
      customerId: row.customerId ?? undefined,
      customerName: row.customerName ?? "Umum",
      orderType:
        row.orderType === "takeaway"
          ? ("takeaway" as const)
          : ("dine-in" as const),
      tableNumber: row.tableNumber ?? undefined,
      items: itemsByTransaction.get(row.id) ?? [],
      subtotal: number(row.subtotal),
      discount: number(row.discountTotal),
      tax: number(row.taxTotal),
      total: number(row.grandTotal),
      paymentMethod: row.paymentMethod as Transaction["paymentMethod"],
      cashReceived: row.amountPaid ? number(row.amountPaid) : undefined,
      change: row.changeAmount ? number(row.changeAmount) : undefined,
      status: row.status as Transaction["status"],
      voidReason: row.voidReason ?? undefined,
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const settingsRow = settingsRowRaw as any;
  const receiptFooter = receiptFooterRaw ?? settingsRow?.legacyReceiptFooter ?? settingsRow?.LegacyReceiptFooter ?? "";
  const mappedSettings: BusinessSettings | null = settingsRow
    ? {
        businessName: settingsRow.businessName ?? settingsRow.BusinessName ?? "",
        address: settingsRow.address ?? settingsRow.Address ?? "",
        phone: settingsRow.phone ?? settingsRow.Phone ?? "",
        email: settingsRow.email ?? settingsRow.Email ?? "",
        currency: settingsRow.currency ?? settingsRow.Currency ?? "IDR",
        timezone: settingsRow.timezone ?? settingsRow.Timezone ?? "Asia/Jakarta",
        taxRate: number(settingsRow.taxRate ?? settingsRow.TaxRate),
        memberDiscountRate: number(settingsRow.memberDiscountRate ?? settingsRow.MemberDiscountRate),
        lowStockThreshold: Number(settingsRow.lowStockThreshold ?? settingsRow.LowStockThreshold ?? 0),
        receiptFooter,
        qrOrderingEnabled: !!(settingsRow.qrOrderingEnabled ?? settingsRow.QrOrderingEnabled),
        qrManualTransferEnabled: settingsRow.qrManualTransferEnabled ?? settingsRow.QrManualTransferEnabled ?? true,
        manualTransferBankName: (settingsRow.manualTransferBankName ?? settingsRow.ManualTransferBankName ?? "") as string,
        manualTransferAccountName: (settingsRow.manualTransferAccountName ?? settingsRow.ManualTransferAccountName ?? "") as string,
        manualTransferAccountNumber: (settingsRow.manualTransferAccountNumber ?? settingsRow.ManualTransferAccountNumber ?? "") as string,
        manualTransferInstructions: (settingsRow.manualTransferInstructions ?? settingsRow.ManualTransferInstructions ?? "") as string,
        reservationExpiryMinutes: Number(settingsRow.reservationExpiryMinutes ?? settingsRow.ReservationExpiryMinutes ?? 30),
      }
    : null;

  return {
    categories: categoryRows
      .map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? undefined,
        status: row.status as EntityStatus,
        createdAt: iso(row.createdAt),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    products: productRows
      .map((row) => {
        const stockRow = inventoryByProduct.get(row.id);
        return {
          id: row.id,
          name: row.name,
          sku: row.sku,
          barcode: row.barcode ?? undefined,
          categoryId: row.categoryId ?? "",
          price: number(row.sellingPrice),
          cost: number(row.costPrice),
          stock: stockRow?.stockQuantity ?? row.stockQuantity,
          minStock: stockRow?.minimumStock ?? row.minimumStock,
          unit: row.unit,
          imageUrl: row.imageUrl ?? undefined,
          status: row.status as EntityStatus,
          createdAt: iso(row.createdAt),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name)),
    customers: customerRows
      .map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email ?? undefined,
        notes: row.notes ?? undefined,
        joinedAt: iso(row.joinedAt),
      }))
      .sort(
        (a, b) =>
          new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
      ),
    staff: staffRows
      .map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as Staff["role"],
        status: row.status as Staff["status"],
        joinedAt: iso(row.joinedAt),
        lastActive: row.lastActive ? iso(row.lastActive) : undefined,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    transactions: mappedTransactions,
    movements: movementRows
      .map((row) => ({
        id: row.id,
        productId: row.productId ?? "",
        productName: row.productName,
        type: row.movementType as StockMovement["type"],
        quantity: row.quantity,
        stockAfter: row.stockAfter,
        note: row.note ?? "",
        staff: row.staffName ?? "Kasir",
        createdAt: iso(row.createdAt),
      }))
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    settings: mappedSettings,
    settingsState: mappedSettings ? "ready" : "uninitialized",
  };
}

function requiredId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} tidak valid.`);
  }
  return value;
}

export async function mutateBusiness(
  action: string,
  payload: any,
  actingUser: ActingUser & { businessId: string; storeId?: string } = { businessId: "" }
) {
  const { actingUserId, actingUserRole: _actingUserRole, businessId, storeId } = actingUser;
  if (!storeId) {
    throw new Error("Store ID tidak ditemukan dalam konteks bisnis.");
  }
  switch (action) {
    case "category.create": {
      await db.insert(categories).values({
        id: requiredId(payload.id, "ID kategori"),
        businessId,
        name: String(payload.name ?? "").trim(),
        description: payload.description?.trim() || null,
        status: payload.status ?? "active",
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        updatedAt: new Date(),
      });
      return { ok: true };
    }

    case "category.update": {
      await db
        .update(categories)
        .set({
          name: String(payload.name ?? "").trim(),
          description: payload.description?.trim() || null,
          status: payload.status ?? "active",
          updatedAt: new Date(),
        })
        .where(eq(categories.id, requiredId(payload.id, "ID kategori")));
      return { ok: true };
    }

    case "category.delete": {
      const id = requiredId(payload.id, "ID kategori");
      const used = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.categoryId, id))
        .limit(1);
      if (used.length > 0) {
        throw new Error("Kategori masih dipakai produk. Pindahkan produk dulu.");
      }
      await db.delete(categories).where(eq(categories.id, id));
      return { ok: true };
    }

    case "product.create": {
      const id = requiredId(payload.id, "ID produk");
      const stock = Number(payload.stock ?? 0);
      const minStock = Number(payload.minStock ?? 0);

      await db.transaction(async (tx) => {
        await assertProductLimitInTx(tx, businessId);
        await tx.insert(products).values({
          id,
          businessId,
          name: String(payload.name ?? "").trim(),
          sku: String(payload.sku ?? "").trim().toUpperCase(),
          barcode: payload.barcode?.trim() || null,
          categoryId: payload.categoryId || null,
          sellingPrice: money(Number(payload.price ?? 0)),
          costPrice: money(Number(payload.cost ?? 0)),
          stockQuantity: stock,
          minimumStock: minStock,
          unit: String(payload.unit ?? "pcs").trim() || "pcs",
          imageUrl: payload.imageUrl?.trim() || null,
          status: payload.status ?? "active",
          createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
          updatedAt: new Date(),
        });
        await upsertInventory(tx, businessId, storeId, id, stock, minStock);
      });
      return { ok: true };
    }

    case "product.update": {
      const id = requiredId(payload.id, "ID produk");
      const stock = Number(payload.stock ?? 0);
      const minStock = Number(payload.minStock ?? 0);

      await db.transaction(async (tx) => {
        await tx
          .update(products)
          .set({
            name: String(payload.name ?? "").trim(),
            sku: String(payload.sku ?? "").trim().toUpperCase(),
            barcode: payload.barcode?.trim() || null,
            categoryId: payload.categoryId || null,
            sellingPrice: money(Number(payload.price ?? 0)),
            costPrice: money(Number(payload.cost ?? 0)),
            stockQuantity: stock,
            minimumStock: minStock,
            unit: String(payload.unit ?? "pcs").trim() || "pcs",
            imageUrl: payload.imageUrl?.trim() || null,
            status: payload.status ?? "active",
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));
        await upsertInventory(tx, businessId, storeId, id, stock, minStock);
      });
      return { ok: true };
    }

    case "product.status": {
      await db
        .update(products)
        .set({ status: payload.status, updatedAt: new Date() })
        .where(eq(products.id, requiredId(payload.id, "ID produk")));
      return { ok: true };
    }

    case "product.delete": {
      const id = requiredId(payload.id, "ID produk");
      const [usedInTransaction, usedInMovement] = await Promise.all([
        db
          .select({ id: transactionItems.id })
          .from(transactionItems)
          .where(eq(transactionItems.productId, id))
          .limit(1),
        db
          .select({ id: stockMovements.id })
          .from(stockMovements)
          .where(eq(stockMovements.productId, id))
          .limit(1),
      ]);
      if (usedInTransaction.length > 0 || usedInMovement.length > 0) {
        throw new Error(
          "Produk sudah punya riwayat transaksi/stok. Arsipkan saja agar riwayat tetap utuh."
        );
      }
      await db.transaction(async (tx) => {
        await tx.delete(inventory).where(eq(inventory.productId, id));
        await tx.delete(products).where(eq(products.id, id));
      });
      return { ok: true };
    }

    case "customer.create": {
      await db.insert(customers).values({
        id: requiredId(payload.id, "ID pelanggan"),
        businessId,
        name: String(payload.name ?? "").trim(),
        phone: String(payload.phone ?? "").trim(),
        email: payload.email?.trim() || null,
        notes: payload.notes?.trim() || null,
        joinedAt: payload.joinedAt ? new Date(payload.joinedAt) : new Date(),
        updatedAt: new Date(),
      });
      return { ok: true };
    }

    case "customer.update": {
      await db
        .update(customers)
        .set({
          name: String(payload.name ?? "").trim(),
          phone: String(payload.phone ?? "").trim(),
          email: payload.email?.trim() || null,
          notes: payload.notes?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, requiredId(payload.id, "ID pelanggan")));
      return { ok: true };
    }

    case "customer.delete": {
      await db
        .delete(customers)
        .where(eq(customers.id, requiredId(payload.id, "ID pelanggan")));
      return { ok: true };
    }

    case "staff.create": {
      const userCheck = await checkUserLimit(businessId);
      if (!userCheck.allowed) {
        throw new Error(userCheck.message || "Batas pengguna tercapai. Upgrade paket untuk menambah pengguna.");
      }

      await db.insert(staff).values({
        id: requiredId(payload.id, "ID staf"),
        businessId,
        storeId,
        name: String(payload.name ?? "").trim(),
        email: String(payload.email ?? "").trim().toLowerCase(),
        role: payload.role ?? "cashier",
        status: payload.status ?? "active",
        joinedAt: payload.joinedAt ? new Date(payload.joinedAt) : new Date(),
        lastActive: new Date(),
        updatedAt: new Date(),
      });
      return { ok: true };
    }

    case "staff.update": {
      await db
        .update(staff)
        .set({
          name: String(payload.name ?? "").trim(),
          email: String(payload.email ?? "").trim().toLowerCase(),
          role: payload.role ?? "cashier",
          status: payload.status ?? "active",
          updatedAt: new Date(),
        })
        .where(eq(staff.id, requiredId(payload.id, "ID staf")));
      return { ok: true };
    }

    case "staff.delete": {
      const id = requiredId(payload.id, "ID staf");
      const [member] = await db
        .select()
        .from(staff)
        .where(eq(staff.id, id))
        .limit(1);
      if (member?.role === "owner") {
        throw new Error("Akun owner tidak bisa dihapus.");
      }
      await db.delete(staff).where(eq(staff.id, id));
      return { ok: true };
    }

    case "stock.adjust": {
      const productId = requiredId(payload.productId, "ID produk");
      const quantity = Number(payload.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error("Jumlah stok tidak valid.");
      }

      const mode = payload.mode as "in" | "out" | "adjustment";
      if (!["in", "out", "adjustment"].includes(mode)) {
        throw new Error("Mode penyesuaian stok tidak valid.");
      }

      await db.transaction(async (tx) => {
        const [product] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
          .for("update")
          .limit(1);
        if (!product) throw new Error("Produk tidak ditemukan.");

        const [inventoryRow] = await tx
          .select()
          .from(inventory)
          .where(
            and(
              eq(inventory.productId, productId),
              eq(inventory.storeId, storeId)
            )
          )
          .for("update")
          .limit(1);

        const currentStock = inventoryRow?.stockQuantity ?? product.stockQuantity;
        const delta =
          mode === "in"
            ? quantity
            : mode === "out"
              ? -quantity
              : quantity - currentStock;
        const nextStock = currentStock + delta;
        if (nextStock < 0) throw new Error("Stok tidak boleh negatif.");

        await tx
          .update(products)
          .set({ stockQuantity: nextStock, updatedAt: new Date() })
          .where(eq(products.id, productId));
        await upsertInventory(
          tx,
          businessId,
          storeId,
          productId,
          nextStock,
          inventoryRow?.minimumStock ?? product.minimumStock
        );

        const movementId = payload.movementId ?? crypto.randomUUID();
        await tx.insert(stockMovements).values({
          id: movementId,
          businessId,
          storeId,
          productId,
          productName: product.name,
          movementType: mode,
          quantity: delta,
          stockAfter: nextStock,
          note: String(payload.note ?? "").trim() || "Penyesuaian stok",
          staffName: String(payload.staff ?? "").trim() || "Kasir",
          referenceType: "adjustment",
          referenceId: movementId,
          createdAt: new Date(),
        });

        await tx.insert(stockAdjustments).values({
          businessId,
          storeId,
          productId,
          adjustmentType:
            mode === "in" ? "increase" : mode === "out" ? "decrease" : "set",
          quantity,
          reason: String(payload.note ?? "").trim() || "Penyesuaian stok",
          notes: String(payload.note ?? "").trim() || null,
          adjustedByUserId: actingUserId ?? null,
          createdAt: new Date(),
        });
      });

      return { ok: true };
    }

    case "transaction.void": {
      const id = requiredId(payload.id, "ID transaksi");

      await db.transaction(async (tx) => {
        const [transaction] = await tx
          .select()
          .from(transactions)
          .where(and(eq(transactions.id, id), eq(transactions.businessId, businessId)))
          .for("update")
          .limit(1);
        if (!transaction) throw new Error("Transaksi tidak ditemukan.");
        if (transaction.status !== "completed") {
          throw new Error("Hanya transaksi selesai yang bisa dibatalkan.");
        }

        const items = await tx
          .select()
          .from(transactionItems)
          .where(eq(transactionItems.transactionId, id));

        for (const item of items) {
          const [product] = await tx
            .select()
            .from(products)
            .where(and(eq(products.id, item.productId), eq(products.businessId, businessId)))
            .for("update")
            .limit(1);
          if (!product) continue;

          const [inventoryRow] = await tx
            .select()
            .from(inventory)
            .where(
              and(
                eq(inventory.productId, product.id),
                eq(inventory.storeId, storeId)
              )
            )
            .for("update")
            .limit(1);

          const currentStock =
            inventoryRow?.stockQuantity ?? product.stockQuantity;
          const nextStock = currentStock + item.quantity;

          await tx
            .update(products)
            .set({ stockQuantity: nextStock, updatedAt: new Date() })
            .where(eq(products.id, product.id));
          await upsertInventory(
            tx,
            businessId,
            storeId,
            product.id,
            nextStock,
            inventoryRow?.minimumStock ?? product.minimumStock
          );

          await tx.insert(stockMovements).values({
            id: crypto.randomUUID(),
            businessId,
            storeId,
            productId: product.id,
            productName: product.name,
            movementType: "void",
            quantity: item.quantity,
            stockAfter: nextStock,
            note: `Pembatalan ${transaction.transactionNumber}`,
            staffName: transaction.cashierName ?? "Kasir",
            referenceType: "transaction",
            referenceId: transaction.id,
            createdAt: new Date(),
          });
        }

        await tx
          .update(transactions)
          .set({
            status: "voided",
            paymentStatus: "voided",
            voidReason: String(payload.reason ?? "").trim() || "Dibatalkan",
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, id));
      });

      return { ok: true };
    }

    case "store.create": {
      const storeCheck = await checkStoreLimit(businessId);
      if (!storeCheck.allowed) {
        throw new Error(storeCheck.message || "Batas toko tercapai. Upgrade paket untuk menambah toko.");
      }

      await db.insert(stores).values({
        id: requiredId(payload.id, "ID toko"),
        businessId,
        name: String(payload.name ?? "").trim(),
        code: String(payload.code ?? "").trim().toUpperCase(),
        address: payload.address?.trim() || null,
        phone: payload.phone?.trim() || null,
        email: payload.email?.trim() || null,
        timezone: payload.timezone ?? "Asia/Jakarta",
        isActive: true,
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
        updatedAt: new Date(),
      });
      return { ok: true };
    }

    case "store.update": {
      await db
        .update(stores)
        .set({
          name: String(payload.name ?? "").trim(),
          code: String(payload.code ?? "").trim().toUpperCase(),
          address: payload.address?.trim() || null,
          phone: payload.phone?.trim() || null,
          email: payload.email?.trim() || null,
          timezone: payload.timezone ?? "Asia/Jakarta",
          isActive: payload.isActive ?? true,
          updatedAt: new Date(),
        })
        .where(eq(stores.id, requiredId(payload.id, "ID toko")));
      return { ok: true };
    }

    case "store.delete": {
      const id = requiredId(payload.id, "ID toko");
      await db.delete(stores).where(eq(stores.id, id));
      return { ok: true };
    }

    default:
      throw new Error(`Aksi tidak dikenal: ${action}`);
  }
}
