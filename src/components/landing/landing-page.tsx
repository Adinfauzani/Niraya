"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Workflow, Boxes, QrCode, Users, Shield, Settings, CreditCard, Smartphone, Menu, HelpCircle, Sparkles, Zap, BarChart, LayoutDashboard, Store, Truck, Package, Users as UsersIcon, Mail, Lock, Globe, Database, Wifi, Cpu, Heart, Star, Award, Target, TrendingUp, ShieldCheck, CheckCircle, ChevronRight, ChevronLeft, Moon, Sun, Monitor, Smartphone as SmartphoneIcon, Tablet, Zap as ZapIcon, ArrowUpRight, ExternalLink, MessageSquare, Mail as MailIcon, MapPin, Phone, Clock, Coffee, Utensils, Store as StoreIcon, Receipt, CreditCard as CreditCardIcon, QrCode as QrCodeIcon, Users as UsersIcon2, Shield as ShieldIcon, Settings as SettingsIcon, Boxes as BoxesIcon, Workflow as WorkflowIcon, HelpCircle as HelpCircleIcon, Cookie, GitBranch, Link as LinkIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/menu", label: "Menu" },
  { href: "/features", label: "Fitur" },
  { href: "/plans", label: "Plans" },
];

const FEATURES = [
  {
    name: "Kasir & Transaksi",
    tag: "POS",
    status: "Tersedia",
    desc: "Transaksi aman dengan validasi stok, harga, pajak server-side, idempotency key, dan advisory lock.",
    icon: CreditCardIcon,
    visual: "payment",
    points: ["Ringkas beli & bayar", "Multi-metode pembayaran", "Struk digital & cetak"],
  },
  {
    name: "Katalog Produk",
    tag: "Produk",
    status: "Tersedia",
    desc: "Kelola kategori, varian, harga, diskon, dan stok real-time dengan riwayat pergerakan.",
    icon: Package,
    visual: "catalog",
    points: ["Kategori & varian", "Harga & diskon fleksibel", "Stok & reservasi real-time"],
  },
  {
    name: "QR Ordering",
    tag: "QR",
    status: "Tersedia",
    desc: "Pelanggan scan QR meja, pesan via HP, bayar di meja. Terintegrasi kasir & dapur.",
    icon: QrCodeIcon,
    visual: "qr",
    points: ["Pesan dari meja", "Bayar di tempat", "Sinkron ke kasir & dapur"],
  },
  {
    name: "Manajemen Akses",
    tag: "Tim",
    status: "Tersedia",
    desc: "Role-based access: Owner, Admin, Manager, Cashier, User. Audit log setiap aksi.",
    icon: UsersIcon2,
    visual: "access",
    points: ["5 level role", "Audit trail lengkap", "Invite & manajemen tim"],
  },
  {
    name: "Inventori & Supplier",
    tag: "Stok",
    status: "Beta",
    desc: "Penerimaan PO, koreksi stok, transfer antar cabang, reorder point, laporan nilai stok.",
    icon: BoxesIcon,
    visual: "catalog",
    points: ["PO & penerimaan", "Koreksi & transfer", "Reorder otomatis"],
  },
  {
    name: "Laporan & Analitik",
    tag: "Data",
    status: "Beta",
    desc: "Penjualan harian/bulanan, produk terlaris, performa kasir, arus kas, export CSV/PDF.",
    icon: BarChart,
    visual: "payment",
    points: ["Dashboard real-time", "Export CSV/PDF", "Filter fleksibel"],
  },
];

const FOOTER_LINKS = {
  Produk: [
    { label: "Fitur", href: "/features" },
    { label: "Harga", href: "/plans" },
    { label: "Menu Demo", href: "/menu" },
    { label: "Changelog", href: "/changelog" },
  ],
  Perusahaan: [
    { label: "Tentang", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Karir", href: "/careers" },
    { label: "Kontak", href: "/contact" },
  ],
  Sumber: [
    { label: "Dokumentasi", href: "/docs" },
    { label: "API Reference", href: "/api-docs" },
    { label: "Komunitas", href: "/community" },
    { label: "Status", href: "/status" },
  ],
  Legal: [
    { label: "Privasi", href: "/privacy" },
    { label: "Syarat", href: "/terms" },
    { label: "Cookie", href: "/cookies" },
    { label: "Keamanan", href: "/security" },
  ],
};

const SOCIALS = [
  { icon: GitBranch, href: "https://github.com/Adinfauzani/Niraya", label: "GitHub" },
  { icon: MessageSquare, href: "https://twitter.com/nirayapos", label: "Twitter" },
  { icon: LinkIcon, href: "https://linkedin.com/company/niraya", label: "LinkedIn" },
  { icon: MailIcon, href: "mailto:hello@niraya.id", label: "Email" },
];

export function LandingPage() {
  const [cookieAccepted, setCookieAccepted] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-accepted");
    if (accepted) setCookieAccepted(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-accepted", "true");
    setCookieAccepted(true);
    toast.success("Preferensi cookie disimpan");
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-accepted", "false");
    setCookieAccepted(true);
    toast.info("Hanya cookie esensial yang digunakan");
  };

  return (
    <>
      <div className="min-h-svh bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="group flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
              <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-500/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(16,185,129,0.10))] shadow-sm ring-1 ring-blue-500/10">
                <Image src="/Logo.png" alt="Niraya" width={20} height={20} className="rounded-sm" />
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">niraya</span>
                <span className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">pos</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Navigasi utama">
              {NAV.map((n) => (
                <Link
                  key={n.label}
                  href={n.href}
                  className="rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Masuk</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Daftar</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main>
          <section id="beranda" className="relative overflow-hidden border-b">
            <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
              <div className="relative z-10 max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/15 bg-blue-500/[0.05] px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                  <span className="size-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                  Niraya POS
                </div>
                <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
                  Satu sistem kasir untuk{" "}
                  <span className="bg-[linear-gradient(90deg,var(--foreground),color-mix(in_oklab,#2563eb_55%,var(--foreground)))] bg-clip-text text-transparent">
                    alur usaha yang lebih tertata.
                  </span>
                </h1>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                  Untuk warung, kafe, dan toko yang ingin operasional harian lebih rapi, dari katalog produk sampai transaksi, dengan instalasi mandiri di lingkungan Anda sendiri.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                  <Button size="lg" asChild className="w-full sm:w-auto">
                    <Link href="/register">Daftar <ArrowRight className="ml-1 size-4" /></Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                    <Link href="/features">Lihat fitur</Link>
                  </Button>
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

          <section id="tentang" className="border-y bg-muted/20">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Apa itu Niraya POS?</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Niraya POS adalah perangkat lunak kasir untuk mengelola katalog produk, penjualan, inventori, dan alur operasional harian dalam satu aplikasi. Dibangun dengan Next.js 16, React 19, TypeScript, Tailwind CSS v4, Drizzle ORM, Supabase Postgres & Auth.
              </p>
            </div>
          </section>

          <section id="fitur" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Fitur utama</p>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Jelajahi Fitur Niraya</h2>
                <p className="text-sm text-muted-foreground">
                  Dirancang untuk ritme usaha harian: dari kasir, etalase produk, pesanan QR, pembayaran, sampai akses tim.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card
                  key={f.name}
                  className="group relative h-full overflow-hidden rounded-[24px] border-border/70 bg-card/80 shadow-none transition-[transform,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:border-blue-600/20 hover:shadow-[0_16px_40px_-28px_rgba(37,99,235,0.45)]"
                >
                  <CardContent className="relative flex h-full flex-col gap-4 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {f.tag}
                      </span>
                      <Badge variant={f.status === "Tersedia" ? "secondary" : "outline"} className="shrink-0 text-[10px]">
                        {f.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/25 text-muted-foreground">
                        <f.icon className="size-4" />
                      </span>
                      <h3 className="min-w-0 font-medium leading-tight">{f.name}</h3>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{f.desc}</p>
                    <ul className="mt-auto space-y-1.5 border-t border-dashed pt-3 text-xs text-muted-foreground">
                      {f.points.map((p) => (
                        <li key={p} className="flex items-start gap-2">
                          <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/features">Semua fitur <ArrowRight className="ml-1 size-4" /></Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/register">Daftar Akun</Link>
              </Button>
            </div>
          </section>

          <section id="teknologi" className="border-t mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Teknologi</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Dibangun dengan Stack Modern</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { name: "Next.js 16", icon: ZapIcon },
                { name: "React 19", icon: Cpu },
                { name: "TypeScript", icon: Database },
                { name: "Tailwind v4", icon: Monitor },
                { name: "Drizzle ORM", icon: Wifi },
                { name: "Supabase", icon: ShieldCheck },
              ].map((t) => (
                <div key={t.name} className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-background/70 p-4 text-center">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-muted/25 text-muted-foreground">
                    <t.icon className="size-5" />
                  </span>
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
              ))}
            </div>
          </section>

          <section id="cta" className="border-t bg-gradient-to-b from-blue-500/5 via-transparent to-transparent mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-2xl text-center space-y-4">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Siap memulai dengan Niraya POS?
              </h2>
              <p className="text-sm text-muted-foreground">
                Daftar gratis dan kelola usaha Anda dalam satu platform terintegrasi.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button size="lg" asChild className="w-full sm:w-auto">
                  <Link href="/register">Mulai Gratis <ArrowRight className="ml-1 size-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
                  <Link href="/plans">Lihat Paket</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <footer className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
              <div className="lg:col-span-2 space-y-4">
                <Link href="/" className="group flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
                  <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-blue-500/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.16),rgba(16,185,129,0.10))] shadow-sm ring-1 ring-blue-500/10">
                    <Image src="/Logo.png" alt="Niraya" width={20} height={20} className="rounded-sm" />
                  </span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">niraya</span>
                    <span className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">pos</span>
                  </span>
                </Link>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Sistem kasir modern untuk warung, kafe, dan toko. Dibangun dengan Next.js, Supabase, dan Drizzle ORM.
                </p>
                <div className="flex gap-4">
                  {SOCIALS.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={s.label}
                    >
                      <s.icon className="size-5" />
                    </a>
                  ))}
                </div>
              </div>

              <nav>
                <h3 className="font-medium">Produk</h3>
                <ul className="mt-4 space-y-2">
                  {FOOTER_LINKS.Produk.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav>
                <h3 className="font-medium">Perusahaan</h3>
                <ul className="mt-4 space-y-2">
                  {FOOTER_LINKS.Perusahaan.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav>
                <h3 className="font-medium">Sumber</h3>
                <ul className="mt-4 space-y-2">
                  {FOOTER_LINKS.Sumber.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <nav>
                <h3 className="font-medium">Legal</h3>
                <ul className="mt-4 space-y-2">
                  {FOOTER_LINKS.Legal.map((l) => (
                    <li key={l.label}>
                      <Link href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <div className="mt-10 flex flex-col items-center gap-2 border-t pt-6 sm:flex-row sm:justify-between">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Niraya POS. Hak cipta dilindungi.
              </p>
              <p className="text-xs text-muted-foreground">
                Dibangun dengan <span className="text-foreground">Next.js</span> + <span className="text-foreground">Supabase</span>
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Cookie Consent Banner */}
      {!cookieAccepted && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-4" role="dialog" aria-label="Cookie consent">
          <Card className="w-full shadow-lg border-border/50">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Cookie className="size-6 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Kami menggunakan cookie</p>
                  <p className="text-xs text-muted-foreground">
                    Cookie esensial untuk fungsi situs, analitik anonim, dan preferensi tema. Tidak ada pelacakan pribadi.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" size="sm" onClick={declineCookies} className="w-full sm:w-auto">
                  Tolak
                </Button>
                <Button size="sm" onClick={acceptCookies} className="w-full sm:w-auto">
                  Terima Semua
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div id="sonner-container" />
    </>
  );
}