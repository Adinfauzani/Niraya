import { getSession } from "@/lib/auth";
import { requireTenantContext } from "@/lib/tenant";
import { enforceFeatureAccess } from "@/lib/featureGating";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { redirect } from "next/navigation";

async function getReportsPageData() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!user?.id) {
    redirect("/login");
  }

  const tenant = await requireTenantContext(user.id);
  await enforceFeatureAccess(tenant.businessId, "reports");

  return { tenant };
}

export default async function Page() {
  const data = await getReportsPageData();

  return <ReportsPage />;
}