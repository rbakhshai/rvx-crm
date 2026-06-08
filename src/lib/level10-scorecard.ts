/**
 * L10 scorecard — metric definitions + live actuals computation.
 *
 * Plain library module, freely importable from both server actions and
 * server components. Lives outside any "use server" file so the helper
 * exports below can stay synchronous.
 */
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, deals } from "@/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

const QUALIFIED_OR_BEYOND = [
  "closer_under_negotiation", "closer_gathering_docs",
  "uw_ready_phase_2", "uw_under_phase_2",
  "loi_ready", "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted",
  "psa_accepted", "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

const LOI_OR_BEYOND = [
  "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted",
  "psa_accepted", "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

const CLOSED_RVX = ["closed_rvx_acquired", "closed_rvx_network"];

/**
 * 7-metric scorecard tuned for L10 cadence.
 *
 * Dropped: deals-in-progress / dispo / DD — those are pipeline snapshots
 * that belong on the kanban, not on the weekly scorecard.
 * Changed:  qualified + LOIs are now "this week" framing instead of
 *           "total" — tracks weekly change, not cumulative growth.
 * Added:    Closer first-touch SLA hit rate — leading indicator that
 *           predicts close rate 3-4 weeks ahead.
 *
 * Pending (will add when data lights up):
 *   - Owner-connect calls (week) — needs the BD dialer
 *   - Commissions collected (month) — needs Kevin's financial-close field
 */
export const SCORECARD_DEFINITIONS: Array<{
  metric: string;
  target: number;
  format: "n" | "pct";
}> = [
  { metric: "Active bird dogs",                       target: 10, format: "n"   },
  { metric: "New leads submitted (week)",             target: 50, format: "n"   },
  { metric: "Qualified leads submitted (week)",       target:  5, format: "n"   },
  { metric: "Closer first-touch SLA hit rate",        target: 80, format: "pct" },
  { metric: "LOIs submitted (week)",                  target:  3, format: "n"   },
  { metric: "Close rate",                             target: 25, format: "pct" },
  { metric: "Signed PSAs (this month)",               target:  3, format: "n"   },
];

/** Live actuals, computed from the CRM tables, in SCORECARD_DEFINITIONS order. */
export async function computeScorecardActuals(): Promise<number[]> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const count = async (where: ReturnType<typeof and>): Promise<number> => {
    const [row] = await db.select({ c: sql<number>`COUNT(*)::int` }).from(deals).where(where);
    return row?.c ?? 0;
  };

  // For SLA hit rate: pull every qualified-or-beyond deal created in
  // the last 7 days. For each, compare closerLastTouch to createdAt.
  // Hit = touched within 24h of creation. Imperfect proxy for "first
  // touch" since we don't log every touch; good enough for V1.
  const slaWindowDeals = await db
    .select({
      createdAt: deals.createdAt,
      closerLastTouch: deals.closerLastTouch,
    })
    .from(deals)
    .where(
      and(
        isNull(deals.deletedAt),
        inArray(deals.statusCode, QUALIFIED_OR_BEYOND),
        gte(deals.createdAt, weekAgo),
      ),
    );

  const slaTotal = slaWindowDeals.length;
  const slaHits = slaWindowDeals.filter(
    (d) =>
      d.closerLastTouch &&
      d.closerLastTouch.getTime() - d.createdAt.getTime() <= DAY_MS,
  ).length;
  const slaPct = slaTotal > 0 ? Math.round((slaHits / slaTotal) * 100) : 0;

  const [
    activeBd,
    newLeadsWeek,
    qualifiedWeek,
    loisWeek,
    psasMonth,
    qualifiedTotalForRate,
    closedRvxTotal,
  ] = await Promise.all([
    // 1. Active bird dogs
    db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(birdDogs)
      .where(and(isNull(birdDogs.deletedAt), eq(birdDogs.statusCode, "active")))
      .then((r) => r[0]?.c ?? 0),
    // 2. New leads submitted this week
    count(and(isNull(deals.deletedAt), gte(deals.createdAt, weekAgo))),
    // 3. Qualified leads SUBMITTED this week — deals created this week
    //    that have already reached qualified-or-beyond status. Catches
    //    "fast moves" not just total qualified count.
    count(
      and(
        isNull(deals.deletedAt),
        inArray(deals.statusCode, QUALIFIED_OR_BEYOND),
        gte(deals.createdAt, weekAgo),
      ),
    ),
    // 5. LOIs submitted this week — deals at LOI-or-beyond status that
    //    were updated this week. Imperfect (any update counts), but
    //    without a stage_changes log this is the best proxy.
    count(
      and(
        isNull(deals.deletedAt),
        inArray(deals.statusCode, LOI_OR_BEYOND),
        gte(deals.updatedAt, weekAgo),
      ),
    ),
    // 7. Signed PSAs this month
    count(
      and(
        isNull(deals.deletedAt),
        eq(deals.statusCode, "psa_accepted"),
        gte(deals.updatedAt, monthStart),
      ),
    ),
    // Helpers for close rate
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, QUALIFIED_OR_BEYOND))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, CLOSED_RVX))),
  ]);

  // 6. Close rate = closed / (qualified-or-closed). Same formula as
  //    before — uses all-time qualified pool, not weekly window.
  const closeRate = qualifiedTotalForRate + closedRvxTotal > 0
    ? Math.round((closedRvxTotal / (qualifiedTotalForRate + closedRvxTotal)) * 100)
    : 0;

  // Order MUST match SCORECARD_DEFINITIONS:
  //   [activeBd, newLeadsWeek, qualifiedWeek, slaPct, loisWeek, closeRate, psasMonth]
  return [
    activeBd,
    newLeadsWeek,
    qualifiedWeek,
    slaPct,
    loisWeek,
    closeRate,
    psasMonth,
  ];
}

export function formatScoreVal(n: number, fmt: "n" | "pct"): string {
  return fmt === "pct" ? `${n}%` : String(n);
}

export function scoreTone(actual: number, target: number): "on_track" | "behind" | "off_track" {
  if (target <= 0) return "on_track";
  const pct = actual / target;
  if (pct >= 1) return "on_track";
  if (pct >= 0.8) return "behind";
  return "off_track";
}
