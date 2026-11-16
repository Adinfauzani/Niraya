# Changelog

Semua perubahan penting pada Niraya POS dicatat di berkas ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/)
dan proyek ini memakai [Semantic Versioning](https://semver.org/lang/id/).

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