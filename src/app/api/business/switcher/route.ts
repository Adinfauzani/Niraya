import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserBusinessesWithStores } from "@/server/auth/BusinessContext";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const sessionUser =
    (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!sessionUser?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = String(sessionUser.id);
  const businesses = await getUserBusinessesWithStores(userId);

  return NextResponse.json({ businesses });
}