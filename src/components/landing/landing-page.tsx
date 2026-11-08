"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  CreditCard,
  Package,
  QrCode,
  ReceiptText,
  ScanLine,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Store,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/themetoggle";
import { PublicNavigation } from "@/components/public/public-navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { LandingMenuItem } from "@/app/page";

/** Verified modules only. Status reflects current implementation maturity. */
const FEATURED_FEATURE = {
  icon: ShoppingCart,
  tag: "Meja Kasir",
  name: "Point of Sale",
  desc: "Dari pilih menu sampai nota selesai: transaksi harian ditangani lewat alur kasir yang rapi, sesuai modul yang tersedia.",
  points: ["Proses transaksi", "Alur kerja kasir", "Operasional penjualan"],
  status: "Tersedia",
  visual: "pos" as const,
} as const;

const FEATURES = [
  { icon: Package, tag: "Etalase", name: "Manajemen Produk", desc: "Rapikan etalase digital usaha: katalog, kategori, harga, dan info stok dalam satu tempat.", points: ["Katalog produk", "Kategori", "Harga & info stok"], status: "Tersedia", visual: "catalog" as const },
  { icon: QrCode, tag: "Meja QR", name: "QR Ordering", desc: "Pelanggan scan, pilih, dan pesan. Checkout tamu serta pelacakan pesanan mengikuti alur yang tersedia.", points: ["Pemesanan via QR", "Guest checkout", "Pelacakan pesanan"], status: "Sesuai fase", visual: "qr" as const },
  { icon: CreditCard, tag: "Laci Bayar", name: "Pembayaran", desc: "Catat pembayaran dengan jelas: tunai di POS, transfer manual, dan verifikasi bukti bayar sesuai alur.", points: ["Tunai (POS)", "Transfer manual", "Verifikasi bukti bayar"], status: "Per alur", visual: "payment" as const },
  { icon: ShieldCheck, tag: "Kunci Akses", name: "Manajemen Akses", desc: "Atur siapa pegang kasir, stok, atau laporan lewat login dan akses berbasis peran.", points: ["Autentikasi", "Akses berbasis peran", "Manajemen staf"], status: "Tersedia", visual: "access" as const },
] as const;

type FeatureVisual = (typeof FEATURES)[number]["visual"];

function FeatureArt({ kind, className }: { kind: FeatureVisual; className?: string }) {
  const base = "h-auto w-full text-foreground/12 dark:text-foreground/14";
  if (kind === "catalog") return (
    <svg viewBox="0 0 160 88" fill="none" className={cn(base, className)} aria-hidden>
      <rect x="8" y="10" width="44" height="30" rx="8" className="fill-emerald-500/10 stroke-emerald-600/25 dark:stroke-emerald-400/25" />
      <rect x="58" y="10" width="44" height="30" rx="8" className="fill-muted/40 stroke-foreground/15" />
      <rect x="108" y="10" width="44" height="30" rx="8" className="fill-muted/25 stroke-foreground/10" />
      <rect x="8" y="48" width="68" height="30" rx="8" className="fill-muted/30 stroke-foreground/12" />
      <rect x="82" y="48" width="70" height="30" rx="8" className="fill-amber-500/8 stroke-amber-600/20 dark:stroke-amber-400/20" />
      <circle cx="30" cy="25" r="5" className="fill-emerald-600/25 dark:fill-emerald-400/25" /><rect x="40" y="20" width="8" height="3" rx="1.5" className="fill-foreground/15" /><rect x="40" y="26" width="6" height="2" rx="1" className="fill-foreground/10" />
      <rect x="14" y="57" width="12" height="12" rx="3" className="fill-foreground/8" /><rect x="30" y="59" width="20" height="3" rx="1.5" className="fill-foreground/12" /><rect x="30" y="65" width="14" height="2" rx="1" className="fill-foreground/8" />
    </svg>
  );
  if (kind === "qr") return (
    <svg viewBox="0 0 160 88" fill="none" className={cn(base, className)} aria-hidden>
      <rect x="18" y="10" width="52" height="52" rx="10" className="fill-sky-500/8 stroke-sky-600/25 dark:stroke-sky-400/25" />
      <rect x="26" y="18" width="12" height="12" rx="2" className="fill-sky-600/25 dark:fill-sky-400/25" /><rect x="50" y="18" width="12" height="12" rx="2" className="fill-foreground/12" />
      <rect x="26" y="42" width="12" height="12" rx="2" className="fill-foreground/12" /><rect x="42" y="34" width="8" height="8" rx="1.5" className="fill-sky-600/20 dark:fill-sky-400/20" /><rect x="52" y="42" width="10" height="10" rx="2" className="fill-foreground/10" />
      <path d="M14 18v-8h8M62 10h8v8M70 54v8h-8M22 62h-8v-8" className="stroke-sky-600/35 dark:stroke-sky-400/35" strokeWidth="2" strokeLinecap="round" />
      <rect x="84" y="14" width="64" height="22" rx="8" className="fill-muted/35 stroke-foreground/12" /><rect x="92" y="21" width="26" height="3" rx="1.5" className="fill-foreground/12" /><rect x="92" y="27" width="18" height="2" rx="1" className="fill-foreground/8" />
      <rect x="84" y="42" width="64" height="22" rx="8" className="fill-muted/25 stroke-foreground/10" /><circle cx="98" cy="53" r="5" className="fill-emerald-500/20 stroke-emerald-600/25" /><rect x="108" y="50" width="24" height="3" rx="1.5" className="fill-foreground/10" />
    </svg>
  );
  if (kind === "payment") return (
    <svg viewBox="0 0 160 88" fill="none" className={cn(base, className)} aria-hidden>
      <rect x="10" y="16" width="78" height="46" rx="10" className="fill-violet-500/8 stroke-violet-600/22 dark:stroke-violet-400/22" />
      <path d="M10 30h78" className="stroke-violet-600/18 dark:stroke-violet-400/18" strokeWidth="6" />
      <rect x="20" y="42" width="20" height="4" rx="2" className="fill-foreground/12" /><rect x="20" y="50" width="14" height="3" rx="1.5" className="fill-foreground/8" />
      <rect x="96" y="10" width="54" height="68" rx="10" className="fill-muted/35 stroke-foreground/12" />
      <path d="M106 24h34M106 32h28M106 40h34M106 48h20" className="stroke-foreground/10" strokeWidth="2" strokeLinecap="round" />
      <rect x="106" y="58" width="34" height="12" rx="6" className="fill-emerald-500/15 stroke-emerald-600/25 dark:stroke-emerald-400/25" />
      <path d="m118 64 3 3 7-7" className="stroke-emerald-600/50 dark:stroke-emerald-400/50" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 160 88" fill="none" className={cn(base, className)} aria-hidden>
      <rect x="12" y="14" width="58" height="60" rx="10" className="fill-muted/35 stroke-foreground/12" />
      <circle cx="41" cy="36" r="10" className="fill-rose-500/10 stroke-rose-600/22 dark:stroke-rose-400/22" />
      <rect x="26" y="52" width="30" height="3" rx="1.5" className="fill-foreground/12" /><rect x="30" y="58" width="22" height="2" rx="1" className="fill-foreground/8" />
      <path d="M74 44h14" className="stroke-foreground/15" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
      <rect x="92" y="10" width="56" height="20" rx="8" className="fill-muted/28 stroke-foreground/10" /><circle cx="104" cy="20" r="4" className="fill-foreground/10" /><rect x="112" y="18" width="24" height="2.5" rx="1.25" className="fill-foreground/10" />
      <rect x="92" y="34" width="56" height="20" rx="8" className="fill-rose-500/6 stroke-rose-600/18 dark:stroke-rose-400/18" /><circle cx="104" cy="44" r="4" className="fill-rose-500/15" /><rect x="112" y="42" width="20" height="2.5" rx="1.25" className="fill-foreground/10" />
      <rect x="92" y="58" width="56" height="20" rx="8" className="fill-muted/22 stroke-foreground/10" /><circle cx="104" cy="68" r="4" className="fill-foreground/10" /><rect x="112" y="66" width="26" height="2.5" rx="1.25" className="fill-foreground/10" />
    </svg>
  );
}

function PosArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 140" fill="none" className={cn("h-auto w-full", className)} aria-hidden>
      <rect x="8" y="12" width="220" height="116" rx="14" className="fill-background/80 stroke-foreground/12" />
      <rect x="20" y="24" width="86" height="14" rx="7" className="fill-muted/60" /><rect x="112" y="24" width="44" height="14" rx="7" className="fill-blue-500/12 stroke-blue-600/20 dark:stroke-blue-400/20" />
      <rect x="20" y="48" width="58" height="34" rx="8" className="fill-muted/45 stroke-foreground/8" /><rect x="84" y="48" width="58" height="34" rx="8" className="fill-blue-500/8 stroke-blue-600/18 dark:stroke-blue-400/18" /><rect x="148" y="48" width="68" height="34" rx="8" className="fill-muted/35 stroke-foreground/8" />
      <rect x="20" y="88" width="92" height="28" rx="8" className="fill-muted/35 stroke-foreground/8" /><rect x="118" y="88" width="98" height="28" rx="8" className="fill-emerald-500/10 stroke-emerald-600/20 dark:stroke-emerald-400/20" />
      <circle cx="142" cy="102" r="5" className="fill-emerald-500/25" /><rect x="152" y="99" width="40" height="3" rx="1.5" className="fill-foreground/12" /><rect x="152" y="105" width="24" height="2" rx="1" className="fill-foreground/8" />
      <rect x="238" y="16" width="114" height="108" rx="14" className="fill-muted/30 stroke-foreground/10" />
      <rect x="250" y="28" width="90" height="10" rx="5" className="fill-foreground/10" /><rect x="250" y="44" width="70" height="3" rx="1.5" className="fill-foreground/8" /><rect x="250" y="52" width="84" height="3" rx="1.5" className="fill-foreground/8" /><rect x="250" y="60" width="52" height="3" rx="1.5" className="fill-foreground/8" />
      <rect x="250" y="78" width="90" height="34" rx="10" className="fill-blue-500/10 stroke-blue-600/22 dark:stroke-blue-400/22" /><rect x="260" y="90" width="34" height="3" rx="1.5" className="fill-blue-600/25 dark:fill-blue-400/25" /><rect x="260" y="98" width="52" height="6" rx="3" className="fill-blue-600/20 dark:fill-blue-400/20" />
    </svg>
  );
}

const WORKFLOW_STEPS = [
  { key: "menu", step: "01", eyebrow: "Front-end customer flow", title: "Jelajahi Menu Digital", desc: "Pelanggan membuka menu digital melalui QR atau katalog mandiri. Tampilan mengikuti data produk yang tersedia tanpa instalasi aplikasi tambahan.", points: ["Akses cepat lewat browser/QR", "Menu mengikuti data katalog", "Identitas meja dapat disertakan sesuai alur"] },
  { key: "pilih", step: "02", eyebrow: "Kustomisasi pesanan", title: "Pilih Produk & Modifikasi", desc: "Pelanggan memilih item, menyesuaikan varian yang tersedia, menambah catatan, dan meninjau keranjang sebelum checkout.", points: ["Varian/catatan sesuai konfigurasi produk", "Ringkasan item sebelum checkout", "Kalkulasi harga mengikuti data tersimpan"] },
  { key: "bayar", step: "03", eyebrow: "Alur pembayaran", title: "Checkout & Tentukan Bayar", desc: "Pelanggan melengkapi info yang dibutuhkan lalu memilih metode pembayaran yang didukung. Status mengikuti verifikasi sesuai alur operasional.", points: ["Identitas/meja sesuai kebutuhan", "Metode mengikuti konfigurasi yang aktif", "Tanpa klaim gateway yang tidak tersedia"] },
  { key: "verifikasi", step: "04", eyebrow: "Validasi staf", title: "Verifikasi Staf Kasir", desc: "Staf memvalidasi pembayaran/pesanan pada terminal internal. Pesanan yang sah diteruskan ke proses operasional sesuai modul aktif.", points: ["Verifikasi oleh staf berwenang", "Penerusan alur sesuai implementasi", "Akses internal tetap terlindungi"] },
  { key: "selesai", step: "05", eyebrow: "Penyerahan", title: "Pesanan Diterima & Tuntas", desc: "Pesanan disiapkan dan diserahkan sesuai alur layanan. Catatan transaksi tersimpan di sistem untuk kebutuhan operasional dan tinjauan.", points: ["Penyerahan mengikuti alur layanan", "Catatan transaksi tersimpan", "Rekap mengikuti modul yang tersedia"] },
] as const;

function WorkflowVisual({ step }: { step: number }) {
  const shell = "relative overflow-hidden rounded-2xl border bg-[linear-gradient(180deg,color-mix(in_oklab,var(--card)_92%,transparent),color-mix(in_oklab,var(--muted)_18%,transparent))] p-3 shadow-sm sm:p-4";
  const chrome = (
    <div className="mb-3 flex items-center justify-between border-b pb-2.5">
      <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-foreground/12" /><span className="size-2 rounded-full bg-foreground/12" /><span className="size-2 rounded-full bg-foreground/12" /></div>
      
    </div>
  );
  if (step === 0) return (
    <div className={shell}>
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-blue-500/10 blur-2xl" />
      {chrome}
      <div className="mb-3 flex items-center justify-between rounded-xl border bg-card/80 px-3 py-2.5">
        <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-700 dark:text-blue-300"><ScanLine className="size-4" /></span><div><div className="text-xs font-medium">Menu digital</div><div className="text-[10px] text-muted-foreground">QR meja / katalog</div></div></div>
        <Badge variant="secondary" className="text-[10px]">Aktif</Badge>
      </div>
      <div className="space-y-2">
        {[{ n: "Kopi susu", m: "Minuman" }, { n: "Nasi goreng", m: "Makanan" }, { n: "Es teh", m: "Minuman" }].map((x, i) => (
          <div key={x.n} className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs", i === 0 ? "border-blue-500/20 bg-blue-500/[0.05]" : "bg-card/70")}>
            <div className="flex items-center gap-2.5"><span className={cn("size-8 rounded-lg border", i === 0 ? "bg-blue-500/10" : "bg-muted/30")} /><span><span className="block font-medium">{x.n}</span><span className="block text-[10px] text-muted-foreground">{x.m}</span></span></div>
            <span className={cn("rounded-md px-2 py-1 text-[10px]", i === 0 ? "bg-blue-600 text-white dark:bg-blue-500" : "border text-muted-foreground")}>{i === 0 ? "Dipilih" : "Lihat"}</span>
          </div>
        ))}
      </div>
    </div>
  );
  if (step === 1) return (
    <div className={shell}>
      <div aria-hidden className="pointer-events-none absolute -left-8 -bottom-8 size-28 rounded-full bg-emerald-500/8 blur-2xl" />
      {chrome}
      <div className="rounded-xl border bg-card/80 p-3">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShoppingCart className="size-4 text-muted-foreground" /><span className="text-sm font-semibold">Keranjang</span></div><span className="rounded-full border bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground">2 item</span></div>
        <div className="mt-3 rounded-lg border bg-background/70 p-2.5 text-xs"><div className="flex items-center justify-between"><span className="font-medium">Kopi susu</span><span className="text-muted-foreground">x1</span></div><div className="mt-2 flex flex-wrap gap-1.5">{["Less sugar", "Es normal", "Catatan"].map((t) => <span key={t} className="rounded-full border border-dashed bg-muted/20 px-2 py-0.5 text-[10px] text-muted-foreground">{t}</span>)}</div></div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div className="rounded-lg border bg-muted/15 p-2"><div className="text-[10px] text-muted-foreground">Item</div><div className="text-xs font-medium">2</div></div><div className="rounded-lg border bg-muted/15 p-2"><div className="text-[10px] text-muted-foreground">Varian</div><div className="text-xs font-medium">Ada</div></div><div className="rounded-lg border bg-blue-500/[0.06] p-2"><div className="text-[10px] text-muted-foreground">Subtotal</div><div className="text-xs font-medium text-blue-700 dark:text-blue-300">Otomatis</div></div></div>
      </div>
    </div>
  );
  if (step === 2) return (
    <div className={shell}>
      <div aria-hidden className="pointer-events-none absolute right-0 top-0 size-24 rounded-full bg-violet-500/8 blur-2xl" />
      {chrome}
      <div className="rounded-xl border bg-card/80 p-3">
        <div className="flex items-center justify-between"><span className="text-sm font-semibold">Checkout</span><span className="text-[10px] text-muted-foreground">Data & metode bayar</span></div>
        <div className="mt-3 rounded-lg border bg-muted/15 px-3 py-2 text-xs"><div className="text-[10px] text-muted-foreground">Identitas / meja</div><div className="mt-0.5 font-medium">Sesuai kebutuhan alur</div></div>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between rounded-lg border border-blue-500/25 bg-blue-500/[0.06] px-3 py-2.5 text-xs"><span className="flex items-center gap-2"><QrCode className="size-3.5 text-blue-600 dark:text-blue-300" /><span><span className="block font-medium">Metode pembayaran aktif</span><span className="block text-[10px] text-muted-foreground">Mengikuti konfigurasi</span></span></span><CheckCircle2 className="size-4 text-blue-600 dark:text-blue-300" /></div>
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-xs text-muted-foreground"><Store className="size-3.5" />Opsi lain sesuai modul tersedia</div>
        </div>
      </div>
    </div>
  );
  if (step === 3) return (
    <div className={shell}>
      <div aria-hidden className="pointer-events-none absolute -right-6 bottom-0 size-24 rounded-full bg-blue-500/8 blur-2xl" />
      {chrome}
      <div className="rounded-xl border bg-card/80 p-3">
        <div className="flex items-center justify-between rounded-lg border bg-muted/15 px-3 py-2"><div className="flex items-center gap-2"><ReceiptText className="size-4 text-muted-foreground" /><span className="text-xs font-medium">Validasi staf / terminal</span></div><Badge variant="outline" className="text-[10px]">Internal</Badge></div>
        <div className="mt-3 space-y-2">
          {[{ t: "Periksa status pembayaran/pesanan", ok: true }, { t: "Konfirmasi oleh staf berwenang", ok: true }, { t: "Teruskan ke proses operasional", ok: false }].map((x) => (
            <div key={x.t} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs", x.ok ? "bg-emerald-500/[0.04]" : "border-dashed bg-background/60")}>
              <CheckCircle2 className={cn("size-3.5 shrink-0", x.ok ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground")} /><span className="text-muted-foreground">{x.t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <div className={shell}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[radial-gradient(70%_90%_at_50%_0%,rgba(16,185,129,0.12),transparent)]" />
      {chrome}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
        <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-background/70"><CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-300" /></span><div><div className="text-sm font-semibold">Pesanan diterima</div><div className="text-[11px] text-muted-foreground">Alur operasional sesuai modul aktif</div></div></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border bg-background/70 px-3 py-2"><div className="text-[10px] text-muted-foreground">Penyerahan</div><div className="font-medium">Sesuai layanan</div></div>
          <div className="rounded-lg border bg-background/70 px-3 py-2"><div className="text-[10px] text-muted-foreground">Catatan</div><div className="font-medium">Tersimpan</div></div>
        </div>
      </div>
    </div>
  );
}

function WorkflowShowcase() {
  const [active, setActive] = useState(0);
  const step = WORKFLOW_STEPS[active]!;
  const prev = () => setActive((a) => (a <= 0 ? WORKFLOW_STEPS.length - 1 : a - 1));
  const next = () => setActive((a) => (a >= WORKFLOW_STEPS.length - 1 ? 0 : a + 1));
  return (
    <div className="mt-10">
      <div className="rounded-2xl border bg-card/70 p-2 shadow-sm backdrop-blur-sm sm:p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div role="tablist" aria-label="Langkah alur kerja" className="hidden gap-1.5 sm:grid sm:grid-cols-3 lg:grid-cols-5 xl:flex-1">
            {WORKFLOW_STEPS.map((s, i) => {
              const selected = i === active;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActive(i)}
                  className={cn(
                    "group flex min-h-11 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    selected
                      ? "border-blue-500/20 bg-blue-500/[0.08] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      : "border-transparent bg-muted/20 text-muted-foreground hover:border-border/70 hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-semibold tabular-nums transition-colors", selected ? "border-blue-500/25 bg-blue-600 text-white dark:bg-blue-500" : "border-border/70 bg-background/80 text-muted-foreground group-hover:text-foreground")}>{s.step}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium leading-4">{s.title}</span>
                    <span className={cn("mt-0.5 hidden truncate text-[10px] leading-4 sm:block", selected ? "text-blue-700/80 dark:text-blue-300/80" : "text-muted-foreground")}>{s.eyebrow}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-muted/15 px-3 py-2 xl:w-[280px] xl:shrink-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-medium text-muted-foreground">Langkah {active + 1}/{WORKFLOW_STEPS.length}</span>
                <span className="truncate text-muted-foreground">{step.step}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-blue-600 transition-[width] duration-300 dark:bg-blue-500" style={{ width: `${((active + 1) / WORKFLOW_STEPS.length) * 100}%` }} />
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button type="button" variant="outline" size="icon" onClick={prev} className="size-9 rounded-lg" aria-label="Langkah sebelumnya"><ArrowLeft className="size-4" /></Button>
              <Button type="button" size="icon" onClick={next} className="size-9 rounded-lg" aria-label={active === WORKFLOW_STEPS.length - 1 ? "Selesai, ulangi alur" : "Langkah berikutnya"}><ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-5 min-h-[420px] sm:min-h-[380px] lg:min-h-[340px]">
        {WORKFLOW_STEPS.map((s, i) => {
          const offset = i - active;
          const isActive = offset === 0;
          const hidden = Math.abs(offset) > 2;
          return (
            <article key={s.key} aria-hidden={!isActive} className={cn("absolute inset-x-0 top-0 rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 ease-out motion-reduce:transition-none sm:p-6", hidden && "pointer-events-none opacity-0")} style={hidden ? undefined : { zIndex: 20 - Math.abs(offset), opacity: isActive ? 1 : offset < 0 ? 0.18 : 0.38, transform: `translateY(${offset * 10}px) scale(${1 - Math.abs(offset) * 0.025})`, pointerEvents: isActive ? "auto" : "none" }}>
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-blue-500/20 bg-blue-500/[0.06] px-2.5 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">Langkah {s.step}</span>
                    <span className="text-[11px] text-muted-foreground">{s.eyebrow}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{s.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{s.desc}</p>
                  <ul className="mt-5 space-y-2">
                    {s.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600/80 dark:text-blue-300/80" /><span>{p}</span></li>
                    ))}
                  </ul>
                </div>
                <WorkflowVisual step={i} />
              </div>
            </article>
          );
        })}
      </div>


    </div>
  );
}


const NAV = [
  { href: "#beranda", label: "Beranda", id: "beranda" },
  { href: "#menu", label: "Menu", id: "menu" },
  { href: "#tentang", label: "Tentang", id: "tentang" },
  { href: "#fitur", label: "Docs", id: "menu" },
];

function scrollToHash(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return;
  const el = document.querySelector(href);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  history.replaceState(null, "", href);
}

function BenefitsSlider() {
  const items = [
    { icon: Workflow, title: "Operasional terstruktur", desc: "Produk, transaksi, dan inventori dikelola dalam alur aplikasi yang konsisten." },
    { icon: Boxes, title: "Visibilitas inventori", desc: "Status stok dan riwayat pergerakan membantu pemantauan ketersediaan." },
    { icon: QrCode, title: "Alur QR terintegrasi", desc: "Mendukung alur QR ordering yang tersedia, dengan validasi sesuai implementasi saat ini." },
  ] as const;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 3500);
    return () => window.clearInterval(id);
  }, [paused, items.length]);

  return (
    <div className="mt-6" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title}><CardContent className="space-y-2 p-4"><item.icon className="size-4 text-muted-foreground" /><h3 className="font-medium">{item.title}</h3><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent></Card>
        ))}
      </div>
      <div className="lg:hidden">
        <div className="overflow-hidden rounded-2xl">
          <div className="flex transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
            {items.map((item) => (
              <div key={item.title} className="w-full shrink-0 px-0.5">
                <Card className="h-full"><CardContent className="space-y-2 p-4"><item.icon className="size-4 text-muted-foreground" /><h3 className="font-medium">{item.title}</h3><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent></Card>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-2" aria-label="Navigasi manfaat">
          {items.map((item, i) => (
            <button key={item.title} type="button" aria-label={`Tampilkan ${item.title}`} aria-current={i === index} onClick={() => setIndex(i)} className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-blue-600 dark:bg-blue-500" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40")} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LandingPage({ menuItems = [] }: { menuItems?: LandingMenuItem[] }) {
  const [active, setActive] = useState("beranda");

  useEffect(() => {
    const ids = ["beranda", "tentang", "menu", "alur", "manfaat", "teknologi"];

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0.01 },
    );
    ids.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const navLink = (item: (typeof NAV)[number]) => (
    <a
      key={item.label}
      href={item.href}
      onClick={(e) => scrollToHash(e, item.href)}
      className={cn(
        "rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        active === item.id && "bg-accent/70 text-foreground font-medium",
      )}
    >
      {item.label}
    </a>
  );

  return (
    <div className="min-h-svh bg-background text-foreground pb-[calc(env(safe-area-inset-bottom)+6.5rem)] lg:pb-0">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#beranda" onClick={(e) => scrollToHash(e, "#beranda")} className="group flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
            <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-500/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(16,185,129,0.10))] shadow-sm ring-1 ring-blue-500/10">
              <Image src="/Logo.png" alt="Niraya" width={20} height={20} className="rounded-sm" />
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">niraya</span>
              <span className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">pos</span>
            </span>
          </a>
          <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Navigasi utama">
            {NAV.map((n) => navLink(n))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <PublicNavigation variant="desktop" />
          </div>
        </div>
      </header>

      <main>
        <section id="beranda" className="scroll-mt-20 relative overflow-hidden border-b">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 right-0 top-0 z-0 flex justify-end opacity-[0.14] lg:hidden dark:opacity-[0.10]">
            <Image src="/hero.webp" alt="" width={425} height={353} priority className="h-auto w-[min(88vw,360px)] translate-x-[12%] -translate-y-[6%] select-none" sizes="360px" />
          </div>
          <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
            <div className="relative z-10 max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/[0.05] px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300"><span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />Niraya POS</div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                Satu sistem kasir untuk <span className="bg-[linear-gradient(90deg,var(--foreground),color-mix(in_oklab,#2563eb_55%,var(--foreground)))] bg-clip-text text-transparent">alur usaha yang lebih tertata.</span>
              </h1>
              <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                Untuk warung, kafe, dan toko yang ingin operasional harian lebih rapi, dari katalog produk sampai transaksi, dengan instalasi mandiri di lingkungan Anda sendiri.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <Button size="lg" asChild className="w-full sm:w-auto"><Link href="/register">Daftar <ArrowRight className="ml-1 size-4" /></Link></Button>
                <Button size="lg" variant="outline" asChild className="w-full bg-background/60 backdrop-blur-sm sm:w-auto sm:border-transparent sm:bg-transparent sm:shadow-none sm:backdrop-blur-none"><a href="#menu" onClick={(e)=>scrollToHash(e,"#menu")}>Lihat fitur</a></Button>
              </div>
            </div>

            <div className="relative hidden overflow-hidden lg:block">
              <Image
                src="/hero.webp"
                alt="Tampilan Niraya POS"
                width={425}
                height={353}
                priority
                className="h-auto w-full"
                sizes="45vw"
              />
            </div>
          </div>
        </section>

        <section id="tentang" className="scroll-mt-20 border-y bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Apa itu Niraya POS?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Niraya POS adalah perangkat lunak kasir untuk mengelola katalog produk, penjualan, inventori, dan alur operasional harian dalam satu aplikasi. Fitur yang ditampilkan di halaman ini dibatasi pada kemampuan yang terverifikasi.</p>
          </div>
        </section>

        <section id="menu" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <span id="fitur" className="block -mt-20 pt-20" aria-hidden />
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Fitur utama</p>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Jelajahi Fitur Niraya</h2>
              <p className="text-sm text-muted-foreground">Dirancang untuk ritme usaha harian: dari kasir, etalase produk, pesanan QR, pembayaran, sampai akses tim. Status mengikuti implementasi yang terverifikasi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="group relative h-full overflow-hidden rounded-[24px] border-border/70 bg-card/80 shadow-none transition-[transform,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:border-blue-600/20 hover:shadow-[0_16px_40px_-28px_rgba(37,99,235,0.45)] sm:col-span-2 lg:col-span-2">
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,rgba(37,99,235,0.12),transparent_55%),radial-gradient(80%_70%_at_100%_100%,rgba(16,185,129,0.08),transparent_55%)]" />
              <CardContent className="relative flex h-full flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-blue-600/15 bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/10 dark:text-blue-300"><FEATURED_FEATURE.icon className="size-5" /></span>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{FEATURED_FEATURE.tag}</span>
                        <Badge variant="secondary" className="text-[10px]">{FEATURED_FEATURE.status}</Badge>
                      </div>
                      <h3 className="text-lg font-semibold tracking-tight sm:text-xl">{FEATURED_FEATURE.name}</h3>
                      <p className="text-xs text-muted-foreground">Pusat alur kasir harian</p>
                    </div>
                  </div>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{FEATURED_FEATURE.desc}</p>
                <ul className="mt-auto grid gap-2 text-sm sm:grid-cols-3">
                  {FEATURED_FEATURE.points.map((p, i) => (
                    <li key={p} className="flex items-center gap-2 rounded-xl border border-dashed bg-background/70 px-3 py-2.5 text-muted-foreground">
                      <span className="flex size-5 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-semibold text-blue-700 dark:text-blue-300">{i + 1}</span>
                      <span className="min-w-0">{p}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {FEATURES.map((f) => (
              <Card key={f.name} className="group relative h-full overflow-hidden rounded-[24px] border-border/70 shadow-none transition-[transform,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_14px_34px_-28px_rgba(0,0,0,0.35)]">
                <div aria-hidden className={cn("pointer-events-none absolute inset-0 opacity-80", f.visual === "catalog" && "bg-[radial-gradient(90%_70%_at_100%_0%,rgba(16,185,129,0.10),transparent_55%)]", f.visual === "qr" && "bg-[radial-gradient(90%_70%_at_0%_0%,rgba(14,165,233,0.10),transparent_55%)]", f.visual === "payment" && "bg-[radial-gradient(90%_70%_at_100%_100%,rgba(139,92,246,0.10),transparent_55%)]", f.visual === "access" && "bg-[radial-gradient(90%_70%_at_0%_100%,rgba(244,63,94,0.08),transparent_55%)]")} />
                <CardContent className="relative flex h-full flex-col gap-3 p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{f.tag}</span>
                    <Badge variant={f.status === "Tersedia" ? "secondary" : "outline"} className="shrink-0 text-[10px]">{f.status}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/25 text-muted-foreground"><f.icon className="size-4" /></span>
                    <h3 className="min-w-0 font-medium leading-tight">{f.name}</h3>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{f.desc}</p>
                  <ul className="mt-auto space-y-1.5 border-t border-dashed pt-3 text-xs text-muted-foreground">
                    {f.points.map((p) => <li key={p} className="flex items-start gap-2"><span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" /><span>{p}</span></li>)}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">Rute internal terlindungi autentikasi/otorisasi. QR dan metode pembayaran mengikuti alur yang tersedia.</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild><Link href="/menu">Jelajahi Menu <ArrowRight className="ml-1 size-4" /></Link></Button>
            <Button variant="outline" asChild><Link href="/register">Daftar Akun</Link></Button>
          </div>
        </section>

        <section id="alur" className="scroll-mt-24 border-y bg-[linear-gradient(180deg,color-mix(in_oklab,var(--muted)_10%,transparent),transparent_70%)]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-4 rounded-full border border-blue-500/15 bg-blue-500/[0.06] px-3 py-1 text-[11px] font-medium text-blue-700 dark:text-blue-300">Cara kerja Niraya</Badge>
              <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl lg:text-[2rem] lg:leading-[1.15]">
                Dari pemesanan hingga <span className="text-muted-foreground">pesanan diterima.</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
                Alur pemesanan yang terorganisir: pelanggan memilih menu, pembayaran diverifikasi oleh staf, dan pesanan diteruskan ke proses operasional. Detail bergantung konfigurasi serta modul yang aktif.
              </p>
            </div>
            <WorkflowShowcase />
          </div>
        </section>

        <section id="manfaat" className="scroll-mt-20 border-y bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Manfaat praktis</h2>
            <BenefitsSlider />
          </div>
        </section>

        <section id="teknologi" className="scroll-mt-20 border-t mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Daftar menu</h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Contoh item dari katalog produk aktif. Daftar dapat kosong jika belum ada data produk.</p>
            </div>
          </div>
          {menuItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
              Belum ada menu tersedia.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="overflow-hidden rounded-2xl border-border/70 shadow-none">
                  <CardContent className="p-0">
                    <div className="relative aspect-[16/10] bg-muted/20">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- dynamic public menu image URLs may come from external hosts not in next/image config
                        <img src={item.imageUrl} alt={item.name} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground/60"><Package className="size-7" /></div>
                      )}
                    </div>
                    <div className="space-y-2 p-4">
                      {item.category ? <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.category}</p> : null}
                      <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{item.name}</h3>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{formatCurrency(Number(item.price || 0))}</span>
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="mulai" className="scroll-mt-20 border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <Card className="bg-card/60"><CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"><div className="space-y-1"><h2 className="text-lg font-semibold">Mulai gunakan Niraya</h2><p className="text-sm text-muted-foreground">Masuk atau daftar melalui alur autentikasi yang terkonfigurasi. Kredensial dan endpoint privat tidak ditampilkan di halaman publik.</p></div><div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" asChild><Link href="/login">Masuk</Link></Button><Button asChild><Link href="/register">Daftar <ArrowRight className="ml-1 size-4" /></Link></Button></div></CardContent></Card>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p><span className="inline-flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-md border border-blue-500/15 bg-blue-500/10 text-[10px] font-semibold text-blue-700 dark:text-blue-300">n</span><span className="font-medium tracking-[-0.02em] text-foreground">niraya pos</span></span></p>
          <div className="flex flex-wrap items-center gap-3">
            <a href="#beranda" onClick={(e)=>scrollToHash(e,"#beranda")} className="hover:text-foreground">Beranda</a>
            <Link href="/menu" className="hover:text-foreground">Menu</Link>
            <Link href="/login" className="hover:text-foreground">Masuk</Link>
          </div>
        </div>
      </footer>

      <PublicNavigation variant="mobile" />
    </div>
  );
}
