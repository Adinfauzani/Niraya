import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://dummy:dummy@localhost:5432/dummy";

/**
 * Supabase Transaction Pooler (port 6543) tidak support prepared statements.
 * Gunakan postgres-js dengan { prepare: false }.
 * Supabase memerlukan SSL - konfigurasi ssl: 'require'.
 * Drizzle menulis nama schema eksplisit (mis. "niraya"."products"),
 * sehingga tidak perlu `search_path`.
 */
export const sql = postgres(connectionString, { 
  prepare: false,
  ssl: 'require'
});

export const db = drizzle(sql, { schema });

export function createClient() {
  return drizzle(sql, { schema });
}

export type DB = typeof db;
export type Schema = typeof schema;