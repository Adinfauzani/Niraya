export type BillingTier = "free" | "starter" | "plus" | "pro"

export type BillingRecurrence =
  | "monthly"
  | "quarterly"
  | "biannually"
  | "yearly"

export type PlanEntitlements = {
  maxUsers: number
  maxStores: number
  maxProducts: number
  features: string[]
}

/**
 * Customer-facing plan catalog.
 *
 * This file is intentionally free of server-only imports so the public
 * pricing page and the billing service can share one source of truth.
 *
 * Gumroad product IDs are identifiers, not secrets. The billing service may
 * still override them with `GUMROAD_PRODUCT_*` environment variables.
 */
export type PlanDefinition = {
  id: string
  code: string
  name: string
  tier: BillingTier
  recurrence: BillingRecurrence
  intervalMonths: number
  priceCents: number
  currency: "IDR"
  tagline: string
  description: string
  billingSuffix: string
  billingLabel: string
  monthlyEquivalentCents: number
  gumroadProductId: string
  gumroadPermalink: string
  entitlements: PlanEntitlements
  features: string[]
  ctaLabel: string
  highlighted: boolean
}

export const PLAN_DEFINITIONS = [
  {
    id: "free",
    code: "free",
    name: "Free",
    tier: "free",
    recurrence: "monthly",
    intervalMonths: 1,
    priceCents: 0,
    currency: "IDR",
    tagline: "Start exploring Niraya.",
    description: "Free tier for individuals trying out the platform.",
    billingSuffix: "/ month",
    billingLabel: "Free forever",
    monthlyEquivalentCents: 0,
    gumroadProductId: "",
    gumroadPermalink: "",
    entitlements: {
      maxUsers: 1,
      maxStores: 1,
      maxProducts: 50,
      features: ["pos_basic"],
    },
    features: [
      "1 store",
      "1 team member (you)",
      "Up to 50 products",
      "Basic POS checkout",
      "Basic inventory tracking",
      "Public storefront",
      "Community support",
    ],
    ctaLabel: "Get Started Free",
    highlighted: false,
  },
  {
    id: "starter-monthly",
    code: "starter-monthly",
    name: "Starter",
    tier: "starter",
    recurrence: "monthly",
    intervalMonths: 1,
    priceCents: 13_000_000,
    currency: "IDR",
    tagline: "Run your first store with confidence.",
    description:
      "A complete point-of-sale and inventory toolkit for independent stores.",
    billingSuffix: "/ month",
    billingLabel: "Billed monthly",
    monthlyEquivalentCents: 13_000_000,
    gumroadProductId: "B0LcbLk9xFaai1NOeuUhdA==",
    gumroadPermalink: "opghbu",
    entitlements: {
      maxUsers: 3,
      maxStores: 1,
      maxProducts: 100,
      features: ["pos", "reports"],
    },
    features: [
      "1 store",
      "Up to 3 team members",
      "Up to 100 products",
      "POS checkout and receipts",
      "Inventory tracking and stock adjustments",
      "Customer management",
      "Sales and product reports",
      "Public storefront and QR menu",
      "Email support",
    ],
    ctaLabel: "Start with Starter",
    highlighted: false,
  },
  {
    id: "plus-biannually",
    code: "plus-biannually",
    name: "Plus",
    tier: "plus",
    recurrence: "biannually",
    intervalMonths: 6,
    priceCents: 78_000_000,
    currency: "IDR",
    tagline: "Built for growing retail teams.",
    description: "Multi-store POS, deeper reports, and room to grow.",
    billingSuffix: "/ 6 months",
    billingLabel: "Billed every 6 months",
    monthlyEquivalentCents: 13_000_000,
    gumroadProductId: "E3mPM1KsY4WhWTFC6LVdqQ==",
    gumroadPermalink: "ebwsuv",
    entitlements: {
      maxUsers: 10,
      maxStores: 2,
      maxProducts: 500,
      features: ["pos", "reports", "multi_store"],
    },
    features: [
      "Everything in Starter",
      "Up to 2 stores",
      "Up to 10 team members",
      "Up to 500 products",
      "Multi-store inventory and reporting",
      "Advanced sales and inventory reports",
      "Priority email support",
    ],
    ctaLabel: "Upgrade to Plus",
    highlighted: true,
  },
  {
    id: "pro-yearly",
    code: "pro-yearly",
    name: "Pro",
    tier: "pro",
    recurrence: "yearly",
    intervalMonths: 12,
    priceCents: 156_000_000,
    currency: "IDR",
    tagline: "Full control for serious retail operations.",
    description: "Maximum stores, users, products, and API access.",
    billingSuffix: "/ year",
    billingLabel: "Billed yearly",
    monthlyEquivalentCents: 13_000_000,
    gumroadProductId: "f5KAd3GngR3R3kCj72QBnQ==",
    gumroadPermalink: "wpartz",
    entitlements: {
      maxUsers: 25,
      maxStores: 5,
      maxProducts: 2000,
      features: ["pos", "reports", "multi_store", "api"],
    },
    features: [
      "Everything in Plus",
      "Up to 5 stores",
      "Up to 25 team members",
      "Up to 2,000 products",
      "API access",
      "Priority support",
    ],
    ctaLabel: "Go Pro",
    highlighted: false,
  },
] satisfies PlanDefinition[]

/** Format a plan amount in the customer-facing Rupiah style: `Rp130.000`. */
export function formatPlanPrice(priceCents: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(
    Math.round(priceCents / 100),
  )}`
}
