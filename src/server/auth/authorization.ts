import { headers } from "next/headers";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import { userProfiles, businessMembers, businesses, stores } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

/**
 * Centralized server-side authorization.
 *
 * Every business-scoped request must:
 * 1. Validate the Better Auth session.
 * 2. Extract the authenticated user.
 * 3. Validate Business Membership.
 * 4. Validate Store access if required.
 * 5. Validate permission.
 * 6. Return a validated tenant context.
 */

export interface AuthenticatedContext {
  userId: string;
  email: string;
  name: string | null;
  businessId: string;
  storeId: string;
  role: string;
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code: string = "AUTHORIZATION_FAILED",
    public readonly status: number = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Get the authenticated user from the current request context.
 */
export async function getAuthenticatedUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
} | null> {
  try {
    const headersStore = await headers();
    const session = await auth.api.getSession({
      headers: headersStore,
    });
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Require an authenticated user. Throws AuthorizationError if not authenticated.
 */
export async function requireAuthenticatedUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
}> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthorizationError("Unauthorized", "UNAUTHORIZED", 401);
  }
  return user;
}

/**
 * Get the tenant context for the authenticated user.
 * Uses the selected business/store from middleware headers when available,
 * falling back to the user's primary membership.
 */
export async function getTenantContext(): Promise<AuthenticatedContext | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const headersStore = await headers();
  const selectedBusinessId = headersStore.get("x-tenant-business-id");
  const selectedStoreId = headersStore.get("x-tenant-store-id");

  // Use selected tenant from middleware if available
  if (selectedBusinessId) {
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
          eq(businessMembers.userId, user.id),
          eq(businessMembers.businessId, selectedBusinessId),
          eq(businessMembers.status, "active")
        )
      )
      .limit(1);

    if (membership) {
      const storeId = selectedStoreId || membership.storeId || "";
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        businessId: membership.businessId,
        storeId,
        role: membership.role,
      };
    }
  }

  // Fall back to primary membership
  const [profile] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

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
        eq(businessMembers.userId, user.id),
        eq(businessMembers.status, "active")
      )
    )
    .limit(1);

  if (!membership) return null;

  let storeId = membership.storeId || selectedStoreId || "";
  if (!storeId) {
    const [store] = await db
      .select({ id: stores.id })
      .from(stores)
      .where(
        and(
          eq(stores.businessId, membership.businessId),
          eq(stores.isActive, true)
        )
      )
      .limit(1);
    storeId = store?.id ?? "";
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    businessId: membership.businessId,
    storeId,
    role: profile?.role || membership.role,
  };
}

/**
 * Require a valid tenant context. Throws AuthorizationError if none exists.
 */
export async function requireTenantContext(): Promise<AuthenticatedContext> {
  const context = await getTenantContext();
  if (!context) {
    throw new AuthorizationError(
      "Tidak ada konteks bisnis aktif. Silakan lengkapi onboarding.",
      "NO_TENANT_CONTEXT",
      400
    );
  }
  return context;
}

/**
 * Validate that the user has access to a specific business.
 * Throws AuthorizationError if not.
 */
export async function requireBusinessAccess(
  businessId: string
): Promise<AuthenticatedContext> {
  const context = await requireTenantContext();

  if (context.businessId !== businessId) {
    // Check if user has access to the requested business
    const [membership] = await db
      .select()
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, context.userId),
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.status, "active")
        )
      )
      .limit(1);

    if (!membership) {
      throw new AuthorizationError(
        "Anda tidak memiliki akses ke bisnis ini",
        "BUSINESS_ACCESS_DENIED",
        403
      );
    }

    return {
      ...context,
      businessId: membership.businessId,
      storeId: membership.storeId || context.storeId,
      role: membership.role,
    };
  }

  return context;
}

/**
 * Validate that the user has a specific role (or higher).
 */
export function requireRole(context: AuthenticatedContext, requiredRole: string): void {
  const roleRanks: Record<string, number> = {
    user: 0,
    cashier: 1,
    manager: 2,
    admin: 3,
    owner: 4,
  };
  const userRank = roleRanks[context.role] ?? 0;
  const requiredRank = roleRanks[requiredRole] ?? 0;

  if (userRank < requiredRank) {
    throw new AuthorizationError(
      `Akses ditolak: memerlukan role ${requiredRole} atau lebih tinggi`,
      "INSUFFICIENT_ROLE",
      403
    );
  }
}

/**
 * Validate that the user has at least one of the required roles.
 */
export function requireAnyRole(context: AuthenticatedContext, requiredRoles: string[]): void {
  const roleRanks: Record<string, number> = {
    user: 0,
    cashier: 1,
    manager: 2,
    admin: 3,
    owner: 4,
  };
  const userRank = roleRanks[context.role] ?? 0;

  for (const role of requiredRoles) {
    const requiredRank = roleRanks[role] ?? 0;
    if (userRank >= requiredRank) return;
  }

  throw new AuthorizationError(
    `Akses ditolak: memerlukan role ${requiredRoles.join(" atau ")}`,
    "INSUFFICIENT_ROLE",
    403
  );
}