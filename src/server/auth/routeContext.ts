import { cookies } from "next/headers";

import { getSession } from "@/lib/auth";
import { ensureUserProfile } from "@/server/auth/session";
import { requireBusinessContext as resolveBusinessContext } from "@/server/auth/BusinessContext";
import { DEFAULT_STORE_ID } from "@/server/db/schema";

/** Resolve the Better Auth session user, creating the profile on first login. */
export async function requireSession() {
  const session = await getSession();
  const user =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (user?.id) await ensureUserProfile(user);

  return user;
}

/**
 * Resolve the active business/store for the current user, honouring the
 * `niraya_selected_business` / `niraya_selected_store` cookies when present.
 */
export async function requireBusinessContext(): Promise<{
  businessId: string | null;
  storeId: string | null;
}> {
  const cookieStore = await cookies();
  const context = await resolveBusinessContext({
    businessId: cookieStore.get("niraya_selected_business")?.value ?? null,
    storeId: cookieStore.get("niraya_selected_store")?.value ?? null,
  });

  return {
    businessId: context.businessId,
    storeId: context.storeId ?? DEFAULT_STORE_ID,
  };
}