/**
 * "My submitted leads" query — the per-BD personal status board.
 *
 * Combines three data sources into one row per lead:
 *   1. raw_leads             — current status + follow-up schedule
 *   2. raw_lead_dispositions — last touch made by the calling user
 *   3. deals (optional)      — current pipeline stage if converted
 *
 * Each row shows where the lead is RIGHT NOW from the BD's POV:
 *   • Did anyone follow up after me? (closerLastTouch on deals)
 *   • What's the current pipeline stage if it converted?
 *   • When's my next scheduled callback?
 *   • Is it overdue?
 *
 * Sort order: due+overdue first, then "today", then upcoming, then
 * "no schedule" — within each band, ordered by last touch desc so the
 * most recently-worked leads bubble up.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { PIPELINE_STAGES, type PipelineStageKey } from "./pipeline-stages";

export type MyLeadRow = {
  leadId: string;
  parkName: string | null;
  city: string | null;
  state: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  /** Current raw_leads.status — pool / claimed / converted / dead. */
  leadStatus: string;
  /** Most recent disposition this user fired on this lead. */
  lastOutcome: string | null;
  lastDispositionAt: Date | null;
  /** Aggregate # of dispositions this user has on this lead. */
  myAttempts: number;
  /** When is my next follow-up due? null = no schedule. */
  nextFollowUpAt: Date | null;
  followUpCadenceDays: number | null;
  /** Did this lead become a deal? If so, surface the stage. */
  dealId: string | null;
  dealStatusCode: string | null;
  /** Bucketed pipeline stage (Leads / Talking / Offer / Contract / Closed). */
  dealStage: PipelineStageKey | null;
  /** When the closer last touched the converted deal — answers Cordtz's
   *  question ("do I need to contact this lead again?"). */
  closerLastTouchAt: Date | null;
};

/** Map a granular status_code → high-level funnel stage. */
const STATUS_TO_STAGE = new Map<string, PipelineStageKey>();
for (const stage of PIPELINE_STAGES) {
  for (const code of stage.statuses) STATUS_TO_STAGE.set(code, stage.key);
}

export function stageForStatusCode(code: string | null): PipelineStageKey | null {
  return code ? STATUS_TO_STAGE.get(code) ?? null : null;
}

/**
 * Pull all leads this user has ever dispositioned, joined with the
 * latest disposition row + deal stage if converted.
 *
 * Single round-trip via one CTE + a LEFT JOIN on deals.
 */
export async function getMyLeads(userId: string): Promise<MyLeadRow[]> {
  const result = await db.execute(sql`
    WITH my_dispositions AS (
      -- Per (lead, this user), take the latest disposition outcome + ts.
      SELECT DISTINCT ON (raw_lead_id)
        raw_lead_id,
        outcome AS last_outcome,
        created_at AS last_at
      FROM raw_lead_dispositions
      WHERE by_user_id = ${userId}
      ORDER BY raw_lead_id, created_at DESC
    ),
    my_counts AS (
      SELECT raw_lead_id, COUNT(*)::int AS attempts
      FROM raw_lead_dispositions
      WHERE by_user_id = ${userId}
      GROUP BY raw_lead_id
    )
    SELECT
      rl.id                          AS lead_id,
      rl.park_name                   AS park_name,
      rl.city                        AS city,
      rl.state                       AS state,
      rl.owner_name                  AS owner_name,
      rl.owner_phone                 AS owner_phone,
      rl.status::text                AS lead_status,
      md.last_outcome::text          AS last_outcome,
      md.last_at                     AS last_disposition_at,
      mc.attempts                    AS my_attempts,
      rl.next_follow_up_at           AS next_follow_up_at,
      rl.follow_up_cadence_days      AS follow_up_cadence_days,
      d.id                           AS deal_id,
      d.status_code                  AS deal_status_code,
      d.closer_last_touch            AS closer_last_touch_at
    FROM my_dispositions md
    JOIN raw_leads rl    ON rl.id = md.raw_lead_id
    JOIN my_counts mc    ON mc.raw_lead_id = md.raw_lead_id
    LEFT JOIN deals d    ON d.id = rl.converted_deal_id AND d.deleted_at IS NULL
    WHERE rl.deleted_at IS NULL
    ORDER BY
      -- Due-now band: scheduled and overdue.
      (rl.next_follow_up_at IS NOT NULL AND rl.next_follow_up_at <= NOW()) DESC,
      -- Then scheduled (earliest first).
      rl.next_follow_up_at ASC NULLS LAST,
      -- Then by recency of MY work.
      md.last_at DESC NULLS LAST
  `);

  const rows = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (result as unknown as Array<Record<string, unknown>>);

  return (rows ?? []).map((r) => {
    const dealStatusCode = (r.deal_status_code ?? null) as string | null;
    return {
      leadId: String(r.lead_id),
      parkName: (r.park_name ?? null) as string | null,
      city: (r.city ?? null) as string | null,
      state: (r.state ?? null) as string | null,
      ownerName: (r.owner_name ?? null) as string | null,
      ownerPhone: (r.owner_phone ?? null) as string | null,
      leadStatus: String(r.lead_status ?? "pool"),
      lastOutcome: (r.last_outcome ?? null) as string | null,
      lastDispositionAt: r.last_disposition_at ? new Date(r.last_disposition_at as string) : null,
      myAttempts: Number(r.my_attempts) || 0,
      nextFollowUpAt: r.next_follow_up_at ? new Date(r.next_follow_up_at as string) : null,
      followUpCadenceDays: r.follow_up_cadence_days != null ? Number(r.follow_up_cadence_days) : null,
      dealId: (r.deal_id ?? null) as string | null,
      dealStatusCode,
      dealStage: stageForStatusCode(dealStatusCode),
      closerLastTouchAt: r.closer_last_touch_at ? new Date(r.closer_last_touch_at as string) : null,
    } satisfies MyLeadRow;
  });
}

/** Pretty-print a raw_lead_outcome for the UI. */
export function outcomeLabel(o: string | null): string {
  if (!o) return "—";
  return o
    .replace(/^connected_/, "Connected · ")
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Map a granular deal status_code → the BD-facing tracker status
 * (Bird Dog spec Phase 11). BDs don't see closer-internal codes; they
 * see where their submission sits in the acquisition journey — the
 * visibility that keeps them motivated through a 2-5 month cycle.
 */
export function bdDealStatusLabel(code: string | null): string {
  if (!code) return "Submitted – Awaiting Closer Review";
  if (code.startsWith("closed_")) return "Closed 🎉";
  if (code.includes("dead")) return "Dead Deal";
  const map: Record<string, string> = {
    new_lead_received: "Submitted – Awaiting Closer Review",
    pace_leads: "Submitted – Awaiting Closer Review",
    incomplete_file: "Submitted – Awaiting Closer Review",
    sent_back_to_bd: "Sent Back – Needs More Info",
    closer_first_contact_attempted: "Assigned to Closer",
    closer_first_contact_made: "Contact Made",
    closer_under_negotiation: "Contact Made",
    closer_gathering_docs: "Financials Requested",
    uw_ready_phase_2: "Financials Received",
    uw_under_phase_2: "Underwriting",
    loi_ready: "Underwriting",
    loi_submitted: "LOI Submitted",
    loi_in_negotiation: "LOI Submitted",
    loi_signed_by_seller: "LOI Submitted",
    loi_accepted_both_sides: "LOI Submitted",
    tc_writing_psa: "Under Contract",
    tc_psa_submitted: "Under Contract",
    psa_accepted: "Under Contract",
    dm_dispo_initiated: "Under Contract",
    tc_dd_in_escrow: "Under Contract",
    dd_completed_in_escrow: "Under Contract",
  };
  return map[code] ?? "In Pipeline";
}

/** Pretty-print a raw_leads.status. */
export function leadStatusLabel(s: string): string {
  return ({
    pool: "Back in pool",
    claimed: "Working it",
    converted: "Now a deal",
    dead: "Dead",
    duplicate: "Duplicate",
  } as Record<string, string>)[s] ?? s;
}

/** Bucket a lead into a UI band based on the next-follow-up time. */
export function followUpBand(at: Date | null, now: Date = new Date()):
  | "overdue"
  | "due_today"
  | "upcoming"
  | "none" {
  if (!at) return "none";
  const ms = at.getTime() - now.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (ms < 0) return "overdue";
  if (ms < day) return "due_today";
  return "upcoming";
}

export type FollowUpDueRow = {
  leadId: string;
  parkName: string | null;
  city: string | null;
  state: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  nextFollowUpAt: Date;
  cadenceDays: number | null;
};

/**
 * Today widget query: every lead where THIS user is the last caller AND
 * the next follow-up is scheduled within the next 24h (or already
 * overdue). Lightweight by design — just the fields the widget needs.
 *
 * The (last_call_by_id, next_follow_up_at) index makes this O(log N).
 */
export async function getFollowUpsDueForUser(
  userId: string,
  limit = 25,
): Promise<FollowUpDueRow[]> {
  const result = await db.execute(sql`
    SELECT
      rl.id                     AS lead_id,
      rl.park_name               AS park_name,
      rl.city                    AS city,
      rl.state                   AS state,
      rl.owner_name              AS owner_name,
      rl.owner_phone             AS owner_phone,
      rl.next_follow_up_at       AS next_follow_up_at,
      rl.follow_up_cadence_days  AS cadence_days
    FROM raw_leads rl
    WHERE rl.deleted_at IS NULL
      AND rl.last_call_by_id = ${userId}
      AND rl.next_follow_up_at IS NOT NULL
      AND rl.next_follow_up_at <= NOW() + INTERVAL '1 day'
      -- Dead / converted leads have left the BD's world — belt-and-
      -- suspenders alongside the clearing in dispositionLeadAction.
      AND rl.status NOT IN ('dead', 'converted')
    ORDER BY rl.next_follow_up_at ASC
    LIMIT ${limit}
  `);

  const rows = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (result as unknown as Array<Record<string, unknown>>);

  return (rows ?? []).map((r) => ({
    leadId: String(r.lead_id),
    parkName: (r.park_name ?? null) as string | null,
    city: (r.city ?? null) as string | null,
    state: (r.state ?? null) as string | null,
    ownerName: (r.owner_name ?? null) as string | null,
    ownerPhone: (r.owner_phone ?? null) as string | null,
    nextFollowUpAt: new Date(r.next_follow_up_at as string),
    cadenceDays: r.cadence_days != null ? Number(r.cadence_days) : null,
  }));
}
