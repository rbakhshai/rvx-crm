/**
 * Three Today-page redesigns rendered server-side. They all consume the
 * same shape (CommonProps) so swapping variants is a single conditional.
 *
 *   A — Focus      Single big Do-Next, AI brief as 1-line, tabs below
 *   B — Inbox      Unified action feed (mentions+tasks+at-risk+leads)
 *   C — Dashboard  Two-column dense grid with hero stats + widgets
 *
 * Once a winner is picked the routing collapses to /today and this
 * folder is deleted.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Widget, ListLink, EmptyHint, StatTile, PriorityBadge, StaleBadge } from "../../dashboard/widgets";
import { ActivityPulse } from "@/components/activity-pulse";
import { DailyBrief } from "@/components/daily-brief";
import { AtRiskWidget } from "@/components/at-risk-widget";
import { DoNextStack } from "@/components/do-next-stack";
import { MentionsWidget } from "@/components/mentions-widget";
import { Badge } from "@/components/badge";
import { fmtDate } from "@/lib/date-format";
import type { OutstandingMention } from "@/lib/mentions";
import type { ActivityEvent } from "@/lib/dashboard-queries";
import type { DoNextItem } from "@/lib/do-next";
import type { Risk } from "@/lib/at-risk";
import { FocusBriefLine, MockTabs } from "./client-bits";

const DAY_MS = 24 * 60 * 60 * 1000;

type Mention = Omit<OutstandingMention, "mentionedAt"> & { mentionedAt: string };

type TaskRow = {
  id: string;
  subject: string;
  body: string | null;
  type: string;
  dueAt: string | null;
  completedAt: string | null;
  parentTable: string;
  parentId: string;
  createdAt: string;
};

type DealRow = {
  id: string;
  name: string | null;
  parkAddress: string | null;
  parkCity: string | null;
  parkState: string | null;
  statusCode: string | null;
  dealPriority: string | null;
  listPrice: string | null;
  closerLastTouch: string | null;
  updatedAt: string;
};

type LeadRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  createdAt: string;
};

export type CommonProps = {
  userName: string | null;
  brief: { contentMd: string; createdAt: string } | null;
  doNext: DoNextItem[];
  mentions: Mention[];
  atRisk: Risk[];
  tasks: TaskRow[];
  myDeals: DealRow[];
  newLeads: LeadRow[];
  statusLabel: Record<string, string>;
  activity: ActivityEvent[];
  stats: {
    openTaskCount: number;
    overdueCount: number;
    dueTodayCount: number;
    myDealCount: number;
    newDealsThisWeek: number;
    pipelineValue: number;
  };
};

// ============================================================================
// Shared bits
// ============================================================================

function greet(name: string | null): string {
  const h = new Date().getHours();
  const first = name?.split(" ")[0] ?? "";
  const prefix = h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return first ? `${prefix}, ${first}` : prefix;
}

function dueChip(d: string | null): { label: string; tone: "danger" | "warning" | "muted" } {
  if (!d) return { label: "no due", tone: "muted" };
  const due = new Date(d);
  const diff = due.getTime() - Date.now();
  if (diff < 0) {
    const days = Math.ceil(-diff / DAY_MS);
    return { label: days === 0 ? "due today" : `${days}d overdue`, tone: "danger" };
  }
  if (diff < DAY_MS) return { label: "due today", tone: "warning" };
  if (diff < 7 * DAY_MS) return { label: `${Math.ceil(diff / DAY_MS)}d`, tone: "muted" };
  return { label: fmtDate(due), tone: "muted" };
}

function moneyShort(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function GreetingRow({ name }: { name: string | null }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-semibold tracking-tight">{greet(name)}</h1>
      <p className="text-sm text-muted mt-0.5">
        {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

// ============================================================================
// A — Focus
// ============================================================================

export function FocusVariant(p: CommonProps) {
  const tabs: Array<{ key: "mentions" | "tasks" | "atrisk"; label: string; count: number; content: ReactNode }> = [
    {
      key: "mentions",
      label: "Mentions",
      count: p.mentions.length,
      content: <MentionsWidget mentions={p.mentions} variant="compact" />,
    },
    {
      key: "tasks",
      label: "Tasks",
      count: p.tasks.length,
      content: <TasksList tasks={p.tasks} />,
    },
    {
      key: "atrisk",
      label: "At-risk",
      count: p.atRisk.length,
      content: <AtRiskWidget risks={p.atRisk} />,
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <GreetingRow name={p.userName} />
      <FocusBriefLine brief={p.brief} />

      <div className="mt-4">
        <DoNextStack items={p.doNext} />
      </div>

      <div className="mt-2">
        <MockTabs tabs={tabs.map((t) => ({ key: t.key, label: t.label, count: t.count }))}>
          {(activeKey) => tabs.find((t) => t.key === activeKey)?.content ?? null}
        </MockTabs>
      </div>
    </div>
  );
}

// ============================================================================
// B — Inbox
// ============================================================================

type InboxItem = {
  id: string;
  kind: "mention" | "task" | "atrisk" | "lead";
  icon: string;
  title: string;
  subtitle: string;
  meta: string;
  href: string;
  urgency: number; // higher = more urgent
};

function buildInbox(p: CommonProps): InboxItem[] {
  const items: InboxItem[] = [];

  for (const m of p.mentions) {
    items.push({
      id: `mention-${m.id}`,
      kind: "mention",
      icon: "💬",
      title: `${m.authorName ?? "Someone"} tagged you`,
      subtitle: m.body.replace(/\s+/g, " ").slice(0, 110),
      meta: new Date(m.mentionedAt).toLocaleString(),
      href: `/${m.parentTable === "bird_dogs" ? "bird-dogs" : m.parentTable}/${m.parentId}`,
      urgency: 800,
    });
  }

  for (const t of p.tasks.slice(0, 12)) {
    const due = dueChip(t.dueAt);
    items.push({
      id: `task-${t.id}`,
      kind: "task",
      icon: due.tone === "danger" ? "⚠️" : "✓",
      title: t.subject,
      subtitle: t.body ?? `${t.type}`,
      meta: due.label,
      href: `/${t.parentTable === "bird_dogs" ? "bird-dogs" : t.parentTable}/${t.parentId}`,
      urgency: due.tone === "danger" ? 900 : due.tone === "warning" ? 700 : 400,
    });
  }

  for (const r of p.atRisk.slice(0, 6)) {
    items.push({
      id: `atrisk-${r.dealId}-${r.kind}`,
      kind: "atrisk",
      icon: "🔥",
      title: r.title,
      subtitle: r.reason,
      meta: r.kind.replace(/_/g, " "),
      href: r.href,
      urgency: 750 + r.severity / 10,
    });
  }

  for (const l of p.newLeads.slice(0, 4)) {
    const name = [l.firstName, l.lastName].filter(Boolean).join(" ") || "(unnamed)";
    const ageMs = Date.now() - new Date(l.createdAt).getTime();
    const ageDays = Math.floor(ageMs / DAY_MS);
    items.push({
      id: `lead-${l.id}`,
      kind: "lead",
      icon: "🆕",
      title: `New lead: ${name}`,
      subtitle: l.email ?? "no email",
      meta: ageDays === 0 ? "today" : `${ageDays}d ago`,
      href: `/contacts/${l.id}`,
      urgency: 500 + Math.max(0, 7 - ageDays) * 20,
    });
  }

  return items.sort((a, b) => b.urgency - a.urgency);
}

export function InboxVariant(p: CommonProps) {
  const inbox = buildInbox(p);

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-6">
      <div>
        <GreetingRow name={p.userName} />

        {p.brief && (
          <details className="mb-4 rounded-lg border border-border bg-foreground/[0.02] p-3 group">
            <summary className="text-xs text-foreground/70 cursor-pointer select-none flex items-center gap-1.5 list-none">
              <span className="text-base">✨</span>
              <span className="font-medium">Morning brief</span>
              <span className="text-muted">— click to expand</span>
            </summary>
            <div className="mt-3 prose prose-sm max-w-none text-[13px] text-foreground/90 whitespace-pre-wrap">
              {p.brief.contentMd}
            </div>
          </details>
        )}

        <section className="rounded-xl border border-border bg-background">
          <header className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Your inbox <span className="text-muted font-normal">({inbox.length})</span>
            </h2>
            <span className="text-[10px] uppercase tracking-widest text-muted">sorted by urgency</span>
          </header>
          {inbox.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">Clear inbox 🎉</div>
          ) : (
            <ol className="divide-y divide-border max-h-[70vh] overflow-y-auto">
              {inbox.map((it) => (
                <li key={it.id}>
                  <Link
                    href={it.href as never}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-foreground/[0.03] transition"
                  >
                    <div className="size-9 shrink-0 rounded-full bg-foreground/[0.04] grid place-items-center text-base">
                      {it.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-medium text-foreground truncate">{it.title}</p>
                        <span className="text-[11px] text-muted shrink-0 tabular-nums">{it.meta}</span>
                      </div>
                      <p className="text-[12px] text-foreground/70 mt-0.5 line-clamp-1">{it.subtitle}</p>
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-widest text-muted font-medium">
                        {it.kind === "mention" ? "@mention" : it.kind === "atrisk" ? "at-risk" : it.kind}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <aside className="lg:sticky lg:top-16 lg:self-start">
        <ActivityPulse events={p.activity} />
      </aside>
    </div>
  );
}

// ============================================================================
// C — Dashboard
// ============================================================================

export function DashboardVariant(p: CommonProps) {
  return (
    <div>
      <GreetingRow name={p.userName} />

      {p.brief && <DailyBrief contentMd={p.brief.contentMd} createdAt={p.brief.createdAt} />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile
          label="My open tasks"
          value={p.stats.openTaskCount}
          hint={p.stats.overdueCount > 0 ? `${p.stats.overdueCount} overdue` : p.stats.dueTodayCount > 0 ? `${p.stats.dueTodayCount} due today` : "on track"}
        />
        <StatTile label="Deals I own" value={p.stats.myDealCount} />
        <StatTile label="New deals (7d)" value={p.stats.newDealsThisWeek} />
        <StatTile label="Pipeline value" value={moneyShort(p.stats.pipelineValue)} />
      </div>

      <div className="grid lg:grid-cols-[3fr_2fr] gap-5">
        <div className="space-y-4">
          <DoNextStack items={p.doNext} />
          <MentionsWidget mentions={p.mentions} />
          <AtRiskWidget risks={p.atRisk} />
        </div>
        <div className="space-y-4">
          <TasksCard tasks={p.tasks} />
          <DealsCard deals={p.myDeals} />
          <ActivityPulse events={p.activity} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Small helper widgets used by variants
// ============================================================================

function TasksList({ tasks }: { tasks: TaskRow[] }) {
  if (tasks.length === 0) {
    return <EmptyHint>No open tasks. Pick a deal to push forward.</EmptyHint>;
  }
  return (
    <ul className="divide-y divide-border">
      {tasks.slice(0, 8).map((t) => {
        const due = dueChip(t.dueAt);
        return (
          <li key={t.id}>
            <ListLink
              href={`/${t.parentTable === "bird_dogs" ? "bird-dogs" : t.parentTable}/${t.parentId}` as never}
              primary={t.subject}
              secondary={due.label}
              trailing={<span className="text-[10px] uppercase tracking-widest text-muted">{t.type}</span>}
            />
          </li>
        );
      })}
    </ul>
  );
}

function TasksCard({ tasks }: { tasks: TaskRow[] }) {
  return (
    <Widget title="Your open tasks" hint="Sorted by due date" href="/tasks?view=mine_open" count={tasks.length}>
      <TasksList tasks={tasks} />
    </Widget>
  );
}

function DealsCard({ deals }: { deals: DealRow[] }) {
  if (deals.length === 0) {
    return (
      <Widget title="Deals you own" count={0}>
        <EmptyHint>No active deals on your plate.</EmptyHint>
      </Widget>
    );
  }
  return (
    <Widget title="Deals you own" hint="Stalest first" count={deals.length}>
      <ul className="divide-y divide-border">
        {deals.slice(0, 6).map((d) => {
          const title = d.name ?? d.parkAddress ?? "(unnamed)";
          const loc = [d.parkCity, d.parkState].filter(Boolean).join(", ");
          return (
            <li key={d.id}>
              <ListLink
                href={`/deals/${d.id}` as never}
                primary={title}
                secondary={loc || "no location"}
                trailing={
                  <div className="inline-flex items-center gap-1.5">
                    {d.dealPriority && <PriorityBadge priority={d.dealPriority as never} />}
                    <StaleBadge since={d.closerLastTouch ? new Date(d.closerLastTouch) : null} />
                  </div>
                }
              />
            </li>
          );
        })}
      </ul>
    </Widget>
  );
}

// Mark the import as used to keep lint quiet when only used conditionally.
void Badge;
