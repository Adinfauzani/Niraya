import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import {
  businesses,
  businessMembers,
  userProfiles,
  roles,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(sessionUser.id);

  try {
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json({ error: "Business ID diperlukan" }, { status: 400 });
    }

    const business = await db.query.businesses.findFirst({
      where: and(eq(businesses.id, businessId), eq(businesses.ownerUserId, userId)),
    });

    if (!business) {
      return NextResponse.json({ error: "Usaha tidak ditemukan atau bukan pemilik" }, { status: 403 });
    }

    const ownerRole = await db.query.roles.findFirst({
      where: eq(roles.code, "owner"),
    });

    if (!ownerRole) {
      return NextResponse.json({ error: "Role owner tidak ditemukan" }, { status: 500 });
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(businessMembers)
        .values({
          businessId,
          userId,
          role: "owner",
          status: "active",
          joinedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [businessMembers.businessId, businessMembers.userId],
          set: {
            role: "owner",
            status: "active",
            joinedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      await tx
        .update(businesses)
        .set({ ownerUserId: userId, updatedAt: new Date() })
        .where(eq(businesses.id, businessId));

      await tx
        .insert(userProfiles)
        .values({
          id: userId,
          name: sessionUser.name ?? sessionUser.email?.split("@")[0] ?? "Owner",
          email: sessionUser.email ?? null,
          role: "owner",
        })
        .onConflictDoUpdate({
          target: userProfiles.id,
          set: {
            role: "owner",
            name: sessionUser.name ?? sessionUser.email?.split("@")[0] ?? "Owner",
            email: sessionUser.email ?? null,
            updatedAt: new Date(),
          },
        });
    });

    return NextResponse.json({
      message: "Onboarding selesai! Selamat datang sebagai Owner.",
      redirectTo: "/dashboard",
    });
  } catch (error) {
    console.error("Onboarding complete error:", error);
    return NextResponse.json(
      { error: "Gagal menyelesaikan onboarding" },
      { status: 500 }
    );
  }
}