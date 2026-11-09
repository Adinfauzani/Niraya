import { Check, Minus } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  PLAN_DEFINITIONS,
  formatPlanPrice,
  type PlanDefinition,
} from "@/lib/plans"
import { cn } from "@/lib/utils"

const COMPARISON_ROWS = [
  { key: "stores", label: "Stores" },
  { key: "teamMembers", label: "Team members" },
  { key: "products", label: "Products" },
  { key: "pos", label: "POS" },
  { key: "inventory", label: "Inventory" },
  { key: "customers", label: "Customer management" },
  { key: "reports", label: "Sales reports" },
  { key: "multiStore", label: "Multi-store management" },
  { key: "api", label: "API access" },
  { key: "support", label: "Support" },
] as const

type ComparisonKey = (typeof COMPARISON_ROWS)[number]["key"]

function comparisonValue(plan: PlanDefinition, key: ComparisonKey): string {
  switch (key) {
    case "stores":
      return String(plan.entitlements.maxStores)
    case "teamMembers":
      return String(plan.entitlements.maxUsers)
    case "products":
      return new Intl.NumberFormat("en-US").format(plan.entitlements.maxProducts)
    case "pos":
    case "inventory":
    case "customers":
      return "Yes"
    case "reports":
      return plan.tier === "starter" ? "Yes" : "Advanced"
    case "multiStore":
      return plan.entitlements.maxStores > 1 ? "Yes" : "No"
    case "api":
      return plan.entitlements.features.includes("api") ? "Yes" : "No"
    case "support":
      return plan.tier === "starter"
        ? "Email"
        : plan.tier === "plus"
          ? "Priority email"
          : "Priority"
  }
}

function ComparisonValue({
  value,
  inverted = false,
}: {
  value: string
  inverted?: boolean
}) {
  if (value === "Yes") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-1.5 text-xs font-medium",
          inverted
            ? "text-[var(--plans-on-green)]"
            : "text-[var(--plans-ink)]",
        )}
      >
        <Check
          aria-hidden
          className={cn(
            "size-3.5 shrink-0",
            inverted
              ? "text-[var(--plans-gold)]"
              : "text-[var(--plans-green)]",
          )}
        />
        Yes
      </span>
    )
  }

  if (value === "No") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center gap-1.5 text-xs",
          inverted
            ? "text-[var(--plans-on-green-muted)]"
            : "text-[var(--plans-muted)]",
        )}
      >
        <Minus aria-hidden className="size-3.5" />
        No
      </span>
    )
  }

  return (
    <span
      className={cn(
        "text-xs font-medium",
        inverted
          ? "text-[var(--plans-on-green)]"
          : "text-[var(--plans-ink)]",
      )}
    >
      {value}
    </span>
  )
}

export function FeatureComparison() {
  return (
    <section
      id="compare"
      className="scroll-mt-24 border-y border-[var(--plans-line)] bg-[var(--plans-paper)]/55 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plans-green)]">
            Compare plans
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--plans-ink)] sm:text-4xl">
            The right limits for every stage.
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--plans-muted)] sm:text-base">
            Every plan includes the core Niraya workspace. Choose the store,
            team, and reporting limits that match how you operate.
          </p>
        </div>

        <div className="mt-8 hidden overflow-hidden rounded-[28px] border border-[var(--plans-line)] bg-[var(--plans-paper)] md:block">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">
              Feature comparison for the Starter, Plus, and Pro plans
            </caption>
            <thead>
              <tr className="border-b border-[var(--plans-line)]">
                <th
                  scope="col"
                  className="px-6 py-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--plans-muted)]"
                >
                  Features
                </th>
                {PLAN_DEFINITIONS.map((plan) => (
                  <th
                    key={plan.id}
                    scope="col"
                    className={cn(
                      "px-4 py-5 text-center",
                      plan.highlighted &&
                        "bg-[var(--plans-green-soft)]/55",
                    )}
                  >
                    <span className="block text-sm font-semibold text-[var(--plans-ink)]">
                      {plan.name}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-[var(--plans-muted)]">
                      {formatPlanPrice(plan.priceCents)} {plan.billingSuffix}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.key}
                  className="border-t border-[var(--plans-line)] first:border-t-0"
                >
                  <th
                    scope="row"
                    className="px-6 py-3.5 text-sm font-medium text-[var(--plans-ink)]"
                  >
                    {row.label}
                  </th>
                  {PLAN_DEFINITIONS.map((plan) => (
                    <td
                      key={plan.id}
                      className={cn(
                        "px-4 py-3.5 text-center",
                        plan.highlighted &&
                          "bg-[var(--plans-green-soft)]/35",
                      )}
                    >
                      <ComparisonValue
                        value={comparisonValue(plan, row.key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 grid gap-4 md:hidden">
          {PLAN_DEFINITIONS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "rounded-[24px] border p-5",
                plan.highlighted
                  ? "border-[var(--plans-gold)]/55 bg-[var(--plans-green-deep)] text-[var(--plans-on-green)]"
                  : "border-[var(--plans-line)] bg-[var(--plans-paper)] text-[var(--plans-ink)]",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      plan.highlighted
                        ? "text-[var(--plans-on-green-muted)]"
                        : "text-[var(--plans-muted)]",
                    )}
                  >
                    {formatPlanPrice(plan.priceCents)} {plan.billingSuffix}
                  </p>
                </div>
                {plan.highlighted ? (
                  <Badge className="rounded-full border border-[var(--plans-gold)]/35 bg-[var(--plans-gold)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--plans-green-deep)]">
                    Popular
                  </Badge>
                ) : null}
              </div>

              <dl
                className={cn(
                  "mt-4 divide-y",
                  plan.highlighted
                    ? "divide-white/15"
                    : "divide-[var(--plans-line)]",
                )}
              >
                {COMPARISON_ROWS.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <dt
                      className={cn(
                        "text-xs",
                        plan.highlighted
                          ? "text-[var(--plans-on-green-muted)]"
                          : "text-[var(--plans-muted)]",
                      )}
                    >
                      {row.label}
                    </dt>
                    <dd className="text-right">
                      <ComparisonValue
                        value={comparisonValue(plan, row.key)}
                        inverted={plan.highlighted}
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
