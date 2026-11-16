import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/server/db";
import { businessMembers, stores, userProfiles } from "@/server/db/schema";
import { ensureUserProfile, requireRole } from "@/server/auth/session";
import { requireBusinessContext } from "@/server/auth/routeContext";
import { getSession } from "@/lib/auth";

const APP_ROLES = ["user", "cashier", "manager", "admin", "owner"] as const;
type AppRole = (typeof APP_ROLES)[number];

const UpdateRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(APP_ROLES),
});

function toAppRole(value: string | null | undefined): AppRole {
  return APP_ROLES.includes(value as AppRole) ? (value as AppRole) : "user";
}

async function requireAccess(minRole: "admin" | "manager" = "admin") {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
  if (!user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null as any,
    };
  }
  await ensureUserProfile(user);
  try {
    await requireRole(minRole);
  } catch (e: any) {
    return {
      error: NextResponse.json(
        { error: e?.message || "Akses ditolak." },
        { status: e?.status || 403 }
      ),
      user: null as any,
    };
  }
  return { error: null, user };
}

/** Active business resolved from the session cookies, or null. */
async function resolveBusinessId(): Promise<string | null> {
  try {
    const context = await requireBusinessContext();
    return context.businessId ?? null;
  } catch {
    return null;
  }
}

async function countActiveOwners(businessId: string): Promise<number> {
  const owners = await db
    .select({ id: businessMembers.id })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.role, "owner"),
        eq(businessMembers.status, "active"),
        isNull(businessMembers.deletedAt)
      )
    )
    .limit(2);
  return owners.length;
}

/**
 * List the active members of the current business only. Users who never joined
 * this store (no active `BusinessMembers` row) are not returned.
 */
export async function GET() {
  try {
    const auth = await requireAccess("admin");
    if (auth.error) return auth.error;

    const businessId = await resolveBusinessId();
    if (!businessId) return NextResponse.json({ users: [], storeCode: null });

    const [store] = await db
      .select({ code: stores.code })
      .from(stores)
      .where(
        and(
          eq(stores.businessId, businessId),
          eq(stores.isActive, true),
          isNull(stores.deletedAt)
        )
      )
      .limit(1);
    const storeCode = store?.code ?? null;

    const memberships = await db
      .select({
        membershipId: businessMembers.id,
        userId: businessMembers.userId,
        role: businessMembers.role,
        storeId: businessMembers.storeId,
      })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.status, "active"),
          isNull(businessMembers.deletedAt)
        )
      )
      .orderBy(desc(businessMembers.createdAt));

    if (memberships.length === 0) {
      return NextResponse.json({ users: [], storeCode });
    }

    const userIds = memberships.map((membership) => membership.userId);
    const profiles = await db
      .select({
        id: userProfiles.id,
        name: userProfiles.name,
        email: userProfiles.email,
        createdAt: userProfiles.createdAt,
        updatedAt: userProfiles.updatedAt,
      })
      .from(userProfiles)
      .where(
        and(inArray(userProfiles.id, userIds), isNull(userProfiles.deletedAt))
      );

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    const users = memberships
      .map((membership) => {
        const profile = profileById.get(membership.userId);
        if (!profile) return null;
        return {
          profileId: membership.membershipId,
          userId: membership.userId,
          name: profile.name ?? "",
          email: profile.email ?? "",
          role: toAppRole(membership.role),
          createdAt: profile.createdAt?.toISOString?.() ?? null,
          updatedAt: profile.updatedAt?.toISOString?.() ?? null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    return NextResponse.json({ users, storeCode });
  } catch (e: any) {
    console.error("Staff users GET error:", e);
    return NextResponse.json(
      { error: "Gagal memuat anggota toko." },
      { status: 500 }
    );
  }
}

/**
 * Change a member's role within the current business.
 *
 * The per-store role lives on `BusinessMembers`. Because business mutations are
 * still gated on the global `core.UserProfiles.role` (see `requireRole`), the
 * profile role is mirrored to the same value so the change takes effect.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireAccess("admin");
    if (auth.error) return auth.error;

    const businessId = await resolveBusinessId();
    if (!businessId) {
      return NextResponse.json(
        { error: "Tidak ada bisnis aktif untuk akun ini." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Data tidak valid." },
        { status: 400 }
      );
    }
    const { userId, role } = parsed.data;

    const actorId = String(auth.user.id);
    if (userId === actorId) {
      return NextResponse.json(
        { error: "Anda tidak dapat mengubah role akun sendiri dari halaman ini." },
        { status: 400 }
      );
    }

    // The target must be an active member of the current business.
    const [target] = await db
      .select({ membershipId: businessMembers.id, role: businessMembers.role })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "active"),
          isNull(businessMembers.deletedAt)
        )
      )
      .limit(1);
    if (!target) {
      return NextResponse.json(
        { error: "Pengguna bukan anggota toko ini." },
        { status: 404 }
      );
    }

    // Prevent demoting the last owner of this business.
    if (role !== "owner" && target.role === "owner") {
      if ((await countActiveOwners(businessId)) <= 1) {
        return NextResponse.json(
          { error: "Tidak dapat mengubah role owner terakhir." },
          { status: 400 }
        );
      }
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(businessMembers)
        .set({ role, updatedAt: now })
        .where(eq(businessMembers.id, target.membershipId));

      await tx
        .update(userProfiles)
        .set({ role, updatedAt: now })
        .where(and(eq(userProfiles.id, userId), isNull(userProfiles.deletedAt)));
    });

    return NextResponse.json({
      ok: true,
      user: { userId, role },
    });
  } catch (e: any) {
    console.error("Staff users PATCH error:", e);
    return NextResponse.json(
      { error: e?.message || "Gagal memperbarui role." },
      { status: 500 }
    );
  }
}

/**
 * Remove a member from the current business. The auth account and its global
 * profile are left intact; other business memberships are untouched.
 */
export async function DELETE(request: Request) {
  try {
    const auth = await requireAccess("admin");
    if (auth.error) return auth.error;

    const businessId = await resolveBusinessId();
    if (!businessId) {
      return NextResponse.json(
        { error: "Tidak ada bisnis aktif untuk akun ini." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    const userId = String(body?.userId || "").trim();
    if (!userId) {
      return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });
    }

    const actorId = String(auth.user.id);
    if (userId === actorId) {
      return NextResponse.json(
        { error: "Anda tidak dapat mengeluarkan akun sendiri." },
        { status: 400 }
      );
    }

    const [target] = await db
      .select({ membershipId: businessMembers.id, role: businessMembers.role })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, businessId),
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "active"),
          isNull(businessMembers.deletedAt)
        )
      )
      .limit(1);
    if (!target) {
      return NextResponse.json(
        { error: "Pengguna bukan anggota toko ini." },
        { status: 404 }
      );
    }

    if (target.role === "owner" && (await countActiveOwners(businessId)) <= 1) {
      return NextResponse.json(
        { error: "Tidak dapat mengeluarkan owner terakhir." },
        { status: 400 }
      );
    }

    await db
      .update(businessMembers)
      .set({ status: "removed", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(businessMembers.id, target.membershipId));

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Staff users DELETE error:", e);
    return NextResponse.json(
      { error: e?.message || "Gagal mengeluarkan anggota." },
      { status: 500 }
    );
  }
}