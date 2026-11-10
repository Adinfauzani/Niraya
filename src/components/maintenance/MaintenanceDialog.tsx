"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface MaintenanceData {
  enabled: boolean;
  message: string | null;
  startedAt: string | null;
  estimatedEndAt: string | null;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateCountdown(estimatedEndAt: string | null): Countdown {
  if (!estimatedEndAt) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const endTime = new Date(estimatedEndAt).getTime();
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

function formatNumber(num: number): string {
  return num.toString().padStart(2, "0");
}

export function MaintenanceDialog({ isOpen }: { isOpen: boolean }) {
  const [maintenanceData, setMaintenanceData] = useState<MaintenanceData | null>(null);
  const [countdown, setCountdown] = useState<Countdown>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });
  const [loading, setLoading] = useState(true);

  // Fetch maintenance status
  useEffect(() => {
    if (!isOpen) return;

    const fetchMaintenance = async () => {
      try {
        const res = await fetch("/api/maintenance/status", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setMaintenanceData(data);
          setCountdown(calculateCountdown(data.estimatedEndAt));
        }
      } catch (error) {
        console.error("Failed to fetch maintenance status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaintenance();
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !maintenanceData?.enabled || countdown.isExpired) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev.isExpired) return prev;

        let totalSeconds = prev.days * 24 * 60 * 60 + prev.hours * 60 * 60 + prev.minutes * 60 + prev.seconds;
        totalSeconds--;

        if (totalSeconds <= 0) {
          return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
        }

        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = totalSeconds % 60;

        return { days, hours, minutes, seconds, isExpired: false };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, maintenanceData?.enabled, countdown.isExpired]);

  if (!isOpen || loading || !maintenanceData?.enabled) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
    >
      <div className="w-full max-w-md mx-auto">
        {/* Status Badge */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
            countdown.isExpired ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
          )}>
            <Loader2 className={cn("size-3 animate-spin", countdown.isExpired && "hidden")} />
            <AlertTriangle className={cn("size-3", !countdown.isExpired && "hidden")} />
            <span>{countdown.isExpired ? "Estimasi Tercapai" : "Maintenance in Progress"}</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border bg-card shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* Title */}
          <h1 id="maintenance-title" className="text-2xl font-bold tracking-tight mb-2">
            Niraya Sedang Dalam Pemeliharaan
          </h1>

          {/* Description */}
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Kami sedang melakukan peningkatan sistem untuk menghadirkan pengalaman penggunaan Niraya yang lebih baik, stabil, dan optimal.
            <br />
            <br />
            Mohon tunggu hingga proses pemeliharaan selesai.
          </p>

          {/* Countdown */}
          <div className="rounded-xl bg-muted/50 p-6 mb-6">
            <div className="flex items-center justify-center gap-1 mb-2" role="timer" aria-live="polite">
              <div className="flex flex-col items-center">
                <span className="text-3xl font-mono font-bold tabular-nums">{formatNumber(countdown.days)}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Hari</span>
              </div>
              <span className="text-2xl font-mono font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-mono font-bold tabular-nums">{formatNumber(countdown.hours)}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Jam</span>
              </div>
              <span className="text-2xl font-mono font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-mono font-bold tabular-nums">{formatNumber(countdown.minutes)}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Menit</span>
              </div>
              <span className="text-2xl font-mono font-bold text-muted-foreground">:</span>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-mono font-bold tabular-nums">{formatNumber(countdown.seconds)}</span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Detik</span>
              </div>
            </div>

            {countdown.isExpired && (
              <div className="flex items-center justify-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-4 py-2 mt-4">
                <AlertTriangle className="size-4 shrink-0" />
                <span className="text-sm font-medium">
                  Estimasi maintenance telah tercapai. Kami sedang memastikan seluruh layanan siap digunakan kembali.
                </span>
              </div>
            )}
          </div>

          {/* Additional Info */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 rounded-lg bg-muted/30">
            <Info className="size-4 shrink-0" />
            <span>Estimasi penyelesaian dapat berubah mengikuti perkembangan proses maintenance.</span>
          </div>

          {/* Custom Message */}
          {maintenanceData.message && (
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary-foreground">{maintenanceData.message}</p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-xs text-center text-muted-foreground">
          Session Anda tetap aktif. Halaman ini akan memperbarui status secara otomatis.
        </p>
      </div>
    </div>
  );
}