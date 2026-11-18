import { NextResponse } from "next/server";
import { desc, eq, isNull, and } from "drizzle-orm";

import { getSession } from "@/lib/auth";
import { db } from "@/server/db";
import { notifications } from "@/server/db/schema";

export async function GET() {
  try {
    const session = await getSession();
    const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;

    if (!user?.id) {
      return NextResponse.json({ items: [], authenticated: false });
    }

    const rows = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        createdAt: notifications.createdAt,
        readAt: notifications.readAt,
      })
      .from(notifications)
      .where(and(eq(notifications.userId, String(user.id)), isNull(notifications.readAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(10);

    return NextResponse.json({ items: rows, authenticated: true });
  } catch {
    return NextResponse.json({ items: [], authenticated: false });
  }
}
