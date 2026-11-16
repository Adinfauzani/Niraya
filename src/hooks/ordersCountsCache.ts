'use client'

import type { OrderCounts } from '@/types/business'

/**
 * Short-lived client cache for the global order counts.
 *
 * Both the Orders page (`useOrders`) and the sidebar badge
 * (`usePendingOrders`) need the same counts. Sharing them here lets the badge
 * reuse the page's fetch instead of issuing a second `/api/orders` request.
 */
const MAX_AGE_MS = 20_000

let cached: OrderCounts | null = null
let cachedAt = 0

/** Returns the cached counts when they are still fresh, otherwise `null`. */
export function getFreshOrderCounts(): OrderCounts | null {
  if (cached && Date.now() - cachedAt <= MAX_AGE_MS) return cached
  return null
}

/** Stores the latest counts so other consumers can reuse them. */
export function setOrderCountsCache(counts: OrderCounts | null) {
  cached = counts
  cachedAt = Date.now()
}