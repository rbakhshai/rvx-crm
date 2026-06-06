/**
 * "At risk" detector. Surfaces records that need attention RIGHT NOW
 * but aren't necessarily on the user's task list.
 *
 * Rules (heuristic — tune over time):
 *   - Owned hot/warm deal untouched 7+ days  → "going cold"
 *   - LOI submitted, no movement 10+ days     → "LOI stalled"
 *   - PSA stage, no movement 14+ days         → "PSA in limbo"
 *   - Inspection ends in ≤7 days but DD < 50% complete → "DD behind"
 *   - Owned deal in same stage 21+ days       → "stuck"
 *
 * Each result has a `kind` for icon/label, a `severity` for sort, and
 * one-click href that opens the deal drawer.
 */
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, ddChecklistItems } from "@/db/schema";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RiskKind =
  | "going_cold"
  | "loi_stalled"
  | "psa_stalled"
  | "dd_behind"
  | "stuck_in_stage";

export type Risk = {
  kind: RiskKind;
  severity: number;          // higher = more urgent (drives sort order)
  dealId: string;
  title: string;
  loc: string | null;
  priority: string | null;
  // One-line action prompt — used as the row description
  reason: string;
  // What to click
  href: string;
};

const KIND_LABEL: Record<RiskKind, { icon: string; label: string }> = {
  going_cold:    { icon: "🥶", label: "Going cold" },
  loi_stalled:   { icon: "📜", label: "LOI stalled" },
  psa_stalled:   { icon: "📑", label: "PSA stalled" },
  dd_behind:     { icon: "⏱",  label: "DD behind" },
  stuck_in_stage:{ icon: "🪨", label: "Stuck" },
};

export function describeRisk(kind: RiskKind): { icon: string; label: string } {
  return KIND_LABEL[kind];
}

const ACTIVE_STAGES_FOR_GOING_COLD = [
  "closer_first_contact_made", "closer_under_negotiation", "closer_gathering_docs",
];

const LOI_STAGES = ["loi_submitted", "loi_in_negotiation", "loi_signed_by_seller"];
const PSA_STAGES = ["tc_writing_psa", "tc_psa_submitted", "psa_accepted"];

export async function detectAtRiskForUser(userId: string): Promise<Risk[]> {
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS);
  const tenDaysAgo = new Date(now - 10 * DAY_MS);
  const fourteenDaysAgo = new Date(now - 14 * DAY_MS);
  const twentyOneDaysAgo = new Date(now - 21 * DAY_MS);

  const [goingCold, loiStalled, psaStalled, stuck, ddRisk] = await Promise.all([
    // Going cold: hot/warm, owned, in talking stages, untouched 7+ days
    db
      .select({
        id: deals.id, name: deals.name, parkAddress: deals.parkAddress,
        parkCity: deals.parkCity, parkState: deals.parkState,
        dealPriority: deals.dealPriority, closerLastTouch: deals.closerLastTouch,
      })
      .from(deals)
      .where(and(
        eq(deals.ownerId, userId),
        isNull(deals.deletedAt),
        inArray(deals.statusCode, ACTIVE_STAGES_FOR_GOING_COLD),
        inArray(deals.dealPriority, ["hot", "warm"] as never),
        or(isNull(deals.closerLastTouch), lt(deals.closerLastTouch, sevenDaysAgo)),
      ))
      .orderBy(asc(deals.closerLastTouch))
      .limit(8),

    // LOI stalled
    db
      .select({
        id: deals.id, name: deals.name, parkAddress: deals.parkAddress,
        parkCity: deals.parkCity, parkState: deals.parkState,
        dealPriority: deals.dealPriority, updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(and(
        eq(deals.ownerId, userId),
        isNull(deals.deletedAt),
        inArray(deals.statusCode, LOI_STAGES),
        lt(deals.updatedAt, tenDaysAgo),
      ))
      .orderBy(asc(deals.updatedAt))
      .limit(5),

    // PSA stalled
    db
      .select({
        id: deals.id, name: deals.name, parkAddress: deals.parkAddress,
        parkCity: deals.parkCity, parkState: deals.parkState,
        dealPriority: deals.dealPriority, updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(and(
        eq(deals.ownerId, userId),
        isNull(deals.deletedAt),
        inArray(deals.statusCode, PSA_STAGES),
        lt(deals.updatedAt, fourteenDaysAgo),
      ))
      .orderBy(asc(deals.updatedAt))
      .limit(5),

    // Stuck in same stage 21+ days
    db
      .select({
        id: deals.id, name: deals.name, parkAddress: deals.parkAddress,
        parkCity: deals.parkCity, parkState: deals.parkState,
        statusCode: deals.statusCode, dealPriority: deals.dealPriority,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(and(
        eq(deals.ownerId, userId),
        isNull(deals.deletedAt),
        sql`${deals.statusCode} NOT IN ('closed_rvx_acquired','closed_rvx_network','closed_other_buyer','not_pursuing_now','not_pursuing_never')`,
        lt(deals.updatedAt, twentyOneDaysAgo),
      ))
      .orderBy(asc(deals.updatedAt))
      .limit(5),

    // DD behind: inspection ends ≤7 days but checklist <50%
    db.execute(sql`
      SELECT d.id, d.name, d.park_address, d.park_city, d.park_state,
             d.deal_priority, d.inspection_period_end,
             (CURRENT_DATE - d.inspection_period_end::date)::int AS days_until,
             COALESCE(stats.done_count, 0)::int AS done_count,
             COALESCE(stats.total_count, 0)::int AS total_count
      FROM deals d
      LEFT JOIN (
        SELECT deal_id,
               COUNT(*) FILTER (WHERE done_at IS NOT NULL) AS done_count,
               COUNT(*) AS total_count
        FROM dd_checklist_items
        GROUP BY deal_id
      ) stats ON stats.deal_id = d.id
      WHERE d.owner_id = ${userId}
        AND d.deleted_at IS NULL
        AND d.inspection_period_end IS NOT NULL
        AND d.inspection_period_end::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
        AND (
          stats.total_count > 0 AND stats.done_count::float / stats.total_count < 0.5
        )
      ORDER BY d.inspection_period_end ASC
      LIMIT 5
    `),
  ]);

  const out: Risk[] = [];

  for (const d of goingCold) {
    const daysSince = d.closerLastTouch
      ? Math.floor((now - d.closerLastTouch.getTime()) / DAY_MS)
      : 99;
    out.push({
      kind: "going_cold",
      severity: daysSince + (d.dealPriority === "hot" ? 100 : 0),
      dealId: d.id,
      title: d.name || d.parkAddress || "(unnamed)",
      loc: [d.parkCity, d.parkState].filter(Boolean).join(", ") || null,
      priority: d.dealPriority,
      reason: d.closerLastTouch ? `${daysSince}d since last contact` : `never contacted`,
      href: `/deals/${d.id}`,
    });
  }

  for (const d of loiStalled) {
    const daysSince = Math.floor((now - d.updatedAt.getTime()) / DAY_MS);
    out.push({
      kind: "loi_stalled",
      severity: daysSince + 50,
      dealId: d.id,
      title: d.name || d.parkAddress || "(unnamed)",
      loc: [d.parkCity, d.parkState].filter(Boolean).join(", ") || null,
      priority: d.dealPriority,
      reason: `LOI hasn't moved in ${daysSince}d — push seller for response`,
      href: `/deals/${d.id}`,
    });
  }

  for (const d of psaStalled) {
    const daysSince = Math.floor((now - d.updatedAt.getTime()) / DAY_MS);
    out.push({
      kind: "psa_stalled",
      severity: daysSince + 75,
      dealId: d.id,
      title: d.name || d.parkAddress || "(unnamed)",
      loc: [d.parkCity, d.parkState].filter(Boolean).join(", ") || null,
      priority: d.dealPriority,
      reason: `PSA stalled ${daysSince}d — check with TC`,
      href: `/deals/${d.id}`,
    });
  }

  for (const d of stuck) {
    const daysSince = Math.floor((now - d.updatedAt.getTime()) / DAY_MS);
    out.push({
      kind: "stuck_in_stage",
      severity: daysSince,
      dealId: d.id,
      title: d.name || d.parkAddress || "(unnamed)",
      loc: [d.parkCity, d.parkState].filter(Boolean).join(", ") || null,
      priority: d.dealPriority,
      reason: `${daysSince}d in same stage — advance or retire`,
      href: `/deals/${d.id}`,
    });
  }

  const ddRows = (Array.isArray(ddRisk) ? ddRisk : (ddRisk as { rows?: unknown[] }).rows ?? []) as Array<{
    id: string; name: string | null; park_address: string | null;
    park_city: string | null; park_state: string | null;
    deal_priority: string | null;
    inspection_period_end: string;
    done_count: number; total_count: number;
  }>;
  for (const d of ddRows) {
    const pct = d.total_count > 0 ? Math.round((d.done_count / d.total_count) * 100) : 0;
    out.push({
      kind: "dd_behind",
      severity: 100 + (100 - pct), // urgent
      dealId: d.id,
      title: d.name || d.park_address || "(unnamed)",
      loc: [d.park_city, d.park_state].filter(Boolean).join(", ") || null,
      priority: d.deal_priority,
      reason: `DD ${pct}% done, inspection ends ${d.inspection_period_end}`,
      href: `/deals/${d.id}/due-diligence`,
    });
  }

  // Sort: highest severity first, dedup by dealId (keep highest sev)
  const byDeal = new Map<string, Risk>();
  for (const r of out.sort((a, b) => b.severity - a.severity)) {
    if (!byDeal.has(r.dealId)) byDeal.set(r.dealId, r);
  }
  return Array.from(byDeal.values()).slice(0, 10);
}
ddChecklistItems; // silence unused-import warning when sql.raw replaces the helper
