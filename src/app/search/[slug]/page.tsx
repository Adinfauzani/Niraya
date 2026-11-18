import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock3, ExternalLink, ImageOff, MapPin, Package, Phone, Sparkles, Store, Tag } from "lucide-react";

import { getDiscoveryStoreDetail } from "@/server/discovery/store";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

function Img({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) return <div className={`flex items-center justify-center bg-muted/40 text-muted-foreground ${className || ""}`}><ImageOff className="size-5" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" className={className} />;
}

export default async function StoreDiscoveryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getDiscoveryStoreDetail(slug);
  if (!store) notFound();

  return (
    <div className="min-h-svh bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-3 min-[400px]:px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/search" aria-label="Kembali" className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft className="size-5" /></Link>
            <span className="truncate text-sm font-semibold tracking-tight">{store.name}</span>
          </div>
          <Link href={`/${store.slug}/menu`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12px] font-medium text-background">Lihat menu <ExternalLink className="size-3.5" /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-3 pt-5 min-[400px]:px-4 sm:px-6">
        <section className="rounded-3xl border border-border/70 bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="size-16 shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/30 sm:size-20">
              {store.logoUrl ? <Img src={store.logoUrl} alt={store.name} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-lg font-semibold">{store.name.slice(0,1).toUpperCase()}</div>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{store.name}</h1>
                {store.hasPromotion ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300"><Sparkles className="size-3.5" />Promo aktif</span> : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{store.businessName}{store.categoryLabel ? ` · ${store.categoryLabel}` : ""}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
                {store.location ? <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{store.location}</span> : null}
                {store.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="size-4" />{store.phone}</span> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1"><Package className="size-3.5" />{store.productCount} produk</span>
                {store.soldCount > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1"><Sparkles className="size-3.5" />{store.soldCount} terjual</span> : null}
              </div>
            </div>
          </div>
          {store.description ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{store.description}</p> : null}
          {store.promoLabels.length ? (
            <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Promosi tersedia</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {store.promoLabels.map((p, i) => <li key={i} className="rounded-full bg-background/70 px-3 py-1 text-[12px] text-foreground/80">{p}</li>)}
              </ul>
            </div>
          ) : null}
        </section>

        {store.categories.length ? (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Tag className="size-4 text-muted-foreground" />Kategori</h2>
            <div className="flex flex-wrap gap-2">
              {store.categories.map((c) => <span key={c.id} className="rounded-full border border-border/70 bg-card px-3 py-1.5 text-[12px] font-medium">{c.name}</span>)}
            </div>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Package className="size-4 text-muted-foreground" />Produk</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">Pilihan produk dari toko ini. Buka menu untuk memesan.</p>
            </div>
            <Link href={`/${store.slug}/menu`} className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground">Buka menu <ChevronRight className="size-3.5" /></Link>
          </div>
          {store.products.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {store.products.map((p) => (
                <Link key={p.id} href={`/discovery/product/${encodeURIComponent(p.id)}?store=${encodeURIComponent(store.slug)}`} className="group overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-foreground/15 hover:shadow-sm">
                  <div className="aspect-[4/3] bg-muted/30">
                    {p.imageUrl ? <Img src={p.imageUrl} alt={p.name} className="size-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><ImageOff className="size-5" /></div>}
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-[13px] font-medium leading-5">{p.name}</p>
                    <p className="mt-1 text-[13px] font-semibold tabular-nums">{formatCurrency(p.price, p.currency)}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${p.available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{p.available ? "Tersedia" : "Stok terbatas"}</span>
                      {p.categoryName ? <span className="truncate text-[10px] text-muted-foreground">{p.categoryName}</span> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/70 p-10 text-center">
              <Store className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Belum ada produk tersedia</p>
              <p className="mt-1 text-sm text-muted-foreground">Produk akan tampil di sini saat tersedia.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
