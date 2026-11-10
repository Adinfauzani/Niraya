import { Suspense } from "react";
import { StorefrontMenu } from "@/features/storefront/StorefrontMenu";
import { PublicNavigation } from "@/components/public/PublicNavigation";

export const dynamic = "force-dynamic";

export default function PublicMenuPage() {
  return (
    <>
      <div className="lg:pt-[57px]">
        <Suspense fallback={<div className="p-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-sm text-muted-foreground">Memuat menu...</div>}><StorefrontMenu /></Suspense>
      </div>
      <PublicNavigation variant="mobile" />
    </>
  );
}
