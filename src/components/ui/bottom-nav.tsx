"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutDashboard, User, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"

export function BottomNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const navItems = [
    { href: "/", label: "Beranda", icon: Home },
    { href: "/plans", label: "Plans", icon: LayoutDashboard },
    { href: user ? "/profile" : "/login", label: user ? "Profil" : "Masuk", icon: user ? User : LogIn },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 xl:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-6xl flex items-center justify-around px-2 py-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}