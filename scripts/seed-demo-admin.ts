/**
 * LOCAL/DEV-ONLY demo admin seeder.
 *
 * Creates (or repairs) a single owner account so the dashboard/admin pages can
 * be opened locally. This is NOT wired to any public route or UI, refuses to
 * run in production, and prints the password to the console only.
 *
 * Usage:
 *   bun scripts/seed-demo-admin.ts
 *
 * Optional env:
 *   DEMO_ADMIN_EMAIL     (default: demo@niraya.local)
 *   DEMO_ADMIN_PASSWORD  (default: random, printed once)
 *   DEMO_ADMIN_NAME      (default: "Demo Admin")
 */
import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, sql as dsql } from "drizzle-orm";

import { slugify } from "@/lib/utils";
import { auth } from "@/server/auth/config";
import { db } from "@/server/db";
import {
  authAccount,
  authUser,
  businesses,
  businessMembers,
  roles,
  stores,
  userProfiles,
} from "@/server/db/schema";

const EMAIL = (process.env.DEMO_ADMIN_EMAIL || "demo@niraya.local").toLowerCase();
const NAME = process.env.DEMO_ADMIN_NAME || "Demo Admin";

function assertNonProduction() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error(
      "Refusing to seed a demo admin in production. This script is local/dev only.",
    );
  }
}

function generatePassword() {
  // ~24 url-safe chars; no shell-unsafe characters.
  return randomBytes(18).toString("base64url");
}

async function ensureOwnerRole() {
  await db
    .insert(roles)
    .values({
      code: "owner",
      name: "Owner",
      description: "Pemilik bisnis",
      rank: 4,
      isSystem: true,
    })
    .onConflictDoNothing();
}

async function upsertCredentialAccount(userId: string, password: string) {
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(password);

  const [account] = await db
    .select({ id: authAccount.id })
    .from(authAccount)
    .where(
      and(
        eq(authAccount.userId, userId),
        eq(authAccount.providerId, "credential"),
      ),
    )
    .limit(1);

  if (account) {
    await db
      .update(authAccount)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(authAccount.id, account.id));
    return;
  }

  await db.insert(authAccount).values({
    id: randomUUID(),
    providerId: "credential",
    accountId: userId,
    userId,
    password: hashed,
  });
}

async function ensureOwnerWorkspace(userId: string) {
  // The dev DB still has the legacy FK `core."UserProfiles"."Id" -> auth.users(id)`
  // (the Drizzle baseline would reference core."AuthUser"). Better Auth writes to
  // core."AuthUser", so add an inert shadow row in auth.users to satisfy the FK.
  // Insert-only and dev-only; safe to delete later. No triggers exist on auth.users.
  await db.execute(dsql`
    insert into auth.users (id, email, email_confirmed_at, created_at, updated_at)
    values (${userId}, ${EMAIL}, now(), now(), now())
    on conflict (id) do nothing
  `);

  await db
    .insert(userProfiles)
    .values({ id: userId, name: NAME, email: EMAIL, role: "owner" })
    .onConflictDoUpdate({
      target: userProfiles.id,
      set: { role: "owner", name: NAME, updatedAt: new Date() },
    });

  const [member] = await db
    .select({
      businessId: businessMembers.businessId,
      storeId: businessMembers.storeId,
    })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businessMembers.role, "owner"),
        eq(businessMembers.status, "active"),
      ),
    )
    .limit(1);

  if (member?.businessId) {
    return { businessId: member.businessId, storeId: member.storeId };
  }

  const base = slugify(NAME) || "demo";
  let slug = base;
  let counter = 0;
  while (true) {
    const [clash] = await db
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.slug, slug))
      .limit(1);
    if (!clash) break;
    counter += 1;
    slug = `${base}-${counter}`;
  }

  const [business] = await db
    .insert(businesses)
    .values({
      name: `${NAME}'s Business`,
      slug,
      ownerUserId: userId,
      status: "active",
    })
    .returning({ id: businesses.id });

  const [store] = await db
    .insert(stores)
    .values({
      businessId: business.id,
      name: `${NAME}'s Store`,
      code: "MAIN",
      isActive: true,
    })
    .returning({ id: stores.id });

  await db.insert(businessMembers).values({
    businessId: business.id,
    userId,
    role: "owner",
    storeId: store.id,
    status: "active",
    joinedAt: new Date(),
  });

  return { businessId: business.id, storeId: store.id };
}

async function main() {
  assertNonProduction();
  await ensureOwnerRole();

  const password = process.env.DEMO_ADMIN_PASSWORD || generatePassword();

  const [existing] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, EMAIL))
    .limit(1);

  let userId: string;
  if (existing) {
    userId = existing.id;
    await db
      .update(authUser)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(authUser.id, userId));
    await upsertCredentialAccount(userId, password);
  } else {
    userId = randomUUID();
    await db.insert(authUser).values({
      id: userId,
      email: EMAIL,
      emailVerified: true,
      name: NAME,
    });
    await upsertCredentialAccount(userId, password);
  }

  const workspace = await ensureOwnerWorkspace(userId);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  console.log("\n=== Demo admin (LOCAL/dev only) ===");
  console.log(`Email    : ${EMAIL}`);
  console.log(`Password : ${password}`);
  console.log("Role     : owner");
  console.log(`Business : ${workspace.businessId}`);
  console.log(`Store    : ${workspace.storeId}`);
  console.log(`Login    : ${baseUrl}/login`);
  console.log("==================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    const cause = (err as { cause?: unknown })?.cause;
    console.error(
      "[seed-demo-admin] failed:",
      err instanceof Error ? err.message : err,
    );
    if (cause) console.error("[seed-demo-admin] cause:", cause);
    process.exit(1);
  });