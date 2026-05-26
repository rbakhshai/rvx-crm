/**
 * Set roles for known user accounts after they've signed up.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/set-user-roles.ts
 *
 * Idempotent — safe to re-run. Reports each account's status.
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");

// Edit this list to add / change roles.
const ASSIGNMENTS: { email: string; role: string; note: string }[] = [
  { email: "reza@rvparkexchange.com",                role: "admin",    note: "Reza — full admin rights" },
  { email: "reza+testing@rvparkexchange.com",        role: "bird_dog", note: "Reza's test bird-dog account" },
  { email: "marco@rvparkexchange.com",               role: "admin",    note: "Marco — COO view (admin-level)" },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  for (const a of ASSIGNMENTS) {
    const [row] = await sql<{ id: string; current_role: string }[]>`
      SELECT id, role AS current_role FROM "user" WHERE email = ${a.email} LIMIT 1
    `;
    if (!row) {
      console.log(`✗ ${a.email.padEnd(36)} not found — sign up at /login first`);
      continue;
    }
    if (row.current_role === a.role) {
      console.log(`= ${a.email.padEnd(36)} already ${a.role}  (${a.note})`);
      continue;
    }
    await sql`UPDATE "user" SET role = ${a.role}, updated_at = NOW() WHERE id = ${row.id}`;
    console.log(`✓ ${a.email.padEnd(36)} ${row.current_role} → ${a.role}  (${a.note})`);
  }

  await sql.end();
  console.log("\n[done]");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
