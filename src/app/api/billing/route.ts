import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { ensureUserProfile } from "@/server/auth/session";
import { getBillingSummaryForUser } from "@/server/billing/subscriptions";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureUserProfile(sessionUser);
  const email =
    profile?.email ?? sessionUser.email ?? null;

  try {
    const summary = await getBillingSummaryForUser(
      String(sessionUser.id),
      email
    );
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[billing] gagal memuat ringkasan", error);
    return NextResponse.json(
      { error: "Gagal memuat data langganan." },
      { status: 500 }
    );
  }
}
