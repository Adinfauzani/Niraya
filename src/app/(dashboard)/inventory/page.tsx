"use client";

import dynamic from "next/dynamic";

const PageComp = dynamic(() => import("@/features/inventory/InventoryPage").then((m: any) => ({ default: m.InventoryPage })), { ssr: false });

export default function Page() {
  return <PageComp />;
}
