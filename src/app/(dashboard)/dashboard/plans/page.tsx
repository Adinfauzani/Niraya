import type { Metadata } from "next"

import { DashboardPlansPage } from "@/features/plans/DashboardPlansPage"

export const metadata: Metadata = {
  title: "Paket Langganan — Niraya",
  description: "Lihat dan kelola paket langganan Niraya untuk bisnis Anda.",
}

export default function Page() {
  return <DashboardPlansPage />
}