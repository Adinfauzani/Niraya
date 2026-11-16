import { Check, LockKeyhole } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPlanPrice, type PlanDefinition } from "@/lib/plans"
import { cn } from "@/lib/utils"

export function PricingCard({
  plan,
  currentTier,
}: {
  plan: PlanDefinition
  currentTier?: string | null
}) {
  const highlighted = plan.highlighted
  const premium = plan.tier === "pro"
  const isCurrent = currentTier === plan.tier

  return (
    <article
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 sm:p-7",
        highlighted
          ? "border-[var(--plans-gold)]/55 bg-[var(--plans-green-deep)] text-[var(--plans-on-green)] shadow-[0_28px_90px_-54px_rgba(18,44,32,0.8)]"
          : premium
            ? "border-[var(--plans-gold)]/35 bg-[var(--plans-paper)] text-[var(--plans-ink)] shadow-[0_22px_70px_-60px_rgba(18,44,32,0.45)] ring-1 ring-[var(--plans-gold)]/15"
            : "border-[var(--plans-line)] bg-[var(--plans-paper)] text-[var(--plans-ink)] shadow-[0_22px_70px_-60px_rgba(18,44,32,0.45)]",
        isCurrent && "ring-2 ring-[var(--plans-green)]/40",
      )}
    >
      {highlighted ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-[var(--plans-gold)]/10 blur-3xl"
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{plan.name}</h2>
          <p
            className={cn(
              "mt-1 max-w-[22ch] text-sm leading-5",
              highlighted
                ? "text-[var(--plans-on-green-muted)]"
                : "text-[var(--plans-muted)]",
            )}
          >
            {plan.tagline}
          </p>
        </div>
        {isCurrent ? (
          <Badge className="shrink-0 rounded-full border border-[var(--plans-gold)]/35 bg-[var(--plans-gold)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--plans-green-deep)]">
            Paket Anda
          </Badge>
        ) : highlighted ? (
          <Badge className="shrink-0 rounded-full border border-[var(--plans-gold)]/35 bg-[var(--plans-gold)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--plans-green-deep)]">
            Most popular
          </Badge>
        ) : null}
      </div>

      <div className="relative mt-7">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="text-[2.6rem] font-semibold leading-none tracking-[-0.05em]">
            {formatPlanPrice(plan.priceCents)}
          </span>
          <span
            className={cn(
              "pb-1 text-sm font-medium",
              highlighted
                ? "text-[var(--plans-on-green-muted)]"
                : "text-[var(--plans-muted)]",
            )}
          >
            {plan.billingSuffix}
          </span>
        </div>
        <p
          className={cn(
            "mt-2 text-xs leading-5",
            highlighted
              ? "text-[var(--plans-on-green-muted)]"
              : "text-[var(--plans-muted)]",
          )}
        >
          {plan.billingLabel} · {formatPlanPrice(plan.monthlyEquivalentCents)}{" "}
          / month equivalent
        </p>
      </div>

      <p
        className={cn(
          "relative mt-5 text-sm leading-6",
          highlighted
            ? "text-[var(--plans-on-green-muted)]"
            : "text-[var(--plans-muted)]",
        )}
      >
        {plan.description}
      </p>

      <div className="relative mt-6">
        <Button
          type="button"
          disabled
          aria-describedby={`${plan.id}-checkout-status`}
          className={cn(
            "h-10 w-full rounded-xl text-sm font-semibold disabled:pointer-events-none disabled:opacity-100",
            highlighted
              ? "bg-[var(--plans-gold)] text-[var(--plans-green-deep)] hover:bg-[var(--plans-gold)]"
              : "bg-[var(--plans-button)] text-[var(--plans-button-ink)] hover:bg-[var(--plans-button)]",
          )}
        >
          <LockKeyhole aria-hidden className="size-3.5" />
          {plan.ctaLabel}
        </Button>
        <p
          id={`${plan.id}-checkout-status`}
          className={cn(
            "mt-2 text-center text-[11px] leading-4",
            highlighted
              ? "text-[var(--plans-on-green-muted)]"
              : "text-[var(--plans-muted)]",
          )}
        >
          Checkout opens soon
        </p>
      </div>

      <div
        className={cn(
          "relative my-6 h-px",
          highlighted ? "bg-white/15" : "bg-[var(--plans-line)]",
        )}
      />

      <div className="relative flex flex-1 flex-col">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.16em]",
            highlighted
              ? "text-[var(--plans-on-green-muted)]"
              : "text-[var(--plans-muted)]",
          )}
        >
          What&apos;s included
        </p>
        <ul className="mt-3 space-y-2.5">
          {plan.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm leading-5"
            >
              <Check
                aria-hidden
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  highlighted
                    ? "text-[var(--plans-gold)]"
                    : "text-[var(--plans-green)]",
                )}
              />
              <span
                className={cn(
                  highlighted
                    ? "text-[var(--plans-on-green)]"
                    : "text-[var(--plans-ink)]",
                )}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
