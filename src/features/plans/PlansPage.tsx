import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Layers3,
  LockKeyhole,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react"

import { PublicNavigation } from "@/components/public/PublicNavigation"
import { ThemeToggle } from "@/components/shared/ThemeToggle"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { FeatureComparison } from "@/features/plans/FeatureComparison"
import { PlansFAQ } from "@/features/plans/PlansFAQ"
import { PricingCard } from "@/features/plans/PricingCard"
import { PLAN_DEFINITIONS } from "@/lib/plans"

const COPYRIGHT_YEAR = 2026

const BILLING_CARDS = [
  {
    icon: ShieldCheck,
    title: "Processed by Gumroad",
    body: "Payments are intended to be handled by Gumroad once checkout opens.",
  },
  {
    icon: ReceiptText,
    title: "Exact billing intervals",
    body: "Monthly, every 6 months, or yearly. Plus and Pro are never billed monthly.",
  },
  {
    icon: LockKeyhole,
    title: "No card data here",
    body: "Niraya does not collect or store card details on this page.",
  },
] as const

export function PlansPage() {
  return (
    <div className="plans-theme min-h-svh bg-[var(--plans-cream)] pb-24 text-[var(--plans-ink)] lg:pb-0">
      <header className="sticky top-0 z-40 border-b border-[var(--plans-line)] bg-[var(--plans-cream)]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--plans-cream)]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--plans-green)]/40"
          >
            <Logo size="sm" />
          </Link>

          <nav
            aria-label="Plans navigation"
            className="hidden items-center gap-1 md:flex"
          >
            <Link
              href="/plans"
              aria-current="page"
              className="rounded-lg bg-[var(--plans-green-soft)] px-3 py-2 text-sm font-medium text-[var(--plans-ink)]"
            >
              Plans
            </Link>
            <Link
              href="/menu"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--plans-muted)] transition-colors hover:bg-[var(--plans-green-soft)]/60 hover:text-[var(--plans-ink)]"
            >
              Menu
            </Link>
            <Link
              href="/#fitur"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--plans-muted)] transition-colors hover:bg-[var(--plans-green-soft)]/60 hover:text-[var(--plans-ink)]"
            >
              Features
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <PublicNavigation variant="desktop" />
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-[var(--plans-line)]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[62rem] -translate-x-1/2 rounded-full bg-[var(--plans-gold)]/20 blur-[110px]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-45"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, var(--plans-green) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage:
                "linear-gradient(to bottom, black, transparent 72%)",
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--plans-line)] bg-[var(--plans-paper)]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--plans-green)]">
                <Sparkles aria-hidden className="size-3.5" />
                Membership plans
              </span>

              <h1 className="mt-6 text-balance text-4xl font-semibold tracking-[-0.055em] text-[var(--plans-ink)] sm:text-5xl lg:text-6xl">
                One system.{" "}
                <span className="text-[var(--plans-green)]">
                  Three ways to grow.
                </span>
              </h1>

              <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-[var(--plans-muted)] sm:text-lg">
                Run your store with point of sale, inventory, customers, staff,
                reports, and a public storefront. Choose the limits that match
                where your business is today.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  asChild
                  className="h-10 rounded-xl bg-[var(--plans-button)] px-5 text-sm font-semibold text-[var(--plans-button-ink)] hover:bg-[var(--plans-button)]/90"
                >
                  <a href="#pricing">
                    Compare plans
                    <ArrowRight aria-hidden className="size-4" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-xl border-[var(--plans-line)] bg-[var(--plans-paper)]/70 px-5 text-sm font-semibold text-[var(--plans-ink)] hover:bg-[var(--plans-green-soft)]/60"
                >
                  <Link href="/register">Create an account</Link>
                </Button>
              </div>

              <p className="mt-4 text-xs leading-5 text-[var(--plans-muted)]">
                Checkout is being finalized. All memberships are shown for
                preview.
              </p>
            </div>

            <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-[var(--plans-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Store aria-hidden className="size-3.5" />
                POS &amp; storefront
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Package aria-hidden className="size-3.5" />
                Inventory
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers3 aria-hidden className="size-3.5" />
                Multi-store
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 aria-hidden className="size-3.5" />
                API on Pro
              </span>
            </div>
          </div>
        </section>

        <section
          id="pricing"
          className="scroll-mt-24 py-14 sm:py-18 lg:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plans-green)]">
                  Pricing
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[var(--plans-ink)] sm:text-4xl">
                  Pick the pace that fits.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-[var(--plans-muted)]">
                Every membership includes the core Niraya workspace. Billing is
                handled by Gumroad when checkout opens.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3 lg:items-stretch">
              {PLAN_DEFINITIONS.map((plan) => (
                <PricingCard key={plan.id} plan={plan} />
              ))}
            </div>

            <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-5 text-[var(--plans-muted)]">
              Prices are in Indonesian Rupiah. The monthly equivalent is shown
              for comparison only; Plus and Pro are not billed monthly.
            </p>
          </div>
        </section>

        <FeatureComparison />

        <section
          id="billing"
          className="scroll-mt-24 border-b border-[var(--plans-line)] bg-[var(--plans-cream)] py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plans-green)]">
                  Billing
                </p>
                <h2 className="mt-3 max-w-md text-3xl font-semibold tracking-[-0.035em] text-[var(--plans-ink)] sm:text-4xl">
                  Simple billing, exact intervals.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-[var(--plans-muted)]">
                  Memberships are intended to be billed through Gumroad. The
                  page is ready for that handoff, but checkout is not active
                  yet.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {BILLING_CARDS.map((card) => {
                  const Icon = card.icon
                  return (
                    <div
                      key={card.title}
                      className="rounded-2xl border border-[var(--plans-line)] bg-[var(--plans-paper)] p-5"
                    >
                      <Icon
                        aria-hidden
                        className="size-5 text-[var(--plans-green)]"
                      />
                      <h3 className="mt-4 text-sm font-semibold text-[var(--plans-ink)]">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-xs leading-5 text-[var(--plans-muted)]">
                        {card.body}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2 rounded-2xl border border-[var(--plans-line)] bg-[var(--plans-paper)]/70 p-5 text-sm leading-6 text-[var(--plans-muted)] sm:flex-row sm:items-center sm:justify-between">
              <p>
                <span className="font-medium text-[var(--plans-ink)]">
                  Checkout status:
                </span>{" "}
                The three Gumroad memberships are currently in preview. Buttons
                will activate after the products are published and billing is
                configured.
              </p>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--plans-gold)] px-3 py-1 text-[11px] font-semibold text-[var(--plans-green-deep)]">
                <LockKeyhole aria-hidden className="size-3" />
                Coming soon
              </span>
            </div>
          </div>
        </section>

        <PlansFAQ />

        <section className="pb-16 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[32px] bg-[var(--plans-green-deep)] px-6 py-10 text-[var(--plans-on-green)] sm:px-10 sm:py-14">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[var(--plans-gold)]/15 blur-3xl"
              />
              <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plans-gold)]">
                    Start with the essentials
                  </p>
                  <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                    Bring your store into one calm system.
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--plans-on-green-muted)]">
                    Create an account now, then choose a membership when
                    checkout opens. Your plan limits are designed to grow with
                    the way you operate.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <Button
                    asChild
                    className="h-10 rounded-xl bg-[var(--plans-gold)] px-5 text-sm font-semibold text-[var(--plans-green-deep)] hover:bg-[var(--plans-gold)]/90"
                  >
                    <Link href="/register">Create an account</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="h-10 rounded-xl border-white/20 bg-transparent px-5 text-sm font-semibold text-[var(--plans-on-green)] hover:bg-white/10 hover:text-[var(--plans-on-green)]"
                  >
                    <a href="#compare">Compare plans</a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--plans-line)] bg-[var(--plans-paper)]/45">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-start gap-3">
            <Logo size="sm" />
            <p className="max-w-xs text-xs leading-5 text-[var(--plans-muted)]">
              Retail operating system by Rynex. Checkout opens soon.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
          >
            <Link
              href="/plans"
              className="text-[var(--plans-muted)] transition-colors hover:text-[var(--plans-ink)]"
            >
              Plans
            </Link>
            <Link
              href="/menu"
              className="text-[var(--plans-muted)] transition-colors hover:text-[var(--plans-ink)]"
            >
              Menu
            </Link>
            <Link
              href="/login"
              className="text-[var(--plans-muted)] transition-colors hover:text-[var(--plans-ink)]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-[var(--plans-muted)] transition-colors hover:text-[var(--plans-ink)]"
            >
              Create account
            </Link>
          </nav>

          <p className="text-xs text-[var(--plans-muted)]">
            © {COPYRIGHT_YEAR} Niraya. Prices in IDR.
          </p>
        </div>
      </footer>

      <PublicNavigation variant="mobile" />
    </div>
  )
}
