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

const IN_PROGRESS_PSAS = ["tc_writing_psa", "tc_psa_submitted", "psa_accepted"];
const IN_DD            = ["tc_dd_in_escrow", "dd_completed_in_escrow"];
const CLOSED_RVX       = ["closed_rvx_acquired", "closed_rvx_network"];

export const SCORECARD_DEFINITIONS: Array<{
  metric: string;
  target: number;
  format: "n" | "pct";
}> = [
  { metric: "Active bird dogs",                  target: 10, format: "n"   },
  { metric: "Total new leads submitted (week)",  target: 50, format: "n"   },
  { metric: "Qualified leads submitted (total)", target: 20, format: "n"   },
  { metric: "Close rate",                        target: 25, format: "pct" },
  { metric: "LOIs submitted (total)",            target: 15, format: "n"   },
  { metric: "Signed PSAs (this month)",          target:  3, format: "n"   },
  { metric: "Deals in progress (assigned PSAs)", target:  8, format: "n"   },
  { metric: "Deals in dispo",                    target:  4, format: "n"   },
  { metric: "Deals in due diligence",            target:  3, format: "n"   },
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

  const [
    activeBd,
    newLeadsWeek,
    qualifiedTotal,
    loisTotal,
    psasMonth,
    inProgress,
    inDispo,
    inDd,
    closedRvxTotal,
  ] = await Promise.all([
    db.select({ c: sql<number>`COUNT(*)::int` })
      .from(birdDogs)
      .where(and(isNull(birdDogs.deletedAt), eq(birdDogs.statusCode, "active")))
      .then((r) => r[0]?.c ?? 0),
    count(and(isNull(deals.deletedAt), gte(deals.createdAt, weekAgo))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, QUALIFIED_OR_BEYOND))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, LOI_OR_BEYOND))),
    count(and(
      isNull(deals.deletedAt),
      eq(deals.statusCode, "psa_accepted"),
      gte(deals.updatedAt, monthStart),
    )),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, IN_PROGRESS_PSAS))),
    count(and(isNull(deals.deletedAt), eq(deals.statusCode, "dm_dispo_initiated"))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, IN_DD))),
    count(and(isNull(deals.deletedAt), inArray(deals.statusCode, CLOSED_RVX))),
  ]);

  const closeRate = qualifiedTotal + closedRvxTotal > 0
    ? Math.round((closedRvxTotal / (qualifiedTotal + closedRvxTotal)) * 100)
    : 0;

  return [
    activeBd,
    newLeadsWeek,
    qualifiedTotal,
    closeRate,
    loisTotal,
    psasMonth,
    inProgress,
    inDispo,
    inDd,
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
