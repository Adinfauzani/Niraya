"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { OnboardingDialog } from "@/features/onboarding/onboarding-dialog";

const DashboardPage = dynamic(
  () => import("@/features/dashboard/dashboard-page").then((m) => m.DashboardPage),
  { ssr: false, loading: () => <DashboardSkeleton /> }
);

function DashboardSkeleton() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="flex gap-1">
          <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.2s" }} />
          <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.1s" }} />
          <span className="size-2 animate-bounce rounded-full bg-primary" />
        </div>
        <span>Memuat dashboard...</span>
      </div>
    </div>
  );
}

export function DashboardClientPage() {
  const pathname = usePathname();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/dashboard/onboarding" || pathname.startsWith("/api/")) return;
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/onboarding/status");
        if (res.ok) {
          const data = await res.json();
          setNeedsOnboarding(data.needsOnboarding === true);
        }
      } catch {
        // Silently fail
      } finally {
        setChecked(true);
      }
    };
    checkOnboarding();
  }, [pathname]);

  // Show loading while checking
  if (!checked) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.2s" }} />
            <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.1s" }} />
            <span className="size-2 animate-bounce rounded-full bg-primary" />
          </div>
          <span>Memeriksa status onboarding...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardPage />
      {/* Onboarding Dialog - shows on dashboard when needed */}
      {needsOnboarding && pathname === "/dashboard" && <OnboardingDialog />}
    </>
  );
}