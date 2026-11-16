import { and, eq } from "drizzle-orm"
import { db } from "@/server/db"
import { businesses, businessMembers } from "@/server/db/schema"

const userId = "f6dbc635-65d7-41d7-ac2b-722de4aa2275"
const businessId = "e08ea3e0-1241-4e0c-9316-99888e47ab55"

async function one(i: number) {
  const [m] = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      storeId: businessMembers.storeId,
      status: businessMembers.status,
    })
    .from(businessMembers)
    .where(and(eq(businessMembers.userId, userId), eq(businessMembers.status, "active")))
    .orderBy(businessMembers.role)
    .limit(1)

  const [b] = await db
    .select({ id: businesses.id, status: businesses.status })
    .from(businesses)
    .where(and(eq(businesses.id, businessId), eq(businesses.status, "active")))
    .limit(1)

  return b?.id ?? null
}

const t0 = performance.now()
const results = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => one(i)))
const ms = (performance.now() - t0).toFixed(0)
const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected")
console.log(`30 concurrent x 2 queries: ${ms}ms, rejected=${rejected.length}`)
for (const r of rejected.slice(0, 3)) {
  console.log("  ERR:", (r.reason as any)?.message?.slice(0, 120))
}
process.exit(0)