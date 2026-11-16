"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DashboardPage } from "@/features/dashboard/DashboardPage";

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
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const res = await fetch("/api/onboarding/status", { cache: "no-store", credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.needsOnboarding === true) {
            router.replace("/dashboard/onboarding");
            return;
          }
        } else if (res.status === 401) {
          router.replace("/login");
          return;
        }
      } catch {
        // Silently fail, will show error on onboarding page
      } finally {
        setChecked(true);
      }
    };
    checkOnboarding();
  }, [router]);

  // Show loading while checking
  if (!checked) {
    return <DashboardSkeleton />;
  }

  return <DashboardPage />;
}