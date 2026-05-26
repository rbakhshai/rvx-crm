import postgres from "postgres";

process.loadEnvFile(".env.local");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const rows = await sql<{ email: string; role: string; created_at: Date; name: string }[]>`
    SELECT email, role, name, created_at FROM "user"
    WHERE email ILIKE '%reza%' OR email ILIKE '%marco%'
    ORDER BY created_at
  `;
  console.table(
    rows.map((r) => ({
      email: r.email,
      name: r.name,
      role: r.role,
      created: new Date(r.created_at).toLocaleString(),
    })),
  );
  await sql.end();
}

main();
