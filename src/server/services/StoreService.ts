import { StoreRepository } from "@/server/repositories/core";
import { checkStoreLimit, checkFeatureAccess } from "@/server/entitlements/check";
import { generateUniqueInviteCode, isInviteCodeTaken } from "@/server/stores/invite";
import type { EntityStatus } from "@/types/business";

const storeRepository = new StoreRepository();

export async function getStores(businessId: string): Promise<
  Array<{
    id: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    timezone: string;
    isActive: boolean;
    status: EntityStatus;
    createdAt: string;
    updatedAt: string;
  }>
> {
  const rows = await storeRepository.findByBusiness(businessId);
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      address: row.address,
      phone: row.phone,
      email: row.email,
      timezone: row.timezone,
      isActive: row.isActive,
      status: row.isActive ? ("active" as EntityStatus) : ("archived" as EntityStatus),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function createStore(
  businessId: string,
  data: {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    timezone?: string;
    isActive?: boolean;
    createdAt?: string;
  }
): Promise<{ ok: true }> {
  const featureCheck = await checkFeatureAccess(businessId, "multi_store");
  if (!featureCheck.allowed) {
    throw new Error(featureCheck.message || "Fitur multi-store tidak tersedia pada paket Anda. Upgrade ke paket Plus atau Pro.");
  }

  const storeCheck = await checkStoreLimit(businessId);
  if (!storeCheck.allowed) {
    throw new Error(storeCheck.message || "Batas toko tercapai. Upgrade paket untuk menambah toko.");
  }

  // Store code doubles as the invite code, so it must be globally unique.
  let code = data.code.trim().toUpperCase();
  if (!code) {
    code = await generateUniqueInviteCode();
  } else if (await isInviteCodeTaken(code)) {
    throw new Error("Kode toko sudah digunakan toko lain. Gunakan kode lain.");
  }

  await storeRepository.create({
    id: data.id,
    businessId,
    name: data.name.trim(),
    code,
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    timezone: data.timezone ?? "Asia/Jakarta",
    isActive: data.isActive ?? true,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: new Date(),
  });
  return { ok: true };
}

export async function updateStore(
  businessId: string,
  id: string,
  data: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    timezone?: string;
    isActive?: boolean;
  }
): Promise<{ ok: true }> {
  // Store code doubles as the invite code, so it must stay globally unique.
  const code = data.code.trim().toUpperCase();
  if (!code) {
    throw new Error("Kode toko wajib diisi.");
  }
  if (await isInviteCodeTaken(code, id)) {
    throw new Error("Kode toko sudah digunakan toko lain. Gunakan kode lain.");
  }

  await storeRepository.update(id, {
    name: data.name.trim(),
    code,
    address: data.address?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    timezone: data.timezone ?? "Asia/Jakarta",
    isActive: data.isActive ?? true,
    updatedAt: new Date(),
  });
  return { ok: true };
}

export async function deleteStore(businessId: string, id: string): Promise<{ ok: true }> {
  await storeRepository.delete(id);
  return { ok: true };
}