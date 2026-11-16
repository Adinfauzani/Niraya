'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { Order, OrderCounts } from '@/types/business'
import { setOrderCountsCache } from '@/hooks/ordersCountsCache'

type OrdersState = {
  orders: Order[]
  counts: OrderCounts | null
}

/**
 * Polls `GET /api/orders` for the current tenant, optionally filtered by
 * status. Refreshes on an interval and when the filter changes.
 */
export function useOrders(status: string = 'all', intervalMs = 15000) {
  const [orders, setOrders] = useState<Order[]>([])
  const [counts, setCounts] = useState<OrderCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const id = ++requestId.current
    try {
      const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''
      const response = await fetch(`/api/orders${query}`, {
        cache: 'no-store',
        credentials: 'include',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error ?? 'Gagal memuat pesanan.')
      }
      if (id !== requestId.current) return
      const data = payload as OrdersState
      setOrders(Array.isArray(data?.orders) ? data.orders : [])
      setCounts(data?.counts ?? null)
      setOrderCountsCache(data?.counts ?? null)
      setError(null)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan.')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh, intervalMs])

  return { orders, counts, loading, error, refresh }
}