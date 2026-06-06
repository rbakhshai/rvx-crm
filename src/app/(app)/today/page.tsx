/**
 * /today — the new default landing.
 *
 * One page answers "what needs me right now?":
 *   • My open tasks, ordered by due (overdue first)
 *   • Deals I own, sorted by staleness — proactive nudge
 *   • New buyer leads needing first contact
 *   • Team-wide live activity feed
 *
 * Replaces the old per-role dashboard as the daily-driver view. The
 * detailed dashboard still exists at /dashboard if anyone wants it.
 */
import Link from "next/link";
import { headers } from "next/headers";
import { and, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  tasks,
  deals,
  contacts,
  notifications as notificationsTable,
  dealStatuses,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { fetchRecentActivity } from "@/lib/dashboard-queries";
import { PageShell } from "../page-shell";
import { ActivityPulse } from "@/components/activity-pulse";
import { Widget, ListLink, EmptyHint, StatTile, PriorityBadge, StaleBadge } from "../dashboard/widgets";
import { Badge } from "@/components/badge";
import { DailyBrief } from "@/components/daily-brief";
import { getOrCreateDailyBrief } from "@/app/actions/daily-brief";
import { AtRiskWidget } from "@/components/at-risk-widget";
import { detectAtRiskForUser } from "@/lib/at-risk";

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

function greeting(name: string | null): string {
  const h = new Date().getHours();
  const first = name?.split(" ")[0] ?? "";
  const prefix = h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return first ? `${prefix}, ${first}` : prefix;
}

function dueLabel(d: Date | null): { label: string; tone: "danger" | "warning" | "muted" } {
  if (!d) return { label: "no due", tone: "muted" };
  const diff = d.getTime() - Date.now();
  if (diff < 0) {
    const days = Math.ceil(-diff / DAY_MS);
    return { label: days === 0 ? "due today" : `${days}d overdue`, tone: "danger" };
  }
  if (diff < DAY_MS) return { label: "due today", tone: "warning" };
  if (diff < 7 * DAY_MS) return { label: `${Math.ceil(diff / DAY_MS)}d`, tone: "muted" };
  return { label: d.toLocaleDateString(), tone: "muted" };
}

export default async function TodayPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const me = session.user.id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + DAY_MS);

  const [
    myOpenTasks,
    myDeals,
    newLeads,
    unreadNotifs,
    statusRows,
    weeklyDealRows,
    pipelineValueRows,
    activity,
    brief,
    atRisk,
  ] = await Promise.all([
    // 1) My open tasks (top 12, soonest due first, NULLs last)
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.assigneeId, me), isNull(tasks.completedAt)))
      .orderBy(sql`${tasks.dueAt} ASC NULLS LAST`)
      .limit(12),

    // 2) Deals I own — in active stages, sorted by staleness (oldest first)
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

    // 3) New buyer leads — closer's queue
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, createdAt: contacts.createdAt })
      .from(contacts)
      .where(and(eq(contacts.status, "new_waiting_to_connect"), isNull(contacts.deletedAt)))
      .orderBy(desc(contacts.createdAt))
      .limit(6),

    // 4) Recent notifications (any 'pending' / 'failed' that need attention)
    db
      .select({ id: notificationsTable.id, kind: notificationsTable.kind, subject: notificationsTable.subject, status: notificationsTable.status, createdAt: notificationsTable.createdAt })
      .from(notificationsTable)
      .where(inArray(notificationsTable.status, ["pending", "failed"]))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(5),

    db.select({ code: dealStatuses.code, label: dealStatuses.label }).from(dealStatuses),

    // 5a) New deals this week
    db.select({ count: sql<number>`count(*)::int` })
      .from(deals)
      .where(and(gt(deals.createdAt, new Date(Date.now() - 7 * DAY_MS)), isNull(deals.deletedAt))),

    // 5b) Pipeline value across all active stages
    db.select({ total: sql<number>`COALESCE(SUM(${deals.listPrice}::numeric), 0)::bigint` })
      .from(deals)
      .where(and(inArray(deals.statusCode, ACTIVE_DEAL_STAGES), isNull(deals.deletedAt))),

    fetchRecentActivity(20),
    getOrCreateDailyBrief(me),
    detectAtRiskForUser(me),
  ]);

  const statusLabel = new Map(statusRows.map((s) => [s.code, s.label]));

  const overdueCount = myOpenTasks.filter((t) => t.dueAt && t.dueAt < today).length;
  const dueTodayCount = myOpenTasks.filter((t) => t.dueAt && t.dueAt >= today && t.dueAt < tomorrow).length;

  const newDealsThisWeek = Number(weeklyDealRows[0]?.count ?? 0);
  const pipelineValue = Number(pipelineValueRows[0]?.total ?? 0);

  return (
    <PageShell title={greeting(session.user.name)} subtitle={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} width="wide">
      {/* ===== AI morning brief ===== */}
      <DailyBrief contentMd={brief.contentMd} createdAt={brief.createdAt} />

      {/* ===== Hero stats ===== */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="My open tasks"
          value={myOpenTasks.length}
          hint={overdueCount > 0 ? `${overdueCount} overdue` : dueTodayCount > 0 ? `${dueTodayCount} due today` : "on track"}
        />
        <StatTile
          label="Deals I own"
          value={myDeals.length}
          hint="active stages"
        />
        <StatTile
          label="New leads"
          value={newLeads.length}
          hint="waiting to connect"
        />
        <StatTile
          label="Pipeline value"
          value={pipelineValue ? `$${(pipelineValue / 1_000_000).toFixed(1)}M` : "—"}
          hint={`${newDealsThisWeek} new this week`}
        />
      </div>

      {/* ===== Main 3-column grid ===== */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Left col: at-risk + my tasks — primary */}
        <div className="lg:col-span-5 space-y-4">
          <AtRiskWidget risks={atRisk} />
          <Widget
            title="My tasks"
            hint="Sorted by due date. Click through to act."
            count={myOpenTasks.length > 0 ? `${myOpenTasks.length} open` : undefined}
            href="/tasks"
          >
            {myOpenTasks.length === 0 ? (
              <EmptyHint>Inbox zero. Nice. 🎉</EmptyHint>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {myOpenTasks.map((t) => {
                  const due = dueLabel(t.dueAt);
                  const parentHref =
                    t.parentTable === "deals" ? `/deals/${t.parentId}`
                    : t.parentTable === "contacts" ? `/contacts/${t.parentId}`
                    : t.parentTable === "companies" ? `/companies/${t.parentId}`
                    : t.parentTable === "bird_dogs" ? `/bird-dogs/${t.parentId}`
                    : "/tasks";
                  return (
                    <li key={t.id}>
                      <Link
                        href={parentHref as never}
                        className="flex items-start justify-between gap-3 py-2.5 px-1 -mx-1 rounded hover:bg-foreground/[0.03]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{t.subject}</div>
                          {t.body && (
                            <div className="text-[11px] text-muted truncate mt-0.5">{t.body}</div>
                          )}
                        </div>
                        <Badge tone={due.tone}>{due.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Widget>

          <Widget
            title="New leads"
            hint="Buyer inquiries waiting on first contact"
            count={newLeads.length}
            href="/contacts?status=new_waiting_to_connect"
          >
            {newLeads.length === 0 ? (
              <EmptyHint>Triage clear.</EmptyHint>
            ) : (
              <div className="space-y-0.5">
                {newLeads.map((l) => (
                  <ListLink
                    key={l.id}
                    href={`/contacts/${l.id}`}
                    primary={[l.firstName, l.lastName].filter(Boolean).join(" ") || "(unnamed)"}
                    secondary={l.email ?? undefined}
                    trailing={<StaleBadge since={l.createdAt} />}
                  />
                ))}
              </div>
            )}
          </Widget>
        </div>

        {/* Middle col: deals + alerts */}
        <div className="lg:col-span-4 space-y-4">
          <Widget
            title="Deals waiting on you"
            hint="Your active pipeline, stalest first"
            count={myDeals.length}
            href="/deals"
          >
            {myDeals.length === 0 ? (
              <EmptyHint>No active deals assigned to you.</EmptyHint>
            ) : (
              <div className="space-y-0.5">
                {myDeals.map((d) => {
                  const title = d.name || d.parkAddress || "(unnamed deal)";
                  const loc = [d.parkCity, d.parkState].filter(Boolean).join(", ");
                  const stage = d.statusCode ? statusLabel.get(d.statusCode) ?? d.statusCode : null;
                  return (
                    <ListLink
                      key={d.id}
                      href={`/deals/${d.id}`}
                      primary={
                        <span className="flex items-center gap-1.5">
                          <PriorityBadge priority={d.dealPriority} />
                          <span className="truncate">{title}</span>
                        </span>
                      }
                      secondary={[loc, stage].filter(Boolean).join(" · ")}
                      trailing={<StaleBadge since={d.closerLastTouch ?? d.updatedAt} />}
                    />
                  );
                })}
              </div>
            )}
          </Widget>

          <Widget
            title="Needs attention"
            hint="Failed or queued notifications"
            count={unreadNotifs.length || undefined}
            href="/notifications"
          >
            {unreadNotifs.length === 0 ? (
              <EmptyHint>All clear.</EmptyHint>
            ) : (
              <div className="space-y-0.5">
                {unreadNotifs.map((n) => (
                  <ListLink
                    key={n.id}
                    href="/notifications"
                    primary={n.subject}
                    secondary={n.kind.replace(/_/g, " ")}
                    trailing={
                      <Badge tone={n.status === "failed" ? "danger" : "warning"}>
                        {n.status === "failed" ? "failed" : "queued"}
                      </Badge>
                    }
                  />
                ))}
              </div>
            )}
          </Widget>

          <Widget title="Jump to" hint="Common destinations">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link href="/deals/board" className="rounded-md border border-border px-3 py-2 hover:bg-foreground/[0.04] transition">
                📋 Pipeline board
              </Link>
              <Link href="/triage" className="rounded-md border border-border px-3 py-2 hover:bg-foreground/[0.04] transition">
                🎯 Triage cockpit
              </Link>
              <Link href={"/deals/new" as never} className="rounded-md border border-border px-3 py-2 hover:bg-foreground/[0.04] transition">
                + New deal
              </Link>
              <Link href={"/contacts/new" as never} className="rounded-md border border-border px-3 py-2 hover:bg-foreground/[0.04] transition">
                + New buyer
              </Link>
            </div>
          </Widget>
        </div>

        {/* Right col: activity */}
        <div className="lg:col-span-3">
          <ActivityPulse events={activity} />
        </div>
      </div>

    </PageShell>
  );
}
