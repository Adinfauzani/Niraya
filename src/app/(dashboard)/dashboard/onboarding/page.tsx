import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { businessMembers } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { OnboardingDialog } from "@/features/onboarding/onboarding-dialog";

export default async function DashboardOnboardingPage() {
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
    <DashboardLayout>
      <OnboardingDialog />
    </DashboardLayout>
  );
}