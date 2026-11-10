import { pgSchema, varchar, text, boolean, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * Better Auth 1.7.x database schema.
 *
 * Tables live in the dedicated `auth` schema, separate from the 13 business
 * domain schemas. Generated to match the Better Auth schema contract.
 *
 * Column names follow Better Auth's snake_case convention by default
 * (`camelCase: false` in the adapter config).
 */
export const authSchema = pgSchema("auth");

export const user = authSchema.table("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name").notNull(),
  image: text("image"),
  // Legacy Supabase user ID for identity mapping (nullable).
  // Set during migration tooling; null for new users.
  legacySupabaseUserId: text("legacy_supabase_user_id"),
});

export const session = authSchema.table("session", {
  id: varchar("id", { length: 36 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const account = authSchema.table("account", {
  id: varchar("id", { length: 36 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  providerId: text("provider_id").notNull(),
  accountId: text("account_id").notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
});

export const verification = authSchema.table("verification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  identifier: text("identifier").notNull(),
});