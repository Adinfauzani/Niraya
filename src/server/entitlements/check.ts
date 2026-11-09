import { eq, and, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { subscriptions, plans } from "@/server/db/schema/platform";
import { businessMembers } from "@/server/db/schema/core";
import { stores } from "@/server/db/schema/core";
import { products } from "@/server/db/schema/products";

export type PlanEntitlements = {
  maxUsers?: number;
  maxStores?: number;
  maxProducts?: number;
  features?: string[];
};

export interface EntitlementCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number | null;
  message?: string;
}

async function getActivePlanEntitlements(businessId: string): Promise<PlanEntitlements | null> {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.businessId, businessId),
      inArray(subscriptions.status, ["active", "cancel_at_period_end"])
    ),
  });

  if (!subscription) {
    return null;
  }

  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, subscription.planId),
  });

  if (!plan?.entitlements) {
    return null;
  }

  return plan.entitlements as PlanEntitlements;
}

export async function checkUserLimit(businessId: string): Promise<EntitlementCheckResult> {
  const entitlements = await getActivePlanEntitlements(businessId);
  const maxUsers = entitlements?.maxUsers ?? null;

  if (maxUsers === null || maxUsers === undefined) {
    return { allowed: true, currentCount: 0, limit: null };
  }

  const members = await db.query.businessMembers.findMany({
    where: and(
      eq(businessMembers.businessId, businessId),
      eq(businessMembers.status, "active")
    ),
    columns: { id: true },
  });

  const currentCount = members.length;

  return {
    allowed: currentCount < maxUsers,
    currentCount,
    limit: maxUsers,
    message: currentCount >= maxUsers ? `Batas pengguna tercapai (${maxUsers}). Upgrade paket untuk menambah pengguna.` : undefined,
  };
}

export async function checkStoreLimit(businessId: string): Promise<EntitlementCheckResult> {
  const entitlements = await getActivePlanEntitlements(businessId);
  const maxStores = entitlements?.maxStores ?? null;

  if (maxStores === null || maxStores === undefined) {
    return { allowed: true, currentCount: 0, limit: null };
  }

  const businessStores = await db.query.stores.findMany({
    where: and(eq(stores.businessId, businessId), eq(stores.isActive, true)),
    columns: { id: true },
  });

  const currentCount = businessStores.length;

  return {
    allowed: currentCount < maxStores,
    currentCount,
    limit: maxStores,
    message: currentCount >= maxStores ? `Batas toko tercapai (${maxStores}). Upgrade paket untuk menambah toko.` : undefined,
  };
}

export async function checkProductLimit(businessId: string): Promise<EntitlementCheckResult> {
  const entitlements = await getActivePlanEntitlements(businessId);
  const maxProducts = entitlements?.maxProducts ?? null;

  if (maxProducts === null || maxProducts === undefined) {
    return { allowed: true, currentCount: 0, limit: null };
  }

  const businessProducts = await db.query.products.findMany({
    where: and(eq(products.businessId, businessId), eq(products.status, "active")),
    columns: { id: true },
  });

  const currentCount = businessProducts.length;

  return {
    allowed: currentCount < maxProducts,
    currentCount,
    limit: maxProducts,
    message: currentCount >= maxProducts ? `Batas produk tercapai (${maxProducts}). Upgrade paket untuk menambah produk.` : undefined,
  };
}

export async function checkFeatureAccess(businessId: string, feature: string): Promise<{
  allowed: boolean;
  message?: string;
}> {
  const entitlements = await getActivePlanEntitlements(businessId);
  const features = entitlements?.features ?? [];

  if (features.length === 0) {
    return { allowed: true };
  }

  const allowed = features.includes(feature);

  return {
    allowed,
    message: allowed ? undefined : `Fitur "${feature}" tidak tersedia pada paket Anda. Upgrade untuk mengakses.`,
  };
}

export async function getEntitlementsSummary(businessId: string): Promise<{
  entitlements: PlanEntitlements | null;
  users: { current: number; limit: number | null; allowed: boolean };
  stores: { current: number; limit: number | null; allowed: boolean };
  products: { current: number; limit: number | null; allowed: boolean };
}> {
  const entitlements = await getActivePlanEntitlements(businessId);

  const [usersCheck, storesCheck, productsCheck] = await Promise.all([
    checkUserLimit(businessId),
    checkStoreLimit(businessId),
    checkProductLimit(businessId),
  ]);

  return {
    entitlements,
    users: { current: usersCheck.currentCount, limit: usersCheck.limit, allowed: usersCheck.allowed },
    stores: { current: storesCheck.currentCount, limit: storesCheck.limit, allowed: storesCheck.allowed },
    products: { current: productsCheck.currentCount, limit: productsCheck.limit, allowed: productsCheck.allowed },
  };
}

export function enforceEntitlement<T extends { allowed: boolean; message?: string }>(
  check: T,
  errorMessage?: string
): asserts check is T & { allowed: true } {
  if (!check.allowed) {
    throw new Error(check.message || errorMessage || "Entitlement limit exceeded");
  }
}