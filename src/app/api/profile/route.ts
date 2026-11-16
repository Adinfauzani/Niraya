import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { userProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

const profileSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  avatarUrl: z.string().url("Format URL tidak valid").optional().nullable(),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(sessionUser.id);

  try {
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, phone, avatarUrl } = parsed.data;

    const [updated] = await db
      .update(userProfiles)
      .set({
        ...(name !== undefined && { name: name.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl?.trim() || null }),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.id, userId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
      message: "Profil diperbarui",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui profil" },
      { status: 500 }
    );
  }
}