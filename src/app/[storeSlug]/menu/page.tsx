import Link from "next/link";
import { Suspense } from "react";
import { StoreIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { StorefrontMenu } from "@/features/storefront/StorefrontMenu";
import { resolveStoreBySlug } from "@/server/stores/slug";

export const dynamic = "force-dynamic";

export default async function StoreMenuPage({
  params,
}: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await params;

  let store: Awaited<ReturnType<typeof resolveStoreBySlug>> = null;
  let loadError = false;
  try {
    store = await resolveStoreBySlug(storeSlug);
  } catch {
    loadError = true;
  }

  if (loadError) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6 pb-6">
        <EmptyState
          icon={StoreIcon}
          title="Tidak dapat memuat toko"
          description="Terjadi gangguan sementara. Silakan muat ulang halaman."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/search">Kembali ke pencarian</Link>
            </Button>
          }
          className="max-w-md border-border/60 bg-card/50"
        />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6 pb-6">
        <EmptyState
          icon={StoreIcon}
          title="Toko tidak ditemukan"
          description="Tautan toko tidak valid atau sudah tidak tersedia."
          action={
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/search">Cari toko</Link>
            </Button>
          }
          className="max-w-md border-border/60 bg-card/50"
        />
      </div>
    );
  }

  return (
    <div className="lg:pt-[57px]">
      <Suspense
        fallback={
          <div className="p-6 pb-6 text-sm text-muted-foreground">
            Memuat menu...
          </div>
        }
      >
        <StorefrontMenu storeId={store.id} />
      </Suspense>
    </div>
  );
}