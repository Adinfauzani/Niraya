import { Plus } from "lucide-react"

const FAQS = [
  {
    question: "What is Niraya?",
    answer:
      "Niraya is a retail operating system that brings point of sale, inventory, products, customers, staff, reporting, and a public storefront into one workspace.",
  },
  {
    question: "Which plan should I choose?",
    answer:
      "Starter is designed for a single store getting started. Plus adds multi-store inventory and deeper reporting for growing teams. Pro raises every limit and adds API access for larger operations.",
  },
  {
    question: "How does billing work?",
    answer:
      "Memberships are intended to be billed through Gumroad. Starter is billed monthly, Plus every 6 months, and Pro yearly. Checkout is not active yet; this page will show the purchase state once the products are published.",
  },
  {
    question: "Can I upgrade my plan?",
    answer:
      "Plan changes will be handled through the billing provider when checkout is live. Until then, no upgrade action is available from this page.",
  },
  {
    question: "How many stores can I manage?",
    answer:
      "Starter includes 1 store, Plus includes up to 2 stores, and Pro includes up to 5 stores. Store limits are part of each plan's entitlements.",
  },
  {
    question: "Is API access available on every plan?",
    answer:
      "No. API access is included on Pro. Starter and Plus focus on the core POS, inventory, customer, storefront, and reporting workflows.",
  },
  {
    question: "Is payment processing handled securely?",
    answer:
      "Once checkout is active, payments are intended to be processed by Gumroad. Niraya does not collect or store card details on this page.",
  },
] as const

export function PlansFAQ() {
  return (
    <section id="faq" className="scroll-mt-24 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--plans-green)]">
              Questions
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[var(--plans-ink)] sm:text-4xl">
              Before you choose.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--plans-muted)]">
              Clear limits, exact billing intervals, and no hidden assumptions.
              Checkout details will appear when memberships open.
            </p>
          </div>

          <div className="divide-y divide-[var(--plans-line)] border-y border-[var(--plans-line)]">
            {FAQS.map((faq) => (
              <details key={faq.question} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-sm font-medium text-[var(--plans-ink)] outline-none transition-colors hover:text-[var(--plans-green)] focus-visible:ring-2 focus-visible:ring-[var(--plans-green)]/40 [&::-webkit-details-marker]:hidden">
                  <span>{faq.question}</span>
                  <Plus
                    aria-hidden
                    className="size-4 shrink-0 text-[var(--plans-muted)] transition-transform duration-200 group-open:rotate-45"
                  />
                </summary>
                <p className="max-w-2xl pb-5 pr-8 text-sm leading-6 text-[var(--plans-muted)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
