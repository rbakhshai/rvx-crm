/**
 * Reset / set passwords for known accounts. Creates the user if they
 * don't exist yet (via Better Auth's signup API).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/reset-passwords.ts "<password>"
 *
 * Edit ACCOUNTS below to change who gets the password.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account, user } from "@/db/schema";
import { auth } from "@/lib/auth";

const ACCOUNTS: { email: string; name: string }[] = [
  { email: "reza@rvparkexchange.com",          name: "Reza Bakhshai" },
  { email: "reza+testing@rvparkexchange.com",  name: "Reza Testing" },
  { email: "marco@rvparkexchange.com",         name: "Marco Behling" },
];

async function main() {
  const password = process.argv[2];
  if (!password || password.length < 8) {
    console.error("Usage: tsx scripts/reset-passwords.ts \"<password>\" (min 8 chars)");
    process.exit(1);
  }

  // Better Auth exposes its internal context with the password hasher
  const ctx = await auth.$context;

  for (const a of ACCOUNTS) {
    const [u] = await db.select().from(user).where(eq(user.email, a.email)).limit(1);

    if (!u) {
      // Create via Better Auth signup so all related records (account, etc.) are set up correctly
      try {
        await auth.api.signUpEmail({
          body: { email: a.email, password, name: a.name },
        });
        console.log(`✓ ${a.email.padEnd(36)} created via signup`);
      } catch (err) {
        console.error(`✗ ${a.email.padEnd(36)} signup failed:`, err instanceof Error ? err.message : err);
      }
      continue;
    }

    // User exists — update their credential account's password hash
    const hashed = await ctx.password.hash(password);
    const [cred] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, u.id), eq(account.providerId, "credential")))
      .limit(1);

    if (cred) {
      await db
        .update(account)
        .set({ password: hashed, updatedAt: new Date() })
        .where(eq(account.id, cred.id));
      console.log(`✓ ${a.email.padEnd(36)} password reset`);
    } else {
      // No credential row — create one so they can sign in with this password
      await db.insert(account).values({
        id: crypto.randomUUID(),
        userId: u.id,
        accountId: u.id,
        providerId: "credential",
        password: hashed,
      });
      console.log(`✓ ${a.email.padEnd(36)} credential account created (password set)`);
    }
  }

  console.log("\n[done]");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
