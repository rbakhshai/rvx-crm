/**
 * Server-only queries that power per-role dashboard widgets.
 * Each function returns small lists — kept lean so the dashboard renders fast.
 */
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contacts,
  deals,
  birdDogs,
  tasks,
  notifications,
  dealStatuses,
  birdDogStatuses,
  notes,
} from "@/db/schema";

const STALE_DAYS = 7;
const HOT_PRIORITY = "hot" as const;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ---- Reza / admin / AM dashboard ----

export async function fetchAdminDashboard() {
  const [
    newBuyerLeads,
    hotDeals,
    bdAppQueue,
    staleDealsAcrossTeam,
    newDealsThisWeek,
    newBuyersThisWeek,
    totalPofAggregate,
  ] = await Promise.all([
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, createdAt: contacts.createdAt })
      .from(contacts)
      .where(eq(contacts.status, "new_waiting_to_connect"))
      .orderBy(desc(contacts.createdAt))
      .limit(8),

    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, parkState: deals.parkState, listPrice: deals.listPrice, statusCode: deals.statusCode })
      .from(deals)
      .where(eq(deals.dealPriority, HOT_PRIORITY))
      .orderBy(desc(deals.updatedAt))
      .limit(6),

    db
      .select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName, email: birdDogs.email, createdAt: birdDogs.createdAt })
      .from(birdDogs)
      .where(eq(birdDogs.statusCode, "hold_see_notes"))
      .orderBy(desc(birdDogs.createdAt))
      .limit(6),

    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, closerLastTouch: deals.closerLastTouch, dealPriority: deals.dealPriority })
      .from(deals)
      .where(
        and(
          or(isNull(deals.closerLastTouch), lt(deals.closerLastTouch, daysAgo(STALE_DAYS))),
          inArray(deals.statusCode, [
            "closer_first_contact_attempted",
            "closer_first_contact_made",
            "closer_under_negotiation",
            "closer_gathering_docs",
            "loi_in_negotiation",
            "loi_signed_by_seller",
          ]),
        ),
      )
      .orderBy(asc(deals.closerLastTouch))
      .limit(8),

    db.select({ count: sql<number>`count(*)::int` }).from(deals).where(gt(deals.createdAt, daysAgo(7))),
    db.select({ count: sql<number>`count(*)::int` }).from(contacts).where(gt(contacts.createdAt, daysAgo(7))),
    db.select({ total: sql<number>`coalesce(sum(${contacts.pofAmount}), 0)::numeric` }).from(contacts),
  ]);

  return {
    newBuyerLeads,
    hotDeals,
    bdAppQueue,
    staleDealsAcrossTeam,
    weeklyDealsAdded: newDealsThisWeek[0]?.count ?? 0,
    weeklyBuyersAdded: newBuyersThisWeek[0]?.count ?? 0,
    totalPof: Number(totalPofAggregate[0]?.total ?? 0),
  };
}

// ---- Marco / closer dashboard ----

export async function fetchCloserDashboard(userId: string) {
  const closerStages = [
    "closer_first_contact_attempted",
    "closer_first_contact_made",
    "closer_under_negotiation",
    "closer_gathering_docs",
    "loi_in_negotiation",
    "loi_signed_by_seller",
  ];

  const [myDeals, myStaleDeals, myDealsByStage, hotTier1Buyers, recentNotesByMe] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(and(or(eq(deals.opsOwnerId, userId), eq(deals.ownerId, userId)), inArray(deals.statusCode, closerStages))),

    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, parkState: deals.parkState, closerLastTouch: deals.closerLastTouch, dealPriority: deals.dealPriority })
      .from(deals)
      .where(
        and(
          or(eq(deals.opsOwnerId, userId), eq(deals.ownerId, userId)),
          inArray(deals.statusCode, closerStages),
          or(isNull(deals.closerLastTouch), lt(deals.closerLastTouch, daysAgo(STALE_DAYS))),
        ),
      )
      .orderBy(asc(deals.closerLastTouch))
      .limit(10),

    db
      .select({ statusCode: deals.statusCode, n: sql<number>`count(*)::int` })
      .from(deals)
      .where(and(or(eq(deals.opsOwnerId, userId), eq(deals.ownerId, userId)), isNotNull(deals.statusCode)))
      .groupBy(deals.statusCode),

    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, pofAmount: contacts.pofAmount })
      .from(contacts)
      .where(
        and(
          eq(contacts.status, "active_looking_hot"),
          eq(contacts.qualificationTier, "tier_1_experienced_rvp_network"),
        ),
      )
      .orderBy(desc(contacts.pofAmount))
      .limit(6),

    db
      .select({ id: notes.id, body: notes.body, parentId: notes.parentId, parentTable: notes.parentTable, createdAt: notes.createdAt })
      .from(notes)
      .where(eq(notes.authorId, userId))
      .orderBy(desc(notes.createdAt))
      .limit(5),
  ]);

  return {
    myDealsCount: myDeals[0]?.count ?? 0,
    myStaleDeals,
    myDealsByStage,
    hotTier1Buyers,
    recentNotesByMe,
  };
}

// ---- Erica / BD-manager dashboard ----

export async function fetchBdManagerDashboard() {
  const [newApplications, statusBreakdown, statusLookup, activeBds, totalBds] = await Promise.all([
    db
      .select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName, email: birdDogs.email, createdAt: birdDogs.createdAt })
      .from(birdDogs)
      .where(eq(birdDogs.statusCode, "hold_see_notes"))
      .orderBy(desc(birdDogs.createdAt))
      .limit(8),

    db
      .select({ statusCode: birdDogs.statusCode, n: sql<number>`count(*)::int` })
      .from(birdDogs)
      .where(isNotNull(birdDogs.statusCode))
      .groupBy(birdDogs.statusCode),

    db.select({ code: birdDogStatuses.code, label: birdDogStatuses.label, group: birdDogStatuses.group, sortOrder: birdDogStatuses.sortOrder }).from(birdDogStatuses),

    db
      .select({ id: birdDogs.id, firstName: birdDogs.firstName, lastName: birdDogs.lastName, email: birdDogs.email, lastActivityAt: birdDogs.lastActivityAt })
      .from(birdDogs)
      .where(inArray(birdDogs.statusCode, ["active", "active_half_time"]))
      .orderBy(asc(birdDogs.lastActivityAt))
      .limit(8),

    db.select({ count: sql<number>`count(*)::int` }).from(birdDogs),
  ]);

  return {
    newApplications,
    statusBreakdown,
    statusLookup,
    activeBds,
    totalBds: totalBds[0]?.count ?? 0,
  };
}

// ---- Kevin / CFO dashboard ----

export async function fetchCfoDashboard() {
  const escrowStages = ["tc_dd_in_escrow", "dd_completed_in_escrow"];
  const closedStages = ["closed_rvx_acquired", "closed_rvx_network"];

  const [dealsInEscrow, totalPof, pipelineValue, closedThisMonth] = await Promise.all([
    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, agreedPurchasePrice: deals.agreedPurchasePrice, psaCoeDate: deals.psaCoeDate })
      .from(deals)
      .where(inArray(deals.statusCode, escrowStages))
      .orderBy(asc(deals.psaCoeDate))
      .limit(10),

    db.select({ total: sql<number>`coalesce(sum(${contacts.pofAmount}), 0)::numeric` }).from(contacts),

    db
      .select({ total: sql<number>`coalesce(sum(${deals.agreedPurchasePrice}), 0)::numeric` })
      .from(deals)
      .where(isNotNull(deals.agreedPurchasePrice)),

    db
      .select({ count: sql<number>`count(*)::int`, total: sql<number>`coalesce(sum(${deals.agreedPurchasePrice}), 0)::numeric` })
      .from(deals)
      .where(and(inArray(deals.statusCode, closedStages), gt(deals.updatedAt, daysAgo(30)))),
  ]);

  return {
    dealsInEscrow,
    totalPof: Number(totalPof[0]?.total ?? 0),
    pipelineValue: Number(pipelineValue[0]?.total ?? 0),
    closedThisMonth: {
      count: closedThisMonth[0]?.count ?? 0,
      total: Number(closedThisMonth[0]?.total ?? 0),
    },
  };
}

// ---- Kerry / due-diligence dashboard ----

export async function fetchDueDiligenceDashboard() {
  const ddStages = ["tc_dd_in_escrow", "dd_completed_in_escrow"];
  const preDdStages = ["psa_accepted", "dm_dispo_initiated"];

  const [inDd, escrowOpenedRecently, awaitingDdStart] = await Promise.all([
    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, escrowOpened: deals.escrowOpened, inspectionPeriodEnd: deals.inspectionPeriodEnd, psaCoeDate: deals.psaCoeDate })
      .from(deals)
      .where(inArray(deals.statusCode, ddStages))
      .orderBy(asc(deals.inspectionPeriodEnd))
      .limit(10),

    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, escrowOpened: deals.escrowOpened })
      .from(deals)
      .where(and(isNotNull(deals.escrowOpened), gt(deals.escrowOpened, daysAgo(14).toISOString().slice(0, 10))))
      .orderBy(desc(deals.escrowOpened))
      .limit(5),

    db
      .select({ id: deals.id, name: deals.name, parkAddress: deals.parkAddress, statusCode: deals.statusCode })
      .from(deals)
      .where(inArray(deals.statusCode, preDdStages))
      .orderBy(desc(deals.updatedAt))
      .limit(5),
  ]);

  return { inDd, escrowOpenedRecently, awaitingDdStart };
}

// ---- shared snippets ----

export async function fetchOpenTasksForMe(userId: string, limit = 5) {
  return db
    .select({
      id: tasks.id,
      subject: tasks.subject,
      type: tasks.type,
      dueAt: tasks.dueAt,
      parentTable: tasks.parentTable,
      parentId: tasks.parentId,
    })
    .from(tasks)
    .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt)))
    .orderBy(asc(tasks.dueAt))
    .limit(limit);
}

export async function fetchRecentNotifications(limit = 5) {
  return db
    .select({ id: notifications.id, kind: notifications.kind, subject: notifications.subject, status: notifications.status, createdAt: notifications.createdAt })
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

// ---- default (viewer / no-role) ----

export async function fetchDefaultDashboard() {
  const [c, d, co, bd] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(contacts),
    db.select({ count: sql<number>`count(*)::int` }).from(deals),
    db.select({ count: sql<number>`count(*)::int`, totalPof: sql<number>`coalesce(sum(${contacts.pofAmount}), 0)::numeric` }).from(contacts),
    db.select({ count: sql<number>`count(*)::int` }).from(birdDogs),
  ]);
  return {
    contactsCount: c[0]?.count ?? 0,
    dealsCount: d[0]?.count ?? 0,
    companiesCount: co[0]?.count ?? 0,
    bdCount: bd[0]?.count ?? 0,
  };
}

// ---- pipeline status labels (used by stage-counts widget) ----

export async function fetchDealStatusLabels() {
  const rows = await db.select({ code: dealStatuses.code, label: dealStatuses.label }).from(dealStatuses);
  return new Map(rows.map((r) => [r.code, r.label]));
}

// ---- active deals for the dashboard map ----

import { groupForStatus } from "./portal-stage-groups";

const MAP_ACTIVE_STATUS_CODES = [
  "new_lead_received", "pace_leads", "sent_back_to_bd", "incomplete_file",
  "closer_first_contact_attempted", "closer_first_contact_made",
  "closer_under_negotiation", "closer_gathering_docs",
  "uw_ready_phase_2", "uw_under_phase_2",
  "loi_ready", "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted", "psa_accepted",
  "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

export async function fetchActiveDealsForMap() {
  const { and, isNotNull, inArray } = await import("drizzle-orm");
  const rows = await db
    .select({
      id: deals.id,
      name: deals.name,
      parkAddress: deals.parkAddress,
      parkCity: deals.parkCity,
      parkState: deals.parkState,
      statusCode: deals.statusCode,
      listPrice: deals.listPrice,
      latitude: deals.latitude,
      longitude: deals.longitude,
    })
    .from(deals)
    .where(
      and(
        isNotNull(deals.latitude),
        isNotNull(deals.longitude),
        inArray(deals.statusCode, MAP_ACTIVE_STATUS_CODES),
      ),
    );

  return rows.map((r) => {
    const g = groupForStatus(r.statusCode);
    return {
      id: r.id,
      title: r.name || r.parkAddress || "(unnamed)",
      city: r.parkCity,
      state: r.parkState,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      group: g.code as "new" | "contact" | "uw" | "offer" | "contract" | "won" | "network" | "drip" | "lost" | "dead" | "unknown",
      groupLabel: g.label,
      listPrice: r.listPrice,
    };
  });
}

// ---- pipeline value + funnel ----

import { PIPELINE_STAGES, type PipelineStageKey } from "./pipeline-stages";

export type FunnelStage = {
  key: PipelineStageKey;
  label: string;
  description: string;
  count: number;
  valueCents: number;
};

export async function fetchPipelineFunnel(): Promise<{
  stages: FunnelStage[];
  activeValueCents: number;
  activeCount: number;
  closedValueCents: number;
  closedCount: number;
}> {
  const { inArray } = await import("drizzle-orm");
  const allActive = PIPELINE_STAGES.flatMap((f) => f.statuses);
  const rows = await db
    .select({ statusCode: deals.statusCode, listPrice: deals.listPrice })
    .from(deals)
    .where(inArray(deals.statusCode, allActive));

  // Bucket each deal into a funnel stage
  const statusToKey = new Map<string, FunnelStage["key"]>();
  for (const f of PIPELINE_STAGES) {
    for (const s of f.statuses) statusToKey.set(s, f.key);
  }

  const stages: FunnelStage[] = PIPELINE_STAGES.map((f) => ({
    key: f.key,
    label: f.label,
    description: f.description,
    count: 0,
    valueCents: 0,
  }));
  const indexByKey = new Map(stages.map((s, i) => [s.key, i]));

  for (const r of rows) {
    const key = r.statusCode ? statusToKey.get(r.statusCode) : null;
    if (!key) continue;
    const idx = indexByKey.get(key)!;
    stages[idx].count++;
    const cents = priceToCents(r.listPrice);
    stages[idx].valueCents += cents;
  }

  const activeStages = stages.filter((s) => s.key !== "closed");
  const closedStage = stages.find((s) => s.key === "closed")!;

  return {
    stages,
    activeValueCents: activeStages.reduce((sum, s) => sum + s.valueCents, 0),
    activeCount: activeStages.reduce((sum, s) => sum + s.count, 0),
    closedValueCents: closedStage.valueCents,
    closedCount: closedStage.count,
  };
}

function priceToCents(v: string | null): number {
  if (!v) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

// ---- activity pulse (recent events across the system) ----

import { user as userTable } from "@/db/schema";

export type ActivityEvent = {
  id: string;          // unique row id
  kind: "note" | "call_log" | "form_submission" | "new_deal" | "dispo" | "bd_dial";
  icon: string;        // emoji
  title: string;       // one-line description
  detail?: string;     // optional second line (note body, etc.)
  authorName?: string | null;
  /** Where clicking takes you */
  href?: string;
  at: Date;
};

export async function fetchRecentActivity(limit = 25): Promise<ActivityEvent[]> {
  const { desc: descFn, gt: gtFn } = await import("drizzle-orm");

  // 1) Recent notes (call_log, manual, form_submission, dispo sends written as manual)
  const recentNotes = await db
    .select({
      id: notes.id,
      type: notes.type,
      body: notes.body,
      parentTable: notes.parentTable,
      parentId: notes.parentId,
      createdAt: notes.createdAt,
      authorName: userTable.name,
    })
    .from(notes)
    .leftJoin(userTable, eq(notes.authorId, userTable.id))
    .orderBy(descFn(notes.createdAt))
    .limit(limit);

  // 2) Recent deal creations (last 14d) — catches new BD portal submissions
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentDeals = await db
    .select({
      id: deals.id,
      name: deals.name,
      parkAddress: deals.parkAddress,
      parkCity: deals.parkCity,
      parkState: deals.parkState,
      birdDogFirstName: deals.birdDogFirstName,
      birdDogLastName: deals.birdDogLastName,
      leadSource: deals.leadSource,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .where(gtFn(deals.createdAt, twoWeeksAgo))
    .orderBy(descFn(deals.createdAt))
    .limit(limit);

  const events: ActivityEvent[] = [];

  // Notes
  for (const n of recentNotes) {
    const dealLink = n.parentTable === "deals" ? `/deals/${n.parentId}` : undefined;
    const contactLink = n.parentTable === "contacts" ? `/contacts/${n.parentId}` : undefined;
    const isDispo = n.body.startsWith("📤 Dispo'd");
    const isCallLog = n.type === "call_log";
    events.push({
      id: `note:${n.id}`,
      kind: isDispo ? "dispo" : isCallLog ? "call_log" : n.type === "form_submission" ? "form_submission" : "note",
      icon: isDispo ? "📤" : isCallLog ? "📞" : n.type === "form_submission" ? "📋" : "📝",
      title: firstLine(n.body),
      detail: secondLine(n.body),
      authorName: n.authorName,
      href: dealLink ?? contactLink,
      at: n.createdAt,
    });
  }

  // New deals (only if NOT already represented by a form_submission note for the same deal)
  const noteDealIds = new Set(recentNotes.filter((n) => n.parentTable === "deals" && n.type === "form_submission").map((n) => n.parentId));
  for (const d of recentDeals) {
    if (noteDealIds.has(d.id)) continue;
    const title = d.name || d.parkAddress || "(unnamed deal)";
    const loc = [d.parkCity, d.parkState].filter(Boolean).join(", ");
    const bdName = [d.birdDogFirstName, d.birdDogLastName].filter(Boolean).join(" ").trim() || null;
    const sourceLabel =
      d.leadSource === "bird_dog" ? (bdName ? `via bird dog ${bdName}` : "via bird dog")
      : d.leadSource === "direct_seller_rvx_website" ? "via /sell-your-park"
      : d.leadSource === "outside_source_rvx_website" ? "via outside source"
      : null;
    events.push({
      id: `deal:${d.id}`,
      kind: "new_deal",
      icon: "🦅",
      title: `New deal: ${title}`,
      detail: [loc, sourceLabel].filter(Boolean).join(" · ") || undefined,
      authorName: null,
      href: `/deals/${d.id}`,
      at: d.createdAt,
    });
  }

  // 3) Recent BD dials — the company heartbeat (Reza: include on the
  //    Mission Control pulse). Joined to the park + caller name.
  const dialRows = await db.execute(sql`
    SELECT d.id, d.outcome::text AS outcome, d.created_at,
           u.name AS caller, rl.park_name, rl.city, rl.state
    FROM raw_lead_dispositions d
    LEFT JOIN "user" u ON u.id = d.by_user_id
    LEFT JOIN raw_leads rl ON rl.id = d.raw_lead_id
    ORDER BY d.created_at DESC
    LIMIT ${limit}
  `);
  const dials = ((dialRows as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (dialRows as unknown as Array<Record<string, unknown>>)) ?? [];
  for (const d of dials) {
    const outcome = String(d.outcome ?? "");
    const park = (d.park_name as string | null) ?? "(unnamed park)";
    const loc = [d.city, d.state].filter(Boolean).join(", ");
    const pretty = outcome === "qualified"
      ? "Qualified ✅"
      : outcome.replace(/^connected_/, "Connected · ").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    events.push({
      id: `dial:${d.id}`,
      kind: "bd_dial",
      icon: outcome === "qualified" ? "✅" : "📞",
      title: `${pretty} — ${park}`,
      detail: loc || undefined,
      authorName: (d.caller as string | null) ?? null,
      at: new Date(d.created_at as string),
    });
  }

  // Merge, sort, truncate
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  return events.slice(0, limit);
}

/** Hot tier-1 buyers — moved to closers' Today when /dashboard died. */
export async function fetchHotTier1Buyers(limit = 6) {
  return db
    .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, pofAmount: contacts.pofAmount })
    .from(contacts)
    .where(
      and(
        eq(contacts.status, "active_looking_hot"),
        eq(contacts.qualificationTier, "tier_1_experienced_rvp_network"),
      ),
    )
    .orderBy(desc(contacts.pofAmount))
    .limit(limit);
}

function firstLine(body: string): string {
  const i = body.indexOf("\n");
  const line = (i === -1 ? body : body.slice(0, i)).trim();
  return line.length > 120 ? line.slice(0, 117) + "…" : line;
}

function secondLine(body: string): string | undefined {
  const i = body.indexOf("\n");
  if (i === -1) return undefined;
  const rest = body.slice(i + 1).trim();
  if (!rest) return undefined;
  // skip a blank separator line between header and body
  const j = rest.indexOf("\n");
  const second = (j === -1 ? rest : rest.slice(0, j)).trim() || rest;
  return second.length > 140 ? second.slice(0, 137) + "…" : second;
}
