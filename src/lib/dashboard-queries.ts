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
