import { PublicNavigation } from "@/components/public/PublicNavigation";
import { StoreDirectory } from "@/features/storefront/StoreDirectory";
import { getStoreDirectory } from "@/server/stores/directory";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const stores = await getStoreDirectory();

  return (
    <>
      <StoreDirectory stores={stores} />
      <PublicNavigation variant="mobile" />
    </>
  );
}