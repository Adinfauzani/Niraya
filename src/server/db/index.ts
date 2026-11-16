import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy";

/**
 * Supabase connection notes:
 * - Use the **session pooler** (port 5432) in `DATABASE_URL`. The transaction
 *   pooler (port 6543) drops replies to postgres.js pipelined queries, which
 *   hangs requests under concurrency (connections stuck on `ClientRead`).
 * - `prepare: false` keeps compatibility with both poolers (transaction mode
 *   does not support prepared statements).
 * - Supabase requires SSL.
 * - Drizzle writes schema-qualified names (e.g. "core"."Businesses"), so no
 *   `search_path` is needed.
 */
// postgres.js opens one pool per module instance. Next.js runs the middleware
// (proxy.ts) and route handlers in separate bundles, so each bundle could open
// multiple connections and exhaust Supabase's session pooler (pool_size 15).
// On Vercel, each serverless function is an isolated instance, so the pool must
// be capped at 1 per instance to avoid exhausting the pooler under concurrency.
// Locally/dev, a small pool (5) is fine for parallel requests.
const globalForDb = globalThis as unknown as {
  nirayaSql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForDb.nirayaSql ??
  postgres(connectionString, {
    prepare: false,
    ssl: "require",
    max: process.env.VERCEL ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });

globalForDb.nirayaSql = sql;

export const db = drizzle(sql, { schema });

export function createClient() {
  return drizzle(sql, { schema });
}

export type DB = typeof db;
export type Schema = typeof schema;