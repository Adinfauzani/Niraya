import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { businessMembers, businesses, businessProfile, stores } from "@/server/db/schema";
import { getSession } from "@/lib/auth";

export async function getActiveBusinessId(userId: string): Promise<string | null> {
  const membership = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.userId, userId),
      eq(businessMembers.status, "active")
    ),
  });

  if (!membership) return null;

  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.id, membership.businessId), eq(businesses.status, "active")),
  });

  if (!business) return null;
  return membership.businessId;
}

export async function getActiveBusinessIds(userId: string): Promise<string[]> {
  const memberships = await db.query.businessMembers.findMany({
    where: and(
      eq(businessMembers.userId, userId),
      eq(businessMembers.status, "active")
    ),
  });

  const businessIds = memberships.map((m) => m.businessId);
  if (businessIds.length === 0) return [];

  const activeBusinesses = await db.query.businesses.findMany({
    where: and(inArray(businesses.id, businessIds), eq(businesses.status, "active")),
    columns: { id: true },
  });

  const activeIds = new Set(activeBusinesses.map((b) => b.id));
  return memberships.filter((m) => activeIds.has(m.businessId)).map((m) => m.businessId);
}

export async function getBusinessContext(
  userId: string,
  options?: { businessId?: string | null; storeId?: string | null }
): Promise<{
  businessId: string | null;
  storeId: string | null;
  role: string | null;
} | null> {
  const requestedBusinessId = options?.businessId ?? null;
  const requestedStoreId = options?.storeId ?? null;

  // A specific business (cookie selection) is honoured only when the user has an
  // active membership; otherwise fall back to the user's default membership.
  let membership = requestedBusinessId
    ? await db.query.businessMembers.findFirst({
        where: and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.businessId, requestedBusinessId),
          eq(businessMembers.status, "active")
        ),
      })
    : null;

  if (!membership) {
    membership = await db.query.businessMembers.findFirst({
      where: and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.status, "active")
      ),
    });
  }

  // No business membership -> free tier
  if (!membership) {
    return {
      businessId: null,
      storeId: null,
      role: "free",
    };
  }

  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.id, membership.businessId), eq(businesses.status, "active")),
  });

  if (!business) {
    // Business not active -> treat as free tier
    return {
      businessId: null,
      storeId: null,
      role: "free",
    };
  }

  // Prefer the requested store when it belongs to the business and is active.
  let storeId: string | null = requestedStoreId ?? membership.storeId ?? null;
  if (storeId) {
    const store = await db.query.stores.findFirst({
      where: and(
        eq(stores.id, storeId),
        eq(stores.businessId, membership.businessId),
        eq(stores.isActive, true)
      ),
      columns: { id: true },
    });
    if (!store) storeId = null;
  }

  if (!storeId) {
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.businessId, membership.businessId), eq(stores.isActive, true)),
      columns: { id: true },
    });
    storeId = store?.id ?? null;
  }

  return {
    businessId: membership.businessId,
    storeId,
    role: membership.role,
  };
}

export async function requireBusinessContext(options?: {
  businessId?: string | null;
  storeId?: string | null;
}): Promise<{
  businessId: string;
  storeId: string | null;
  role: string;
  userId: string;
}> {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    throw new Error("Unauthorized");
  }

  const userId = String(sessionUser.id);
  const context = await getBusinessContext(userId, options);

  if (!context || !context.businessId) {
    throw new Error("No active business membership found");
  }

  return {
    businessId: context.businessId,
    storeId: context.storeId,
    role: context.role ?? "free",
    userId,
  };
}

export async function getBusinessBySlug(slug: string): Promise<{ id: string } | null> {
  const business = await db.query.businesses.findFirst({
    where: and(eq(businesses.slug, slug), eq(businesses.status, "active")),
    columns: { id: true },
  });
  return business ? { id: business.id } : null;
}

export async function getUserBusinessesWithStores(userId: string): Promise<
  Array<{
    businessId: string;
    businessName: string;
    businessSlug: string;
    logoUrl: string | null;
    role: string;
    stores: Array<{ id: string; name: string; code: string; isActive: boolean; latitude: number | null; longitude: number | null }>;
  }>
> {
  const memberships = await db.query.businessMembers.findMany({
    where: and(
      eq(businessMembers.userId, userId),
      eq(businessMembers.status, "active")
    ),
  });

  const businessIds = memberships.map((m) => m.businessId);
  if (businessIds.length === 0) return [];

  const activeBusinesses = await db.query.businesses.findMany({
    where: and(inArray(businesses.id, businessIds), eq(businesses.status, "active")),
    columns: { id: true, name: true, slug: true },
  });

  // Public profile (Settings -> Business Profile) overrides the core business
  // name and supplies the logo shown in the sidebar.
  const profiles = await db.query.businessProfile.findMany({
    where: inArray(businessProfile.businessId, businessIds),
    columns: { businessId: true, businessName: true, logoUrl: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.businessId, p]));

  const businessMap = new Map(activeBusinesses.map((b) => [b.id, b]));
  const result: Array<{
    businessId: string;
    businessName: string;
    businessSlug: string;
    logoUrl: string | null;
    role: string;
    stores: Array<{ id: string; name: string; code: string; isActive: boolean; latitude: number | null; longitude: number | null }>;
  }> = [];

  for (const membership of memberships) {
    const business = businessMap.get(membership.businessId);
    if (!business) continue;

    const userStores = await db.query.stores.findMany({
      where: and(eq(stores.businessId, membership.businessId), eq(stores.isActive, true)),
      columns: { id: true, name: true, code: true, isActive: true, latitude: true, longitude: true },
    });

    const profile = profileMap.get(membership.businessId);
    const profileName = profile?.businessName?.trim();

    result.push({
      businessId: membership.businessId,
      businessName: profileName || business.name,
      businessSlug: business.slug,
      logoUrl: profile?.logoUrl ?? null,
      role: membership.role,
      stores: userStores,
    });
  }

  return result;
}