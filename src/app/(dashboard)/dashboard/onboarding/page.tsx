"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertCircle, Building2 } from "lucide-react";
import { MaintenanceDialog } from "@/components/maintenance";

export default function OnboardingInitializationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "initializing" | "success" | "error">("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);

  const checkInitialization = async () => {
    try {
      const res = await fetch("/api/onboarding/status", {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error("Failed to check status");
      }

      const data = await res.json();

      if (data.isInitialized) {
        setStatus("success");
        // Redirect to dashboard after brief success state
        setTimeout(() => router.replace("/dashboard"), 800);
      } else {
        // Not initialized yet, trigger initialization
        await initializeWorkspace();
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Gagal memeriksa status");
    }
  };

  const initializeWorkspace = async () => {
    setStatus("initializing");
    try {
      const res = await fetch("/api/onboarding/initialize", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menginisialisasi workspace");
      }

      setStatus("success");
      setTimeout(() => router.replace("/dashboard"), 800);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Gagal menginisialisasi workspace");
    }
  };

  const handleRetry = () => {
    setRetryCount((c) => c + 1);
    setErrorMessage(null);
    checkInitialization();
  };

  // Check maintenance status
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const res = await fetch("/api/maintenance/status", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (data.enabled) {
            setMaintenanceOpen(true)
          }
        }
      } catch {
        // Ignore errors, fail open
      } finally {
        setMaintenanceChecked(true)
      }
    }
    checkMaintenance()
  }, [])

  useEffect(() => {
    if (maintenanceChecked && !maintenanceOpen) {
      checkInitialization();
    }
  }, [maintenanceChecked, maintenanceOpen, retryCount]);

  // Don't render until maintenance check is done
  if (!maintenanceChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex gap-1">
            <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.2s" }} />
            <span className="size-2 animate-bounce rounded-full bg-primary" style={{ animationDelay: "-0.1s" }} />
            <span className="size-2 animate-bounce rounded-full bg-primary" />
          </div>
          <span>Memeriksa status sistem...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Brand */}
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Selamat Datang di Niraya</h1>
        <p className="text-muted-foreground mb-8">
          Kami menyiapkan workspace bisnis Anda...
        </p>

        {/* Status Content */}
        <div className="rounded-2xl border bg-card shadow-sm p-8">
          {status === "checking" && (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Memeriksa status akun...</p>
            </div>
          )}

          {status === "initializing" && (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Membuat bisnis dan toko default...</p>
              <p className="text-sm text-muted-foreground">Ini hanya butuh beberapa detik</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
              <h2 className="text-xl font-semibold text-green-600">Siap Digunakan!</h2>
              <p className="text-muted-foreground">Workspace bisnis Anda sudah siap</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
              <h2 className="text-xl font-semibold text-destructive">Terjadi Kesalahan</h2>
              <p className="text-muted-foreground">{errorMessage}</p>
              <button
                onClick={handleRetry}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Detail bisnis dan toko dapat diubah nanti di Pengaturan
        </p>
      </div>

      <MaintenanceDialog isOpen={maintenanceOpen} />
    </div>
  );
}