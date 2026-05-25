import postgres from "postgres";

process.loadEnvFile(".env.local");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const rows = await sql<{ legacy_ontraport_id: number | null }[]>`
    select legacy_ontraport_id from contacts where legacy_ontraport_id is not null order by legacy_ontraport_id
  `;
  console.log(rows.map((r) => r.legacy_ontraport_id).join(","));
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
