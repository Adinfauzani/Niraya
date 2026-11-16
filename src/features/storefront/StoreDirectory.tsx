"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2Icon,
  ChevronRightIcon,
  MapPinIcon,
  SearchIcon,
  StoreIcon,
  UtensilsCrossedIcon,
  XIcon,
} from "lucide-react";

import { PublicNavigation } from "@/components/public/PublicNavigation";
import { Input } from "@/components/ui/input";

export type StorePopularProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
  sold: number;
};

export type StoreDirectoryItem = {
  id: string;
  name: string;
  slug: string;
  businessId: string;
  businessName: string;
  logoUrl: string | null;
  location: string | null;
  description: string | null;
  phone: string | null;
  popular: StorePopularProduct[];
};

function storeInitial(name: string) {
  return (name.trim()[0] || "S").toUpperCase();
}

function StoreDirectoryCard({ store, showStoreName }: { store: StoreDirectoryItem; showStoreName: boolean }) {
  const hasSales = store.popular.some((product) => product.sold > 0);
  const title = showStoreName ? store.name : store.businessName;
  const subtitle = showStoreName ? store.businessName : null;
  return (
    <Link
      href={`/${store.slug}/menu`}
      aria-label={`Buka menu ${title}`}
      className="group flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_1px_0_rgba(0,0,0,0.02)] outline-none transition duration-200 hover:border-foreground/15 hover:shadow-[0_10px_28px_-20px_rgba(0,0,0,0.35)] focus-visible:ring-2 focus-visible:ring-ring motion-safe:hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-3">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt=""
            className="size-12 shrink-0 rounded-2xl border border-border/60 object-cover"
          />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-muted/50 to-muted/15 text-base font-semibold text-foreground/75">
            {storeInitial(title)}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium leading-5 tracking-tight text-foreground">{title}</span>
          {subtitle ? (
            <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
              <Building2Icon aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{subtitle}</span>
            </span>
          ) : null}
          {store.location ? (
            <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
              <MapPinIcon aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{store.location}</span>
            </span>
          ) : null}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground transition duration-200 group-hover:border-foreground/15 group-hover:text-foreground">
          <ChevronRightIcon aria-hidden="true" className="size-4 transition duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>

      {store.description ? (
        <p className="line-clamp-2 text-[12px] leading-5 text-muted-foreground">{store.description}</p>
      ) : null}

      {store.popular.length ? (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/90">
            {hasSales ? "Paling laku" : "Menu pilihan"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {store.popular.map((product) => (
              <div key={product.id} className="min-w-0">
                <div className="aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/30">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                      <UtensilsCrossedIcon aria-hidden="true" className="size-4" />
                    </div>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] leading-4 text-foreground/80">{product.name}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Link>
  );
}

export function StoreDirectory({ stores }: { stores: StoreDirectoryItem[] }) {
  const [search, setSearch] = useState("");

  const storeCountByBusiness = useMemo(() => {
    const counts = new Map<string, number>();
    for (const store of stores) {
      counts.set(store.businessId, (counts.get(store.businessId) ?? 0) + 1);
    }
    return counts;
  }, [stores]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.businessName.toLowerCase().includes(q) ||
        (s.location || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q),
    );
  }, [stores, search]);

  return (
    <>
      <div className="hidden lg:fixed lg:inset-x-0 lg:top-0 lg:z-40 lg:block lg:border-b lg:border-border/60 lg:bg-background/95 lg:backdrop-blur supports-[backdrop-filter]:lg:bg-background/85">
        <div className="mx-auto flex h-[57px] max-w-6xl items-center justify-between gap-3 px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/20 text-muted-foreground">
              <StoreIcon aria-hidden="true" className="size-4" />
            </span>
            <span className="min-w-0 truncate text-sm font-medium tracking-tight">Menu Toko</span>
          </div>
          <PublicNavigation variant="desktop" />
        </div>
      </div>

      <div className="min-h-svh bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-10 lg:pt-[57px]">
        <header className="border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="mx-auto max-w-6xl px-3 pt-[max(0.75rem,env(safe-area-inset-top))] min-[400px]:px-4 sm:px-6">
            <div className="flex items-center gap-2.5 pb-2.5 lg:hidden">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-muted-foreground">
                <StoreIcon aria-hidden="true" className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[15px] font-semibold tracking-tight">Menu Toko</h1>
                <p className="truncate text-[12px] text-muted-foreground">Temukan toko pilihanmu</p>
              </div>
            </div>
            <div className="pb-2.5">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama toko atau bisnis..."
                  className="h-10 rounded-xl border-border/60 bg-muted/15 pl-9 pr-9 shadow-none focus-visible:bg-background"
                  aria-label="Cari toko"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Hapus pencarian"
                  >
                    <XIcon className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-3 pt-3 min-[400px]:px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 text-[12px] text-muted-foreground">
            <p><span className="font-medium text-foreground/80">{filtered.length}</span> toko</p>
            <p className="truncate text-right">Pilih toko untuk melihat menu</p>
          </div>

          {filtered.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/40 px-4 py-12 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-background">
                <StoreIcon className="size-5 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium">{stores.length ? "Tidak ada toko yang cocok" : "Belum ada toko terdaftar"}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {stores.length ? "Coba kata kunci lain." : "Toko yang aktif akan tampil di sini."}
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {filtered.map((store) => (
                <StoreDirectoryCard
                  key={store.id}
                  store={store}
                  showStoreName={(storeCountByBusiness.get(store.businessId) ?? 0) > 1}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}