import { and, eq, isNull, sql } from "drizzle-orm";

import { slugifyStoreName } from "@/lib/storeSlug";
import { db } from "@/server/db";
import { businesses, stores } from "@/server/db/schema";

export { slugifyStoreName };

export type ResolvedStore = {
  id: string;
  name: string;
  businessId: string;
  businessName: string;
};

/**
 * Resolve a store from its URL slug. The slug is derived from the store name,
 * then validated against the store id (active, not deleted, business active).
 * When several stores share a name, the oldest active one wins.
 */
export async function resolveStoreBySlug(slug: string): Promise<ResolvedStore | null> {
  const normalized = slugifyStoreName(slug);
  if (!normalized) return null;

  const slugExpr = sql`trim(both '-' from regexp_replace(lower(${stores.name}), '[^a-z0-9]+', '-', 'g'))`;

  try {
    const [row] = await db
      .select({
        id: stores.id,
        name: stores.name,
        businessId: stores.businessId,
        businessName: businesses.name,
      })
      .from(stores)
      .innerJoin(businesses, eq(businesses.id, stores.businessId))
      .where(
        and(
          eq(stores.isActive, true),
          isNull(stores.deletedAt),
          eq(businesses.status, "active"),
          sql`${slugExpr} = ${normalized}`,
        ),
      )
      .orderBy(stores.id)
      .limit(1);

    return row ?? null;
  } catch {
    return null;
  }
}

/** Resolve an active store by its id (validated against active business). */
export async function resolveStoreById(id: string): Promise<ResolvedStore | null> {
  try {
    const [row] = await db
      .select({
        id: stores.id,
        name: stores.name,
        businessId: stores.businessId,
        businessName: businesses.name,
      })
      .from(stores)
      .innerJoin(businesses, eq(businesses.id, stores.businessId))
      .where(
        and(
          eq(stores.id, id),
          eq(stores.isActive, true),
          isNull(stores.deletedAt),
          eq(businesses.status, "active"),
        ),
      )
      .limit(1);

    return row ?? null;
  } catch {
    return null;
  }
}