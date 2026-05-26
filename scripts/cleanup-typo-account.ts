/**
 * One-shot cleanup — delete the orphaned account with the typo'd domain.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user, account, session } from "@/db/schema";

const TARGET_EMAIL = "reza+testing@rvpparkexchange.com"; // note: rvp-parkexchange (extra "p")

async function main() {
  const [u] = await db.select().from(user).where(eq(user.email, TARGET_EMAIL)).limit(1);
  if (!u) {
    console.log(`Nothing to delete — ${TARGET_EMAIL} not found.`);
    process.exit(0);
  }

  // Sessions and accounts cascade delete, but be explicit for clarity
  await db.delete(session).where(eq(session.userId, u.id));
  await db.delete(account).where(eq(account.userId, u.id));
  await db.delete(user).where(eq(user.id, u.id));

  console.log(`✓ Deleted ${TARGET_EMAIL} (and ${u.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
