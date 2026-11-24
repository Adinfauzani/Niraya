import { Suspense } from "react";

import { StorefrontCheckout } from "@/features/storefront/StorefrontCheckout";
import { StorefrontOrderView } from "@/features/storefront/OrderPages";

export const dynamic = "force-dynamic";

export default async function StorefrontCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; paymentId?: string; method?: string; view?: string }>;
}) {
  const params = await searchParams;
  const orderId = typeof params.orderId === "string" ? params.orderId : null;
  const method = typeof params.method === "string" ? params.method : undefined;

  return (
    <Suspense
      fallback={
        <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-sm text-muted-foreground">
          {orderId ? "Memuat pesanan..." : "Menyiapkan checkout..."}
        </div>
      }
    >
      {orderId ? (
        <StorefrontOrderView orderId={orderId} initialMethod={method} />
      ) : (
        <StorefrontCheckout />
      )}
    </Suspense>
  );
}
