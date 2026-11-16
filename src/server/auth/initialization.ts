import { db } from "@/server/db";
import { businesses, stores, businessMembers, userProfiles } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { slugify } from "@/lib/utils";
import { generateUniqueInviteCode } from "@/server/stores/invite";

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

/** Role aplikasi yang diberikan secara otomatis oleh `ensureUserProfile`. */
export const DEFAULT_USER_ROLE = "user";
/** Role yang diberikan pemilik workspace setelah onboarding selesai. */
export const OWNER_ROLE = "owner";

/**
 * Tentukan role yang harus diberikan profil aplikasi setelah workspace
 * diinisialisasi. Pemilik selalu dapat `owner`; profil yang sudah ada dari
 * `ensureUserProfile` (role `user`) dipromosikan.
 */
export function resolveWorkspaceRole(existingRole: string | null | undefined): string {
  return existingRole === OWNER_ROLE ? OWNER_ROLE : OWNER_ROLE;
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
 * Check if user already belongs to a business (as any active member, not just
 * the owner). A cashier who joined via a store code is considered initialized.
 */
export async function checkInitializationStatus(userId: string): Promise<{
  isInitialized: boolean;
  businessId: string | null;
  storeId: string | null;
  role: string | null;
}> {
  const membership = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.userId, userId),
      eq(businessMembers.status, "active")
    ),
  });

  if (!membership) {
    return { isInitialized: false, businessId: null, storeId: null, role: null };
  }

  return {
    isInitialized: true,
    businessId: membership.businessId,
    storeId: membership.storeId,
    role: membership.role,
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
    // Profil sudah ada (bisa dari `ensureUserProfile` dengan role `user`).
    // Hanya pemilik workspace yang dipromosikan ke `owner`; anggota yang
    // bergabung via kode toko mempertahankan role keanggotaannya.
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, userId),
    });
    const targetRole =
      status.role === OWNER_ROLE ? OWNER_ROLE : (profile?.role ?? DEFAULT_USER_ROLE);
    const targetName = displayName || profile?.name || null;
    if (profile && (profile.role !== targetRole || (targetName && !profile.name))) {
      await db
        .update(userProfiles)
        .set({
          role: targetRole,
          name: targetName ?? profile.name,
          updatedAt: new Date(),
        })
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
      code: await generateUniqueInviteCode(),
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
    // Pemilik workspace selalu dapat role `owner` di profil aplikasinya,
    // bahkan jika profil sudah ada dari `ensureUserProfile` (role `user`).
    if (existingProfile.role !== "owner") {
      await db
        .update(userProfiles)
        .set({ role: "owner", name: displayName, updatedAt: new Date() })
        .where(eq(userProfiles.id, userId));
    } else if (!existingProfile.name && displayName) {
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
      plan: "free",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  return { businessId, storeId, isNewUser: true };
}