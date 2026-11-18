"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ClipboardList, Home, Search, User } from "lucide-react"

import {
  BottomNavigation,
  BottomNavigationAccessory,
  BottomNavigationHighlight,
  BottomNavigationHighlightItem,
  BottomNavigationItem,
  BottomNavigationLabel,
} from "@animate-ui/react/primitives/bottom-navigation"

import { useAuth } from "@/hooks/useAuth"

/**
 * Rute di dalam aplikasi (dashboard/POS), alur auth, dan storefront/checkout.
 * Bottom nav hanya ditampilkan di halaman publik umum; alur pemesanan/menu
 * punya CTA bawah sendiri agar tidak tertutup/tidak saling tumpang-tindih.
 */
const HIDE_PREFIXES = [
  "/dashboard",
  "/pos",
  "/products",
  "/inventory",
  "/customers",
  "/staff",
  "/reports",
  "/settings",
  "/categories",
  "/suppliers",
  "/purchases",
  "/transactions",
  // Staf /orders (bukan /orders/me) memakai layout dashboard.
  "/orders",
  "/onboarding",
  "/login",
  "/register",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
] as const;

function isHiddenPath(pathname: string): boolean {
  // /orders/me adalah aktivitas pengguna (punya nav ini); /orders lainnya dashboard.
  if (pathname === "/orders/me" || pathname.startsWith("/orders/me/")) return false;
  if (
    HIDE_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  // Checkout & store menu flows have their own bottom CTAs; keep floating nav off them.
  if (pathname === "/menu/checkout" || pathname.startsWith("/menu/checkout/")) return true;
  const segs = pathname.split("/").filter(Boolean);
  // /{storeSlug}/menu (public storefront menu)
  if (segs.length >= 2 && segs[1] === "menu") return true;
  return false;
}

function getActiveValue(pathname: string): string {
  if (pathname === "/home" || pathname.startsWith("/home/")) return "home";
  if (pathname === "/search" || pathname.startsWith("/search/")) return "search";
  if (pathname === "/orders/me" || pathname.startsWith("/orders/me/")) return "activity";
  return "none";
}

const itemClassName =
  "flex h-[3.875rem] w-[4.875rem] flex-col items-center justify-center pt-[5px] data-[minimized]:size-12 data-[minimized]:pt-0";

const ITEMS = [
  { value: "home", label: "Beranda", href: "/home", Icon: Home },
  { value: "search", label: "Cari", href: "/search", Icon: Search },
  { value: "activity", label: "Aktivitas", href: "/orders/me", Icon: ClipboardList },
] as const;

const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribeDesktop(callback: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function BottomNav() {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getServerSnapshot,
  )

  if (isDesktop || isHiddenPath(pathname) || loading || !user) return null;

  const activeValue = getActiveValue(pathname);

  return (
    <>
      {/* Spacer agar konten tidak tertutup bottom bar yang fixed. */}
      <div className="h-20" aria-hidden="true" />
      <BottomNavigation
        value={activeValue === "none" ? undefined : activeValue}
        scrollBehavior="minimize"
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-2.5"
      >
        <BottomNavigationHighlight className="absolute inset-x-0 inset-y-1 rounded-full bg-muted">
          <ul className="flex items-center rounded-full bg-background px-1 ring-1 ring-border">
            {ITEMS.map(({ value, label, href, Icon }) => (
              <li key={value}>
                <BottomNavigationHighlightItem value={value}>
                  <BottomNavigationItem value={value} asChild>
                    <Link href={href} aria-label={label} className={itemClassName}>
                      <Icon className="size-5" aria-hidden="true" />
                      <BottomNavigationLabel className="pt-[5px] text-xs">
                        {label}
                      </BottomNavigationLabel>
                    </Link>
                  </BottomNavigationItem>
                </BottomNavigationHighlightItem>
              </li>
            ))}
          </ul>
        </BottomNavigationHighlight>
        <BottomNavigationAccessory className="size-[3.875rem] rounded-full bg-background p-1 shadow-lg ring-1 ring-border data-[minimized]:size-12">
          <Link
            href="/profile"
            aria-label="Profil"
            className="flex size-full items-center justify-center rounded-full text-muted-foreground outline-none transition-colors duration-300 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <User className="size-5" aria-hidden="true" />
          </Link>
        </BottomNavigationAccessory>
      </BottomNavigation>
    </>
  );
}