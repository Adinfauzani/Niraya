"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, SparklesIcon, StoreIcon, UserCircle2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/authClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type PublicNavItem = {
  id: "home" | "menu" | "plans" | "account";
  label: string;
  href: string;
  icon: typeof HomeIcon;
  active: boolean;
};

function initials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "P";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

export function PublicNavigation({
  className,
  variant = "responsive",
}: { className?: string; variant?: "responsive" | "desktop" | "mobile" }) {
  const showDesktop = variant === "responsive" || variant === "desktop";
  const showMobile = variant === "responsive" || variant === "mobile";
  const pathname = usePathname();
  const [session, setSession] = useState<{ user?: { name?: string | null; email?: string | null; image?: string | null } } | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    // Get initial session
    (authClient as any).getSession().then(({ data }: any) => {
      setSession(data?.session ?? null);
      setIsPending(false);
    });

    // Listen for session changes via broadcast channel
    const channel = new BroadcastChannel("better-auth-session");
    channel.addEventListener("message", () => {
      (authClient as any).getSession().then(({ data }: any) => {
        setSession(data?.session ?? null);
      });
    });

    return () => channel.close();
  }, []);

  const user = session?.user ?? null;
  const isAuthed = !!user;

  const [indicator, setIndicator] = useState<{ x: number; w: number; ready: boolean }>({
    x: 0,
    w: 0,
    ready: false,
  });
  const mobileRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  const mobileItems = useMemo<PublicNavItem[]>(() => {
    const accountLabel = isPending ? "Profil" : isAuthed ? "Profil" : "Masuk";
    const accountHref = isPending ? "/login" : isAuthed ? "/profile" : "/login";
    return [
      { id: "home", label: "Beranda", href: "/", icon: HomeIcon, active: pathname === "/" },
      { id: "menu", label: "Menu", href: "/menu", icon: StoreIcon, active: pathname === "/menu" || pathname.startsWith("/menu/") },
      { id: "plans", label: "Plans", href: "/plans", icon: SparklesIcon, active: pathname === "/plans" || pathname.startsWith("/plans/") },
      {
        id: "account",
        label: accountLabel,
        href: accountHref,
        icon: UserCircle2Icon,
        active:
          pathname === "/profile" ||
          pathname.startsWith("/profile/") ||
          (!isAuthed && !isPending && (pathname === "/login" || pathname === "/signup" || pathname === "/register")),
      },
    ];
  }, [isAuthed, isPending, pathname]);

  const activeId = mobileItems.find((i) => i.active)?.id ?? "home";

  useLayoutEffect(() => {
    if (!showMobile) return;
    const update = () => {
      if (window.innerWidth >= 1024) return;
      const ref = mobileRefs.current[activeId];
      const parent = ref?.parentElement;
      if (!ref || !parent) return;
      const pr = parent.getBoundingClientRect();
      const r = ref.getBoundingClientRect();
      setIndicator({ x: r.left - pr.left, w: r.width, ready: true });
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    const activeRef = mobileRefs.current[activeId];
    if (activeRef?.parentElement) ro?.observe(activeRef.parentElement);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [activeId, mobileItems, showMobile]);

  const indicatorStyle = {
    transform: `translateX(${indicator.x}px)`,
    width: `${indicator.w}px`,
    opacity: indicator.ready && indicator.w > 0 ? 1 : 0,
  };

  return (
    <div className={className}>
      {showDesktop ? (
        <nav aria-label="Akun publik" className="hidden items-center lg:flex">
          {isPending ? (
            <Skeleton className="size-9 rounded-full" aria-label="Memuat status akun" />
          ) : isAuthed ? (
            <Link
              href="/profile"
              aria-label="Profil"
              className={cn(
                "group inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/30 text-[12px] font-semibold text-foreground/80 outline-none transition hover:border-border hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
                pathname.startsWith("/profile") && "ring-2 ring-foreground/10",
              )}
            >
              {user?.image ? (
                <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span aria-hidden>{initials(user?.name)}</span>
              )}
            </Link>
          ) : (
            <Button asChild size="sm" className="h-9 rounded-xl px-4">
              <Link href="/register">Daftar</Link>
            </Button>
          )}
        </nav>
      ) : null}

      {showMobile ? (
        <nav
          aria-label="Navigasi publik mobile"
          className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] min-[400px]:px-4 lg:hidden"
        >
          <div
            className="relative mx-auto grid max-w-md grid-cols-4 items-center gap-1 rounded-[26px] border border-border/70 bg-background/84 p-1.5 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.35)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/72 dark:shadow-[0_14px_44px_-22px_rgba(0,0,0,0.55)]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-1.5 left-1.5 top-1.5 rounded-[20px] bg-foreground text-background shadow-sm transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none dark:bg-white dark:text-black"
              style={indicatorStyle}
            />
            {mobileItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  ref={(el) => {
                    mobileRefs.current[item.id] = el;
                  }}
                  aria-current={item.active ? "page" : undefined}
                  aria-label={item.label}
                  className={cn(
                    "relative z-[1] flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-2 py-1.5 text-[11px] font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
                    item.active ? "text-background dark:text-black" : "text-muted-foreground",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-[19px] transition-[transform,opacity] duration-200 motion-reduce:transition-none",
                      item.active ? "translate-y-[-0.5px] scale-[1.03]" : "opacity-80",
                    )}
                  />
                  <span
                    className={cn(
                      "truncate leading-none transition-opacity duration-200 motion-reduce:transition-none",
                      item.active ? "opacity-100" : "opacity-90",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}