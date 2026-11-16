import Link from "next/link";
import { Suspense } from "react";
import { StoreIcon } from "lucide-react";

import { PublicNavigation } from "@/components/public/PublicNavigation";
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
  const store = await resolveStoreBySlug(storeSlug);

  if (!store) {
    return (
      <>
        <div className="flex min-h-svh items-center justify-center bg-background px-6 pb-[calc(env(safe-area-inset-bottom)+6rem)]">
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
        <PublicNavigation variant="mobile" />
      </>
    );
  }

  return (
    <>
      <div className="lg:pt-[57px]">
        <Suspense
          fallback={
            <div className="p-6 pb-[calc(env(safe-area-inset-bottom)+6rem)] text-sm text-muted-foreground">
              Memuat menu...
            </div>
          }
        >
          <StorefrontMenu storeId={store.id} />
        </Suspense>
      </div>
      <PublicNavigation variant="mobile" />
    </>
  );
}