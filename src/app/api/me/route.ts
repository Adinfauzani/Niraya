import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { ensureUserProfile, normalizeRole } from "@/server/auth/session";

/**
 * Mengembalikan akun yang sedang login beserta role aplikasinya.
 * Profil dibuat otomatis dengan role `user` jika belum ada.
 */
export async function GET() {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureUserProfile(sessionUser);

  return NextResponse.json({
    user: {
      id: String(sessionUser.id),
      name: profile?.name ?? sessionUser.name ?? null,
      email: profile?.email ?? sessionUser.email ?? null,
      image: (sessionUser as any).image ?? (sessionUser as any).avatarUrl ?? null,
      role: normalizeRole(profile?.role),
      createdAt: profile?.createdAt ?? null,
      updatedAt: profile?.updatedAt ?? null,
    },
  });
}
