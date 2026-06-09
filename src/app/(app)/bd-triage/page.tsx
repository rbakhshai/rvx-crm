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
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { rawLeadDispositions, rawLeads } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";
import { BdTriageClient } from "./client";
import { getQueueCountsForUser } from "@/app/actions/leads";

const DAY_MS = 24 * 60 * 60 * 1000;

type Mode = "fresh" | "followup";

function isMode(v: string | undefined): v is Mode {
  return v === "fresh" || v === "followup";
}

export default async function BdTriagePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const params = await searchParams;
  const mode: Mode = isMode(params.mode) ? params.mode : "fresh";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  const me = session.user.id;

  // Pick up the claimed lead if any. Since connected_* outcomes now recycle
  // back to the pool, the only "claimed" leads should be ones the BD is
  // actively dispositioning right now.
  const [claimed] = await db
    .select()
    .from(rawLeads)
    .where(and(eq(rawLeads.claimedById, me), eq(rawLeads.status, "claimed")))
    .limit(1);

  // Stats: pool counts (split by mode) + BD's calls today.
  const dayAgo = new Date(Date.now() - DAY_MS);
  const [counts, todayRow] = await Promise.all([
    getQueueCountsForUser(),
    db
      .select({ c: rawLeadDispositions.id })
      .from(rawLeadDispositions)
      .where(and(eq(rawLeadDispositions.byUserId, me), gte(rawLeadDispositions.createdAt, dayAgo)))
      .then((r) => ({ c: r.length })),
  ]);

  return (
    <PageShell
      title="Lead Work"
      subtitle={
        mode === "fresh"
          ? "Fresh leads — calling people you've never spoken to. Click Get next when you're ready."
          : "Follow-ups — calling people you've connected with before. Oldest callbacks first."
      }
      width="default"
    >
      <BdTriageClient
        mode={mode}
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
        freshCount={counts.fresh}
        followupCount={counts.followup}
        callsToday={todayRow.c}
      />
    </PageShell>
  );
}
