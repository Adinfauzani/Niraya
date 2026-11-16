import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requireTenantContext } from "@/lib/tenant";
import { checkFeatureAccess } from "@/lib/featureGating";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const user = (session as any)?.user ?? (session as any)?.data?.user ?? null;

  if (!user?.id) {
    return NextResponse.json({ allowed: false }, { status: 401 });
  }

  try {
    const tenant = await requireTenantContext(user.id);
    const check = await checkFeatureAccess(tenant.businessId, "pos");
    return NextResponse.json({ allowed: check.allowed });
  } catch {
    return NextResponse.json({ allowed: false }, { status: 403 });
  }
}