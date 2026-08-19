/**
 * Mission Control tiles — the six numbers Reza wants at a glance
 * (his exact list, 2026-06-12), plus two small context tiles.
 *
 *   1. BD dials today          — raw activity heartbeat
 *   2. Leads today             — qualified submissions today
 *   3. Leads this week         — qualified submissions, trailing 7d
 *   4. Closer-qualified (7d)   — deals a closer connected on, seller
 *                                open to selling, touched in last 7d
 *   5. LOIs out                — currently outstanding (snapshot)
 *   6. In escrow               — snapshot
 *   +  Parks owned X/target    — the 5×4 mission (20 parks)
 *   +  BD applications pending — recruiting funnel
 */
import { sql } from "drizzle-orm";

/** Company parks goal — 5 parks/yr × 4 years (matches the Partnership plan). */
export const PARKS_TARGET = 20;
import { db } from "@/db";

export type MissionTiles = {
  dialsToday: number;
  leadsToday: number;
  leadsWeek: number;
  /** Qualified submissions in the 7–14 day window — for week-over-week. */
  leadsLastWeek: number;
  closerQualifiedWeek: number;
  loisOut: number;
  inEscrow: number;
  parksOwned: number;
  targetParks: number;
  bdAppsPending: number;
  /** Bird dogs actively working — full-time + half-time. */
  activeBds: number;
};

/** Closer connected + seller open to selling (and everything past it). */
const CLOSER_ENGAGED = [
  "closer_first_contact_made", "closer_under_negotiation", "closer_gathering_docs",
  "uw_ready_phase_2", "uw_under_phase_2",
  "loi_ready", "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
];
const LOIS_OUT = ["loi_submitted", "loi_in_negotiation", "loi_signed_by_seller"];
const IN_ESCROW = ["tc_dd_in_escrow", "dd_completed_in_escrow"];

const lit = (codes: string[]) => `ARRAY[${codes.map((c) => `'${c}'`).join(",")}]`;

export async function getMissionTiles(targetParks = PARKS_TARGET): Promise<MissionTiles> {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM raw_lead_dispositions
        WHERE created_at >= (NOW() AT TIME ZONE 'UTC')::date)                    AS dials_today,
      (SELECT COUNT(*)::int FROM raw_lead_dispositions
        WHERE outcome = 'qualified'
          AND created_at >= (NOW() AT TIME ZONE 'UTC')::date)                    AS leads_today,
      (SELECT COUNT(*)::int FROM raw_lead_dispositions
        WHERE outcome = 'qualified'
          AND created_at >= NOW() - INTERVAL '7 days')                           AS leads_week,
      (SELECT COUNT(*)::int FROM raw_lead_dispositions
        WHERE outcome = 'qualified'
          AND created_at >= NOW() - INTERVAL '14 days'
          AND created_at <  NOW() - INTERVAL '7 days')                           AS leads_last_week,
      (SELECT COUNT(*)::int FROM deals
        WHERE deleted_at IS NULL
          AND status_code = ANY(${sql.raw(lit(CLOSER_ENGAGED))})
          AND updated_at >= NOW() - INTERVAL '7 days')                           AS closer_qualified_week,
      (SELECT COUNT(*)::int FROM deals
        WHERE deleted_at IS NULL AND status_code = ANY(${sql.raw(lit(LOIS_OUT))})) AS lois_out,
      (SELECT COUNT(*)::int FROM deals
        WHERE deleted_at IS NULL AND status_code = ANY(${sql.raw(lit(IN_ESCROW))})) AS in_escrow,
      (SELECT COUNT(*)::int FROM deals
        WHERE deleted_at IS NULL AND status_code = 'closed_rvx_acquired')        AS parks_owned,
      (SELECT COUNT(*)::int FROM bird_dogs
        WHERE status_code = 'hold_see_notes')                                    AS bd_apps,
      (SELECT COUNT(*)::int FROM bird_dogs
        WHERE status_code = ANY(ARRAY['active','active_half_time']))             AS active_bds
  `);
  const rows = ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (result as unknown as Array<Record<string, unknown>>)) ?? [];
  const r = rows[0] ?? {};
  return {
    dialsToday: Number(r.dials_today) || 0,
    leadsToday: Number(r.leads_today) || 0,
    leadsWeek: Number(r.leads_week) || 0,
    leadsLastWeek: Number(r.leads_last_week) || 0,
    closerQualifiedWeek: Number(r.closer_qualified_week) || 0,
    loisOut: Number(r.lois_out) || 0,
    inEscrow: Number(r.in_escrow) || 0,
    parksOwned: Number(r.parks_owned) || 0,
    targetParks,
    bdAppsPending: Number(r.bd_apps) || 0,
    activeBds: Number(r.active_bds) || 0,
  };
}
