'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { getFreshOrderCounts } from '@/hooks/ordersCountsCache'

/**
 * Polls `GET /api/orders?summary=1` for the pending (SUBMITTED) order count and
 * surfaces a toast when new orders arrive. Intended for the sidebar badge.
 *
 * When the Orders page is mounted it shares its counts through
 * `ordersCountsCache`, so the badge reuses that fetch instead of issuing a
 * second request.
 */
export function usePendingOrders(enabled: boolean = true, intervalMs = 15000) {
  const [count, setCount] = useState(0)
  const previous = useRef<number | null>(null)

  const applyCount = useCallback((next: number) => {
    if (!Number.isFinite(next)) return
    if (previous.current !== null && next > previous.current) {
      const delta = next - previous.current
      toast.info(
        delta === 1 ? '1 pesanan baru masuk' : `${delta} pesanan baru masuk`,
        { description: 'Buka halaman Pesanan untuk menindaklanjuti.' },
      )
    }
    previous.current = next
    setCount(next)
  }, [])

  const refresh = useCallback(async () => {
    if (!enabled) return

    // Reuse the Orders page's counts when they are still fresh.
    const cached = getFreshOrderCounts()
    if (cached) {
      applyCount(Number(cached.pending ?? 0))
      return
    }

    try {
      const response = await fetch('/api/orders?summary=1', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) return
      const payload = await response.json().catch(() => null)
      applyCount(Number(payload?.counts?.pending ?? 0))
    } catch {
      // Diamkan; badge akan retry pada interval berikutnya.
    }
  }, [enabled, applyCount])

  useEffect(() => {
    if (!enabled) {
      setCount(0)
      previous.current = null
      return
    }
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, refresh, intervalMs])

  return { count, refresh }
}