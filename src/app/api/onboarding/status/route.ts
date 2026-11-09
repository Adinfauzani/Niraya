import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { userProfiles, businessMembers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, String(sessionUser.id)),
  });

  const membership = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.userId, String(sessionUser.id)),
      eq(businessMembers.role, "owner"),
      eq(businessMembers.status, "active")
    ),
  });

  const needsOnboarding = !membership;

  return NextResponse.json({
    needsOnboarding,
    hasProfile: !!profile,
    profileRole: profile?.role ?? null,
    isOwner: !!membership,
  });
}