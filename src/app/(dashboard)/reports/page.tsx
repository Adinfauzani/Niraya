import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { ReportsPage } from "@/features/reports/ReportsPage";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { checkFeatureAccess } from "@/lib/featureGating";
import { requireTenantContext } from "@/lib/tenant";

export default async function Page() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!user?.id) {
    redirect("/login");
  }

  const tenant = await requireTenantContext(user.id);
  const featureCheck = await checkFeatureAccess(tenant.businessId, "reports");

  if (!featureCheck.allowed) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-5 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <LockKeyhole aria-hidden className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">
            Fitur Laporan terkunci
          </h1>
          <p className="text-sm text-muted-foreground">
            {featureCheck.message ??
              'Fitur "reports" tidak tersedia pada paket Anda. Upgrade untuk mengakses.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href="/dashboard/plans">
              Lihat paket
              <ArrowRight aria-hidden className="ml-2 size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Kembali ke dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ReportsPage />;
}