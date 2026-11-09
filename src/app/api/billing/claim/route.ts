import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businessMembers } from "@/server/db/schema";
import { ensureUserProfile } from "@/server/auth/session";
import {
  claimSubscriptionsForUser,
  getBillingSummaryForUser,
  getPrimaryBusinessForUser,
} from "@/server/billing/subscriptions";

export const dynamic = "force-dynamic";

/**
 * Klaim langganan Gumroad yang belum terikat bisnis, berdasarkan email
 * pembeli. User harus owner/admin pada bisnis tujuan.
 */
export async function POST(request: Request) {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await ensureUserProfile(sessionUser);
  const email = profile?.email ?? sessionUser.email ?? null;
  if (!email) {
    return NextResponse.json(
      { error: "Akun belum punya email." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const requestedBusinessId =
    typeof body?.businessId === "string" ? body.businessId : null;

  const primary = await getPrimaryBusinessForUser(String(sessionUser.id));
  const businessId = requestedBusinessId ?? primary?.businessId ?? null;

  if (!businessId) {
    return NextResponse.json(
      { error: "Buat bisnis terlebih dahulu sebelum klaim langganan." },
      { status: 400 }
    );
  }

  const [member] = await db
    .select({ businessId: businessMembers.businessId })
    .from(businessMembers)
    .where(
      and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.userId, String(sessionUser.id)),
        eq(businessMembers.status, "active"),
        inArray(businessMembers.role, ["owner", "admin"])
      )
    )
    .limit(1);

  if (!member) {
    return NextResponse.json(
      { error: "Kamu bukan owner/admin bisnis ini." },
      { status: 403 }
    );
  }

  const claimed = await claimSubscriptionsForUser(
    String(sessionUser.id),
    email,
    businessId
  );
  const summary = await getBillingSummaryForUser(
    String(sessionUser.id),
    email
  );

  return NextResponse.json({ ok: true, claimed, ...summary });
}
