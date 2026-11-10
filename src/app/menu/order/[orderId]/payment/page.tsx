import { Suspense } from "react";
import { StorefrontPaymentPage } from "@/features/storefront/OrderPages";
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) { const { orderId } = await params; return <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Memuat...</div>}><StorefrontPaymentPage orderId={orderId} /></Suspense>; }
