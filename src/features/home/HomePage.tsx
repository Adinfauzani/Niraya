"use client";

import Link from "next/link";
import { ClipboardList, Search, Store, User } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const LINKS = [
  {
    href: "/search",
    title: "Cari toko & menu",
    description: "Temukan toko, lihat menu, dan pesan.",
    icon: Search,
  },
  {
    href: "/orders/me",
    title: "Aktivitas pesanan",
    description: "Lihat status dan riwayat pesanan Anda.",
    icon: ClipboardList,
  },
  {
    href: "/profile",
    title: "Profil",
    description: "Kelola akun dan informasi Anda.",
    icon: User,
  },
];

export function HomePage() {
  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,color-mix(in_oklab,var(--muted)_24%,transparent),transparent_220px)] pb-[calc(env(safe-area-inset-bottom)+6.5rem)] dark:bg-background">
      <div className="mx-auto w-full max-w-xl px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl border border-border/60 bg-card shadow-sm">
            <Store className="size-5 text-foreground/80" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Beranda</h1>
            <p className="text-sm text-muted-foreground">Pesan dan pantau aktivitas Anda.</p>
          </div>
        </header>

        <div className="space-y-3">
          {LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="block outline-none">
                <Card className="rounded-2xl border-border/70 shadow-none transition hover:bg-muted/20">
                  <CardContent className="flex items-center gap-3 p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/25 text-muted-foreground">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.title}</span>
                      <span className="block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
