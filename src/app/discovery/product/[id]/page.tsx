import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ImageOff, MapPin, Package, Store, Tag } from "lucide-react";

import { getDiscoveryProductContext } from "@/server/discovery/store";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DiscoveryProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ store?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const product = await getDiscoveryProductContext(id, sp.store || null);
  if (!product) notFound();

  return (
    <div className="min-h-svh bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-10">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-3 min-[400px]:px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link href={`/search/${encodeURIComponent(product.storeSlug)}`} aria-label="Kembali ke toko" className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft className="size-5" /></Link>
            <span className="truncate text-sm font-semibold tracking-tight">Detail produk</span>
          </div>
          <Link href={`/${product.storeSlug}/menu`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12px] font-medium text-background">Pesan di menu <ExternalLink className="size-3.5" /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-3 pt-5 min-[400px]:px-4 sm:px-6">
        <article className="overflow-hidden rounded-3xl border border-border/70 bg-card">
          <div className="grid gap-0 sm:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className="aspect-[4/3] bg-muted/30 sm:aspect-auto sm:min-h-[360px]">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="size-full object-cover" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
              ) : (
                <div className="flex size-full min-h-[240px] items-center justify-center text-muted-foreground"><ImageOff className="size-8" /></div>
              )}
            </div>
            <div className="flex flex-col p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {product.categoryName ? <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"><Tag className="size-3" />{product.categoryName}</span> : null}
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${product.available ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>{product.available ? "Tersedia" : "Stok terbatas"}</span>
              </div>
              <h1 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{product.name}</h1>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{formatCurrency(product.price, product.currency)}</p>
              {product.description ? <p className="mt-4 text-sm leading-6 text-muted-foreground">{product.description}</p> : <p className="mt-4 text-sm leading-6 text-muted-foreground">Informasi detail produk dari toko ini. Ketersediaan dan harga final dikonfirmasi saat pemesanan di menu toko.</p>}

              <div className="mt-6 rounded-2xl border border-border/70 bg-muted/15 p-4">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Dijual oleh</p>
                <Link href={`/search/${encodeURIComponent(product.storeSlug)}`} className="mt-2 flex items-center gap-3 rounded-xl p-1 -m-1 transition hover:bg-muted/30">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-background"><Store className="size-4 text-muted-foreground" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{product.storeName}</span>
                    <span className="block truncate text-[12px] text-muted-foreground">{product.businessName}</span>
                  </span>
                </Link>
              </div>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <Link href={`/${product.storeSlug}/menu`} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background"><Package className="size-4" />Buka di menu & pesan</Link>
                <Link href={`/search/${encodeURIComponent(product.storeSlug)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/70 px-4 text-sm font-medium text-muted-foreground hover:text-foreground"><Store className="size-4" />Detail toko</Link>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Pemesanan, pembayaran, dan checkout lintas-toko tidak tersedia di fase discovery ini. Pesanan diproses melalui menu toko.</p>
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
