import {
  BarChart,
  Boxes,
  CreditCard,
  Package,
  QrCode,
  Users,
} from "lucide-react"

export const NAV_LINKS = [
  { title: "Fitur", url: "/#fitur" },
  { title: "Harga", url: "/plans" },
  { title: "Docs", url: "/docs" },
]

export const ROTATING_WORDS = ["penjualan", "stok", "tim", "cabang"]

export const HERO_POINTS = [
  "Tanpa kartu kredit",
  "Gratis 14 hari",
  "Data tersimpan aman",
]

export const PAYMENT_LOGOS = [
  "QRIS",
  "GoPay",
  "OVO",
  "DANA",
  "ShopeePay",
  "BCA",
]

export const FOOTER_LINKS = [
  { title: "Fitur", url: "/#fitur" },
  { title: "Harga", url: "/plans" },
  { title: "Docs", url: "/docs" },
  { title: "Masuk", url: "/login" },
  { title: "Daftar", url: "/register" },
]

export const SOCIALS = [
  { label: "Instagram", url: "https://instagram.com" },
  { label: "Facebook", url: "https://facebook.com" },
  { label: "YouTube", url: "https://youtube.com" },
  { label: "TikTok", url: "https://tiktok.com" },
  { label: "Email", url: "mailto:halo@niraya.id" },
]

export const FOOTER_GROUPS = [
  {
    title: "Produk",
    links: [
      { title: "Fitur", url: "/#fitur" },
      { title: "Harga", url: "/plans" },
      { title: "Menu demo", url: "/menu" },
    ],
  },
  {
    title: "Perusahaan",
    links: [
      { title: "Beranda", url: "/" },
      { title: "Dokumentasi", url: "/docs" },
    ],
  },
  {
    title: "Akun",
    links: [
      { title: "Masuk", url: "/login" },
      { title: "Daftar", url: "/register" },
    ],
  },
]

export const FEATURES = [
  {
    name: "Kasir & Transaksi",
    tag: "POS",
    desc: "Transaksi aman dengan validasi stok, harga, dan pajak di sisi server. Struk digital siap cetak.",
    icon: CreditCard,
    points: ["Ringkas beli & bayar", "Multi-metode pembayaran", "Struk digital & cetak"],
  },
  {
    name: "Katalog Produk",
    tag: "Produk",
    desc: "Kelola kategori, varian, harga, diskon, dan stok real-time dengan riwayat pergerakan.",
    icon: Package,
    points: ["Kategori & varian", "Harga & diskon fleksibel", "Stok real-time"],
  },
  {
    name: "QR Ordering",
    tag: "QR",
    desc: "Pelanggan scan QR meja, pesan dari HP, lalu bayar di meja. Terintegrasi kasir dan dapur.",
    icon: QrCode,
    points: ["Pesan dari meja", "Bayar di tempat", "Sinkron ke kasir"],
  },
  {
    name: "QRIS & E-Wallet",
    tag: "Bayar",
    desc: "Tampilkan QRIS, pelanggan membayar dari GoPay, OVO, DANA, atau m-banking. Kasir mencatat pembayaran.",
    icon: QrCode,
    points: ["Semua e-wallet", "Pencatatan manual", "Tanpa biaya integrasi"],
  },
  {
    name: "Inventori & Supplier",
    tag: "Stok",
    desc: "Penerimaan PO, koreksi stok, transfer antar cabang, reorder point, dan laporan nilai stok.",
    icon: Boxes,
    points: ["PO & penerimaan", "Koreksi & transfer", "Reorder otomatis"],
  },
  {
    name: "Laporan & Analitik",
    tag: "Data",
    desc: "Penjualan harian dan bulanan, produk terlaris, performa kasir, arus kas, ekspor CSV.",
    icon: BarChart,
    points: ["Dashboard real-time", "Ekspor CSV", "Filter fleksibel"],
  },
  {
    name: "Manajemen Akses",
    tag: "Tim",
    desc: "Role-based access: Owner, Admin, Manager, Cashier, User. Audit log untuk setiap aksi.",
    icon: Users,
    points: ["5 level role", "Audit trail lengkap", "Manajemen tim"],
  },
]