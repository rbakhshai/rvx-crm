/**
 * Add latitude / longitude columns to deals for the map dashboard.
 * Idempotent — safe to re-run.
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS latitude  numeric(10, 7)`;
  await sql`ALTER TABLE deals ADD COLUMN IF NOT EXISTS longitude numeric(10, 7)`;
  console.log("✓ deals.latitude, deals.longitude");
  await sql.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
