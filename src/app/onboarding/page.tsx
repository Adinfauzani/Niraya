import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businessMembers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export default async function OnboardingPage() {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    redirect("/login");
  }

  const membership = await db.query.businessMembers.findFirst({
    where: and(
      eq(businessMembers.userId, String(sessionUser.id)),
      eq(businessMembers.status, "active")
    ),
  });

  if (membership) {
    redirect("/dashboard");
  }

  redirect("/dashboard/onboarding");
}