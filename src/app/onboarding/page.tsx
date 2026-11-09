import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businessMembers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";

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
      eq(businessMembers.role, "owner"),
      eq(businessMembers.status, "active")
    ),
  });

  if (membership) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-4xl">
        <OnboardingWizard />
      </div>
    </div>
  );
}