"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  ChevronRight,
  Clock3,
  Compass,
  ImageOff,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Search,
  Sparkles,
  Store,
  Tag,
  UserCircle2,
  UtensilsCrossed,
  X,
} from "lucide-react";

import type {
  DiscoveryBanner,
  DiscoveryCategory,
  DiscoveryProduct,
  DiscoverySearchResult,
  DiscoveryStore,
  HomeDiscoveryData,
} from "@/server/discovery/home";
import { cn } from "@/lib/utils";

type CurrentUser = { name?: string | null; email?: string | null; image?: string | null } | null;

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  createdAt: string;
  readAt: string | null;
};

function initials(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "N";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("");
}

function formatIDR(value: number, currency = "IDR") {
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
  }
}

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function ProductImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn("size-full object-cover", className)} />;
  }
  return (
    <div className={cn("flex size-full items-center justify-center bg-muted/40 text-muted-foreground", className)}>
      <ImageOff className="size-5" aria-hidden />
    </div>
  );
}

function StoreAvatar({ src, name, className }: { src: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt={name} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={cn("size-full object-cover", className)} />;
  }
  return (
    <div className={cn("flex size-full items-center justify-center bg-muted/50 text-sm font-semibold text-foreground/70", className)}>
      {initials(name)}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon: Icon, href }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }>; href?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon ? <span className="flex size-7 items-center justify-center rounded-lg bg-foreground/[0.04] text-foreground/70"><Icon className="size-4" /></span> : null}
          <h2 className="text-[15px] font-semibold tracking-tight sm:text-base">{title}</h2>
        </div>
        {subtitle ? <p className="mt-1 text-[12px] leading-5 text-muted-foreground sm:text-[13px]">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium text-muted-foreground transition hover:text-foreground">
          Lihat semua <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function StoreCard({ store, detailHref }: { store: DiscoveryStore; detailHref?: string }) {
  const href = detailHref || `/${store.slug}/menu`;
  return (
    <div className="group flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-3 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:border-foreground/15 hover:shadow-sm">
      <Link href={href} className="flex items-start gap-3">
        <span className="size-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-muted/30">
          <StoreAvatar src={store.logoUrl} name={store.name} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium leading-5">{store.name}</span>
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{store.businessName}</span>
          {store.location ? (
            <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{store.location}</span>
            </span>
          ) : null}
        </span>
      </Link>
      {store.description ? <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{store.description}</p> : null}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        {store.categoryLabel ? <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5"><Tag className="size-3" />{store.categoryLabel}</span> : null}
        <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5"><Package className="size-3" />{store.productCount} produk</span>
        {store.hasPromotion ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300"><Sparkles className="size-3" />Promo</span> : null}
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/${store.slug}/menu`} className="inline-flex h-8 flex-1 items-center justify-center rounded-lg bg-foreground text-[12px] font-medium text-background">Lihat menu</Link>
        <Link href={href} className="inline-flex h-8 items-center justify-center rounded-lg border border-border/70 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground">Detail</Link>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: DiscoveryProduct }) {
  const href = `/${product.storeSlug}/menu?product=${encodeURIComponent(product.id)}`;
  return (
    <Link href={href} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-foreground/15 hover:shadow-sm">
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted/30">
        <ProductImage src={product.imageUrl} alt={product.name} className="transition duration-300 group-hover:scale-[1.02]" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-3">
        <p className="line-clamp-2 text-[13px] font-medium leading-5">{product.name}</p>
        <p className="mt-1 text-[13px] font-semibold tabular-nums text-foreground">{formatIDR(product.price, product.currency)}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{product.storeName} · {product.businessName}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", product.available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground")}>
            {product.available ? "Tersedia" : "Stok terbatas"}
          </span>
          {product.categoryName ? <span className="truncate text-[10px] text-muted-foreground">{product.categoryName}</span> : null}
        </div>
      </div>
    </Link>
  );
}

function BannerCarousel({ banners }: { banners: DiscoveryBanner[] }) {
  const [idx, setIdx] = useState(0);
  const count = banners.length;
  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count]);
  if (!count) {
    return (
      <div className="flex h-40 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-muted/20 px-6 text-center sm:h-48">
        <div>
          <p className="text-sm font-medium">Sorotan segera hadir</p>
          <p className="mt-1 text-xs text-muted-foreground">Jelajahi toko dan produk pilihan di bawah ini.</p>
        </div>
      </div>
    );
  }
  const b = banners[idx]!;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--foreground)_6%,var(--background)),var(--background))]">
      <div className="relative z-[1] flex min-h-[168px] flex-col justify-between p-5 sm:min-h-[196px] sm:p-7">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
          <Sparkles className="size-3.5" /> {b.label}
        </span>
        <div className="max-w-xl pr-24">
          <p className="text-lg font-semibold tracking-tight sm:text-2xl">{b.title}</p>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.subtitle}</p>
          <Link href={b.href} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90">
            Lihat toko <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
      {b.imageUrl ? (
        <div className="absolute bottom-4 right-4 size-16 overflow-hidden rounded-2xl border border-border/60 bg-background shadow-sm sm:bottom-6 sm:right-6 sm:size-20">
          <StoreAvatar src={b.imageUrl} name={b.title} />
        </div>
      ) : null}
      {count > 1 ? (
        <div className="absolute bottom-3 left-5 z-[2] flex gap-1.5 sm:bottom-4 sm:left-7">
          {banners.map((_, i) => (
            <button key={i} type="button" aria-label={`Sorotan ${i + 1}`} onClick={() => setIdx(i)} className={cn("h-1.5 rounded-full transition-all", i === idx ? "w-5 bg-foreground/70" : "w-1.5 bg-foreground/20 hover:bg-foreground/35")} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HomePage({ data, user }: { data: HomeDiscoveryData; user: CurrentUser }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const [notifAuthed, setNotifAuthed] = useState<boolean | null>(null);

  const [searching, setSearching] = useState(false);
  const [searchRes, setSearchRes] = useState<DiscoverySearchResult | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const debouncedQ = useDebounced(query, 350);
  const activeSearch = debouncedQ.trim().length > 0 || !!category || !!coords;

  useEffect(() => {
    if (!activeSearch) {
      setSearchRes(null);
      return;
    }
    const ctrl = new AbortController();
    setSearching(true);
    const sp = new URLSearchParams();
    if (debouncedQ.trim()) sp.set("q", debouncedQ.trim());
    if (category) sp.set("category", category);
    if (coords) { sp.set("lat", String(coords.lat)); sp.set("lng", String(coords.lng)); }
    sp.set("limit", "24");
    fetch(`/api/discovery/search?${sp.toString()}`, { signal: ctrl.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setSearchRes(json as DiscoverySearchResult))
      .catch((e) => { if (e?.name !== "AbortError") setSearchRes({ stores: [], products: [], categories: [], query: debouncedQ.trim(), category, usedLocation: !!coords }); })
      .finally(() => setSearching(false));
    return () => ctrl.abort();
  }, [debouncedQ, category, coords, activeSearch]);

  useEffect(() => {
    if (!notifOpen) return;
    fetch("/api/discovery/notifications", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => { setNotifs(Array.isArray(j?.items) ? j.items : []); setNotifAuthed(!!j?.authenticated); })
      .catch(() => { setNotifs([]); setNotifAuthed(false); });
  }, [notifOpen]);

  const watchIdRef = useRef<number | null>(null);
  const lastGeocodedRef = useRef<{ lat: number; lng: number } | null>(null);
  const [liveLocation, setLiveLocation] = useState(false);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && "geolocation" in navigator) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Reverse-geocode the device coordinate into a place label (e.g. "Gunung Putri").
  // Debounced + throttled: only re-query after movement settles or the point moved
  // ~300m, so Nominatim is not hammered by watchPosition updates.
  useEffect(() => {
    if (!coords) {
      lastGeocodedRef.current = null;
      return;
    }
    const last = lastGeocodedRef.current;
    if (last) {
      const dLat = coords.lat - last.lat;
      const dLng = coords.lng - last.lng;
      if (Math.sqrt(dLat * dLat + dLng * dLng) < 0.003) return; // ~300m
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/discovery/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        const label = typeof data?.label === "string" ? data.label : null;
        if (label) {
          setLocationLabel(label);
          lastGeocodedRef.current = { lat: coords.lat, lng: coords.lng };
        }
      } catch {
        // keep the generic status label on failure
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coords]);

  function stopLiveLocation() {
    if (watchIdRef.current != null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLiveLocation(false);
    setCoords(null);
    setLocationLabel(null);
  }

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      return;
    }
    // Toggle real-time watch when already tracking; otherwise start live tracking.
    if (liveLocation && watchIdRef.current != null) {
      stopLiveLocation();
      return;
    }
    setLocBusy(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLiveLocation(true);
        setLocBusy(false);
      },
      () => {
        setLocBusy(false);
        setLiveLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  }

  const storeDetailHref = (s: DiscoveryStore) => `/search/${encodeURIComponent(s.slug)}`;

  return (
    <div className="min-h-svh bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 min-[400px]:px-4 sm:px-6">
          <Link href="/home" className="flex min-w-0 items-center gap-2">
            <Image src="/Logo.png" alt="Niraya" width={32} height={32} className="size-8 rounded-lg object-contain" priority />
            <span className="truncate text-sm font-semibold tracking-tight">Niraya</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={requestLocation} className="hidden max-w-[220px] items-center gap-1.5 rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-[12px] text-muted-foreground transition hover:text-foreground sm:flex">
              {locBusy ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
              <span className="truncate">{liveLocation && locationLabel ? locationLabel : "Location"}</span>
            </button>
            <div className="relative">
              <button type="button" aria-label="Notifikasi" onClick={() => setNotifOpen((v) => !v)} className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <Bell className="size-[18px]" />
                {notifAuthed && notifs.length ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-foreground" /> : null}
              </button>
              {notifOpen ? (
                <div className="absolute right-0 top-11 z-40 w-80 max-w-[85vw] rounded-2xl border border-border/70 bg-popover p-2 shadow-lg">
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-sm font-medium">Notifikasi</p>
                    <button type="button" onClick={() => setNotifOpen(false)} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                  </div>
                  {!notifAuthed ? (
                    <p className="px-2 py-3 text-xs text-muted-foreground">{user ? "Tidak ada notifikasi baru." : "Masuk untuk melihat notifikasi akun Anda."}</p>
                  ) : notifs.length ? (
                    <ul className="max-h-72 space-y-1 overflow-auto">
                      {notifs.map((n) => (
                        <li key={n.id} className="rounded-xl px-2 py-2 hover:bg-muted/40">
                          <p className="text-[13px] font-medium leading-5">{n.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{n.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="px-2 py-3 text-xs text-muted-foreground">Tidak ada notifikasi baru.</p>}
                </div>
              ) : null}
            </div>
            {user ? (
              <Link href="/profile" aria-label="Profil" className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted/30 text-[12px] font-semibold">
                {user.image ? <img src={user.image} alt="" className="size-full object-cover" referrerPolicy="no-referrer" /> : initials(user.name)}
              </Link>
            ) : (
              <Link href="/login" className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/60 px-3 text-[12px] font-medium transition hover:bg-muted">
                <UserCircle2 className="size-4" /> Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-3 pt-4 min-[400px]:px-4 sm:space-y-10 sm:px-6 sm:pt-6">
        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari toko, produk, atau kategori..." className="h-12 w-full rounded-2xl border border-border/70 bg-muted/15 pl-11 pr-10 text-sm shadow-none outline-none transition placeholder:text-muted-foreground focus:border-foreground/20 focus:bg-background" aria-label="Cari di Niraya" />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 sm:hidden">
            <button type="button" onClick={requestLocation} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] transition", liveLocation ? "border-foreground/20 bg-foreground text-background" : "border-border/60 text-muted-foreground")}>
              {locBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Navigation className="size-3.5" />} {liveLocation && locationLabel ? locationLabel : "Location"}
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[12px] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => setCategory(null)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition", !category ? "border-foreground/20 bg-foreground text-background" : "border-border/70 bg-background text-muted-foreground hover:text-foreground")}>
              <Compass className="size-3.5" /> Semua
            </button>
            {data.categories.map((c: DiscoveryCategory) => (
              <button key={c.id} type="button" onClick={() => setCategory((v) => (v === c.name ? null : c.name))} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition", category === c.name ? "border-foreground/20 bg-foreground text-background" : "border-border/70 bg-background text-muted-foreground hover:text-foreground")}>
                <Tag className="size-3.5" /> {c.name}{c.count ? <span className="text-[11px] opacity-70">({c.count})</span> : null}
              </button>
            ))}
          </div>
        </section>

        {activeSearch ? (
          <section className="space-y-6">
            <SectionHeader title="Hasil pencarian" subtitle={searching ? "Mencari..." : `${searchRes?.stores.length ?? 0} toko · ${searchRes?.products.length ?? 0} produk${coords ? " · dekat Anda" : ""}`} icon={Search} />
            {searching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Memuat hasil dari pencarian...</div>
            ) : null}
            {searchRes?.products.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
                {searchRes.products.map((p) => <ProductCard key={`${p.storeId}-${p.id}`} product={p} />)}
              </div>
            ) : null}
            {searchRes?.stores.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                {searchRes.stores.map((s) => <StoreCard key={s.id} store={s} detailHref={storeDetailHref(s)} />)}
              </div>
            ) : null}
            {!searching && !searchRes?.products.length && !searchRes?.stores.length ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
                <Search className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Tidak ada hasil</p>
                <p className="mt-1 text-sm text-muted-foreground">Coba kata kunci, kategori, atau lokasi lain.</p>
              </div>
            ) : null}
          </section>
        ) : (
          <>
            <section><BannerCarousel banners={data.banners} /></section>

            {data.categories.length ? (
              <section className="space-y-3">
                <SectionHeader title="Kategori usaha" subtitle="Jelajahi berbagai jenis UMKM di Niraya" icon={Tag} />
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {data.categories.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setCategory(c.name); searchRef.current?.focus(); }} className="flex min-w-[132px] items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-3 text-left transition hover:border-foreground/15 hover:bg-muted/20">
                      <span className="flex size-9 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground"><UtensilsCrossed className="size-4" /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium">{c.name}</span>
                        <span className="block text-[11px] text-muted-foreground">{c.count ? `${c.count} produk` : "Kategori"}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {data.featuredStores.length ? (
              <section className="space-y-3">
                <SectionHeader title="Toko pilihan" subtitle="Sorotan dari ekosistem Niraya" icon={Sparkles} href="/search" />
                <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
                  {data.featuredStores.map((s) => <div key={s.id} className="w-[260px] shrink-0 sm:w-[280px]"><StoreCard store={s} detailHref={storeDetailHref(s)} /></div>)}
                </div>
              </section>
            ) : null}

            {data.nearbyStores.length ? (
              <section className="space-y-3">
                <SectionHeader title={coords ? "Toko di dekat Anda" : data.hasLocation ? "Toko di sekitar" : "Jelajahi toko"} subtitle={coords ? (liveLocation ? "Diurutkan dari lokasi Anda secara real-time (berdasarkan info lokasi toko)" : "Diurutkan dari lokasi Anda (berdasarkan info lokasi toko)") : data.hasLocation ? "Berdasarkan informasi lokasi toko yang tersedia" : "Aktifkan lokasi untuk urutan terdekat; menampilkan toko yang tersedia"} icon={MapPin} href="/search" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                  {data.nearbyStores.slice(0, 6).map((s) => <StoreCard key={s.id} store={s} detailHref={storeDetailHref(s)} />)}
                </div>
              </section>
            ) : null}

            {data.popularProducts.length ? (
              <section className="space-y-3">
                <SectionHeader title="Produk populer" subtitle="Produk yang banyak dipesan di Niraya" icon={Sparkles} />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
                  {data.popularProducts.slice(0, 8).map((p) => <ProductCard key={`pop-${p.storeId}-${p.id}`} product={p} />)}
                </div>
              </section>
            ) : null}

            {data.recommendedStores.length ? (
              <section className="space-y-3">
                <SectionHeader title="Rekomendasi untukmu" subtitle="Berdasarkan ketersediaan produk dan aktivitas toko" icon={Compass} href="/search" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                  {data.recommendedStores.slice(0, 6).map((s) => <StoreCard key={`rec-${s.id}`} store={s} detailHref={storeDetailHref(s)} />)}
                </div>
              </section>
            ) : null}

            {data.recentProducts.length || data.recentStores.length ? (
              <section className="space-y-3">
                <SectionHeader title="Baru ditambahkan" subtitle="Produk dan toko terbaru di platform" icon={Clock3} />
                {data.recentProducts.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
                    {data.recentProducts.slice(0, 8).map((p) => <ProductCard key={`new-${p.storeId}-${p.id}`} product={p} />)}
                  </div>
                ) : null}
                {data.recentStores.length ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                    {data.recentStores.slice(0, 3).map((s) => <StoreCard key={`news-${s.id}`} store={s} detailHref={storeDetailHref(s)} />)}
                  </div>
                ) : null}
              </section>
            ) : null}

            {!data.stores.length ? (
              <section className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
                <Store className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">Belum ada toko untuk dijelajahi</p>
                <p className="mt-1 text-sm text-muted-foreground">Toko aktif akan muncul di sini saat tersedia.</p>
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
