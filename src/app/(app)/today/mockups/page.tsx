/**
 * /today/mockups — three side-by-side directions for redesigning /today.
 *
 * Each variant fetches the same real data, then renders a distinct layout
 * so Reza can compare like-for-like. Switching is ?v=focus|inbox|dashboard
 * via a small bar at top.
 *
 * After he picks one, this whole folder gets deleted and the chosen
 * variant becomes the new /today.
 */
import { headers } from "next/headers";
import Link from "next/link";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, tasks, dealStatuses } from "@/db/schema";
import { auth } from "@/lib/auth";
import { fetchRecentActivity } from "@/lib/dashboard-queries";
import { getOrCreateDailyBrief } from "@/app/actions/daily-brief";
import { detectAtRiskForUser } from "@/lib/at-risk";
import { getDoNextItems } from "@/lib/do-next";
import { getUnreadMentionsFor } from "@/lib/mentions";
import { PageShell } from "../../page-shell";
import { FocusVariant, InboxVariant, DashboardVariant } from "./variants";

const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVE_DEAL_STAGES = [
  "closer_first_contact_attempted",
  "closer_first_contact_made",
  "closer_under_negotiation",
  "closer_gathering_docs",
  "uw_ready_phase_2",
  "uw_under_phase_2",
  "loi_ready",
  "loi_submitted",
  "loi_in_negotiation",
  "loi_signed_by_seller",
  "loi_accepted_both_sides",
  "tc_writing_psa",
  "tc_psa_submitted",
  "psa_accepted",
  "tc_dd_in_escrow",
];

type Variant = "focus" | "inbox" | "dashboard";

function isVariant(v: string | undefined): v is Variant {
  return v === "focus" || v === "inbox" || v === "dashboard";
}

const META: Record<Variant, { label: string; subtitle: string }> = {
  focus: {
    label: "A — Focus",
    subtitle: "One thing at a time. Brief is a single line. Do-next card dominates. Mentions / Tasks / At-risk fold into tabs.",
  },
  inbox: {
    label: "B — Inbox",
    subtitle: "Single chronological queue of everything that needs you — mentions, tasks, at-risk, leads. Work it like email.",
  },
  dashboard: {
    label: "C — Dashboard",
    subtitle: "Command center. Two-column dense grid. See everything at once.",
  },
};

export default async function TodayMockupsPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const params = await searchParams;
  const variant: Variant = isVariant(params.v) ? params.v : "focus";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const me = session.user.id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + DAY_MS);

  const [
    myOpenTasks,
    myDeals,
    newLeads,
    statusRows,
    weeklyDealRows,
    pipelineValueRows,
    activity,
    brief,
    atRisk,
    doNext,
    mentions,
  ] = await Promise.all([
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.assigneeId, me), isNull(tasks.completedAt)))
      .orderBy(sql`${tasks.dueAt} ASC NULLS LAST`)
      .limit(12),
    db
      .select({
        id: deals.id,
        name: deals.name,
        parkAddress: deals.parkAddress,
        parkCity: deals.parkCity,
        parkState: deals.parkState,
        statusCode: deals.statusCode,
        dealPriority: deals.dealPriority,
        listPrice: deals.listPrice,
        closerLastTouch: deals.closerLastTouch,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(and(eq(deals.ownerId, me), inArray(deals.statusCode, ACTIVE_DEAL_STAGES), isNull(deals.deletedAt)))
      .orderBy(sql`COALESCE(${deals.closerLastTouch}, ${deals.updatedAt}) ASC`)
      .limit(8),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, createdAt: contacts.createdAt })
      .from(contacts)
      .where(and(eq(contacts.status, "new_waiting_to_connect"), isNull(contacts.deletedAt)))
      .orderBy(desc(contacts.createdAt))
      .limit(6),
    db.select({ code: dealStatuses.code, label: dealStatuses.label }).from(dealStatuses),
    db.select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(and(gt(deals.createdAt, new Date(Date.now() - 7 * DAY_MS)), isNull(deals.deletedAt))),
    db.select({ total: sql<number>`COALESCE(SUM(${deals.listPrice}::numeric), 0)::bigint` })
      .from(deals)
      .where(and(inArray(deals.statusCode, ACTIVE_DEAL_STAGES), isNull(deals.deletedAt))),
    fetchRecentActivity(15),
    getOrCreateDailyBrief(me),
    detectAtRiskForUser(me).catch(() => []),
    getDoNextItems(me, 5).catch(() => []),
    getUnreadMentionsFor(me, 10),
  ]);

  // Mark the gt import as used in this file; keeps eslint quiet if no
  // other reference shows up later in the file body.
  void isNotNull;

  const statusLabel = new Map(statusRows.map((s) => [s.code, s.label]));
  const overdueCount = myOpenTasks.filter((t) => t.dueAt && t.dueAt < today).length;
  const dueTodayCount = myOpenTasks.filter((t) => t.dueAt && t.dueAt >= today && t.dueAt < tomorrow).length;
  const newDealsThisWeek = Number(weeklyDealRows[0]?.count ?? 0);
  const pipelineValue = Number(pipelineValueRows[0]?.total ?? 0);

  // Serialize Dates for client components.
  const serializedMentions = mentions.map((m) => ({
    ...m,
    mentionedAt: m.mentionedAt.toISOString(),
  }));

  const commonProps = {
    userName: session.user.name,
    brief: brief ? { contentMd: brief.contentMd, createdAt: brief.createdAt.toISOString() } : null,
    doNext,
    mentions: serializedMentions,
    atRisk,
    tasks: myOpenTasks.map((t) => ({
      ...t,
      dueAt: t.dueAt?.toISOString() ?? null,
      completedAt: t.completedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
    myDeals: myDeals.map((d) => ({
      ...d,
      closerLastTouch: d.closerLastTouch?.toISOString() ?? null,
      updatedAt: d.updatedAt.toISOString(),
      listPrice: d.listPrice,
    })),
    newLeads: newLeads.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })),
    statusLabel: Object.fromEntries(statusLabel),
    activity,
    stats: {
      openTaskCount: myOpenTasks.length,
      overdueCount,
      dueTodayCount,
      myDealCount: myDeals.length,
      newDealsThisWeek,
      pipelineValue,
    },
  };

  return (
    <PageShell title="Today — mockups" subtitle={META[variant].subtitle} width="wide">
      <VariantBar current={variant} />
      <div className="mt-5">
        {variant === "focus" && <FocusVariant {...commonProps} />}
        {variant === "inbox" && <InboxVariant {...commonProps} />}
        {variant === "dashboard" && <DashboardVariant {...commonProps} />}
      </div>
    </PageShell>
  );
}

function VariantBar({ current }: { current: Variant }) {
  const variants: Variant[] = ["focus", "inbox", "dashboard"];
  return (
    <div className="rounded-lg border border-dashed border-border bg-foreground/[0.02] p-3 flex items-center gap-3 flex-wrap">
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium">Variant</div>
      <div className="flex gap-1 text-xs">
        {variants.map((v) => {
          const active = v === current;
          return (
            <Link
              key={v}
              href={`/today/mockups?v=${v}` as never}
              className={
                "rounded-md px-2.5 py-1 border " +
                (active
                  ? "border-primary/40 bg-primary/[0.08] text-primary font-medium"
                  : "border-border text-foreground/70 hover:bg-foreground/[0.04]")
              }
            >
              {META[v].label}
            </Link>
          );
        })}
      </div>
      <div className="text-[11px] text-muted ml-auto">
        Pick a winner → tell me &quot;ship variant {current.toUpperCase()[0]}&quot;
      </div>
    </div>
  );
}
