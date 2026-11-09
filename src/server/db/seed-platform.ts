import { sql } from "./index";
import { seedPlans } from "../billing/plans";

async function seed() {
  const count = await seedPlans();
  console.log(`[platform] ${count} paket berhasil di-seed.`);
}

seed()
  .catch((error) => {
    console.error("[platform] seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });