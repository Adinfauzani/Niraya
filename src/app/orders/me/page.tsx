import { redirect } from "next/navigation";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MyOrdersPage } from "@/features/orders/me/MyOrdersPage";
import { getSession } from "@/lib/auth";

export default async function Page() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!user?.id) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <MyOrdersPage />
    </DashboardLayout>
  );
}
