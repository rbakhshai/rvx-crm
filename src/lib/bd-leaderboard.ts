/**
 * BD leaderboard query — computes per-user stats from
 * raw_lead_dispositions (the source of truth for "what calls did
 * which BD make") + joins to deals via raw_leads.converted_deal_id
 * to credit downstream LOI / PSA progress back to the BD who first
 * qualified the lead.
 *
 * Periods:
 *   week   last 7 days
 *   month  last 30 days
 *   all    forever
 *
 * Point system (calibration is just an opening bid — tunable):
 *   call         1 pt
 *   connect      5 pt
 *   qualified    25 pt
 *   LOI reached  50 pt
 *   PSA reached  100 pt
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { CONNECTED_OUTCOMES } from "@/lib/follow-up";

export type LeaderboardPeriod = "week" | "month" | "all";

export type LeaderboardRow = {
  userId: string;
  name: string;
  role: string | null;
  calls: number;
  connects: number;
  qualified: number;
  dnc: number;
  lois: number;
  psas: number;
  points: number;
  /** Convenience: connect rate = connects / calls. */
  connectRate: number;
  /** Convenience: qualification rate = qualified / connects. */
  qualifyRate: number;
};

const POINTS = {
  call: 1,
  connect: 5,
  qualified: 25,
  loi: 50,
  psa: 100,
} as const;

const LOI_STAGES = [
  "loi_submitted", "loi_in_negotiation", "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted", "psa_accepted",
  "dm_dispo_initiated", "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];
const PSA_STAGES = [
  "tc_writing_psa", "tc_psa_submitted", "psa_accepted",
  "dm_dispo_initiated", "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

function periodFloor(period: LeaderboardPeriod): Date | null {
  const now = Date.now();
  if (period === "week")  return new Date(now - 7  * 24 * 60 * 60 * 1000);
  if (period === "month") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return null;
}

/**
 * Run the full leaderboard query for one period and return rows sorted
 * by points desc (then qualified desc, then calls desc as tie-breakers).
 *
 * One big CTE keeps it to a single round-trip. PG can't bind arrays as
 * easily as scalars in raw SQL templates, so we inline the constant
 * status-code arrays as SQL literals.
 */
export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardRow[]> {
  const floor = periodFloor(period);
  // Build a SQL fragment "AND d.created_at >= '...'" or nothing.
  const periodFilter = floor
    ? sql`AND d.created_at >= ${floor.toISOString()}::timestamp`
    : sql``;
  // For deal-stage attribution, we use the deal's updated_at as the
  // "did they reach this stage in the window" proxy.
  const dealStageFilter = floor
    ? sql`AND deals.updated_at >= ${floor.toISOString()}::timestamp`
    : sql``;

  // SQL literal arrays — easier than parameter binding for this shape.
  const connectedLit = sql.raw(`ARRAY[${CONNECTED_OUTCOMES.map((o) => `'${o}'`).join(", ")}]`);
  const loiLit       = sql.raw(`ARRAY[${LOI_STAGES.map((o) => `'${o}'`).join(", ")}]`);
  const psaLit       = sql.raw(`ARRAY[${PSA_STAGES.map((o) => `'${o}'`).join(", ")}]`);

  const result = await db.execute(sql`
    WITH call_stats AS (
      SELECT
        d.by_user_id AS user_id,
        COUNT(*)::int AS calls,
        COUNT(*) FILTER (WHERE d.outcome::text = ANY(${connectedLit}))::int AS connects,
        COUNT(*) FILTER (WHERE d.outcome = 'qualified')::int           AS qualified,
        COUNT(*) FILTER (WHERE d.outcome = 'do_not_call')::int         AS dnc
      FROM raw_lead_dispositions d
      WHERE d.by_user_id IS NOT NULL
        ${periodFilter}
      GROUP BY d.by_user_id
    ),
    deal_stats AS (
      SELECT
        first_qual.by_user_id AS user_id,
        COUNT(DISTINCT deals.id) FILTER (WHERE deals.status_code = ANY(${loiLit}))::int AS lois,
        COUNT(DISTINCT deals.id) FILTER (WHERE deals.status_code = ANY(${psaLit}))::int AS psas
      FROM (
        -- Per converted lead, take the user who fired the 'qualified'
        -- disposition. Multiple BDs might disposition a lead historically;
        -- credit goes to whoever flipped it to qualified.
        SELECT DISTINCT ON (rl.id) rl.id AS raw_lead_id, rl.converted_deal_id, d.by_user_id
        FROM raw_leads rl
        JOIN raw_lead_dispositions d
          ON d.raw_lead_id = rl.id AND d.outcome = 'qualified'
        WHERE rl.converted_deal_id IS NOT NULL
        ORDER BY rl.id, d.created_at ASC
      ) first_qual
      JOIN deals ON deals.id = first_qual.converted_deal_id
      WHERE deals.deleted_at IS NULL
        ${dealStageFilter}
      GROUP BY first_qual.by_user_id
    )
    SELECT
      u.id                                 AS user_id,
      u.name                               AS name,
      u.role::text                         AS role,
      COALESCE(c.calls, 0)::int            AS calls,
      COALESCE(c.connects, 0)::int         AS connects,
      COALESCE(c.qualified, 0)::int        AS qualified,
      COALESCE(c.dnc, 0)::int              AS dnc,
      COALESCE(ds.lois, 0)::int            AS lois,
      COALESCE(ds.psas, 0)::int            AS psas
    FROM "user" u
    LEFT JOIN call_stats c  ON c.user_id  = u.id
    LEFT JOIN deal_stats ds ON ds.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND u.suspended_at IS NULL
      -- Leaderboard is bird-dog-team only. Leadership (admin/Sales &
      -- Marketing/Operations/Finance/Closer/UW/DD/TC/Dispo) is excluded
      -- by limiting to bd_level_* roles. Marco (bird_dog_manager →
      -- Operations) stays off the board even if he picks up the dialer
      -- occasionally.
      AND u.role IN ('bd_level_1', 'bd_level_2', 'bd_level_3')
      AND (COALESCE(c.calls, 0) + COALESCE(ds.lois, 0) + COALESCE(ds.psas, 0)) > 0
  `);

  const rawRows = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (result as unknown as Array<Record<string, unknown>>);

  const rows: LeaderboardRow[] = (rawRows ?? []).map((r) => {
    const calls     = Number(r.calls)     || 0;
    const connects  = Number(r.connects)  || 0;
    const qualified = Number(r.qualified) || 0;
    const dnc       = Number(r.dnc)       || 0;
    const lois      = Number(r.lois)      || 0;
    const psas      = Number(r.psas)      || 0;

    const points =
      calls     * POINTS.call +
      connects  * POINTS.connect +
      qualified * POINTS.qualified +
      lois      * POINTS.loi +
      psas      * POINTS.psa;

    return {
      userId: String(r.user_id),
      name: String(r.name ?? "(unnamed)"),
      role: (r.role ?? null) as string | null,
      calls,
      connects,
      qualified,
      dnc,
      lois,
      psas,
      points,
      connectRate: calls > 0 ? connects / calls : 0,
      qualifyRate: connects > 0 ? qualified / connects : 0,
    };
  });

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.qualified !== a.qualified) return b.qualified - a.qualified;
    return b.calls - a.calls;
  });

  return rows;
}

/** Period-label helper used by the leaderboard header. */
export function periodLabel(p: LeaderboardPeriod): string {
  return p === "week" ? "This Week" : p === "month" ? "This Month" : "All Time";
}

/** Exported for the UI so the legend can list the rule. */
export const POINT_RULES = POINTS;
