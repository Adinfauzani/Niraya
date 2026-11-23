import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BottomNav } from "@/components/ui/BottomNav";

const fredoka = localFont({
  variable: "--font-fredoka",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  src: [
    { path: "../fonts/47fe3839ae8538a9-s.1qipnwisndnl7.woff2", weight: "700", style: "normal" },
    { path: "../fonts/78503821dea84724-s.1u3lwjrw57qjh.woff2", weight: "700", style: "normal" },
    { path: "../fonts/e35ac209a319490a-s.p.3ryvcbcsz78_7.woff2", weight: "700", style: "normal" },
  ],
});

const plusJakartaSans = localFont({
  variable: "--font-sans",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  src: [
    { path: "../fonts/12d4e8c1f08b4a66-s.0e__wj8580tc5.woff2", weight: "200 800", style: "normal" },
    { path: "../fonts/cabb10e1d7cbc7c1-s.10u7vx61f1ie7.woff2", weight: "200 800", style: "normal" },
    { path: "../fonts/9f5a2b9f13a4ecbb-s.35a5cae5tspm2.woff2", weight: "200 800", style: "normal" },
    { path: "../fonts/d8aeca813a9ab546-s.p.18rizl4rsrl42.woff2", weight: "200 800", style: "normal" },
  ],
});

const outfit = localFont({
  variable: "--font-outfit",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  src: [
    { path: "../fonts/8bcddb47c8219945-s.1spbknb88wd48.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/c0680f1bdb3a2e90-s.p.1gsd1jahc5dg_.woff2", weight: "100 900", style: "normal" },
  ],
});

const jetBrainsMono = localFont({
  variable: "--font-mono",
  display: "swap",
  preload: true,
  fallback: ["Arial"],
  adjustFontFallback: "Arial",
  src: [
    { path: "../fonts/258bd0ab5fdd762a-s.2f7nqdagzwx2-.woff2", weight: "100 800", style: "normal" },
    { path: "../fonts/99a2019bdfa8519b-s.176arc174-8zp.woff2", weight: "100 800", style: "normal" },
    { path: "../fonts/44e0cb21b0d052b7-s.0bp8oijd_gu96.woff2", weight: "100 800", style: "normal" },
    { path: "../fonts/f9cd5a77d065db98-s.1fby2rem9ngyr.woff2", weight: "100 800", style: "normal" },
    { path: "../fonts/954d21e04331b2ae-s.0vfdmo25voy_0.woff2", weight: "100 800", style: "normal" },
    { path: "../fonts/53897e768d329f66-s.p.3t6q91iet4nsy.woff2", weight: "100 800", style: "normal" },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Niraya",
  description: "Niraya - Sistem kasir untuk warung, kafe, dan toko. Kelola katalog, transaksi, stok, dan operasional harian.",
  openGraph: {
    title: "Niraya POS",
    description: "Sistem kasir untuk warung, kafe, dan toko. Kelola katalog, transaksi, stok, dan operasional harian.",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "Niraya POS" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Niraya POS",
    description: "Sistem kasir untuk warung, kafe, dan toko. Kelola katalog, transaksi, stok, dan operasional harian.",
    images: ["/og.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon/favicon.ico",
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html:
                             "(function(){try{var t=localStorage.getItem('niraya-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();",
          }}
        />
        <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="icon" href="/favicon/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/favicon/site.webmanifest" />
      </head>
      <body
        className={`${fredoka.variable} ${outfit.variable} ${plusJakartaSans.variable} ${jetBrainsMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
          <BottomNav />
          <Toaster richColors closeButton position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
