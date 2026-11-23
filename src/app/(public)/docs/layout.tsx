import type { Metadata } from "next"
import Image from "next/image"

import { DocsLayout } from "fumadocs-ui/layouts/docs"
import { RootProvider } from "fumadocs-ui/provider/next"

import { DocsHeaderBar } from "@/components/docs/DocsHeaderBar"
import { source } from "@/lib/docs-source"

export const metadata: Metadata = {
  title: "Dokumentasi — Niraya POS",
  description:
    "Panduan dan referensi Niraya POS: kasir dan transaksi, produk dan katalog, inventori, QR ordering, serta API.",
}

export default function DocsRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="font-outfit min-h-svh bg-background">
      <RootProvider
        theme={{ enabled: true, defaultTheme: "light" }}
        search={{ options: { api: "/api/search" } }}
      >
        <DocsLayout
          tree={source.getPageTree()}
          themeSwitch={{ enabled: true }}
          sidebar={{ collapsible: false }}
          nav={{
            title: (
              <Image
                src="/Niraya.webp"
                alt="Niraya POS"
                width={92}
                height={32}
                priority
                className="h-6 w-auto"
              />
            ),
            url: "/",
            transparentMode: "top",
          }}
          links={[
            { text: "Beranda", url: "/" },
            { text: "Harga", url: "/plans" },
          ]}
          slots={{ header: DocsHeaderBar }}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </div>
  )
}
