/**
 * Re-export Better Auth tables from the `core` schema.
 *
 * Better Auth tables live in the `core` schema alongside the app tables
 * (no separate `auth` schema — Supabase's built-in `auth` schema is reserved
 * for Supabase Auth and is not writable by the app role).
 */
export {
  authUser as user,
  authSession as session,
  authAccount as account,
  authVerification as verification,
} from "./core";