import { StorefrontTrackingPage } from "@/features/storefront/OrderPages";
export default async function Page({ params }: { params: Promise<{ orderId: string }> }) { const { orderId } = await params; return <StorefrontTrackingPage orderId={orderId} />; }
