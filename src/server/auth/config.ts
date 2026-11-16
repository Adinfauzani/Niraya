import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { github, google } from "better-auth/social-providers";
import { db } from "@/server/db";
import * as authSchema from "@/server/db/schema/auth";

/**
 * Centralized Better Auth configuration.
 *
 * - Drizzle adapter against Supabase PostgreSQL (existing connection).
 * - Auth tables live in the `core` schema alongside the app tables
 *   (no separate `auth` schema — Supabase's built-in `auth` schema is
 *   reserved for Supabase Auth and is not writable by the app role).
 * - Google + GitHub OAuth enabled.
 * - Email/password, email verification, and password reset are built-in.
 * - Secret comes from `BETTER_AUTH_SECRET` env var.
 */

// Dash plugin (optional — only loaded when BETTER_AUTH_API_KEY is set).
// Get your API key at https://better-auth.com/dashboard
const plugins: any[] = [];
if (process.env.BETTER_AUTH_API_KEY) {
  const { dash } = require("@better-auth/infra") as any;
  plugins.push(
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    })
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
    camelCase: false,
    transaction: false,
  }),
  plugins,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  email: {
    requireEmailVerification: false,
  },
  session: {
    // Cache the session (id/email/name) in a signed cookie so `getSession()`
    // does not hit Postgres on every request. The proxy and route handlers call
    // `getSession()` multiple times per request; without this, each call was
    // 2-3 extra round-trips to Supabase (100-200ms each) and exhausted the
    // session pooler under load. Role is still read fresh from `core.UserProfiles`,
    // so role changes take effect immediately; only session validity is cached.
    cookieCache: {
      enabled: true,
      maxAge: 300, // 5 minutes
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      console.log(`[auth] password reset requested for ${user.email}; url=${url}`);
    },
    onPasswordReset: async ({ user }, request) => {
      console.log(`[auth] password reset completed for ${user.email}`);
    },
  },
  user: {
    additionalFields: {
      legacySupabaseUserId: {
        type: "string",
        required: false,
        defaultValue: null,
      },
    },
  },
  advanced: {
    database: {
      // The drizzle adapter hardcodes `supportsUUIDs: true` for Postgres, so
      // `generateId: "uuid"` defers id generation to the DB default. The auth
      // tables use `varchar(36)` ids with no DB default, which makes inserts
      // fail (null id). Generate the uuid in-app instead.
      generateId: () => crypto.randomUUID(),
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL!,
});
