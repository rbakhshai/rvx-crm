/**
 * Idempotent seed for default email templates. Run once to bootstrap the
 * dispo composer with a sensible default; re-run any time to update copy.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { messageTemplates } from "../src/db/schema";

process.loadEnvFile(".env.local");

type Seed = Omit<typeof messageTemplates.$inferInsert, "id" | "createdAt" | "updatedAt">;

const TEMPLATES: Seed[] = [
  {
    name: "Dispo — new RVP available",
    description: "First-touch dispo email when you bring a new park to a buyer's attention.",
    kind: "dispo",
    subject: "{{deal.name}} — new RV park, fits your buy box",
    bodyText: `Hey {{buyer.firstName}},

Wanted to put a new RV park in front of you that matches what you've been looking for.

  • {{deal.parkAddress}}{{deal.parkCity}}, {{deal.parkState}}
  • {{deal.padsCount}} pads
  • Asking: {{deal.listPrice}}
  • NOI: {{deal.listNoi}}
  • Cap: {{deal.listCapRate}}

Full details and financials are in the CRM:
{{deal.url}}

If it's a fit, reply here and I'll send you the marketing package + P&L straight away.

— {{sender.firstName}}
RV Park Exchange
`,
  },
  {
    name: "Follow-up — checking in",
    description: "Light-touch follow-up to a buyer you haven't heard from in a while.",
    kind: "follow_up",
    subject: "Checking in — any RV park deals you'd like me to keep an eye on?",
    bodyText: `Hi {{buyer.firstName}},

Wanted to check in. Any update on what you're looking for in an RV park acquisition? Buy box change, timeline shift, capital deployed?

Happy to send over anything new we've sourced that fits.

— {{sender.firstName}}
RV Park Exchange
`,
  },
  {
    name: "NCNDA — sign once to get full deal access",
    description: "Send to a buyer asking them to sign the NCNDA so they get full financials going forward.",
    kind: "ncnda_invite",
    subject: "Quick — sign our NCNDA to see full financials on every deal",
    bodyText: `Hi {{buyer.firstName}},

To share full park financials and seller details with you, we ask for a one-time NCNDA. It's standard and protects both sides.

It takes about 60 seconds to sign:
[NCNDA link will go here once DocuSign is wired up]

Once it's on file we can move much faster on every deal that fits your buy box — no back-and-forth on access.

— {{sender.firstName}}
RV Park Exchange
`,
  },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql);

  console.log(`Seeding ${TEMPLATES.length} message templates…`);
  for (const t of TEMPLATES) {
    const existing = await db.select({ id: messageTemplates.id }).from(messageTemplates).where(eq(messageTemplates.name, t.name)).limit(1);
    if (existing[0]) {
      await db
        .update(messageTemplates)
        .set({ description: t.description, kind: t.kind, subject: t.subject, bodyText: t.bodyText, updatedAt: new Date() })
        .where(eq(messageTemplates.id, existing[0].id));
      console.log(`  updated: ${t.name}`);
    } else {
      await db.insert(messageTemplates).values(t);
      console.log(`  inserted: ${t.name}`);
    }
  }

  console.log("✓ done.");
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
