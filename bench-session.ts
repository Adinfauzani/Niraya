import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  ssl: "require",
  max: 1,
  connect_timeout: 15,
});

const TOKEN = "7sKgv0dIK8Ognu9bNuCK7VVpuzMtKUia.3pD+zRZEXJJvBcq2u87cwjj7xMT/BIl5ICNzQ4ZUEXg=";
const USER_ID = "f6dbc635-65d7-41d7-ac2b-722de4aa2275";

async function time<T>(label: string, fn: () => Promise<T>) {
  const t = Date.now();
  const r = await fn();
  console.log(`${label}: ${Date.now() - t}ms`);
  return r;
}

async function main() {
  await time("connect", async () => {
    await sql`select 1`;
  });

  const count = await time("count AuthSession", async () => {
    const r = await sql`select count(*)::int as c from core."AuthSession"`;
    return r[0];
  });
  console.log("  rows:", count);

  await time("select session by token", async () => {
    const r = await sql`select * from core."AuthSession" where "token" = ${TOKEN}`;
    console.log("  found:", r.length);
    return r;
  });

  await time("select user by id", async () => {
    const r = await sql`select * from core."Users" where "id" = ${USER_ID}`;
    console.log("  found:", r.length);
    return r;
  });

  await time("select 1 (warm)", async () => {
    await sql`select 1`;
  });

  await sql.end();
}

main().catch((e) => {
  console.error("ERR:", e.message);
  process.exit(1);
});