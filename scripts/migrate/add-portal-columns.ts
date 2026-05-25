/**
 * One-shot migration: add bird_dog role to user_role enum and
 * portal-access columns to bird_dogs. Safe to re-run.
 */
import postgres from "postgres";

process.loadEnvFile(".env.local");

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  // 1. Add 'bird_dog' to the user_role enum (idempotent)
  await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bird_dog'`;
  console.log("✓ user_role enum: bird_dog");

  // 2. Add bird_dogs.user_id (idempotent)
  await sql`
    ALTER TABLE bird_dogs
      ADD COLUMN IF NOT EXISTS user_id text REFERENCES "user"(id) ON DELETE SET NULL
  `;
  console.log("✓ bird_dogs.user_id column");

  // 3. Add bird_dogs.last_portal_visit_at (idempotent)
  await sql`
    ALTER TABLE bird_dogs
      ADD COLUMN IF NOT EXISTS last_portal_visit_at timestamp
  `;
  console.log("✓ bird_dogs.last_portal_visit_at column");

  // 4. Unique constraint on user_id (one BD per auth user)
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bird_dogs_user_id_unique'
      ) THEN
        ALTER TABLE bird_dogs ADD CONSTRAINT bird_dogs_user_id_unique UNIQUE (user_id);
      END IF;
    END $$;
  `;
  console.log("✓ bird_dogs_user_id_unique constraint");

  await sql.end();
  console.log("\n[done]");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
