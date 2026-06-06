/**
 * "Do next" priority engine. Combines several signals into a single
 * ordered list of actions, then returns the top one.
 *
 * Signals:
 *   - Overdue tasks                 (highest urgency)
 *   - Tasks due today
 *   - At-risk deals (going cold / stalled / dd behind)
 *   - New buyer leads needing first contact (oldest first)
 *
 * Items the user already skipped today are filtered out.
 */
import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { contacts, deals, doNextSkips, tasks } from "@/db/schema";
import { detectAtRiskForUser, describeRisk, type Risk } from "./at-risk";
import { fmtDate } from "./date-format";

const DAY_MS = 24 * 60 * 60 * 1000;

export type DoNextItem = {
  kind: "task" | "at_risk" | "new_lead";
  id: string;                  // entity id for skip tracking + actions
  score: number;               // higher = more urgent
  icon: string;
  badge: string;               // small label above title (e.g. "Overdue", "Going cold")
  title: string;
  subtitle?: string;           // location, last touch, etc.
  reason: string;              // why this is up next, plain English
  /** Action labels + their kind. Buttons rendered in this order. */
  actions: DoNextAction[];
};

export type DoNextAction =
  /** Quick: mark current task complete */
  | { kind: "task_done"; label: string }
  /** Open deal/contact/etc. in drawer */
  | { kind: "open"; label: string; href: string }
  /** Skip until tomorrow */
  | { kind: "skip"; label: string };

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDoNextItems(userId: string, limit = 5): Promise<DoNextItem[]> {
  const now = Date.now();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + DAY_MS);

  const [openTasks, newLeads, atRiskRaw, skips] = await Promise.all([
    db
      .select({ id: tasks.id, subject: tasks.subject, body: tasks.body, dueAt: tasks.dueAt, parentTable: tasks.parentTable, parentId: tasks.parentId })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt)))
      .orderBy(sql`${tasks.dueAt} ASC NULLS LAST`)
      .limit(20),

    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName, lastName: contacts.lastName,
        email: contacts.email, state: contacts.state, createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(and(eq(contacts.status, "new_waiting_to_connect"), isNull(contacts.deletedAt)))
      .orderBy(asc(contacts.createdAt))
      .limit(10),

    detectAtRiskForUser(userId),

    db
      .select({ itemKind: doNextSkips.itemKind, itemId: doNextSkips.itemId })
      .from(doNextSkips)
      .where(and(eq(doNextSkips.userId, userId), eq(doNextSkips.skippedForDate, todayUtc()))),
  ]);

  const skipped = new Set(skips.map((s) => `${s.itemKind}:${s.itemId}`));
  const isSkipped = (kind: string, id: string) => skipped.has(`${kind}:${id}`);

  const items: DoNextItem[] = [];

  // Tasks
  for (const t of openTasks) {
    if (isSkipped("task", t.id)) continue;
    const overdue = t.dueAt && t.dueAt < today;
    const dueToday = t.dueAt && t.dueAt >= today && t.dueAt < tomorrow;
    if (!t.dueAt) continue; // we only stack dated tasks
    const daysOverdue = overdue ? Math.ceil((today.getTime() - t.dueAt.getTime()) / DAY_MS) : 0;

    const parentHref =
      t.parentTable === "deals" ? `/deals/${t.parentId}` :
      t.parentTable === "contacts" ? `/contacts/${t.parentId}` :
      t.parentTable === "companies" ? `/companies/${t.parentId}` :
      t.parentTable === "bird_dogs" ? `/bird-dogs/${t.parentId}` :
      "/tasks";

    items.push({
      kind: "task",
      id: t.id,
      score: overdue ? 1000 + daysOverdue * 10 : dueToday ? 500 : 100,
      icon: "✓",
      badge: overdue ? `Overdue ${daysOverdue}d` : dueToday ? "Due today" : `Due ${fmtDate(t.dueAt)}`,
      title: t.subject,
      subtitle: t.body ?? undefined,
      reason: overdue ? `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} past due — close it or push it` : "Scheduled for today",
      actions: [
        { kind: "task_done", label: "✓ Done" },
        { kind: "open", label: "Open record", href: parentHref },
        { kind: "skip", label: "Skip for today" },
      ],
    });
  }

  // At-risk
  for (const r of atRiskRaw) {
    if (isSkipped("at_risk", r.dealId)) continue;
    const desc = describeRisk(r.kind);
    items.push({
      kind: "at_risk",
      id: r.dealId,
      score: r.severity * 4, // weight a touch above tasks-due-today
      icon: desc.icon,
      badge: desc.label,
      title: r.title,
      subtitle: r.loc ?? undefined,
      reason: r.reason,
      actions: [
        { kind: "open", label: "Open deal", href: r.href },
        { kind: "skip", label: "Skip for today" },
      ],
    });
  }

  // New leads
  for (const l of newLeads) {
    if (isSkipped("new_lead", l.id)) continue;
    const name = [l.firstName, l.lastName].filter(Boolean).join(" ") || "(unnamed buyer)";
    const age = Math.floor((now - l.createdAt.getTime()) / DAY_MS);
    items.push({
      kind: "new_lead",
      id: l.id,
      score: 300 + Math.min(age, 14) * 20,    // older lead = more urgent (capped)
      icon: "👤",
      badge: age === 0 ? "New today" : `Waiting ${age}d`,
      title: name,
      subtitle: [l.email, l.state].filter(Boolean).join(" · ") || undefined,
      reason: age === 0 ? "Just came in — first touch SLA" : `Submitted ${age}d ago, still no first contact`,
      actions: [
        { kind: "open", label: "Open buyer", href: `/contacts/${l.id}` },
        { kind: "skip", label: "Skip for today" },
      ],
    });
  }

  items.sort((a, b) => b.score - a.score);

  void desc; void gt; void inArray; void lt;
  return items.slice(0, limit);
}
