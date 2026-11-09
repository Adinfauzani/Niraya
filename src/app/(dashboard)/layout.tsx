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
  const [onboardingDone, setOnboardingDone] = useState(false)

  // Check onboarding status first
  useEffect(() => {
    if (!role || pathname.startsWith("/onboarding")) {
      setCheckingOnboarding(false)
      return
    }
    let cancelled = false
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/onboarding/status")
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            if (data.needsOnboarding) {
              setShowOnboarding(true)
              setOnboardingDone(false)
            } else {
              setOnboardingDone(true)
              setShowOnboarding(false)
            }
          }
        }
      } catch {
        // Silently fail - let middleware handle auth
      } finally {
        if (!cancelled) {
          setCheckingOnboarding(false)
        }
      }
    }
    checkOnboarding()
    return () => { cancelled = true }
  }, [role, pathname])

  // Only redirect to /profile AFTER onboarding check is done AND onboarding is complete
  useEffect(() => {
    // Wait for onboarding check to complete
    if (checkingOnboarding) return
    
    // Don't redirect if onboarding modal is showing
    if (showOnboarding) return
    
    // Don't redirect if onboarding not done yet
    if (!onboardingDone) return
    
    // Don't redirect if already on profile or onboarding page
    if (pathname === "/profile" || pathname.startsWith("/onboarding")) return
    
    // Only redirect if role is "user" (no business role assigned)
    if (role === "user") {
      router.replace("/profile")
    }
  }, [role, pathname, router, checkingOnboarding, showOnboarding, onboardingDone])

  if (checkingOnboarding) {
    return <DashboardLayout>{children}</DashboardLayout>
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    setOnboardingDone(true)
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
