import { NextResponse } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull, ne } from "drizzle-orm";

import { db } from "@/server/db";
import { userProfiles } from "@/server/db/schema";
import { ACTION_ROLES, ensureUserProfile, getCurrentUserRole, requireRole } from "@/server/auth/session";
import { getSession } from "@/lib/auth";

const APP_ROLES = ["user", "cashier", "manager", "admin", "owner"] as const;
type AppRole = (typeof APP_ROLES)[number];

const UpdateRoleSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(APP_ROLES),
});

async function requireAccess(minRole: "admin" | "manager" = "admin") {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;
  if (!user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null as any };
  await ensureUserProfile(user);
  try { await requireRole(minRole); } catch (e: any) {
    return { error: NextResponse.json({ error: e?.message || "Akses ditolak." }, { status: e?.status || 403 }), user: null as any };
  }
  return { error: null, user };
}

export async function GET() {
  try {
    const auth = await requireAccess("admin");
    if (auth.error) return auth.error;
    const rows = await db
      .select({
        id: userProfiles.id,
        userId: userProfiles.userId,
        name: userProfiles.name,
        email: userProfiles.email,
        role: userProfiles.role,
        createdAt: userProfiles.createdAt,
        updatedAt: userProfiles.updatedAt,
      })
      .from(userProfiles)
      .where(isNull(userProfiles.deletedAt))
      .orderBy(desc(userProfiles.updatedAt), desc(userProfiles.createdAt))
      .limit(500);
    return NextResponse.json({
      users: rows.map((r) => ({
        profileId: r.id,
        userId: r.userId,
        name: r.name ?? "",
        email: r.email ?? "",
        role: (APP_ROLES.includes(r.role as AppRole) ? r.role : "user") as AppRole,
        createdAt: r.createdAt?.toISOString?.() ?? null,
        updatedAt: r.updatedAt?.toISOString?.() ?? null,
      })),
    });
  } catch (e: any) {
    console.error("Staff users GET error:", e);
    return NextResponse.json({ error: "Gagal memuat pengguna login." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireAccess("admin");
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    const parsed = UpdateRoleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Data tidak valid." }, { status: 400 });
    const { userId, role } = parsed.data;

    const actorId = String(auth.user.id);
    const actorRole = await getCurrentUserRole();
    if (userId === actorId && role !== actorRole) {
      return NextResponse.json({ error: "Anda tidak dapat mengubah role akun sendiri dari halaman ini." }, { status: 400 });
    }

    // prevent removing the last owner
    if (role !== "owner") {
      const [target] = await db.select({ role: userProfiles.role }).from(userProfiles).where(and(eq(userProfiles.userId, userId), isNull(userProfiles.deletedAt))).limit(1);
      if (target?.role === "owner") {
        const owners = await db.select({ userId: userProfiles.userId }).from(userProfiles).where(and(eq(userProfiles.role, "owner"), isNull(userProfiles.deletedAt))).limit(2);
        if (owners.length <= 1) return NextResponse.json({ error: "Tidak dapat mengubah role owner terakhir." }, { status: 400 });
      }
    }

    const [updated] = await db
      .update(userProfiles)
      .set({ role, updatedAt: new Date() })
      .where(and(eq(userProfiles.userId, userId), isNull(userProfiles.deletedAt)))
      .returning({ userId: userProfiles.userId, role: userProfiles.role, name: userProfiles.name, email: userProfiles.email, updatedAt: userProfiles.updatedAt });
    if (!updated) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, user: { userId: updated.userId, role: updated.role, name: updated.name ?? "", email: updated.email ?? "", updatedAt: updated.updatedAt?.toISOString?.() ?? null } });
  } catch (e: any) {
    console.error("Staff users PATCH error:", e);
    return NextResponse.json({ error: e?.message || "Gagal memperbarui role." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAccess("admin");
    if (auth.error) return auth.error;
    const body = await request.json().catch(() => null);
    const userId = String(body?.userId || "").trim();
    if (!userId) return NextResponse.json({ error: "User ID wajib diisi." }, { status: 400 });

    const actorId = String(auth.user.id);
    if (userId === actorId) return NextResponse.json({ error: "Anda tidak dapat menghapus profil akun sendiri." }, { status: 400 });

    const [target] = await db.select({ role: userProfiles.role }).from(userProfiles).where(and(eq(userProfiles.userId, userId), isNull(userProfiles.deletedAt))).limit(1);
    if (!target) return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    if (target.role === "owner") {
      const owners = await db.select({ userId: userProfiles.userId }).from(userProfiles).where(and(eq(userProfiles.role, "owner"), isNull(userProfiles.deletedAt))).limit(2);
      if (owners.length <= 1) return NextResponse.json({ error: "Tidak dapat menghapus owner terakhir." }, { status: 400 });
    }

    // Delete app profile row only (Neon Auth account untouched). User can receive a fresh default profile on next login.
    await db.delete(userProfiles).where(and(eq(userProfiles.userId, userId), isNull(userProfiles.deletedAt)));
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("Staff users DELETE error:", e);
    return NextResponse.json({ error: e?.message || "Gagal menghapus profil pengguna." }, { status: 500 });
  }
}
