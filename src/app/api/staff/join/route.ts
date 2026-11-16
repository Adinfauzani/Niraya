import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { businesses, businessMembers, stores, userProfiles } from "@/server/db/schema";
import { ensureUserProfile } from "@/server/auth/session";
import { getSession } from "@/lib/auth";
import { checkUserLimit } from "@/server/entitlements/check";

export const runtime = "nodejs";

const JoinSchema = z.object({
  code: z.string().trim().min(1, "Kode toko wajib diisi.").max(32),
});

/** Role default untuk anggota yang baru bergabung via kode toko. */
const DEFAULT_MEMBER_ROLE = "cashier";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const sessionUser =
      (session as any)?.user ?? (session as any)?.data?.user ?? null;

    if (!sessionUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = String(sessionUser.id);
    await ensureUserProfile(sessionUser);

    const body = await request.json().catch(() => null);
    const parsed = JoinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Kode toko tidak valid." },
        { status: 400 }
      );
    }
    const code = parsed.data.code.toUpperCase();

    // A user belongs to a single store: joining requires no active membership.
    const [existing] = await db
      .select({ businessId: businessMembers.businessId })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.userId, userId),
          eq(businessMembers.status, "active")
        )
      )
      .limit(1);
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Anda sudah tergabung dalam sebuah toko. Keluar dari toko saat ini sebelum bergabung dengan toko lain.",
          code: "ALREADY_MEMBER",
        },
        { status: 409 }
      );
    }

    // Resolve the store by its (unique) invite code.
    const matches = await db
      .select({
        storeId: stores.id,
        businessId: stores.businessId,
        storeName: stores.name,
      })
      .from(stores)
      .innerJoin(businesses, eq(businesses.id, stores.businessId))
      .where(
        and(
          sql`upper(${stores.code}) = ${code}`,
          eq(stores.isActive, true),
          isNull(stores.deletedAt),
          eq(businesses.status, "active")
        )
      )
      .limit(2);

    if (matches.length === 0) {
      return NextResponse.json(
        { error: "Kode toko tidak ditemukan.", code: "INVALID_CODE" },
        { status: 404 }
      );
    }
    if (matches.length > 1) {
      return NextResponse.json(
        { error: "Kode toko tidak valid.", code: "AMBIGUOUS_CODE" },
        { status: 400 }
      );
    }

    const store = matches[0];

    const limit = await checkUserLimit(store.businessId);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            limit.message ||
            "Batas pengguna tercapai. Upgrade paket untuk menambah anggota.",
          code: "USER_LIMIT_REACHED",
        },
        { status: 409 }
      );
    }

    const now = new Date();
    await db.insert(businessMembers).values({
      businessId: store.businessId,
      userId,
      role: DEFAULT_MEMBER_ROLE,
      storeId: store.storeId,
      status: "active",
      joinedAt: now,
    });

    // Keep the global profile role in sync with the store membership so the
    // existing `requireRole` gating reflects the member's store role.
    await db
      .update(userProfiles)
      .set({ role: DEFAULT_MEMBER_ROLE, updatedAt: now })
      .where(eq(userProfiles.id, userId));

    const cookieStore = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    };
    cookieStore.set("niraya_selected_business", store.businessId, cookieOptions);
    cookieStore.set("niraya_selected_store", store.storeId, cookieOptions);

    return NextResponse.json({
      ok: true,
      businessId: store.businessId,
      storeId: store.storeId,
      storeName: store.storeName,
    });
  } catch (e: any) {
    console.error("Staff join error:", e);
    return NextResponse.json(
      { error: e?.message || "Gagal bergabung dengan toko." },
      { status: 500 }
    );
  }
}