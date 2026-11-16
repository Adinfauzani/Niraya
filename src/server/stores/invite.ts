import { sql } from "drizzle-orm";

import { db } from "@/server/db";
import { stores } from "@/server/db/schema";

/**
 * Ambiguous characters (0/O, 1/I/L) are excluded so codes are easy to read
 * aloud and type. 32 symbols -> 8 chars ~= 1.1e12 combinations.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const DEFAULT_LENGTH = 8;

export function generateInviteCode(length: number = DEFAULT_LENGTH): string {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * ALPHABET.length);
    code += ALPHABET[index];
  }
  return code;
}

/** Case-insensitive check for a code already used by another store. */
export async function isInviteCodeTaken(
  code: string,
  exceptStoreId?: string
): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;
  const rows = await db
    .select({ id: stores.id })
    .from(stores)
    .where(sql`upper(${stores.code}) = ${normalized}`)
    .limit(20);
  return rows.some((row) => row.id !== exceptStoreId);
}

/** Generate a code that is not currently used by any store. */
export async function generateUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateInviteCode();
    if (!(await isInviteCodeTaken(code))) return code;
  }
  // Extremely unlikely; widen the code to reduce collision odds further.
  return generateInviteCode(12);
}