"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  FileImage,
  Loader2,
  ReceiptText,
  RefreshCw,
  Upload,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PublicNavigation } from "@/components/public/PublicNavigation";
import { getJson } from "@/features/storefront/api";
import { formatCurrency } from "@/lib/format";

function norm(v: unknown) {
  return String(v || "")
    .trim()
    .toUpperCase();
}
function rp(v: number) {
  return formatCurrency(v);
}

function TopDesktopNav() {
  return (
    <div className="fixed right-3 top-3 z-30 hidden lg:block">
      <PublicNavigation variant="desktop" />
    </div>
  );
}

export function StorefrontPaymentPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [ref, setRef] = useState("");
  const paymentId = sp.get("paymentId") || order?.payment?.id || "";
  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const r = await getJson<{ order: any }>(
        `/api/public/orders/${encodeURIComponent(orderId)}`,
      );
      setOrder(r.order ?? null);
    } catch (e: any) {
      if (!silent) toast.error(e?.message || "Gagal memuat pembayaran.");
      setOrder(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [orderId]);
  async function upload() {
    const pid = paymentId || order?.payment?.id;
    if (!pid) {
      toast.error("Payment ID tidak ditemukan.");
      return;
    }
    if (!file) {
      toast.error("Pilih file bukti transfer.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("orderId", orderId);
      fd.set("paymentId", pid);
      if (ref.trim()) fd.set("referenceNumber", ref.trim());
      fd.set("file", file);
      const res = await fetch("/api/public/payments/proof", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any)?.error || "Upload gagal.");
      toast.success("Bukti terkirim. Menunggu verifikasi.");
      setFile(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Upload gagal.");
    } finally {
      setUploading(false);
    }
  }
  async function copy(text?: string | null) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Disalin");
    } catch {}
  }
  if (loading)
    return (
      <>
        <TopDesktopNav />
        <div className="mx-auto max-w-xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
          <Card className="rounded-3xl p-6 text-sm text-muted-foreground">
            Memuat pembayaran...
          </Card>
        </div>
        <PublicNavigation variant="mobile" />
      </>
    );
  if (!order)
    return (
      <>
        <TopDesktopNav />
        <div className="mx-auto flex min-h-[70svh] max-w-md flex-col items-center justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-center">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">
            Pembayaran tidak dapat diakses
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gunakan perangkat/browser yang sama saat checkout.
          </p>
        </div>
        <PublicNavigation variant="mobile" />
      </>
    );
  const ps = norm(order.paymentStatus),
    payState = norm(order.payment?.status),
    paid = ps === "PAID" || ps === "COMPLETED" || payState === "COMPLETED",
    rejected = payState === "REJECTED" || payState === "FAILED",
    inactive =
      ps === "EXPIRED" ||
      ps === "CANCELLED" ||
      payState === "EXPIRED" ||
      payState === "CANCELLED",
    proofSubmitted =
      !!order.payment?.proofSubmitted || payState === "AWAITING_VERIFICATION",
    canUpload = !paid && !inactive;
  return (
    <>
      <TopDesktopNav />
      <div className="mx-auto min-h-svh max-w-xl pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-8">
        <div className="sticky top-0 z-10 border-b bg-background/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5 lg:pt-4">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-sm text-muted-foreground"
            onClick={() =>
              router.push(`/menu/order/${encodeURIComponent(orderId)}`)
            }
          >
            <ArrowLeft className="size-4" />
            Status pesanan
          </button>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Pembayaran Manual</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Transfer sesuai total, lalu unggah bukti.
              </p>
            </div>
            <Button
              size="icon-sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => load()}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-4 px-4 pt-4 sm:px-5">
          <Card className="rounded-3xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Order</p>
                <p className="font-semibold">{order.orderNumber}</p>
              </div>
              <Badge
                variant={
                  paid
                    ? "default"
                    : rejected || inactive
                      ? "destructive"
                      : "secondary"
                }
                className="rounded-full"
              >
                {paid
                  ? "Terverifikasi"
                  : proofSubmitted
                    ? "Menunggu verifikasi"
                    : rejected
                      ? "Perlu tindakan"
                      : order.paymentStatus}
              </Badge>
            </div>
            <div className="mt-4 flex items-end justify-between border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Total transfer</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {rp(order.totals?.total || 0)}
                </p>
              </div>
              <ReceiptText className="size-5 text-muted-foreground" />
            </div>
          </Card>
          <Card className="rounded-3xl p-4 sm:p-5">
            <p className="text-sm font-medium">Instruksi transfer</p>
            {order.payment?.instructions?.qrisImageUrl ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-2xl border bg-muted/10 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Scan QRIS untuk bayar</p>
                <img src={String(order.payment.instructions.qrisImageUrl)} alt="QRIS pembayaran" className="h-56 w-56 rounded-xl border bg-white object-contain p-2" />
                <p className="text-center text-xs text-muted-foreground">Scan dengan aplikasi pembayaran, lalu unggah bukti transfer di bawah.</p>
              </div>
            ) : null}
            {order.payment?.instructions?.accountNumber ||
            order.payment?.instructions?.bankName ? (
              <div className="mt-3 space-y-2 text-sm">
                {order.payment.instructions.bankName ? (
                  <div className="flex justify-between rounded-2xl border bg-muted/10 px-3 py-2">
                    <span className="text-muted-foreground">Bank/E-wallet</span>
                    <span className="font-medium">
                      {order.payment.instructions.bankName}
                    </span>
                  </div>
                ) : null}
                {order.payment.instructions.accountName ? (
                  <div className="flex justify-between rounded-2xl border bg-muted/10 px-3 py-2">
                    <span className="text-muted-foreground">Atas nama</span>
                    <span className="font-medium">
                      {order.payment.instructions.accountName}
                    </span>
                  </div>
                ) : null}
                {order.payment.instructions.accountNumber ? (
                  <button
                    type="button"
                    onClick={() =>
                      copy(order.payment.instructions.accountNumber)
                    }
                    className="flex w-full items-center justify-between rounded-2xl border bg-muted/10 px-3 py-2 text-left"
                  >
                    <span className="text-muted-foreground">No. tujuan</span>
                    <span className="inline-flex items-center gap-2 font-medium">
                      {order.payment.instructions.accountNumber}
                      <Copy className="size-3.5 text-muted-foreground" />
                    </span>
                  </button>
                ) : null}
              </div>
            ) : !order.payment?.instructions?.qrisImageUrl ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Transfer sesuai total, lalu unggah bukti untuk verifikasi staff.
              </p>
            ) : null}
            <div
              className={`mt-3 flex items-start gap-2 rounded-2xl border p-3 text-xs ${paid ? "border-green-500/20 bg-green-500/[0.05]" : rejected ? "border-destructive/20 bg-destructive/[0.04] text-destructive" : "border-blue-500/12 bg-blue-500/[0.04] text-muted-foreground"}`}
            >
              {paid ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : rejected ? (
                <XCircle className="mt-0.5 size-4 shrink-0" />
              ) : proofSubmitted ? (
                <Clock3 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              )}
              <span>
                {paid
                  ? "Pembayaran terverifikasi."
                  : rejected
                    ? "Bukti ditolak/bermasalah. Unggah bukti yang benar."
                    : proofSubmitted
                      ? "Bukti diterima, menunggu verifikasi staff. Belum otomatis lunas."
                      : "Pembayaran tidak otomatis lunas. Unggah bukti setelah transfer."}
              </span>
            </div>
          </Card>
          {canUpload ? (
            <Card className="rounded-3xl p-4 sm:p-5">
              <p className="text-sm font-medium">Unggah bukti transfer</p>
              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ref">Nomor referensi (opsional)</Label>
                  <Input
                    id="ref"
                    value={ref}
                    onChange={(e) => setRef(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="file">Bukti transfer</Label>
                  <label
                    htmlFor="file"
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed bg-muted/10 p-4 text-sm"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl border bg-background">
                      <FileImage className="size-4 text-muted-foreground" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {file ? file.name : "Pilih JPG, PNG, WebP, atau PDF"}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Maksimal 5MB. Disimpan privat untuk verifikasi staff.
                      </span>
                    </span>
                  </label>
                  <Input
                    id="file"
                    type="file"
                    className="sr-only"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Button
                  className="h-11 w-full rounded-2xl bg-[#3769C8] text-white"
                  disabled={uploading || !file}
                  onClick={upload}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Mengunggah...
                    </>
                  ) : (
                    <>
                      <Upload className="size-4" />
                      Kirim Bukti Pembayaran
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ) : null}
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onClick={() =>
              router.push(`/menu/order/${encodeURIComponent(orderId)}`)
            }
          >
            Lihat Status Pesanan
          </Button>
        </div>
      </div>
      <PublicNavigation variant="mobile" />
    </>
  );
}

export function StorefrontTrackingPage({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const r = await getJson<{ order: any }>(
        `/api/public/orders/${encodeURIComponent(orderId)}`,
      );
      setOrder(r.order ?? null);
    } catch (e: any) {
      if (!silent) toast.error(e?.message || "Gagal memuat status.");
      setOrder(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }
  useEffect(() => {
    load();
    const t = setInterval(() => load(true), 12000);
    return () => clearInterval(t);
  }, [orderId]);
  if (loading)
    return (
      <>
        <TopDesktopNav />
        <div className="mx-auto max-w-xl px-4 py-6 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
          <Card className="rounded-3xl p-6 text-sm text-muted-foreground">
            Memuat status pesanan...
          </Card>
        </div>
        <PublicNavigation variant="mobile" />
      </>
    );
  if (!order)
    return (
      <>
        <TopDesktopNav />
        <div className="mx-auto flex min-h-[70svh] max-w-md flex-col items-center justify-center px-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-center">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Status tidak tersedia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Gunakan perangkat/browser yang sama saat checkout.
          </p>
        </div>
        <PublicNavigation variant="mobile" />
      </>
    );
  const ps = norm(order.paymentStatus),
    paid = ps === "PAID" || ps === "COMPLETED",
    awaiting =
      norm(order.payment?.status) === "AWAITING_VERIFICATION" ||
      ps === "AWAITING_VERIFICATION";
  return (
    <>
      <TopDesktopNav />
      <div className="mx-auto min-h-svh max-w-xl pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-8">
        <div className="sticky top-0 z-10 border-b bg-background/80 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5 lg:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Niraya order tracking
              </p>
              <h1 className="mt-1 text-xl font-semibold">Status Pesanan</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.orderNumber}
              </p>
            </div>
            <Button
              size="icon-sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => load()}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-4 px-4 pt-4 sm:px-5">
          <Card className="rounded-3xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex size-10 items-center justify-center rounded-2xl ${paid ? "bg-green-500/10 text-green-700 dark:text-green-300" : awaiting ? "bg-blue-500/10 text-blue-700 dark:text-blue-300" : "bg-muted text-muted-foreground"}`}
              >
                {paid ? (
                  <CheckCircle2 className="size-5" />
                ) : awaiting ? (
                  <Clock3 className="size-5" />
                ) : (
                  <UtensilsCrossed className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{order.orderStatus}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {paid
                    ? "Pembayaran terverifikasi. Pesanan dapat diproses."
                    : awaiting
                      ? "Bukti diterima, menunggu verifikasi staff."
                      : "Pembayaran manual perlu verifikasi staff sebelum diproses."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">Order: {order.orderStatus}</Badge>
                  <Badge variant={paid ? "default" : "secondary"}>
                    Bayar: {order.paymentStatus}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
          <Card className="rounded-3xl p-4 sm:p-5">
            <p className="text-sm font-medium">Ringkasan item</p>
            <div className="mt-3 space-y-2">
              {(order.items || []).map((i: any, idx: number) => (
                <div key={idx} className="flex justify-between gap-3 text-sm">
                  <span>
                    {i.quantity}× {i.productName}
                    {i.variantName ? ` · ${i.variantName}` : ""}
                  </span>
                  <span className="font-medium tabular-nums">
                    {rp(i.subtotal)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{rp(order.totals?.subtotal || 0)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-muted-foreground">Pajak</span>
                <span>{rp(order.totals?.tax || 0)}</span>
              </div>
              <div className="mt-2 flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{rp(order.totals?.total || 0)}</span>
              </div>
            </div>
          </Card>
          <Button
            variant="outline"
            className="h-11 w-full rounded-2xl"
            onClick={() =>
              router.push(
                `/menu/order/${encodeURIComponent(orderId)}/payment?paymentId=${encodeURIComponent(order.payment?.id || "")}`,
              )
            }
          >
            <CreditCard className="size-4" />
            Buka Halaman Pembayaran
          </Button>
        </div>
      </div>
      <PublicNavigation variant="mobile" />
    </>
  );
}
