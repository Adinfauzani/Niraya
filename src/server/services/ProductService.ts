import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import {
  inventory,
  products,
  stockAdjustments,
  stockMovements,
  transactionItems,
} from "@/server/db/schema";
import { ProductRepository } from "@/server/repositories/products";
import { InventoryRepository } from "@/server/repositories/inventory";
import { checkProductLimit } from "@/server/entitlements/check";
import type { Product } from "@/types/business";

const productRepository = new ProductRepository();
const inventoryRepository = new InventoryRepository();

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

export async function getProducts(
  businessId: string,
  storeId: string,
  options: { categoryId?: string; status?: string; search?: string; page?: number; pageSize?: number } = {}
): Promise<Product[]> {
  const { categoryId, status, search, page = 1, pageSize = 20 } = options;

  const result = await productRepository.findByBusiness(businessId, {
    categoryId,
    status,
    search,
    page,
    pageSize,
  });

  const rows = result.data;
  const productIds = rows.map((row) => row.id);
  const inventoryRows =
    productIds.length > 0
      ? await db
          .select()
          .from(inventory)
          .where(and(eq(inventory.storeId, storeId), inArray(inventory.productId, productIds)))
      : [];
  const inventoryByProduct = new Map(inventoryRows.map((row) => [row.productId, row]));

  return rows
    .map((row) => {
      const stockRow = inventoryByProduct.get(row.id);
      return {
        id: row.id,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode ?? undefined,
        categoryId: row.categoryId ?? "",
        price: Number(row.sellingPrice),
        cost: Number(row.costPrice),
        stock: stockRow?.stockQuantity ?? row.stockQuantity,
        minStock: stockRow?.minimumStock ?? row.minimumStock,
        unit: row.unit,
        imageUrl: row.imageUrl ?? undefined,
        status: row.status as Product["status"],
        createdAt: row.createdAt.toISOString(),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createProduct(
  businessId: string,
  storeId: string,
  data: {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    unit?: string;
    imageUrl?: string;
    status?: string;
  }
): Promise<{ ok: true }> {
  const productCheck = await checkProductLimit(businessId);
  if (!productCheck.allowed) {
    throw new Error(productCheck.message || "Batas produk tercapai. Upgrade paket untuk menambah produk.");
  }

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id: data.id,
      businessId,
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      barcode: data.barcode?.trim() || null,
      categoryId: data.categoryId || null,
      sellingPrice: money(data.price),
      costPrice: money(data.cost),
      stockQuantity: data.stock,
      minimumStock: data.minStock,
      unit: (data.unit ?? "pcs").trim() || "pcs",
      imageUrl: data.imageUrl?.trim() || null,
      status: data.status ?? "active",
    });
    await upsertInventory(tx, businessId, storeId, data.id, data.stock, data.minStock);
  });
  return { ok: true };
}

export async function updateProduct(
  businessId: string,
  storeId: string,
  id: string,
  data: {
    name: string;
    sku: string;
    barcode?: string;
    categoryId?: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    unit?: string;
    imageUrl?: string;
    status?: string;
  }
): Promise<{ ok: true }> {
  await db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        name: data.name.trim(),
        sku: data.sku.trim().toUpperCase(),
        barcode: data.barcode?.trim() || null,
        categoryId: data.categoryId || null,
        sellingPrice: money(data.price),
        costPrice: money(data.cost),
        stockQuantity: data.stock,
        minimumStock: data.minStock,
        unit: (data.unit ?? "pcs").trim() || "pcs",
        imageUrl: data.imageUrl?.trim() || null,
        status: data.status ?? "active",
        updatedAt: new Date(),
      })
      .where(eq(products.id, id));
    await upsertInventory(tx, businessId, storeId, id, data.stock, data.minStock);
  });
  return { ok: true };
}

export async function updateProductStatus(
  businessId: string,
  id: string,
  status: string
): Promise<{ ok: true }> {
  await productRepository.update(id, { status, updatedAt: new Date() });
  return { ok: true };
}

export async function deleteProduct(businessId: string, storeId: string, id: string): Promise<{ ok: true }> {
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