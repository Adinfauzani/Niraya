import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { staff } from "@/server/db/schema";
import { StaffRepository } from "@/server/repositories/CustomersStaff";
import { checkUserLimit } from "@/server/entitlements/check";
import type { Staff } from "@/types/business";

const staffRepository = new StaffRepository();

export async function getStaff(
  businessId: string,
  options: { status?: string; search?: string; page?: number; pageSize?: number } = {}
): Promise<Staff[]> {
  const { status, search, page = 1, pageSize = 20 } = options;

  const result = await staffRepository.findByBusiness(businessId, {
    status,
    search,
    page,
    pageSize,
  });

  return result.data
    .map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as Staff["role"],
      status: row.status as Staff["status"],
      joinedAt: row.joinedAt.toISOString(),
      lastActive: row.lastActive?.toISOString(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createStaff(
  businessId: string,
  storeId: string,
  data: { id: string; name: string; email: string; role?: string; status?: string; joinedAt?: string }
): Promise<{ ok: true }> {
  const userCheck = await checkUserLimit(businessId);
  if (!userCheck.allowed) {
    throw new Error(userCheck.message || "Batas pengguna tercapai. Upgrade paket untuk menambah pengguna.");
  }

  await staffRepository.create({
    id: data.id,
    businessId,
    storeId,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role ?? "cashier",
    status: data.status ?? "active",
    joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
    lastActive: new Date(),
  });
  return { ok: true };
}

export async function updateStaff(
  businessId: string,
  id: string,
  data: { name: string; email: string; role?: string; status?: string }
): Promise<{ ok: true }> {
  await staffRepository.update(id, {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    role: data.role ?? "cashier",
    status: data.status ?? "active",
    updatedAt: new Date(),
  });
  return { ok: true };
}

export async function deleteStaff(businessId: string, id: string): Promise<{ ok: true }> {
  const [member] = await db
    .select()
    .from(staff)
    .where(eq(staff.id, id))
    .limit(1);
  if (member?.role === "owner") {
    throw new Error("Akun owner tidak bisa dihapus.");
  }
  await staffRepository.delete(id);
  return { ok: true };
}