import { redirect } from "next/navigation";

import { slugifyStoreName } from "@/lib/storeSlug";
import { resolveStoreById } from "@/server/stores/slug";

export const dynamic = "force-dynamic";

/** Legacy /menu: redirect to the store menu when ?store=<id>, else to /search. */
export default async function LegacyMenuPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string | string[] }>;
}) {
  const params = await searchParams;
  const legacyStoreId = typeof params.store === "string" ? params.store : null;

  if (legacyStoreId) {
    const store = await resolveStoreById(legacyStoreId);
    if (store) redirect(`/${slugifyStoreName(store.name)}/menu`);
  }

  redirect("/search");
}