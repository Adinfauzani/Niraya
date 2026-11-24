"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ReceiptText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";

type ActivityItem = {
  kind: "order" | "transaction";
  role: "customer" | "staff";
  id: string;
  number: string;
  status: string;
  paymentStatus?: string | null;
  total: number;
  currency: string;
  source: string;
  paymentMethod?: string | null;
  createdAt: string | Date;
};

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  const s = String(status || "").toUpperCase();
  if (["COMPLETED", "PAID", "SUCCESS", "FULFILLED"].includes(s)) return "default";
  if (["CANCELLED", "VOIDED", "FAILED", "EXPIRED", "REFUNDED"].includes(s)) return "destructive";
  if (["PENDING", "UNPAID", "AWAITING_VERIFICATION", "SUBMITTED", "PROCESSING"].includes(s)) return "secondary";
  return "outline";
}

function humanStatus(value?: string | null) {
  if (!value) return "-";
  const key = value.toUpperCase();
  if (["AWAITING_VERIFICATION", "PENDING_VERIFICATION"].includes(key)) return "Verify";
  return value.replaceAll("_", " ");
}

export function MyOrdersPage() {
  const [activity, setActivity] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/me/activity", { cache: "no-store", credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) {
          setActivity([]);
          setError((data as any)?.error || "Gagal memuat aktivitas.");
          return;
        }
        setActivity(Array.isArray((data as any)?.activity) ? (data as any).activity : []);
      } catch (e: any) {
        if (active) {
          setActivity([]);
          setError(e?.message || "Gagal memuat aktivitas.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => activity ?? [], [activity]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aktivitas"
        description="Riwayat dan status pesanan/transaksi Anda."
      />

      {activity === null ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Belum ada aktivitas"
          description={error || "Pesanan yang Anda buat atau transaksi yang terkait akan muncul di sini."}
          className="border-border/60 py-10"
        />
      ) : (
        <Card className="rounded-2xl border-border/70 shadow-none">
          <CardContent className="p-4">
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={`${item.role}-${item.kind}-${item.id}`}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.number}</p>
                      <Badge variant={statusVariant(item.status)} className="rounded-full px-2 py-0 text-[10px] font-medium">
                        {humanStatus(item.status)}
                      </Badge>
                      {item.paymentStatus && item.paymentStatus !== item.status ? (
                        <Badge variant="outline" className="rounded-full px-2 py-0 text-[10px] font-medium">
                          Bayar: {humanStatus(item.paymentStatus)}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {formatDateTime(item.createdAt)} · {item.source}
                      {item.role === "staff" ? " · Ditangani" : " · Pesanan Anda"}
                      {item.paymentMethod ? ` · ${item.paymentMethod}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatCurrency(Number(item.total || 0), item.currency || "IDR")}
                    </p>
                    {item.kind === "order" && item.role === "customer" ? (
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <Link href={`/menu/checkout?orderId=${encodeURIComponent(item.id)}`}>Detail</Link>
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
