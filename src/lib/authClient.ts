import { createAuthClient } from "better-auth/client";

/**
 * Better Auth client for use in client components.
 *
 * Uses `NEXT_PUBLIC_APP_URL` as the base URL. The route handler lives at
 * `/api/auth/[...path]`.
 *
 * Social providers (Google, GitHub) are configured server-side in
 * `src/server/auth/config.ts`. The client uses dynamic path proxying;
 * methods like `signIn.email`, `signUp.email`, `social.login`, `signOut`
 * are available at runtime.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
}) as any;

export type AuthClient = typeof authClient;