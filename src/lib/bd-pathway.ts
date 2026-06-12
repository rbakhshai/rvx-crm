/**
 * BD Pathway to Partnership — level ladder config + the "accepted
 * submissions" counter that gates promotions.
 *
 * Levels (per Reza's adopted pathway doc, calibrated against tracker
 * data 2026-06):
 *   bd_level_1  Lead Generator      — entry; cold call, qualify, submit
 *   bd_level_2  Acquisition Scout   — + collects financials; gate: 10 accepted subs
 *   bd_level_3  Acquisition Partner — bridge to closer/UW; gate: 25 accepted subs + leadership invite
 *
 * "Accepted" = the BD's qualified disposition became a deal that closer
 * review did NOT bounce (status is not sent_back_to_bd / incomplete_file).
 * Counting accepted-only is the anti-gaming rule: volume-stuffed junk
 * submissions never advance a level.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const PATHWAY_GATES = { toL2: 10, toL3: 25 } as const;

export type PathwayLevel = {
  name: string;
  blurb: string;
  /** Gate to reach the NEXT level (null at the top). */
  nextGate: number | null;
  nextName: string | null;
  /** What leveling up unlocks — the carrot line under the progress bar. */
  nextUnlocks: string | null;
};

export const PATHWAY_LEVELS: Record<string, PathwayLevel> = {
  bd_level_1: {
    name: "Level 1 — Lead Generator",
    blurb: "Source off-market parks, qualify owners, submit deals.",
    nextGate: PATHWAY_GATES.toL2,
    nextName: "Level 2 — Acquisition Scout",
    nextUnlocks: "UW training library, bi-monthly UW sessions, +0.5% acquisition split",
  },
  bd_level_2: {
    name: "Level 2 — Acquisition Scout",
    blurb: "Everything in Level 1, plus preliminary financials before submission.",
    nextGate: PATHWAY_GATES.toL3,
    nextName: "Level 3 — Acquisition Partner",
    nextUnlocks: "Weekly closer Zooms, deal reviews, shadowing, +1.0% split — by leadership invite",
  },
  bd_level_3: {
    name: "Level 3 — Acquisition Partner",
    blurb: "Top of the BD ladder — the bridge to closer, UW, and leadership tracks.",
    nextGate: null,
    nextName: null,
    nextUnlocks: null,
  },
};

/**
 * Accepted-submission counts per user. Credit goes to whoever fired the
 * "qualified" disposition (same attribution as the leaderboard).
 */
export async function getAcceptedSubCounts(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const idArray = `ARRAY[${userIds.map((i) => `'${i}'`).join(",")}]`;
  const result = await db.execute(sql`
    SELECT fq.by_user_id AS user_id, COUNT(DISTINCT d.id)::int AS accepted
    FROM (
      SELECT DISTINCT ON (rl.id) rl.converted_deal_id, dd.by_user_id
      FROM raw_leads rl
      JOIN raw_lead_dispositions dd
        ON dd.raw_lead_id = rl.id AND dd.outcome = 'qualified'
      WHERE rl.converted_deal_id IS NOT NULL
      ORDER BY rl.id, dd.created_at ASC
    ) fq
    JOIN deals d ON d.id = fq.converted_deal_id
    WHERE d.deleted_at IS NULL
      AND d.status_code NOT IN ('sent_back_to_bd', 'incomplete_file')
      AND fq.by_user_id = ANY(${sql.raw(idArray)})
    GROUP BY 1
  `);
  const rows = ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (result as unknown as Array<Record<string, unknown>>)) ?? [];
  return new Map(rows.map((r) => [String(r.user_id), Number(r.accepted) || 0]));
}
