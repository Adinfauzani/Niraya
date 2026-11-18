# Changelog

Semua perubahan penting pada Niraya POS dicatat di berkas ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/)
dan proyek ini memakai [Semantic Versioning](https://semver.org/lang/id/).

## [0.1.2] - 2026-11-18

### Ditambahkan

- Tab **Toko & Menu** di Pengaturan untuk mengganti nama toko (outlet) dengan pratinjau slug dan tautan menu publik (`/{slug}/menu`).
- Pengaturan **Pembayaran → Transfer manual**: unggah gambar **QRIS statis** (JPEG/PNG/WebP, maks 1 MB) dengan pratinjau/hapus; gambar ditampilkan pada halaman pembayaran pesanan storefront (`/menu/order/[id]/payment`).
- Halaman checkout storefront menampilkan metode dan instruksi transfer (termasuk pratinjau QRIS bila ada) sebelum pesanan dibuat, lalu mengarahkan ke halaman pembayaran.
- Migrasi aditif `drizzle/0009_manual_transfer_qris_image.sql` (kolom `ManualTransferQrisImageUrl` pada `settings.PaymentSettings` dan `settings.BusinessSettings`).
- Skeleton loading pada halaman Pengaturan saat data dimuat.

### Diubah

- **Transfer manual** storefront aktif secara default hingga dinonaktifkan secara eksplisit di Pengaturan → Pembayaran.
- Direktori toko `/search`: menampilkan logo toko dan thumbnail produk populer (lazy load + fallback); produk populer diprioritaskan berdasarkan jumlah pesanan (POS & storefront), sisanya diisi acak.
- Form produk: langkah (`step`) input harga jual/modal diubah menjadi 1.
- Tab Pengaturan dirapikan (gaya pill); kontrol mode maintenance/pesan maintenance dan dokumentasi API dihapus dari tab Sistem.
- Simpan profil bisnis kini menyinkronkan nama bisnis di data bisnis.

### Diperbaiki

- Penegakan batas maksimum produk (entitlement) dipindah ke dalam transaksi database dengan kunci advisory untuk mencegah pembuatan produk melebihi batas saat permintaan bersamaan.
- Tombol/CTA checkout storefront dapat diklik dan menavigasi ke `/menu/checkout` hingga pembuatan pesanan/halaman pembayaran (`/menu/order/[id]/payment`); navigasi bawah publik tidak lagi menutupi bar keranjang/menu toko.
- Pengaturan Pembayaran: sakelar metode dan transfer manual merespons klik serta tersimpan dengan benar, input teks tidak lagi bernilai `null`/berubah uncontrolled, dan form tidak terkunci hanya karena peran pengguna belum termuat.
- Simpan/muat pengaturan pembayaran lebih tangguh saat kolom QRIS belum ada di skema database (fallback tanpa kolom), termasuk format `UpdatedAt` pada jalur fallback raw SQL.
- Build produksi: font (Fredoka, Outfit, Plus Jakarta Sans, JetBrains Mono) di-self-host lokal (`next/font/local`) sehingga build tidak bergantung pada `fonts.googleapis.com`.
- Resolusi slug menu toko (`/[storeSlug]/menu`) disederhanakan agar lebih toleran terhadap perbedaan skema.

## [0.1.1] - 2026-11-16

### Ditambahkan

- Landing page baru: hero dengan `hero.webp`, `PreviewCard` diganti visual gambar,
  dan H1 memakai font Fredoka Bold.
- Navbar mengambang (floating pill) yang otomatis menyembunyikan diri saat halaman
  di-scroll ke bawah dan muncul kembali saat scroll ke atas.
- Kartu fitur interaktif dengan ikon biru, efek hover, dan card lebar untuk
  `Kasir & Transaksi` serta `Manajemen Akses`.
- Footer baru dengan deskripsi, kolom `Produk` / `Perusahaan` / `Akun`,
  ikon sosial media, dan baris copyright.
- Dokumentasi pindah ke Fumadocs di `/docs` lengkap dengan pencarian
  (`/api/search`) dan navigasi `Fitur` / `Harga` / `Buka aplikasi` di header.
- Bottom navigation mobile memakai `@animate-ui/react`
  (`BottomNavigation`, `Highlight`, `Item`, `Label`) dengan `scrollBehavior="minimize"`.
- `PWAInstallPrompt` untuk memasang aplikasi dari browser.
- `src/app/sitemap.ts` dan `src/app/robots.ts`.

### Diubah

- Ikon sosial media dibuat sebagai inline SVG karena `lucide-react` v1 menghapus
  ikon merek (Facebook, Instagram, YouTube).
- `.font-outfit` kini menimpa `--font-display`, dan utility `.font-fredoka`
  ditambahkan agar H1 bisa memakai Fredoka tanpa mengubah tipografi docs.
- Bottom nav tidak dirender di desktop (`matchMedia`) untuk mencegah error
  `commitStyles` dari animasi `layoutId`.

### Diperbaiki

- Tema: `LIGHT_ONLY_PATHS` untuk `/` dan `/docs`, plus skrip anti-flash di `<head>`.
- `.gitignore` memakai `/docs/` sehingga `src/app/docs/` dan `src/components/docs/`
  tidak lagi terabaikan.