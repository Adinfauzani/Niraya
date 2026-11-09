import { db } from "@/server/db";
import { businesses, stores, businessMembers, userProfiles } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { slugify } from "@/lib/utils";

export interface InitializationResult {
  businessId: string;
  storeId: string;
  isNewUser: boolean;
}

export interface UserIdentity {
  userId: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
}

/**
 * Generate a safe fallback username from email or userId
 */
function generateFallbackName(identity: UserIdentity): string {
  if (identity.name?.trim()) return identity.name.trim();
  if (identity.email) return identity.email.split("@")[0];
  return `User${identity.userId.slice(0, 8)}`;
}

/**
 * Generate a unique slug from base name
 */
async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = slugify(baseName);
  let slug = baseSlug;
  let counter = 0;

  while (true) {
    const existing = await db.query.businesses.findFirst({
      where: eq(businesses.slug, slug),
    });
    if (!existing) break;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
  return slug;
}

/**
 * Check if user already has complete initialization
 */
export async function checkInitializationStatus(userId: string): Promise<{
  isInitialized: boolean;
  businessId: string | null;
  storeId: string | null;
}> {
  const membership = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.userId, userId),
      eq(businessMembers.role, "owner"),
      eq(businessMembers.status, "active")
    ),
    with: {
      business: true,
      store: true,
    },
  });

  if (!membership) {
    return { isInitialized: false, businessId: null, storeId: null };
  }

  return {
    isInitialized: true,
    businessId: membership.businessId,
    storeId: membership.storeId,
  };
}

/**
 * Initialize user workspace: profile, business, store, owner membership
 * Idempotent - safe to call multiple times
 */
export async function initializeUserWorkspace(identity: UserIdentity): Promise<InitializationResult> {
  const userId = identity.userId;
  const displayName = generateFallbackName(identity);

  // Check existing initialization first (idempotent)
  const status = await checkInitializationStatus(userId);
  if (status.isInitialized && status.businessId && status.storeId) {
    // Update profile name if missing
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
    });
    if (profile && !profile.name && displayName) {
      await db
        .update(userProfiles)
        .set({ name: displayName, updatedAt: new Date() })
        .where(eq(userProfiles.id, userId));
    }
    return { businessId: status.businessId, storeId: status.storeId!, isNewUser: false };
  }

  // Generate unique slug
  const slug = await generateUniqueSlug(displayName);

  // Create business
  const newBusiness = await db
    .insert(businesses)
    .values({
      name: `${displayName}'s Business`,
      slug,
      ownerUserId: userId,
      status: "active",
    })
    .returning({ id: businesses.id });

  const businessId = newBusiness[0].id;

  // Create default store
  const newStore = await db
    .insert(stores)
    .values({
      businessId,
      name: `${displayName}'s Store`,
      code: "MAIN",
      isActive: true,
    })
    .returning({ id: stores.id });

  const storeId = newStore[0].id;

  // Create owner membership
  await db.insert(businessMembers).values({
    businessId,
    userId,
    role: "owner",
    storeId,
    status: "active",
    joinedAt: new Date(),
  });

  // Create or update user profile
  const existingProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userId),
  });

  if (existingProfile) {
    if (!existingProfile.name && displayName) {
      await db
        .update(userProfiles)
        .set({ name: displayName, updatedAt: new Date() })
        .where(eq(userProfiles.id, userId));
    }
  } else {
    await db.insert(userProfiles).values({
      id: userId,
      name: displayName,
      email: identity.email,
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { businessId, storeId, isNewUser: true };
}