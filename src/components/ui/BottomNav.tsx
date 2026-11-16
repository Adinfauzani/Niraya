"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, LayoutDashboard, LogIn, User } from "lucide-react"
import { useSyncExternalStore } from "react"

import {
  BottomNavigation,
  BottomNavigationHighlight,
  BottomNavigationHighlightItem,
  BottomNavigationItem,
  BottomNavigationLabel,
} from "@animate-ui/react/primitives/bottom-navigation"

import { useAuth } from "@/hooks/useAuth"

/**
 * Rute di dalam aplikasi (dashboard/POS) dan alur auth. Bottom nav hanya
 * ditampilkan di halaman publik di luar dashboard.
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
  "/orders",
  "/onboarding",
  "/profile",
  "/login",
  "/register",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
] as const;

function isHiddenPath(pathname: string): boolean {
  return HIDE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getActiveValue(pathname: string): string {
  if (pathname === "/" || pathname.startsWith("/#")) return "home";
  if (pathname === "/plans" || pathname.startsWith("/plans/")) return "plans";
  return "account";
}

const itemClassName =
  "flex h-[3.875rem] w-[4.875rem] flex-col items-center justify-center pt-[5px] data-[minimized]:size-12 data-[minimized]:pt-0";

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
  const { user } = useAuth()
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getServerSnapshot,
  )

  if (isDesktop || isHiddenPath(pathname)) return null;

  return (
    <>
      {/* Spacer agar konten tidak tertutup bottom bar yang fixed. */}
      <div className="h-20" aria-hidden="true" />
      <BottomNavigation
        value={getActiveValue(pathname)}
        scrollBehavior="minimize"
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit items-center gap-2.5"
      >
        <BottomNavigationHighlight className="absolute inset-x-0 inset-y-1 rounded-full bg-muted">
          <ul className="flex rounded-full bg-background px-1 ring-1 ring-border">
            <li>
              <BottomNavigationHighlightItem value="home">
                <BottomNavigationItem value="home" asChild>
                  <Link href="/" className={itemClassName}>
                    <Home className="size-5" aria-hidden="true" />
                    <BottomNavigationLabel className="pt-[5px] text-xs">
                      Beranda
                    </BottomNavigationLabel>
                  </Link>
                </BottomNavigationItem>
              </BottomNavigationHighlightItem>
            </li>
            <li>
              <BottomNavigationHighlightItem value="plans">
                <BottomNavigationItem value="plans" asChild>
                  <Link href="/plans" className={itemClassName}>
                    <LayoutDashboard className="size-5" aria-hidden="true" />
                    <BottomNavigationLabel className="pt-[5px] text-xs">
                      Plans
                    </BottomNavigationLabel>
                  </Link>
                </BottomNavigationItem>
              </BottomNavigationHighlightItem>
            </li>
            <li>
              <BottomNavigationHighlightItem value="account">
                <BottomNavigationItem value="account" asChild>
                  <Link
                    href={user ? "/profile" : "/login"}
                    className={itemClassName}
                  >
                    {user ? (
                      <User className="size-5" aria-hidden="true" />
                    ) : (
                      <LogIn className="size-5" aria-hidden="true" />
                    )}
                    <BottomNavigationLabel className="pt-[5px] text-xs">
                      {user ? "Profil" : "Masuk"}
                    </BottomNavigationLabel>
                  </Link>
                </BottomNavigationItem>
              </BottomNavigationHighlightItem>
            </li>
          </ul>
        </BottomNavigationHighlight>
      </BottomNavigation>
    </>
  );
}