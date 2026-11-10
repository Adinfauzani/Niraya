import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { categories, products } from "@/server/db/schema";
import { CategoryRepository } from "@/server/repositories/products";
import type { Category } from "@/types/business";

const categoryRepository = new CategoryRepository();

export async function getCategories(businessId: string): Promise<Category[]> {
  const rows = await categoryRepository.findByBusiness(businessId);
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      status: row.status as Category["status"],
      createdAt: row.createdAt.toISOString(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCategory(
  businessId: string,
  data: { id: string; name: string; description?: string; status?: string }
): Promise<{ ok: true }> {
  await categoryRepository.create({
    id: data.id,
    businessId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    status: data.status ?? "active",
  });
  return { ok: true };
}

export async function updateCategory(
  businessId: string,
  id: string,
  data: { name: string; description?: string; status?: string }
): Promise<{ ok: true }> {
  await categoryRepository.update(id, {
    name: data.name.trim(),
    description: data.description?.trim() || null,
    status: data.status ?? "active",
    updatedAt: new Date(),
  });
  return { ok: true };
}

export async function deleteCategory(businessId: string, id: string): Promise<{ ok: true }> {
  const used = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.categoryId, id))
    .limit(1);
  if (used.length > 0) {
    throw new Error("Kategori masih dipakai produk. Pindahkan produk dulu.");
  }
  await categoryRepository.delete(id);
  return { ok: true };
}