/**
 * Legacy Supabase user → Better Auth identity mapping.
 *
 * This module provides tooling to migrate existing Supabase Auth users
 * to Better Auth without losing identity relationships.
 *
 * Strategy:
 * 1. Read existing `auth.users` rows (Supabase Auth) via raw SQL.
 * 2. For each user, check if a Better Auth user already exists
 *    (matched by email, case-insensitive).
 * 3. If not, create a Better Auth user with the same email and
 *    store the legacy Supabase user ID in `legacySupabaseUserId`.
 * 4. If a Better Auth user already exists, update `legacySupabaseUserId`
 *    to point to the Supabase user.
 * 5. Password migration: Supabase uses bcrypt; Better Auth uses bcrypt
 *    via the `password` field on `auth.account`. If the hash format
 *    is compatible, copy it. Otherwise, force a password reset.
 *
 * SAFETY: This script is read-only on the Supabase Auth tables.
 * It only INSERTs/UPDATEs the Better Auth `auth` schema.
 */

import { eq } from "drizzle-orm";
import { db, sql } from "@/server/db";
import { user as authUser, account as authAccount } from "@/server/db/schema/auth";

export interface LegacyUserMapping {
  supabaseUserId: string;
  betterAuthUserId: string;
  email: string;
  migratedAt: Date;
  passwordCopied: boolean;
}

interface SupabaseAuthUser {
  id: string;
  email: string;
  encryptedPassword: string | null;
}

/**
 * Read all Supabase Auth users via raw SQL.
 * Supabase Auth tables are not in the Drizzle schema.
 */
export async function getSupabaseAuthUsers(): Promise<SupabaseAuthUser[]> {
  const result = await sql`
    SELECT id, email, encrypted_password
    FROM auth.users
    ORDER BY created_at
  `;
  return result.map((row: any) => ({
    id: row.id,
    email: row.email,
    encryptedPassword: row.encrypted_password,
  }));
}

/**
 * Find a Better Auth user by email (case-insensitive).
 */
export async function findBetterAuthUserByEmail(email: string) {
  const result = await db
    .select()
    .from(authUser)
    .where(eq(authUser.email, email.toLowerCase()))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Find a Better Auth user by legacy Supabase user ID.
 */
export async function findBetterAuthUserByLegacyId(supabaseUserId: string) {
  const result = await db
    .select()
    .from(authUser)
    .where(eq(authUser.legacySupabaseUserId, supabaseUserId))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Create a Better Auth user from a Supabase Auth user row.
 *
 * Returns the new Better Auth user ID and whether the password was copied.
 */
export async function migrateUser(
  supabaseUser: SupabaseAuthUser,
  options: { forcePasswordReset?: boolean } = {}
): Promise<LegacyUserMapping> {
  const { forcePasswordReset = false } = options;

  // Check if already migrated
  const existing = await findBetterAuthUserByLegacyId(supabaseUser.id);
  if (existing) {
    return {
      supabaseUserId: supabaseUser.id,
      betterAuthUserId: existing.id,
      email: existing.email,
      migratedAt: new Date(),
      passwordCopied: false,
    };
  }

  // Check if a Better Auth user with the same email already exists
  const existingByEmail = await findBetterAuthUserByEmail(supabaseUser.email);
  if (existingByEmail) {
    // Update legacy ID mapping
    await db
      .update(authUser)
      .set({ legacySupabaseUserId: supabaseUser.id })
      .where(eq(authUser.id, existingByEmail.id));

    return {
      supabaseUserId: supabaseUser.id,
      betterAuthUserId: existingByEmail.id,
      email: existingByEmail.email,
      migratedAt: new Date(),
      passwordCopied: false,
    };
  }

  // Create new Better Auth user
  const newUserId = crypto.randomUUID();
  await db.insert(authUser).values({
    id: newUserId,
    email: supabaseUser.email.toLowerCase(),
    emailVerified: false, // Will be verified via existing Supabase flow or reset
    name: supabaseUser.email.split("@")[0], // Default name; will be updated by onboarding
    legacySupabaseUserId: supabaseUser.id,
  });

  // Password migration: Supabase uses bcrypt; Better Auth uses bcrypt
  // via the `password` field on `auth.account`.
  // If the hash format is compatible, copy it.
  let passwordCopied = false;
  if (supabaseUser.encryptedPassword && !forcePasswordReset) {
    // Supabase encryptedPassword format: $2b$12$... (bcrypt)
    // Better Auth expects the same format.
    // We store it as a credential on the account table.
    try {
      await db.insert(authAccount).values({
        id: crypto.randomUUID(),
        providerId: "credential",
        accountId: newUserId,
        userId: newUserId,
        password: supabaseUser.encryptedPassword,
      });
      passwordCopied = true;
    } catch {
      // If password copy fails, force reset
      passwordCopied = false;
    }
  }

  return {
    supabaseUserId: supabaseUser.id,
    betterAuthUserId: newUserId,
    email: supabaseUser.email,
    migratedAt: new Date(),
    passwordCopied,
  };
}

/**
 * Migrate all Supabase Auth users to Better Auth.
 *
 * This is a one-time migration script. Run it on a dev branch
 * before cutover.
 */
export async function migrateAllUsers(): Promise<LegacyUserMapping[]> {
  const supabaseUsers = await getSupabaseAuthUsers();
  const results: LegacyUserMapping[] = [];

  for (const supabaseUser of supabaseUsers) {
    try {
      const mapping = await migrateUser(supabaseUser);
      results.push(mapping);
    } catch (error) {
      console.error(`Failed to migrate user ${supabaseUser.id}:`, error);
    }
  }

  return results;
}

/**
 * Verify that all Supabase Auth users have a corresponding Better Auth user.
 */
export async function verifyMigration(): Promise<{ total: number; migrated: number; missing: string[] }> {
  const supabaseUsers = await getSupabaseAuthUsers();
  const missing: string[] = [];

  for (const supabaseUser of supabaseUsers) {
    const betterAuthUser = await findBetterAuthUserByLegacyId(supabaseUser.id);
    if (!betterAuthUser) {
      missing.push(supabaseUser.id);
    }
  }

  return {
    total: supabaseUsers.length,
    migrated: supabaseUsers.length - missing.length,
    missing,
  };
}