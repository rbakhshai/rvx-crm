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
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { rawLeadDispositions, rawLeads, user as userTable } from "@/db/schema";
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

  // Stats: pool counts (split by mode) + BD's calls today + (if a
  // lead is claimed) the # of times anyone has flagged this lead's
  // phone as wrong-number historically.
  const dayAgo = new Date(Date.now() - DAY_MS);
  const [counts, todayRow, wrongNumberCount, priorTouches] = await Promise.all([
    getQueueCountsForUser(),
    db
      .select({ c: rawLeadDispositions.id })
      .from(rawLeadDispositions)
      .where(and(eq(rawLeadDispositions.byUserId, me), gte(rawLeadDispositions.createdAt, dayAgo)))
      .then((r) => ({ c: r.length })),
    claimed
      ? db
          .select({ c: sql<number>`COUNT(*)::int` })
          .from(rawLeadDispositions)
          .where(
            and(
              eq(rawLeadDispositions.rawLeadId, claimed.id),
              eq(rawLeadDispositions.outcome, "wrong_number"),
            ),
          )
          .then((r) => Number(r[0]?.c ?? 0))
      : Promise.resolve(0),
    // Prior touches from OTHER BDs (not the current user) — surfaced
    // so the active BD inherits the park's institutional memory when
    // they claim a recycled / orphaned lead. Most-recent first; cap
    // at 8 to keep the panel scrollable but bounded.
    claimed
      ? db
          .select({
            id: rawLeadDispositions.id,
            outcome: rawLeadDispositions.outcome,
            notes: rawLeadDispositions.notes,
            createdAt: rawLeadDispositions.createdAt,
            byUserId: rawLeadDispositions.byUserId,
            byUserName: userTable.name,
          })
          .from(rawLeadDispositions)
          .leftJoin(userTable, eq(userTable.id, rawLeadDispositions.byUserId))
          .where(
            and(
              eq(rawLeadDispositions.rawLeadId, claimed.id),
              ne(rawLeadDispositions.byUserId, me),
            ),
          )
          .orderBy(desc(rawLeadDispositions.createdAt))
          .limit(8)
      : Promise.resolve([] as Array<{
          id: string;
          outcome: string;
          notes: string | null;
          createdAt: Date;
          byUserId: string | null;
          byUserName: string | null;
        }>),
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
                wrongNumberCount,
                priorTouches: priorTouches.map((t) => ({
                  id: t.id,
                  outcome: t.outcome,
                  notes: t.notes,
                  createdAt: t.createdAt.toISOString(),
                  byUserName: t.byUserName ?? "(former teammate)",
                })),
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
