import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/server/db";
import { businessMembers, businesses, stores } from "@/server/db/schema";
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

export async function getBusinessContext(userId: string): Promise<{
  businessId: string | null;
  storeId: string | null;
  role: string | null;
} | null> {
  const membership = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.userId, userId),
      eq(businessMembers.status, "active")
    ),
  });

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

  let storeId: string | null = null;
  if (membership.storeId) {
    const store = await db.query.stores.findFirst({
      where: and(eq(stores.id, membership.storeId), eq(stores.isActive, true)),
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

export async function requireBusinessContext(): Promise<{
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
  const context = await getBusinessContext(userId);

  if (!context) {
    throw new Error("No active business membership found");
  }

  // For free tier, we still need a valid context but with null businessId
  return {
    businessId: context.businessId ?? "00000000-0000-0000-0000-000000000001",
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
    role: string;
    stores: Array<{ id: string; name: string; code: string; isActive: boolean }>;
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

  const businessMap = new Map(activeBusinesses.map((b) => [b.id, b]));
  const result: Array<{
    businessId: string;
    businessName: string;
    businessSlug: string;
    role: string;
    stores: Array<{ id: string; name: string; code: string; isActive: boolean }>;
  }> = [];

  for (const membership of memberships) {
    const business = businessMap.get(membership.businessId);
    if (!business) continue;

    const userStores = await db.query.stores.findMany({
      where: and(eq(stores.businessId, membership.businessId), eq(stores.isActive, true)),
      columns: { id: true, name: true, code: true, isActive: true },
    });

    result.push({
      businessId: membership.businessId,
      businessName: business.name,
      businessSlug: business.slug,
      role: membership.role,
      stores: userStores,
    });
  }

  return result;
}