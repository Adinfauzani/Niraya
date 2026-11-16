"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Building2,
  Store,
  LogIn,
} from "lucide-react";
import { MaintenanceDialog } from "@/components/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = "checking" | "choose" | "creating" | "joining" | "success";

export default function OnboardingInitializationPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checking");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);

  const goToDashboard = () => {
    setTimeout(() => router.replace("/dashboard"), 700);
  };

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
        throw new Error("Gagal memeriksa status");
      }

      const data = await res.json();

      if (data.isInitialized) {
        setStep("success");
        goToDashboard();
      } else {
        setStep("choose");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal memeriksa status"
      );
      setStep("choose");
    }
  };

  const initializeWorkspace = async () => {
    setStep("creating");
    setErrorMessage(null);
    try {
      const res = await fetch("/api/onboarding/initialize", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal membuat workspace");
      }

      setStep("success");
      goToDashboard();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Gagal membuat workspace"
      );
      setStep("choose");
    }
  };

  const joinStore = async () => {
    if (!code.trim()) {
      setJoinError("Kode toko wajib diisi.");
      return;
    }
    setStep("joining");
    setJoinError(null);
    try {
      const res = await fetch("/api/staff/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal bergabung dengan toko");
      }
      setStep("success");
      goToDashboard();
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Gagal bergabung dengan toko"
      );
      setStep("choose");
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
        const res = await fetch("/api/maintenance/status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.enabled) {
            setMaintenanceOpen(true);
          }
        }
      } catch {
        // Ignore errors, fail open
      } finally {
        setMaintenanceChecked(true);
      }
    };
    checkMaintenance();
  }, []);

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
    );
  }

  const busy = step === "creating" || step === "joining";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Brand */}
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Building2 className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">Selamat Datang di Niraya</h1>
        <p className="text-muted-foreground mb-8">
          Buat usaha baru atau bergabung dengan toko yang sudah ada.
        </p>

        {/* Status Content */}
        <div className="rounded-2xl border bg-card shadow-sm p-8 text-left">
          {step === "checking" && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Memeriksa status akun...</p>
            </div>
          )}

          {step === "choose" && (
            <div className="space-y-4">
              {errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <div className="flex-1">
                    <p>{errorMessage}</p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="mt-1 font-medium underline underline-offset-4 hover:text-destructive/80"
                    >
                      Coba lagi
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <Store className="size-4 text-primary" />
                    Buat usaha baru
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buat workspace dan toko baru. Anda menjadi owner.
                  </p>
                  <Button className="mt-3 w-full" onClick={() => void initializeWorkspace()}>
                    Buat usaha baru
                  </Button>
                </div>

                <div className="rounded-xl border border-border/70 p-4">
                  <div className="flex items-center gap-2 font-medium">
                    <LogIn className="size-4 text-primary" />
                    Gabung dengan kode toko
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Masukkan kode toko yang diberikan pemilik untuk bergabung sebagai anggota.
                  </p>
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="store-code">Kode toko</Label>
                    <Input
                      id="store-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: 6ZGD3462"
                      autoComplete="off"
                      autoCapitalize="characters"
                      disabled={busy}
                    />
                    {joinError && <p className="text-sm text-destructive">{joinError}</p>}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => void joinStore()}
                      disabled={busy}
                    >
                      Gabung dengan toko
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "creating" && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Membuat bisnis dan toko default...</p>
            </div>
          )}

          {step === "joining" && (
            <div className="space-y-4 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Menghubungkan ke toko...</p>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-10 w-10 text-green-500" />
              <h2 className="text-xl font-semibold text-green-600">Siap Digunakan!</h2>
              <p className="text-muted-foreground">Anda akan diarahkan ke dashboard...</p>
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