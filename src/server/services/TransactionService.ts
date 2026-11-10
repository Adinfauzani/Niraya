import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import {
  inventory,
  products,
  stockMovements,
  transactionItems,
  transactions,
} from "@/server/db/schema";
import { TransactionRepository } from "@/server/repositories/TransactionsPayments";
import type { Transaction, StockMovement } from "@/types/business";

const transactionRepository = new TransactionRepository();

const money = (value: number) => value.toFixed(2);
const number = (value: string | null | undefined) => Number(value ?? 0);
const iso = (value: Date | string) => new Date(value).toISOString();

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

export async function voidTransaction(
  businessId: string,
  storeId: string,
  transactionId: string,
  reason?: string
): Promise<{ ok: true }> {
  await db.transaction(async (tx) => {
    const [transaction] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, transactionId), eq(transactions.businessId, businessId)))
      .for("update")
      .limit(1);
    if (!transaction) throw new Error("Transaksi tidak ditemukan.");
    if (transaction.status !== "completed") {
      throw new Error("Hanya transaksi selesai yang bisa dibatalkan.");
    }

    const items = await tx
      .select()
      .from(transactionItems)
      .where(eq(transactionItems.transactionId, transactionId));

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
        voidReason: String(reason ?? "").trim() || "Dibatalkan",
        updatedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));
  });

  return { ok: true };
}

export async function getTransactions(
  businessId: string,
  options: {
    search?: string;
    status?: string;
    payment?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<Transaction[]> {
  const { search, status, payment, from, to, page = 1, pageSize = 20 } = options;

  const result = await transactionRepository.findByBusiness(businessId, {
    search,
    status,
    paymentMethod: payment,
    from,
    to,
    page,
    pageSize,
  });

  const rows = result.data;
  const transactionIds = rows.map((r) => r.id);
  const itemsByTransaction = new Map<string, Transaction["items"]>();
  if (transactionIds.length > 0) {
    const items = await db
      .select()
      .from(transactionItems)
      .where(inArray(transactionItems.transactionId, transactionIds));
    for (const item of items) {
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
  }

  return rows
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
}