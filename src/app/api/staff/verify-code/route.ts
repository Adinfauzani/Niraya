import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db";
import { businesses, stores } from "@/server/db/schema";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.trim().toUpperCase();
    if (!code || code.length < 1) {
      return NextResponse.json({ valid: false });
    }

    const matches = await db
      .select({ storeId: stores.id })
      .from(stores)
      .innerJoin(businesses, eq(businesses.id, stores.businessId))
      .where(
        and(
          sql`upper(${stores.code}) = ${code}`,
          eq(stores.isActive, true),
          isNull(stores.deletedAt),
          eq(businesses.status, "active")
        )
      )
      .limit(2);

    return NextResponse.json({ valid: matches.length === 1 });
  } catch (e: any) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
