/**
 * /bd-triage — the BD's lead-work page.
 *
 * Server queries:
 *   - The lead currently claimed by this BD (if any).
 *   - Pool stats (how many unclaimed / how many this BD attempted today).
 *
 * The client component handles "Get next lead" + disposition buttons.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { rawLeadDispositions, rawLeads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";
import { BdTriageClient } from "./client";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function BdTriagePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  const me = session.user.id;

  // Look for a lead this BD already has claimed — they pick up where they
  // left off if they navigated away mid-call.
  const [claimed] = await db
    .select()
    .from(rawLeads)
    .where(and(eq(rawLeads.claimedById, me), eq(rawLeads.status, "claimed")))
    .limit(1);

  // Stats panel — pool size + this BD's today count.
  const dayAgo = new Date(Date.now() - DAY_MS);
  const [poolRow] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(rawLeads)
    .where(and(isNull(rawLeads.deletedAt), eq(rawLeads.status, "pool")));
  const [todayRow] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(rawLeadDispositions)
    .where(and(eq(rawLeadDispositions.byUserId, me), gte(rawLeadDispositions.createdAt, dayAgo)));

  return (
    <PageShell
      title="Lead Work"
      subtitle="One lead at a time. Click Get next when you're ready."
      width="default"
    >
      <BdTriageClient
        initialLead={
          claimed
            ? {
                id: claimed.id,
                parkName: claimed.parkName,
                street: claimed.street,
                city: claimed.city,
                state: claimed.state,
                zipCode: claimed.zipCode,
                ownerName: claimed.ownerName,
                ownerPhone: claimed.ownerPhone,
                ownerEmail: claimed.ownerEmail,
                pads: claimed.pads,
                source: claimed.source,
                importedNotes: claimed.importedNotes,
                callAttempts: claimed.callAttempts,
              }
            : null
        }
        poolCount={poolRow?.c ?? 0}
        callsToday={todayRow?.c ?? 0}
      />
    </PageShell>
  );
}
