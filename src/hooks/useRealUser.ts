'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/authClient'

type RealUser = {
  name?: string
  email?: string
  role?: string
  image?: string | null
} | null

type SessionUser = NonNullable<RealUser>

/**
 * Loads the signed-in Supabase Auth user plus the app role from
 * `core.UserProfiles` (via `/api/me`). New accounts default to `user`.
 */
export function useRealUser(enabled: boolean) {
  const [user, setUser] = useState<RealUser>(null)

  useEffect(() => {
    if (!enabled) return

    let active = true

    const load = async () => {
      try {
        const { data }: any = await (authClient as any).getSession()
        if (!active) return

        const session = data?.session ?? null
        const sessionUser: SessionUser | null = session?.user ?? null

        if (!sessionUser) {
          setUser(null)
          return
        }

        try {
          const response = await fetch('/api/me', {
            cache: 'no-store',
            credentials: 'include',
          })

          if (response.ok) {
            const data = await response.json()
            if (active && data?.user) {
              setUser(data.user)
              return
            }
          }
        } catch {
          // Abaikan; fallback ke data sesi Supabase Auth di bawah.
        }

        if (active) setUser(sessionUser)
      } catch {
        if (active) setUser(null)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [enabled])

  return user
}