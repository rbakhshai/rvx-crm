import postgres from "postgres";

process.loadEnvFile(".env.local");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const tables = ["contacts", "companies", "bird_dogs", "deals"];
  for (const t of tables) {
    const [{ count }] = await sql.unsafe<{ count: number }[]>(
      `select count(*)::int as count from ${t}`,
    );
    console.log(`${t.padEnd(12)} ${count}`);
  }
  const [{ count: dealsWithSeller }] = await sql.unsafe<{ count: number }[]>(
    `select count(*)::int as count from deals where seller_company_id is not null`,
  );
  const [{ count: dealsWithBuyer }] = await sql.unsafe<{ count: number }[]>(
    `select count(*)::int as count from deals where confirmed_buyer_id is not null`,
  );
  const [{ count: dealsWithStatus }] = await sql.unsafe<{ count: number }[]>(
    `select count(*)::int as count from deals where status_code is not null`,
  );
  console.log(`---`);
  console.log(`deals w/ seller_company_id:  ${dealsWithSeller}`);
  console.log(`deals w/ confirmed_buyer_id: ${dealsWithBuyer}`);
  console.log(`deals w/ status_code:        ${dealsWithStatus}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
