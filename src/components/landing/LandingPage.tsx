"use client"

import { motion } from "motion/react"
import { Check } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CookieConsent } from "./CookieConsent"
import { FEATURES } from "./content"
import { LandingFooter } from "./LandingFooter"
import { LandingHeader } from "./LandingHeader"
import { LandingHero } from "./LandingHero"

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Niraya POS",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Platform SaaS multifungsi untuk UMKM Indonesia: kelola kasir, transaksi, inventori, dan operasional warung, kafe, serta toko secara digital, terintegrasi, dan efisien.",
  featureList: [
    "Kasir dan transaksi",
    "Katalog produk",
    "Manajemen inventori",
    "Laporan penjualan",
    "Multi-cabang",
  ],
}

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1]

function Features() {
  return (
    <section id="fitur" className="mx-auto mt-24 w-full max-w-[1200px] px-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h2 className="max-w-[520px] text-2xl font-medium tracking-tight md:text-3xl">
          Semua kebutuhan usaha Anda
        </h2>
        <p className="max-w-[360px] text-sm text-muted-foreground md:text-right">
          Dirancang mengikuti alur kerja warung, kafe, dan toko. Buka aplikasi,
          langsung transaksi.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => {
          const featured =
            index === 0 || feature.name === "Manajemen Akses"

          return (
            <motion.article
              key={feature.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, ease: EASE, delay: index * 0.05 }}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/15 hover:shadow-lg hover:shadow-foreground/5",
                featured ? "bg-accent/40 sm:col-span-2" : "bg-card",
              )}
            >
              {featured ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -end-16 -top-20 size-52 rounded-full bg-blue-500/10 blur-2xl"
                />
              ) : null}

              <div
                className={cn(
                  "relative",
                  featured && "sm:flex sm:items-start sm:gap-6",
                )}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/15 transition-transform duration-300 group-hover:scale-105 dark:bg-blue-400/10 dark:text-blue-400">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <div className={cn(featured && "sm:min-w-0")}>
                  <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0">
                    <h3 className="text-base font-medium">{feature.name}</h3>
                    <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground ring-1 ring-border">
                      {feature.tag}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              </div>

              <ul
                className={cn(
                  "relative mt-6 gap-3 border-t border-border/60 pt-5 text-sm text-muted-foreground",
                  featured ? "grid sm:grid-cols-3" : "grid",
                )}
              >
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="mt-24 border-y bg-accent/30">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-5 py-16 text-center">
        <h2 className="text-2xl font-medium tracking-tight md:text-3xl">
          Siap memulai dengan Niraya?
        </h2>
        <p className="mt-3 max-w-[620px] text-balance text-muted-foreground">
          Daftar gratis dan kelola usaha Anda dalam satu platform terintegrasi.
        </p>
        <div className="mt-6 flex w-full max-w-[30rem] flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Button asChild className="h-10 rounded-lg px-5 text-sm font-medium">
            <Link href="/register">Mulai gratis</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            className="h-10 rounded-lg px-5 text-sm font-medium"
          >
            <Link href="/plans">Lihat paket</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

export function LandingPage() {
  return (
    <div className="font-outfit min-h-svh bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      <LandingHeader />

      <main className="flex flex-1 flex-col">
        <LandingHero />
        <Features />
        <CallToAction />
      </main>

      <LandingFooter />
      <CookieConsent />
    </div>
  )
}