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
  { metric: "Active bird dogs",                       target: 16, format: "n"   },
  { metric: "Total new leads submitted (last week)",  target: 50, format: "n"   },
  { metric: "Total new leads qualified (last week)",  target: 75, format: "pct" },
  { metric: "Closer first-touch within 24 hours",     target: 75, format: "pct" },
  { metric: "LOIs submitted (last week)",             target:  4, format: "n"   },
  { metric: "PSA submitted (last week)",              target:  1, format: "n"   },
  { metric: "Signed PSAs (this month)",               target:  2, format: "n"   },
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
  // Hit = touched within 24h of creation.
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
    qualifiedLeadsWeek,
    loisWeek,
    psaSubmittedWeek,
    psasMonth,
  ] = await Promise.all([
    // 1. Active bird dogs
    db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(birdDogs)
      .where(and(isNull(birdDogs.deletedAt), eq(birdDogs.statusCode, "active")))
      .then((r) => r[0]?.c ?? 0),
    // 2. Total new leads submitted (last week) — all deals created this week
    count(and(isNull(deals.deletedAt), gte(deals.createdAt, weekAgo))),
    // 3. Qualified leads created this week (for percentage calculation)
    count(
      and(
        isNull(deals.deletedAt),
        inArray(deals.statusCode, QUALIFIED_OR_BEYOND),
        gte(deals.createdAt, weekAgo),
      ),
    ),
    // 4. LOIs submitted (last week) — deals at LOI-or-beyond status updated this week
    count(
      and(
        isNull(deals.deletedAt),
        inArray(deals.statusCode, LOI_OR_BEYOND),
        gte(deals.updatedAt, weekAgo),
      ),
    ),
    // 5. PSA submitted (last week) — deals at psa_accepted or beyond, updated this week
    count(
      and(
        isNull(deals.deletedAt),
        inArray(deals.statusCode, ["psa_accepted", "dm_dispo_initiated", "tc_dd_in_escrow", "dd_completed_in_escrow", "closed_rvx_acquired", "closed_rvx_network"]),
        gte(deals.updatedAt, weekAgo),
      ),
    ),
    // 6. Signed PSAs (this month) — deals at psa_accepted status updated this month
    count(
      and(
        isNull(deals.deletedAt),
        eq(deals.statusCode, "psa_accepted"),
        gte(deals.updatedAt, monthStart),
      ),
    ),
  ]);

  // 3. Calculate percentage of new leads that qualified
  const newLeadsQualifiedPct = newLeadsWeek > 0
    ? Math.round((qualifiedLeadsWeek / newLeadsWeek) * 100)
    : 0;

  // Order MUST match SCORECARD_DEFINITIONS:
  //   [activeBd, newLeadsWeek, newLeadsQualifiedPct, slaPct, loisWeek, psaSubmittedWeek, psasMonth]
  return [
    activeBd,
    newLeadsWeek,
    newLeadsQualifiedPct,
    slaPct,
    loisWeek,
    psaSubmittedWeek,
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
