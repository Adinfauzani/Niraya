"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PricingCard } from "@/features/plans/PricingCard"
import { useRealUser } from "@/hooks/useRealUser"
import { PLAN_DEFINITIONS } from "@/lib/plans"
import { cn } from "@/lib/utils"

type BillingSubscription = {
  id: string
  planId: string
  planName: string
  tier: string
  status: string
  recurrence: string | null
  currentPeriodEnd: string | null
  cancelAt: string | null
  endedAt: string | null
  usable: boolean
}

type UnclaimedSubscription = {
  id: string
  planId: string
  planName: string
  purchaserEmail: string
  status: string
  currentPeriodEnd: string | null
  createdAt: string
}

type BillingSummary = {
  businessId: string | null
  subscription: BillingSubscription | null
  entitlements: {
    maxUsers?: number
    maxStores?: number
    maxProducts?: number
    features?: string[]
  } | null
  unclaimed: UnclaimedSubscription[]
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date)
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ")
}

export function DashboardPlansPage() {
  const realUser = useRealUser(true) as { plan?: string } | null
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [message, setMessage] = useState<{
    tone: "ok" | "error"
    text: string
  } | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const response = await fetch("/api/billing", {
          cache: "no-store",
          credentials: "include",
        })
        if (response.ok && active) {
          setSummary((await response.json()) as BillingSummary)
        }
      } catch {
        // Biarkan ringkasan kosong; kartu paket tetap tampil.
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  const handleClaim = async () => {
    setClaiming(true)
    setMessage(null)

    try {
      const response = await fetch("/api/billing/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: data?.error ?? "Gagal mengklaim langganan.",
        })
        return
      }

      setSummary(data as BillingSummary)
      const claimed = typeof data?.claimed === "number" ? data.claimed : 0
      setMessage({
        tone: claimed > 0 ? "ok" : "error",
        text:
          claimed > 0
            ? `Berhasil mengklaim ${claimed} langganan.`
            : "Tidak ada langganan baru untuk diklaim.",
      })
    } catch {
      setMessage({ tone: "error", text: "Gagal mengklaim langganan." })
    } finally {
      setClaiming(false)
    }
  }

  const currentTier = summary?.subscription?.usable
    ? summary.subscription.tier
    : (realUser?.plan ?? "free")
  const currentPlan = PLAN_DEFINITIONS.find((plan) => plan.tier === currentTier)

  return (
    <div className="plans-theme mx-auto w-full max-w-7xl space-y-8 text-[var(--plans-ink)]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Paket Langganan
          </h1>
          <p className="mt-1 text-sm text-[var(--plans-muted)]">
            Kelola paket Niraya untuk bisnis Anda. Harga dalam Rupiah.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium tracking-wider text-[var(--plans-muted)] uppercase">
            Paket saat ini
          </span>
          <Badge className="rounded-full capitalize">
            {currentPlan?.name ?? currentTier}
          </Badge>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[var(--plans-muted)]">
          <Loader2 className="size-4 animate-spin" />
          Memuat status langganan...
        </div>
      ) : null}

      {!loading && summary?.subscription ? (
        <section className="rounded-2xl border border-[var(--plans-line)] bg-[var(--plans-paper)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wider text-[var(--plans-muted)] uppercase">
                Langganan aktif
              </p>
              <p className="mt-1 text-lg font-semibold">
                {summary.subscription.planName}
              </p>
            </div>
            <Badge
              variant={summary.subscription.usable ? "success" : "warning"}
              className="capitalize"
            >
              {statusLabel(summary.subscription.status)}
            </Badge>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[var(--plans-muted)]">Periode berakhir</dt>
              <dd className="font-medium">
                {formatDate(summary.subscription.currentPeriodEnd)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--plans-muted)]">Tagihan</dt>
              <dd className="font-medium capitalize">
                {summary.subscription.recurrence ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--plans-muted)]">Maks. pengguna</dt>
              <dd className="font-medium">
                {summary.entitlements?.maxUsers ?? "-"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--plans-muted)]">Maks. toko</dt>
              <dd className="font-medium">
                {summary.entitlements?.maxStores ?? "-"}
              </dd>
            </div>
          </dl>
        </section>
      ) : null}

      {!loading && summary && summary.unclaimed.length > 0 ? (
        <section className="rounded-2xl border border-[var(--plans-gold)]/40 bg-[var(--plans-paper)] p-5">
          <p className="text-sm font-semibold">
            Ada {summary.unclaimed.length} langganan yang belum diklaim
          </p>
          <p className="mt-1 text-sm text-[var(--plans-muted)]">
            Email pembeli:{" "}
            {summary.unclaimed.map((item) => item.purchaserEmail).join(", ")}
          </p>
          <Button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="mt-3 h-10 rounded-xl"
          >
            {claiming ? (
              <Loader2 aria-hidden className="mr-2 size-4 animate-spin" />
            ) : null}
            Klaim sekarang
          </Button>
        </section>
      ) : null}

      {message ? (
        <p
          className={cn(
            "flex items-center gap-2 text-sm",
            message.tone === "ok" ? "text-emerald-600" : "text-destructive",
          )}
        >
          {message.tone === "ok" ? (
            <CheckCircle2 aria-hidden className="size-4" />
          ) : (
            <AlertCircle aria-hidden className="size-4" />
          )}
          {message.text}
        </p>
      ) : null}

      <section>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_DEFINITIONS.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              currentTier={currentTier}
            />
          ))}
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-[var(--plans-line)] pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[var(--plans-muted)]">
          Butuh perbandingan fitur yang lengkap?
        </p>
        <Button asChild variant="outline" className="h-10 rounded-xl">
          <Link href="/plans">
            Lihat halaman paket
            <ArrowRight aria-hidden className="ml-2 size-4" />
          </Link>
        </Button>
      </footer>
    </div>
  )
}