"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Workflow, Boxes, QrCode, Users, Shield, Settings, CreditCard, Smartphone, HelpCircle, Sparkles, Zap, BarChart, LayoutDashboard, Store, Truck, Package, Users as UsersIcon, Mail, Lock, Globe, Database, Wifi, Cpu, Heart, Star, Award, Target, TrendingUp, ShieldCheck, CheckCircle, ChevronRight, ChevronLeft, Moon, Sun, Monitor, Smartphone as SmartphoneIcon, Tablet, Zap as ZapIcon, ArrowUpRight, ExternalLink, MessageSquare, Mail as MailIcon, MapPin, Phone, Clock, Coffee, Utensils, Store as StoreIcon, Receipt, CreditCard as CreditCardIcon, QrCode as QrCodeIcon, Users as UsersIcon2, Shield as ShieldIcon, Settings as SettingsIcon, Boxes as BoxesIcon, Workflow as WorkflowIcon, HelpCircle as HelpCircleIcon, Cookie, GitBranch, Link as LinkIcon, Settings2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/ScrollArea"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Switch } from "@/components/ui/switch"
import { BottomNav } from "@/components/ui/BottomNav"

const NAV = [
  { href: "/", label: "Beranda" },
  { href: "/features", label: "Fitur" },
  { href: "/plans", label: "Plans" },
];

const HOW_IT_WORKS = [
  {
    step: 1,
    title: "Daftar Akun",
    desc: "Buat akun gratis dan verifikasi email. Tidak perlu kartu kredit.",
    icon: UsersIcon2,
  },
  {
    step: 2,
    title: "Setup Katalog",
    desc: "Tambah kategori, produk, varian, harga, dan stok awal via dashboard.",
    icon: Package,
  },
  {
    step: 3,
    title: "Buka Kasir",
    desc: "Transaksi cepat dengan validasi stok & harga server-side, multi-bayar, struk digital.",
    icon: CreditCardIcon,
  },
  {
    step: 4,
    title: "Terima Pesanan QR",
    desc: "Pelanggan scan QR meja, pesan & bayar dari HP. Sinkron otomatis ke kasir & dapur.",
    icon: QrCodeIcon,
  },
  {
    step: 5,
    title: "Pantau & Skala",
    desc: "Laporan real-time, produk terlaris, performa tim, arus kas. Ekspor CSV/PDF.",
    icon: BarChart,
  },
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
    { label: "Kebijakan Privasi", href: "/privacy" },
    { label: "Syarat & Ketentuan", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
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
  const [showCookieSettings, setShowCookieSettings] = useState(false);
  const [cookiePrefs, setCookiePrefs] = useState({
    essential: true,
    analytics: false,
    preferences: false,
    marketing: false,
  });

  useEffect(() => {
    const accepted = localStorage.getItem("cookie-accepted");
    const prefs = localStorage.getItem("cookie-prefs");
    if (accepted) {
      setCookieAccepted(true);
      if (prefs) {
        try {
          setCookiePrefs(JSON.parse(prefs));
        } catch {
          // ignore parse errors
        }
      }
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie-accepted", "true");
    localStorage.setItem("cookie-prefs", JSON.stringify(cookiePrefs));
    setCookieAccepted(true);
    setShowCookieSettings(false);
    toast.success("Preferensi cookie disimpan");
  };

  const declineCookies = () => {
    localStorage.setItem("cookie-accepted", "true");
    const essentialOnly = { essential: true, analytics: false, preferences: false, marketing: false };
    localStorage.setItem("cookie-prefs", JSON.stringify(essentialOnly));
    setCookiePrefs(essentialOnly);
    setCookieAccepted(true);
    setShowCookieSettings(false);
    toast.info("Hanya cookie esensial yang digunakan");
  };

  const togglePref = (key: keyof typeof cookiePrefs) => {
    if (key === "essential") return; // Essential cannot be disabled
    setCookiePrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <>
      <div className="min-h-svh bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="group flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
              <Image src="/Logo.png" alt="Niraya" width={28} height={28} className="size-7" />
              <span className="flex items-baseline gap-1.5">
                <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">niraya</span>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">pos</span>
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

          <section id="cara-kerja" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Cara kerja</p>
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Mulai dalam 5 Langkah</h2>
                <p className="text-sm text-muted-foreground">
                  Dari pendaftaran hingga operasional penuh: tidak perlu setup server, tinggal daftar dan pakai.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {HOW_IT_WORKS.map((h) => (
                <Card
                  key={h.step}
                  className="group relative h-full overflow-hidden rounded-[24px] border-border/70 bg-card/80 shadow-none transition-[transform,border-color,box-shadow] duration-300 ease-out motion-reduce:transition-none hover:-translate-y-0.5 hover:border-blue-600/20 hover:shadow-[0_16px_40px_-28px_rgba(37,99,235,0.45)]"
                >
                  <CardContent className="relative flex h-full flex-col gap-4 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full border border-dashed px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Langkah {h.step}
                      </span>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        Gratis
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-muted/25 text-muted-foreground">
                        <h.icon className="size-4" />
                      </span>
                      <h3 className="min-w-0 font-medium leading-tight">{h.title}</h3>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{h.desc}</p>
                  </CardContent>
                </Card>
              ))}
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
            <div className="space-y-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <Link href="/" className="group flex min-w-0 items-center gap-2.5 font-semibold tracking-tight">
                  <Image src="/Logo.png" alt="Niraya" width={28} height={28} className="size-7" />
                  <span className="flex items-baseline gap-1.5">
                    <span className="text-[15px] font-semibold tracking-[-0.03em] text-foreground">niraya</span>
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-primary">pos</span>
                  </span>
                </Link>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="space-y-4 flex-1 min-w-[200px]">
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

                <nav className="flex-1 min-w-[140px]">
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

                <nav className="flex-1 min-w-[140px]">
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

                <nav className="flex-1 min-w-[140px]">
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
              </div>

              <div className="pt-8 border-t flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} Niraya. Hak cipta dilindungi.</p>
                <nav aria-label="Legal" className="flex flex-wrap items-center gap-4">
                  {FOOTER_LINKS.Legal.map((l) => (
                    <Link
                      key={l.label}
                      href={l.href}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Cookie Consent Pill Bar */}
      {!cookieAccepted && (
        <>
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-4xl animate-in slide-in-from-bottom-2" role="dialog" aria-label="Cookie consent">
            <div className="w-full bg-[#202022] border border-[#2e2e32] rounded-full p-2.5 sm:p-3 flex items-center justify-between shadow-2xl backdrop-blur-md gap-4">
              {/* Left: Cookie Icon & Description */}
              <div className="flex items-center gap-3.5 sm:gap-4 overflow-hidden pl-1">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-[#141416]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.598 11.064a1.006 1.006 0 0 0-.854-.172A3.994 3.994 0 0 1 15.6 5.753a1.002 1.002 0 0 0-.792-.958 9.99 9.99 0 0 0-2.808-.4 10 10 0 1 0 10 10c0-.82-.098-1.618-.28-2.383a1 1 0 0 0-.122-.948zM8.5 7.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-2 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5.5 3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2-6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 3a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
                  </svg>
                </div>
                <p className="text-[#d1d1d6] text-xs sm:text-sm font-normal leading-relaxed line-clamp-2 sm:line-clamp-none">
                  We use cookies to enhance your browsing experience, personalize content, and analyze our traffic.
                </p>
              </div>

              {/* Right: Settings, Reject & Accept */}
              <div className="flex items-center gap-2 sm:gap-3 shrink-0 pr-1">
                <button
                  type="button"
                  aria-label="Cookie Preferences"
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[#8e8e93] hover:text-white hover:bg-[#2c2c30] transition-colors"
                  onClick={() => setShowCookieSettings(true)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                  </svg>
                </button>

                <button
                  type="button"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium text-[#c7c7cc] bg-[#2a2a2e]/60 hover:bg-[#323238] border border-transparent hover:border-[#3e3e44] transition-all"
                  onClick={declineCookies}
                >
                  Reject
                </button>

                <button
                  type="button"
                  className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                  onClick={acceptCookies}
                >
                  Accept
                </button>
              </div>
            </div>
          </div>

          {showCookieSettings && (
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-4xl animate-in slide-in-from-bottom-2">
              {/* Settings Panel - expands below */}
              <Card className="w-full shadow-2xl border border-[#2e2e32] bg-[#202022] rounded-2xl overflow-hidden">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white">Cookie Preferences</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCookieSettings(false)}
                      className="text-[#8e8e93] hover:text-white"
                      aria-label="Close"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-[#2a2a2e]/60">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-white">Essential</p>
                        <p className="text-xs text-[#8e8e93]">Required for basic site functionality (authentication, security, preferences)</p>
                      </div>
                      <Switch checked={true} disabled className="data-[size=default]:h-[16px] data-[size=default]:w-[28px]" />
                    </div>

                    <label className="flex items-center justify-between px-2 py-2 rounded-xl bg-[#2a2a2e]/60 cursor-pointer">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-white">Analytics</p>
                        <p className="text-xs text-[#8e8e93]">Collect anonymous data to understand site usage</p>
                      </div>
                      <Switch checked={cookiePrefs.analytics} onCheckedChange={() => togglePref("analytics")} className="data-[size=default]:h-[16px] data-[size=default]:w-[28px]" aria-label="Analytics" />
                    </label>

                    <label className="flex items-center justify-between px-2 py-2 rounded-xl bg-[#2a2a2e]/60 cursor-pointer">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-white">Preferences</p>
                        <p className="text-xs text-[#8e8e93]">Remember theme, language, and user settings</p>
                      </div>
                      <Switch checked={cookiePrefs.preferences} onCheckedChange={() => togglePref("preferences")} className="data-[size=default]:h-[16px] data-[size=default]:w-[28px]" aria-label="Preferences" />
                    </label>

                    <label className="flex items-center justify-between px-2 py-2 rounded-xl bg-[#2a2a2e]/60 cursor-pointer">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-white">Marketing</p>
                        <p className="text-xs text-[#8e8e93]">Show relevant content and ads based on interests</p>
                      </div>
                      <Switch checked={cookiePrefs.marketing} onCheckedChange={() => togglePref("marketing")} className="data-[size=default]:h-[16px] data-[size=default]:w-[28px]" aria-label="Marketing" />
                    </label>
                  </div>

                  <div className="flex items-center gap-2 border-t border-[#2e2e32] pt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCookieSettings(false)}
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button size="sm" onClick={acceptCookies} className="flex-1 bg-[#f95721] hover:bg-[#ff6938]">
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <div id="sonner-container" />
      <BottomNav />
    </>
  );
}