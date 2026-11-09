"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  Building2,
  CreditCardIcon,
  EllipsisVerticalIcon,
  HelpCircleIcon,
  LogOutIcon,
  SettingsIcon,
  UserCircleIcon,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"
import { supabaseClient } from "@/lib/auth-client"
import { useBusinessStore } from "@/stores/business-store"
import { cn } from "@/lib/utils"

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function NavUser({
  user,
  collapsed = false,
}: {
  user: {
    name: string
    email: string
    avatar?: string
  }
  collapsed?: boolean
}) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const fallback = initials(user.name)

  const {
    availableBusinesses,
    selectedBusinessId,
    selectedStoreId,
    loadBusinesses,
    switchBusiness,
  } = useBusinessStore()

  const [businessesLoaded, setBusinessesLoaded] = useState(false)

  useEffect(() => {
    if (!businessesLoaded) {
      loadBusinesses()
      setBusinessesLoaded(true)
    }
  }, [loadBusinesses, businessesLoaded])

  const handleSignOut = async () => {
    try {
      await supabaseClient.auth.signOut()
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  const renderAvatar = (className?: string) => (
    <Avatar
      className={cn("h-8 w-8 rounded-lg after:rounded-lg", className)}
    >
      {user.avatar ? (
        <AvatarImage
          src={user.avatar}
          alt={user.name}
          className="rounded-lg"
        />
      ) : null}
      <AvatarFallback className="rounded-lg text-xs font-medium">
        {fallback}
      </AvatarFallback>
    </Avatar>
  )

  const businessSwitcher = availableBusinesses.length > 1 ? (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="px-1 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
        Bisnis & Toko
      </DropdownMenuLabel>
      {availableBusinesses.map((business) => (
        <DropdownMenuItem
          key={business.businessId}
          onSelect={() => switchBusiness(business.businessId)}
          className={
            selectedBusinessId === business.businessId
              ? "bg-primary/10 text-primary"
              : undefined
          }
        >
          <Building2 className="mr-2 size-4" />
          <div className="flex flex-col">
            <span className="truncate font-medium">{business.businessName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {business.stores.map((s) => s.name).join(", ")}
            </span>
          </div>
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  ) : null

  const menu = (
    <DropdownMenuContent
      className="min-w-56 rounded-lg"
      side={isMobile ? "bottom" : "right"}
      align="end"
      sideOffset={4}
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          {renderAvatar()}
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {businessSwitcher}
      {businessSwitcher && <DropdownMenuSeparator />}
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => router.push("/profile")}>
          <UserCircleIcon />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/plans")}>
          <CreditCardIcon />
          Plans & Billing
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/settings")}>
          <SettingsIcon />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/help")}>
          <HelpCircleIcon />
          Help & Support
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => void handleSignOut()}>
        <LogOutIcon />
        Log out
      </DropdownMenuItem>
    </DropdownMenuContent>
  )

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-accent"
            title={user.name}
            aria-label={`Menu pengguna ${user.name}`}
          >
            {renderAvatar("grayscale")}
          </button>
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors",
            "hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "data-[state=open]:bg-accent"
          )}
        >
          {renderAvatar("grayscale")}
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-medium">{user.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.email}
            </span>
          </div>
          <EllipsisVerticalIcon className="ml-auto size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
        </button>
      </DropdownMenuTrigger>
      {menu}
    </DropdownMenu>
  )
}