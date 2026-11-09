"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useRealUser } from "@/hooks/use-real-user"
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const realUser = useRealUser(true)
  const role = realUser?.role
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)

  useEffect(() => {
    if (!role) return
    if (role === "user" && pathname !== "/profile") {
      router.replace("/profile")
    }
  }, [role, pathname, router])

  // Check onboarding status
  useEffect(() => {
    if (!role || pathname.startsWith("/onboarding")) {
      setCheckingOnboarding(false)
      return
    }
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/onboarding/status")
        if (res.ok) {
          const data = await res.json()
          if (data.needsOnboarding) {
            setShowOnboarding(true)
          }
        }
      } catch {
        // Silently fail - let middleware handle auth
      } finally {
        setCheckingOnboarding(false)
      }
    }
    checkOnboarding()
  }, [role, pathname])

  if (checkingOnboarding) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    router.refresh()
  }

  return (
    <DashboardLayout>
      {children}
      {showOnboarding && (
        <Dialog open onOpenChange={setShowOnboarding}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="border-b pb-4">
              <DialogTitle>Setup Usaha Pertama</DialogTitle>
              <DialogDescription>
                Ikuti langkah-langkah di bawah untuk menyiapkan usaha Anda sebelum masuk ke dashboard.
              </DialogDescription>
            </DialogHeader>
            <OnboardingWizard onComplete={handleOnboardingComplete} />
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  )
}
