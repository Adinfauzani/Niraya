"use client"

import { useStore } from "better-auth/react"

import { authClient } from "@/lib/authClient"

export function useAuth() {
  const { data, isPending } = useStore(authClient.useSession)

  return { user: data?.user ?? null, loading: isPending }
}