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
        theme={{ enabled: false }}
        search={{ options: { api: "/api/search" } }}
      >
        <DocsLayout
          tree={source.getPageTree()}
          themeSwitch={{ enabled: false }}
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
          }}
          slots={{ header: DocsHeaderBar }}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </div>
  )
}