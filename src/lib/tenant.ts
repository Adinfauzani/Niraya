import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { businessMembers, businesses, stores } from "@/server/db/schema";

export interface TenantContext {
  businessId: string;
  storeId: string | null;
  role: string;
  userId: string;
}

export interface BusinessMembership {
  businessId: string;
  role: string;
  storeId: string | null;
  status: string;
}

export class TenantValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string = "TENANT_VALIDATION_FAILED",
    public readonly status: number = 403
  ) {
    super(message);
    this.name = "TenantValidationError";
  }
}

export async function validateBusinessMembership(
  userId: string,
  businessId: string
): Promise<BusinessMembership> {
  const [membership] = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      storeId: businessMembers.storeId,
      status: businessMembers.status,
    })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.status, "active")
      )
    )
    .limit(1);

  if (!membership) {
    throw new TenantValidationError(
      "Anda tidak memiliki akses ke bisnis ini",
      "BUSINESS_ACCESS_DENIED",
      403
    );
  }

  const [business] = await db
    .select({ id: businesses.id, status: businesses.status })
    .from(businesses)
    .where(
      and(
        eq(businesses.id, businessId),
        eq(businesses.status, "active")
      )
    )
    .limit(1);

  if (!business) {
    throw new TenantValidationError(
      "Bisnis tidak ditemukan atau tidak aktif",
      "BUSINESS_NOT_FOUND",
      404
    );
  }

  return membership;
}

export async function validateStoreAccess(
  userId: string,
  businessId: string,
  storeId: string
): Promise<{ storeId: string }> {
  await validateBusinessMembership(userId, businessId);

  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(
      and(
        eq(stores.id, storeId),
        eq(stores.businessId, businessId),
        eq(stores.isActive, true)
      )
    )
    .limit(1);

  if (!store) {
    throw new TenantValidationError(
      "Toko tidak ditemukan atau tidak aktif",
      "STORE_NOT_FOUND",
      404
    );
  }

  return { storeId: store.id };
}

export async function getUserTenantContext(userId: string): Promise<TenantContext | null> {
  let membership: any;
  try {
    [membership] = await db
      .select({
        businessId: businessMembers.businessId,
        role: businessMembers.role,
        storeId: businessMembers.storeId,
        status: businessMembers.status,
      })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "active")
        )
      )
      .orderBy(businessMembers.role)
      .limit(1);
  } catch {
    return null;
  }

  if (!membership) {
    return null;
  }

  const [business] = await db
    .select({ id: businesses.id, status: businesses.status })
    .from(businesses)
    .where(
      and(
        eq(businesses.id, membership.businessId),
        eq(businesses.status, "active")
      )
    )
    .limit(1);

  if (!business) {
    return null;
  }

  let storeId = membership.storeId;
  if (storeId) {
    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.id, storeId),
          eq(stores.businessId, membership.businessId),
          eq(stores.isActive, true)
        )
      )
      .limit(1);
    if (!store) {
      storeId = null;
    }
  } else {
    const [defaultStore] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.businessId, membership.businessId),
          eq(stores.isActive, true)
        )
      )
      .limit(1);
    storeId = defaultStore?.id ?? null;
  }

  return {
    businessId: membership.businessId,
    storeId,
    role: membership.role,
    userId,
  };
}

export async function requireTenantContext(userId: string): Promise<TenantContext> {
  const context = await getUserTenantContext(userId);
  if (!context) {
    throw new TenantValidationError(
      "Tidak ada konteks bisnis aktif. Silakan lengkapi onboarding.",
      "NO_TENANT_CONTEXT",
      400
    );
  }
  return context;
}

export function assertBusinessAccess(
  membership: BusinessMembership,
  requiredRoles: string[]
): void {
  if (!requiredRoles.includes(membership.role)) {
    throw new TenantValidationError(
      `Akses ditolak: memerlukan role ${requiredRoles.join(" atau ")}`,
      "INSUFFICIENT_ROLE",
      403
    );
  }
}

export const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  cashier: 1,
  manager: 2,
  admin: 3,
  owner: 4,
};

export function hasRole(userRole: string, requiredRole: string): boolean {
  const userRank = ROLE_HIERARCHY[userRole] ?? 0;
  const requiredRank = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userRank >= requiredRank;
}

export function assertRole(userRole: string, requiredRole: string): void {
  if (!hasRole(userRole, requiredRole)) {
    throw new TenantValidationError(
      `Akses ditolak: memerlukan role ${requiredRole} atau lebih tinggi`,
      "INSUFFICIENT_ROLE",
      403
    );
  }
}