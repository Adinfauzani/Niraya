import type { Metadata } from "next";
import { Fredoka, Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BottomNav } from "@/components/ui/BottomNav";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: "700",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "Niraya POS",
  description: "Niraya POS - Sistem kasir untuk warung, kafe, dan toko. Kelola katalog, transaksi, stok, dan operasional harian.",
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
              "(function(){try{var t=localStorage.getItem('niraya-theme');var p=window.location.pathname;var l=p==='/'||/^\\/(docs|plans|login|register|signup)(\\/|$)/.test(p);var d=!l&&(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches));var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();",
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
