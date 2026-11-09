"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useRealUser } from "@/hooks/use-real-user"

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const realUser = useRealUser(true)
  const role = realUser?.role

  useEffect(() => {
    if (!role) return
    if (role === "user" && pathname !== "/profile") {
      router.replace("/profile")
    }
  }, [role, pathname, router])

  // Check onboarding status
  useEffect(() => {
    if (!role || pathname.startsWith("/onboarding")) return
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/onboarding/status")
        if (res.ok) {
          const data = await res.json()
          if (data.needsOnboarding) {
            router.replace("/onboarding")
          }
        }
      } catch {
        // Silently fail - let middleware handle auth
      }
    }
    checkOnboarding()
  }, [role, pathname, router])

  return <DashboardLayout>{children}</DashboardLayout>
}
