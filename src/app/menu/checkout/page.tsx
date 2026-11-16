import { Suspense } from "react";

import { StorefrontCheckout } from "@/features/storefront/StorefrontCheckout";

export const dynamic = "force-dynamic";

export default function StorefrontCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-sm text-muted-foreground">
          Menyiapkan checkout...
        </div>
      }
    >
      <StorefrontCheckout />
    </Suspense>
  );
}