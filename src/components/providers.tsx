"use client"

import { useEffect } from "react"

import { QueryClientProvider } from "@tanstack/react-query"

import { queryClient } from "@/lib/query-client"
import { useBusinessQuery } from "@/hooks/use-business"
import { useBusinessStore } from "@/stores/business-store"

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

/**
 * Keeps the Zustand business store in sync with TanStack Query, which fetches
 * real business data from `/api/business`. The store no longer performs its
 * own database fetch; this provider is the single data source for real sessions.
 */
export function BusinessDataProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const ready = useBusinessStore((state) => state.ready)
  const { data, error, isPending } = useBusinessQuery({ enabled: true })

  useEffect(() => {
    // Sync whenever the query yields new data (first load, refetch after a
    // mutation, or recovery from a transient auth error).
    if (data) {
      useBusinessStore.setState({
        categories: data.categories ?? [],
        products: data.products ?? [],
        customers: data.customers ?? [],
        staff: data.staff ?? [],
        transactions: data.transactions ?? [],
        movements: data.movements ?? [],
        settings: data.settings ?? null,
        settingsState: data.settings ? "ready" : "uninitialized",
        businessError: null,
        ready: true,
      })
      return
    }

    // A failed request is not an empty database. Keep ready false for
    // authenticated business surfaces so layouts can show an error/retry state
    // instead of rendering misleading empty data.
    if (error) {
      if (!ready) {
        useBusinessStore.setState({
          categories: [],
          products: [],
          customers: [],
          staff: [],
          transactions: [],
          movements: [],
          settings: null,
          settingsState: "uninitialized",
          businessError:
            error instanceof Error
              ? error.message
              : "Gagal memuat data bisnis.",
          ready: false,
        })
      }
      return
    }

    // No data and no error while pending: wait.
    if (isPending) return
  }, [data, error, isPending, ready])

  return children
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <BusinessDataProvider>{children}</BusinessDataProvider>
    </QueryProvider>
  )
}
