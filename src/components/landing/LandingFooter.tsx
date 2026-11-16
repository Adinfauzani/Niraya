import Image from "next/image"
import Link from "next/link"

import { FOOTER_GROUPS, SOCIALS } from "./content"

const YEAR = new Date().getFullYear()

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-4 lg:size-5",
} as const

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  Instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  Facebook: (
    <path d="M15.5 21v-6.2h2.1l.3-2.6h-2.4V10.5c0-.8.2-1.3 1.4-1.3h1.2V6.9c-.2 0-1-.1-1.9-.1-1.9 0-3.2 1.2-3.2 3.4v2H11v2.6h3V21" />
  ),
  YouTube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.5 9.8l4.5 2.2-4.5 2.2z" fill="currentColor" stroke="none" />
    </>
  ),
  TikTok: (
    <path d="M14 4v10.2a3.6 3.6 0 1 1-3.1-3.6M14 4c.4 2 1.8 3.3 3.8 3.5" />
  ),
  Email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M4 7.5l8 5.5 8-5.5" />
    </>
  ),
}

export function LandingFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-[1200px] px-5 pb-10">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Link
            href="/"
            aria-label="Niraya POS"
            className="inline-flex shrink-0"
          >
            <Image
              src="/Niraya.webp"
              alt="Niraya POS"
              width={92}
              height={32}
              className="h-6 w-auto lg:h-8"
            />
          </Link>
          <p className="mt-3 max-w-[280px] text-sm leading-6 text-muted-foreground">
            Sistem kasir dan manajemen untuk warung, kafe, dan toko. Catat
            transaksi, atur stok, dan baca performa usaha dalam satu aplikasi.
          </p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {SOCIALS.map((social) => (
              <li key={social.label}>
                <a
                  href={social.url}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-500/15 transition-colors hover:bg-blue-600 hover:text-white sm:size-10 dark:bg-blue-500/10"
                >
                  <svg {...iconProps}>{SOCIAL_ICONS[social.label]}</svg>
                </a>
              </li>
            ))}
          </ul>
        </div>

        {FOOTER_GROUPS.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.links.map((link) => (
                <li key={link.url}>
                  <Link
                    href={link.url}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>&copy; {YEAR} Niraya. Semua hak dilindungi.</span>
        <span>Dibuat untuk UMKM Indonesia.</span>
      </div>
    </footer>
  )
}