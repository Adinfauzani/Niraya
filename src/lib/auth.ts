import { auth } from "@/server/auth/config";

/**
 * Get the current Better Auth session from the request context.
 *
 * Uses `auth.api.getSession` which reads the session cookie set by the
 * Better Auth route handler at `/api/auth/[...path]`.
 *
 * @returns The session object with `user`, or `null` if not authenticated.
 */
export async function getSession() {
  try {
    // Better Auth's API methods accept a request-like context.
    // In Next.js App Router, we use the `headers()` from `next/headers`
    // to pass the current request headers.
    const { headers } = await import("next/headers");
    const headersStore = await headers();

    const session = await auth.api.getSession({
      headers: headersStore,
    });

    if (!session) return null;

    return { user: session.user, session: session.session };
  } catch {
    return null;
  }
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}