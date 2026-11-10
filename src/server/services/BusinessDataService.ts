import { and, desc, eq, inArray, or, sql, ilike, gte, lte } from "drizzle-orm";

import { db } from "@/server/db";
import {
  businessSettings,
  categories,
  customers,
  inventory,
  products,
  receiptSettings,
  staff,
  stockMovements,
  transactionItems,
  transactions,
} from "@/server/db/schema";
import type {
  BusinessData,
  BusinessQuery,
  BusinessSettings,
  Category,
  Customer,
  Product,
  Staff,
  StockMovement,
  Transaction,
} from "@/types/business";

const money = (value: number) => value.toFixed(2);
const number = (value: string | null | undefined) => Number(value ?? 0);
const iso = (value: Date | string) => new Date(value).toISOString();

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
      .where(and(eq(receiptSettings.businessId, businessId), eq(receiptSettings.storeId, storeId)))
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

  const transactionFilters: any[] = [eq(transactions.businessId, businessId)];
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

  const productFilters: any[] = [eq(products.businessId, businessId)];
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

  const customerFilters: any[] = [eq(customers.businessId, businessId)];
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
    db.select().from(categories).where(eq(categories.businessId, businessId)),
    db
      .select()
      .from(products)
      .where(and(...productFilters))
      .limit(pageSize)
      .offset(offset),
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
          .where(and(eq(inventory.storeId, storeId), inArray(inventory.productId, productIds)))
      : [];
  const inventoryByProduct = new Map(inventoryRows.map((row) => [row.productId, row]));

  const itemsByTransaction = new Map<string, Transaction["items"]>();
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
  const receiptFooter =
    receiptFooterRaw ?? settingsRow?.legacyReceiptFooter ?? settingsRow?.LegacyReceiptFooter ?? "";
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
        qrManualTransferEnabled: !!(settingsRow.qrManualTransferEnabled ?? settingsRow.QrManualTransferEnabled),
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
        status: row.status as Category["status"],
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
          status: row.status as Product["status"],
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