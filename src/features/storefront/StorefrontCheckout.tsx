"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  Loader2Icon,
  ShieldCheckIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { getJson, postJson } from "@/features/storefront/api";
import {
  cartStorageKey,
  clearCart,
  clearIdemKey,
  getOrCreateIdemKey,
  idemStorageKey,
  loadCart,
  type CartLine,
} from "@/features/storefront/cart";
import { formatCurrency, formatNumber } from "@/lib/format";
import { slugifyStoreName } from "@/lib/storeSlug";

type CatalogResp = {
  catalog: {
    business: { name: string; logoUrl?: string | null };
    store?: { id: string; name: string } | null;
    payment: { storefrontCheckoutEnabled: boolean; manualTransferEnabled: boolean };
  };
};

type CheckoutResp = {
  orderId: string;
  paymentId?: string;
  orderNumber?: string;
};

export function StorefrontCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store") || null;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [catalog, setCatalog] = useState<CatalogResp | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCart(loadCart(cartStorageKey(storeId)));
    setHydrated(true);
  }, [storeId]);

  useEffect(() => {
    const reload = () => setCart(loadCart(cartStorageKey(storeId)));
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    window.addEventListener("focus", reload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", reload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [storeId]);

  useEffect(() => {
    let active = true;
    setCatalogError(null);
    const url = storeId
      ? `/api/public/storefront/catalog?store=${encodeURIComponent(storeId)}`
      : "/api/public/storefront/catalog";
    getJson<CatalogResp>(url)
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch((error: any) => {
        if (active) setCatalogError(error?.message || "Gagal memuat informasi toko.");
      });
    return () => {
      active = false;
    };
  }, [storeId]);

  const count = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );
  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
    [cart],
  );

  const checkoutEnabled =
    catalog?.catalog.payment.storefrontCheckoutEnabled ?? false;
  const storeName = catalog?.catalog.store?.name || null;
  const menuHref = storeName
    ? `/${slugifyStoreName(storeName)}/menu`
      : storeId
        ? `/menu?store=${encodeURIComponent(storeId)}`
        : "/search";
  const businessName = catalog?.catalog.business.name || "Pemesanan";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;

    if (!cart.length) {
      toast.error("Keranjang masih kosong.");
      return;
    }
    if (catalog && !checkoutEnabled) {
      toast.error("Pemesanan belum diaktifkan.");
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error("Nama dan nomor HP/WhatsApp wajib diisi.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 6) {
      toast.error("Nomor HP/WhatsApp tidak valid.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await postJson<CheckoutResp>(
        "/api/public/storefront/checkout",
        {
          idempotencyKey: getOrCreateIdemKey(idemStorageKey(storeId)),
          storeId: storeId || undefined,
          paymentMethod: "manual_transfer",
          orderType: "takeaway",
          notes: notes.trim() || undefined,
          guest: { name: name.trim(), phone: phone.trim() },
          items: cart.map((line) => ({
            productId: line.productId,
            variantId: line.variantId || undefined,
            quantity: line.quantity,
            notes: line.notes || undefined,
          })),
        },
      );

      clearCart(cartStorageKey(storeId));
      clearIdemKey(idemStorageKey(storeId));
      toast.success("Pesanan dibuat", { description: "Lanjut ke pembayaran." });
      const paymentId = result.paymentId ? `?paymentId=${encodeURIComponent(result.paymentId)}` : "";
      router.replace(`/menu/order/${encodeURIComponent(result.orderId)}/payment${paymentId}`);
    } catch (error: any) {
      toast.error("Checkout gagal", {
        description: error?.message || "Silakan coba lagi.",
      });
      setSubmitting(false);
    }
  }

  const showEmpty = hydrated && cart.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-svh bg-background pb-[calc(env(safe-area-inset-bottom)+9.5rem)]"
    >
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2.5 min-[400px]:px-4">
          <Link
            href={menuHref}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-foreground/80 outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Kembali ke menu"
          >
            <ArrowLeftIcon className="size-4" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold tracking-tight">
              Checkout
            </h1>
            <p className="truncate text-[12px] text-muted-foreground">
              {businessName}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-3 pt-4 min-[400px]:px-4">
        {!hydrated ? (
          <>
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </>
        ) : showEmpty ? (
          <EmptyState
            icon={ShoppingBagIcon}
            title="Keranjang masih kosong"
            description="Tambahkan menu terlebih dahulu untuk mulai memesan."
            action={
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={menuHref}>Lihat menu</Link>
              </Button>
            }
            className="border-border/60 bg-card/50"
          />
        ) : (
          <>
            <section className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-medium">Ringkasan pesanan</h2>
                <span className="text-[12px] text-muted-foreground">
                  {formatNumber(count)} item
                </span>
              </div>
              <ul className="mt-3 space-y-2.5">
                {(hydrated ? cart : []).map((line) => (
                  <li
                    key={line.key}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="min-w-0 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {line.quantity}×
                      </span>{" "}
                      {line.name}
                      {line.variantName ? ` · ${line.variantName}` : ""}
                      {line.notes ? (
                        <span className="block break-words text-[11px]">
                          {line.notes}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Pajak & total final dihitung server saat pesanan dibuat.
              </p>
            </section>

            <section className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
              <h2 className="text-sm font-medium">Data pemesan</h2>
              <div className="space-y-1.5">
                <label
                  htmlFor="checkout-name"
                  className="text-sm font-medium"
                >
                  Nama penerima
                </label>
                <Input
                  id="checkout-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-muted/10 text-base shadow-none"
                  required
                  autoComplete="name"
                  maxLength={80}
                  placeholder="Nama Anda"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="checkout-phone"
                  className="text-sm font-medium"
                >
                  No. HP / WhatsApp
                </label>
                <Input
                  id="checkout-phone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="h-12 rounded-2xl border-border/70 bg-muted/10 text-base shadow-none"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={30}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="checkout-notes"
                  className="text-sm font-medium"
                >
                  Catatan <span className="font-normal text-muted-foreground">(opsional)</span>
                </label>
                <Textarea
                  id="checkout-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  className="min-h-24 rounded-2xl border-border/70 bg-muted/10 text-base shadow-none"
                  maxLength={500}
                  placeholder="Contoh: tanpa sambal, ambil pukul 12.00"
                />
              </div>
            </section>

            <p className="flex items-start gap-2 px-1 text-[12px] leading-5 text-muted-foreground">
              <ShieldCheckIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden
              />
              Pesanan dibuat dengan metode transfer manual. Selesaikan
              pembayaran pada langkah berikutnya.
            </p>

            {catalogError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                {catalogError}
              </p>
            ) : null}
            {catalog && !checkoutEnabled ? (
              <p className="rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
                Pemesanan belum diaktifkan untuk toko ini.
              </p>
            ) : null}
          </>
        )}
      </main>

      {hydrated && !showEmpty ? (
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">
                  Estimasi subtotal
                </p>
                <p className="truncate text-lg font-semibold tabular-nums">
                  {formatCurrency(subtotal)}
                </p>
              </div>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {formatNumber(count)} item
              </span>
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 h-12 w-full rounded-2xl bg-blue-600 text-[15px] font-semibold text-white shadow-none hover:bg-blue-500"
            >
              {submitting ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" aria-hidden />
                  Memproses...
                </>
              ) : (
                "Buat pesanan & lanjut bayar"
              )}
            </Button>
          </div>
        </footer>
      ) : null}
    </form>
  );
}