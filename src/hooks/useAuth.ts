"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/authClient"

export function useAuth() {
  const [user, setUser,] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getInitialUser = async () => {
      const { data } = await authClient.getSession()
      setUser(data?.user ?? null)
      setLoading(false)
    }

    getInitialUser()

    const { data: { subscription } } = authClient.sessionChanged((_event: any, session: any) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}