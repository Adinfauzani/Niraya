"use client"

import { Fragment, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronUp,
  Grid3X3,
  LayoutDashboard,
  Package,
  PanelLeftOpen,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  UserCog,
  UserCircle,
  Users,
} from "lucide-react"

import { NavUser } from "@/components/NavUser"
import { Logo } from "@/components/ui/logo"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { usePendingOrders } from "@/hooks/usePendingOrders"
import { useRealUser } from "@/hooks/useRealUser"
import { useBusinessStore } from "@/stores/businessStore"
import { cn } from "@/lib/utils"

interface NavItem { href: string; label: string; icon: React.ElementType; badge?: number }
interface NavGroup { key: string; title: string; collapsible: boolean; defaultOpen?: boolean; items: NavItem[] }

const NAV: NavGroup[] = [
  { key: "overview", title: "Overview", collapsible: false, items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  { key: "sales", title: "Sales", collapsible: true, defaultOpen: true, items: [{ href: "/pos", label: "POS Terminal", icon: ShoppingBag }, { href: "/orders", label: "Orders", icon: ShoppingCart }, { href: "/transactions", label: "Transactions", icon: Receipt }, { href: "/customers", label: "Customers", icon: Users }] },
  { key: "catalog", title: "Catalog", collapsible: true, defaultOpen: true, items: [{ href: "/products", label: "Products", icon: Package }, { href: "/categories", label: "Categories", icon: Grid3X3 }, { href: "/inventory", label: "Inventory", icon: Boxes }] },
  { key: "business", title: "Business", collapsible: true, defaultOpen: true, items: [{ href: "/reports", label: "Reports", icon: BarChart3 }, { href: "/staff", label: "Staff Management", icon: UserCog }] },
]

const MIN_SIDEBAR_WIDTH = 200
const MAX_SIDEBAR_WIDTH = 360

export function AppSidebar({
  collapsed, onToggle, width = 260, onWidthChange, resizing = false, onResizeStart, onResizeEnd, className,
}: {
  collapsed: boolean; onToggle: (next: boolean) => void; width?: number; onWidthChange?: (next: number) => void;
  resizing?: boolean; onResizeStart?: () => void; onResizeEnd?: () => void; className?: string
}) {
  const pathname = usePathname()
  const realUser = useRealUser(true) as any
  const userRole = realUser?.role as string | undefined
  const roleLoading = realUser === null
  const isRegularUser = userRole === "user"
  const { count: pendingOrders } = usePendingOrders(!isRegularUser)
  const currentUser = { name: realUser?.name ?? "Akun", email: realUser?.email ?? "", avatar: realUser?.image ?? undefined, role: userRole }
  const availableBusinesses = useBusinessStore((state) => state.availableBusinesses)
  const selectedBusinessId = useBusinessStore((state) => state.selectedBusinessId)
  const currentBusiness =
    availableBusinesses.find((b) => b.businessId === selectedBusinessId) ??
    availableBusinesses[0] ??
    null
  const businessName = currentBusiness?.businessName?.trim() || "NIRAYA"
  const businessLogoUrl = currentBusiness?.logoUrl ?? null
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ sales: true, catalog: true, business: true })

  const ROLE_ALLOWED: Record<string, string[]> = {
    user: [],
    cashier: ["/dashboard", "/pos", "/orders", "/transactions", "/customers"],
    manager: ["/dashboard", "/pos", "/orders", "/transactions", "/customers", "/products", "/categories", "/inventory"],
    admin: ["/dashboard", "/pos", "/orders", "/transactions", "/customers", "/products", "/categories", "/inventory", "/reports", "/staff"],
    owner: ["/dashboard", "/pos", "/orders", "/transactions", "/customers", "/products", "/categories", "/inventory", "/reports", "/staff"],
  }
  const allowed = ROLE_ALLOWED[userRole ?? "user"] ?? []

  const filteredNav = isRegularUser
    ? []
    : NAV.map((group) => ({
        ...group,
        items: group.items
          .filter((item) => allowed.includes(item.href))
          .map((item) =>
            item.href === "/orders" ? { ...item, badge: pendingOrders } : item,
          ),
      })).filter((group) => group.items.length > 0)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia("(max-width: 767px)").matches) onToggle(true)
  }, [pathname, onToggle])

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)
  const toggleGroup = (key: string) => setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }))

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (collapsed || !onWidthChange) return
    event.preventDefault()
    const startX = event.clientX; const startWidth = width
    onResizeStart?.()
    const handlePointerMove = (e: PointerEvent) => onWidthChange(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, startWidth + e.clientX - startX)))
    const stop = () => { onResizeEnd?.(); window.removeEventListener("pointermove", handlePointerMove); window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop) }
    window.addEventListener("pointermove", handlePointerMove); window.addEventListener("pointerup", stop); window.addEventListener("pointercancel", stop)
  }

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onWidthChange || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
    event.preventDefault()
    onWidthChange(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width + (event.key === "ArrowRight" ? 16 : -16))))
  }

  const profileActive = isActive("/profile")
  const ProfileNavItem = ({ full }: { full?: boolean }) => {
    const Icon = UserCircle
    const cls = cn(
      "flex items-center rounded-xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      full ? "gap-2 px-2.5 py-2 text-sm" : "size-10 justify-center",
      profileActive ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground"
    )
    const link = <Link href="/profile" aria-current={profileActive ? "page" : undefined} className={cls}><Icon className={full ? "size-4 shrink-0" : "size-5 shrink-0"} />{full ? <span className="flex-1 truncate">Profil</span> : null}</Link>
    return full ? link : <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" sideOffset={8}>Profil</TooltipContent></Tooltip>
  }

  const navBody = () => {
    if (roleLoading) {
      if (collapsed) return <div className="flex flex-col items-center gap-2"><Skeleton className="size-10 rounded-lg" /><Skeleton className="size-10 rounded-lg" /><Skeleton className="size-10 rounded-lg" /></div>
      return <div className="space-y-2 px-1">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full rounded-xl" />)}</div>
    }
    if (isRegularUser) return collapsed ? <ProfileNavItem /> : <div className="space-y-1"><ProfileNavItem full /></div>

    if (collapsed) {
      return (
        <div className="flex flex-col items-center gap-1">
          {filteredNav.map((group, groupIndex) => (
            <Fragment key={group.key}>
              {groupIndex > 0 ? <div className="my-1 h-px w-6 shrink-0 bg-sidebar-border" aria-hidden /> : null}
              {group.items.map((item) => {
                const Icon = item.icon; const active = isActive(item.href)
                return (
                  <Tooltip key={item.href}><TooltipTrigger asChild>
                    <Link href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined} className={cn("relative flex size-10 items-center justify-center rounded-lg transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                      <Icon className="size-5 shrink-0" />
                      {item.badge ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-sidebar" aria-hidden /> : null}
                    </Link>
                  </TooltipTrigger><TooltipContent side="right" sideOffset={8}>{item.label}</TooltipContent></Tooltip>
                )
              })}
            </Fragment>
          ))}
        </div>
      )
    }

    return filteredNav.map((group) => {
      const groupOpen = group.collapsible ? !!openGroups[group.key] : true
      const header = <div className="flex w-full items-center justify-between px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{group.title}{group.collapsible ? (groupOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />) : null}</div>
      return (
        <div key={group.key} className="space-y-1">
          {group.collapsible ? <button type="button" onClick={() => toggleGroup(group.key)} className="w-full rounded-lg transition-colors hover:bg-accent/40" aria-expanded={groupOpen}>{header}</button> : <div>{header}</div>}
          {groupOpen ? (
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("group flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm transition-colors duration-200", active ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold tabular-nums text-white">{item.badge > 99 ? "99+" : item.badge}</span> : null}
                  </Link>
                )
              })}
            </div>
          ) : null}
        </div>
      )
    })
  }

  const brandContent = collapsed ? (
    <div className="relative flex h-10 w-full items-center justify-center">
      {businessLogoUrl ? (
        <img src={businessLogoUrl} alt={businessName} className="size-7 rounded-lg object-cover transition-opacity duration-150 group-hover/sidebar:opacity-0" />
      ) : (
        <Logo size="sm" label={false} className="transition-opacity duration-150 group-hover/sidebar:opacity-0" />
      )}
      <button type="button" onClick={() => onToggle(false)} aria-label="Buka sidebar" title="Buka sidebar" className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity duration-150 hover:bg-accent hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/sidebar:pointer-events-auto group-hover/sidebar:opacity-100"><PanelLeftOpen className="size-5" /></button>
    </div>
  ) : (
    <button type="button" onClick={() => onToggle(true)} className="flex w-full shrink-0 items-center gap-2 rounded-xl p-2 text-left transition-colors duration-200 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Tutup sidebar" title="Tutup sidebar">
      {businessLogoUrl ? (
        <img src={businessLogoUrl} alt={businessName} className="size-8 shrink-0 rounded-lg object-cover" />
      ) : (
        <Logo size="md" label={false} />
      )}
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-semibold">{businessName}</span>
        <span className="text-[10px] leading-none text-muted-foreground">Enterprise POS</span>
      </span>
    </button>
  )

  return (
    <TooltipProvider delayDuration={150}>
      {!collapsed ? <button type="button" className="fixed inset-0 z-10 bg-black/40 backdrop-blur-[1px] md:hidden" onClick={() => onToggle(true)} aria-label="Tutup sidebar" /> : null}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex h-svh flex-col justify-between overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm print:hidden", resizing ? "transition-none" : "transition-[width,transform] duration-200 ease-in-out", "md:w-[var(--sidebar-width)]", collapsed ? "group/sidebar -translate-x-full md:translate-x-0" : "w-[280px] max-w-[85vw] translate-x-0", className ?? "")} aria-label="Main navigation">
        <div className="shrink-0 p-3">{brandContent}</div>
        <nav className={cn("no-scrollbar flex-1 overflow-y-auto p-3 text-sm", collapsed ? "flex flex-col items-center gap-1" : "space-y-4")}>{navBody()}</nav>
        <footer className="shrink-0 border-t border-sidebar-border p-3">
          {collapsed ? <div className="flex justify-center"><NavUser collapsed user={currentUser} /></div> : <NavUser collapsed={false} user={currentUser} />}
        </footer>
        {!collapsed && onWidthChange ? <div role="separator" aria-orientation="vertical" aria-label="Ubah lebar sidebar" aria-valuemin={MIN_SIDEBAR_WIDTH} aria-valuemax={MAX_SIDEBAR_WIDTH} aria-valuenow={Math.round(width)} tabIndex={0} onPointerDown={handleResizePointerDown} onKeyDown={handleResizeKeyDown} className="group/resize absolute inset-y-0 right-0 hidden w-2 cursor-col-resize md:block"><span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover/resize:bg-border group-focus-visible/resize:bg-primary" /></div> : null}
      </aside>
    </TooltipProvider>
  )
}
