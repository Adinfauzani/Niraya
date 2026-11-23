import type { Metadata } from "next"

import { LandingPage } from "@/components/landing/LandingPage";

// oxlint-disable-next-line react/only-export-components -- Next.js route metadata belongs here.
export const metadata: Metadata = {
  title: "Niraya POS: Software Kasir & Operasional UMKM Indonesia",
  description:
    "Niraya POS adalah platform SaaS multifungsi untuk UMKM Indonesia: kelola kasir, transaksi, inventori, dan operasional warung, kafe, serta toko secara digital, terintegrasi, dan efisien.",
  keywords: [
    "Niraya POS",
    "software kasir",
    "aplikasi kasir",
    "aplikasi POS",
    "point of sale",
    "kelola inventori",
    "aplikasi UMKM",
    "software UMKM",
    "aplikasi toko",
    "aplikasi warung",
    "aplikasi kafe",
    "SaaS UMKM Indonesia",
  ],
  alternates: { canonical: "/" },
};

export default function Home() {
  return <LandingPage />;
}