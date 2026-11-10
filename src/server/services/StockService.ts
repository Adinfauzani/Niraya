import { and, eq, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  inventory,
  products,
  stockAdjustments,
  stockMovements,
} from "@/server/db/schema";
import { StockMovementRepository } from "@/server/repositories/inventory";
import type { StockMovement } from "@/types/business";

const stockMovementRepository = new StockMovementRepository();

const money = (value: number) => value.toFixed(2);

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

export async function adjustStock(
  businessId: string,
  storeId: string,
  data: {
    productId: string;
    quantity: number;
    mode: "in" | "out" | "adjustment";
    note?: string;
    staff?: string;
    movementId?: string;
    actingUserId?: string;
  }
): Promise<{ ok: true }> {
  const productId = data.productId;
  const quantity = Number(data.quantity);
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error("Jumlah stok tidak valid.");
  }

  const mode = data.mode;
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
      .where(and(eq(inventory.productId, productId), eq(inventory.storeId, storeId)))
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

    const movementId = data.movementId ?? crypto.randomUUID();
    await tx.insert(stockMovements).values({
      id: movementId,
      businessId,
      storeId,
      productId,
      productName: product.name,
      movementType: mode,
      quantity: delta,
      stockAfter: nextStock,
      note: String(data.note ?? "").trim() || "Penyesuaian stok",
      staffName: String(data.staff ?? "").trim() || "Kasir",
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
      reason: String(data.note ?? "").trim() || "Penyesuaian stok",
      notes: String(data.note ?? "").trim() || null,
      adjustedByUserId: data.actingUserId ?? null,
      createdAt: new Date(),
    });
  });

  return { ok: true };
}

export async function getStockMovements(
  businessId: string,
  storeId?: string
): Promise<StockMovement[]> {
  const targetStoreId = storeId ?? "00000000-0000-0000-0000-000000000002";
  const result = await stockMovementRepository.findByStore(targetStoreId, {
    page: 1,
    pageSize: 100,
  });
  return result.data
    .map((row) => ({
      id: row.id,
      productId: row.productId ?? "",
      productName: row.productName,
      type: row.movementType as StockMovement["type"],
      quantity: row.quantity,
      stockAfter: row.stockAfter,
      note: row.note ?? "",
      staff: row.staffName ?? "Kasir",
      createdAt: row.createdAt.toISOString(),
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}