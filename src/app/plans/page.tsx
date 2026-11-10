import type { Metadata } from "next"

import { PlansPage } from "@/features/plans/PlansPage"

// oxlint-disable-next-line react/only-export-components -- Next.js route metadata belongs here.
export const metadata: Metadata = {
  title: "Plans — Niraya",
  description:
    "Compare Niraya Starter, Plus, and Pro memberships. Point of sale, inventory, multi-store operations, reporting, and API access in one retail operating system.",
}

export default function Page() {
  return <PlansPage />
}
