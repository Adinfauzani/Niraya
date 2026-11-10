"use client";

import dynamic from "next/dynamic";

const PageComp = dynamic(() => import("@/features/help/HelpPage").then((m: any) => ({ default: m.HelpPage })), { ssr: false });

export default function Page() {
  return <PageComp />;
}
