"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AlertCircle, ImageOff, PackageSearch, Search, Store } from "lucide-react";
import { useBusinessStore } from "@/stores/business-store";
import { formatCurrency, formatNumber } from "@/lib/format";
import { isLowStock, isOutOfStock } from "@/lib/business-selectors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import type { EntityStatus } from "@/types/business";

type Availability = "all" | "available" | "low" | "out" | "archived";

export function MenuPage() {
  const { products, categories, settings, ready } = useBusinessStore();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [availability, setAvailability] = useState<Availability>("all");
  const [sort, setSort] = useState<"name" | "price-asc" | "price-desc">("name");

  const categoryOptions = useMemo(() => {
    const active = categories.filter((c) => c.status === "active");
    return [{ id: "all", name: "Semua kategori" }, ...active.map((c) => ({ id: c.id, name: c.name }))];
  }, [categories]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = products.filter((p) => {
      if (categoryId !== "all" && p.categoryId !== categoryId) return false;
      if (q && !`${p.name} ${p.sku ?? ""} ${p.barcode ?? ""}`.toLowerCase().includes(q)) return false;
      if (availability === "available") return p.status === "active" && !isOutOfStock(p);
      if (availability === "low") return p.status === "active" && isLowStock(p);
      if (availability === "out") return p.status === "active" && isOutOfStock(p);
      if (availability === "archived") return p.status === "archived";
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      return a.name.localeCompare(b.name, "id");
    });
    return rows;
  }, [products, search, categoryId, availability, sort]);

  if (!ready) {
    return (
      <div className="space-y-4">
        <div className="space-y-1"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-72 max-w-full" /></div>
        <div className="flex flex-col gap-2 sm:flex-row"><Skeleton className="h-10 flex-1" /><Skeleton className="h-10 w-full sm:w-44" /><Skeleton className="h-10 w-full sm:w-44" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl"><Store className="size-5 text-muted-foreground" />Menu</h1>
          <p className="text-sm text-muted-foreground">Katalog produk dari data bisnis{settings?.businessName ? ` — ${settings.businessName}` : ""}. Stok ditampilkan dari catatan inventori saat ini.</p>
        </div>
        <p className="text-sm text-muted-foreground">{formatNumber(filtered.length)} dari {formatNumber(products.length)} produk</p>
      </header>

      <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_220px_220px_180px]" aria-label="Filter menu">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama, SKU, atau barcode..." className="pl-9" aria-label="Cari produk" />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger aria-label="Filter kategori"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>{categoryOptions.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={availability} onValueChange={(v) => setAvailability(v as Availability)}>
          <SelectTrigger aria-label="Filter ketersediaan"><SelectValue placeholder="Ketersediaan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="available">Tersedia</SelectItem>
            <SelectItem value="low">Stok menipis</SelectItem>
            <SelectItem value="out">Habis</SelectItem>
            <SelectItem value="archived">Diarsipkan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger aria-label="Urutkan"><SelectValue placeholder="Urutkan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Nama A-Z</SelectItem>
            <SelectItem value="price-asc">Harga terendah</SelectItem>
            <SelectItem value="price-desc">Harga tertinggi</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {products.length === 0 ? (
        <EmptyState icon={PackageSearch} title="Belum ada produk" description="Produk akan muncul di sini setelah ditambahkan ke katalog bisnis." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Search} title="Tidak ada hasil" description="Coba ubah kata kunci, kategori, atau filter ketersediaan." action={<Button variant="outline" onClick={() => { setSearch(""); setCategoryId("all"); setAvailability("all"); }}>Reset filter</Button>} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="Daftar produk">
          {filtered.map((p) => <ProductCard key={p.id} product={p} categoryName={catById.get(p.categoryId)} />)}
        </section>
      )}
    </div>
  );
}

function statusFor(product: { status: EntityStatus; stock: number; minStock: number }) {
  if (product.status === "archived") return { label: "Diarsipkan", variant: "secondary" as const };
  if (isOutOfStock(product as any)) return { label: "Habis", variant: "destructive" as const };
  if (isLowStock(product as any)) return { label: "Stok menipis", variant: "outline" as const };
  return { label: "Tersedia", variant: "secondary" as const };
}

function ProductCard({ product, categoryName }: { product: ReturnType<typeof useBusinessStore.getState>["products"][number]; categoryName?: string }) {
  const st = statusFor(product);
  const unavailable = product.status !== "active" || isOutOfStock(product);
  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-sm ${unavailable ? "opacity-90" : ""}`}>
      <div className="relative aspect-[4/3] w-full border-b bg-muted/30">
        {product.imageUrl ? (
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 25vw" unoptimized />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageOff className="size-8" aria-hidden /></div>
        )}
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>
      </div>
      <CardContent className="space-y-2 p-3 sm:p-4">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 font-medium leading-tight">{product.name}</h2>
          </div>
          <p className="text-xs text-muted-foreground truncate">{categoryName ?? "Tanpa kategori"}{product.sku ? ` · ${product.sku}` : ""}</p>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-base font-semibold tabular-nums">{formatCurrency(product.price)}</p>
          <p className="text-xs text-muted-foreground">Stok {formatNumber(product.stock)} {product.unit}</p>
        </div>
        {isLowStock(product) && !isOutOfStock(product) ? (
          <p className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-500"><AlertCircle className="size-3.5" />Minimum {formatNumber(product.minStock)} {product.unit}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
