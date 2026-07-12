/**
 * "Your next actions" — the top-of-dashboard queue that answers the 8am
 * question: what should I do right now?
 *
 * Assembles a per-user, priority-ordered list from signals that already
 * exist: overdue / due-today tasks, unread @mentions, hires and
 * reimbursements sitting on this person's step, and stale deals they
 * own. Capped small on purpose — it's a queue, not a report.
 */
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, noteMentions, notes, tasks } from "@/db/schema";
import { getLeadershipQueueForUser } from "./leadership-queue";
import { PIPELINE_STAGES } from "./pipeline-stages";

export type NextAction = {
  key: string;
  /** rose = overdue/blocked-on-you, amber = due today / going stale, gold = waiting on you */
  urgency: "rose" | "amber" | "gold";
  title: string;
  detail?: string;
  href: string;
};

const MAX_ACTIONS = 6;
const STALE_DAYS = 7;

const PARENT_PATH: Record<string, string> = {
  contacts: "/contacts",
  deals: "/deals",
  companies: "/companies",
  bird_dogs: "/bird-dogs",
  issues: "/issues",
};

function parentHref(table: string, id: string): string {
  return `${PARENT_PATH[table] ?? "/deals"}/${id}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function fetchNextActions(userId: string, role: string): Promise<NextAction[]> {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  // Active pipeline statuses (everything in the funnel except closed).
  const activeStatuses = PIPELINE_STAGES.filter((s) => s.key !== "closed").flatMap((s) => s.statuses);

  const [openTasks, mentions, deskQueue, staleDeals] = await Promise.all([
    // Open tasks with a due date, soonest first — we bucket below.
    db
      .select({
        id: tasks.id,
        subject: tasks.subject,
        dueAt: tasks.dueAt,
        parentTable: tasks.parentTable,
        parentId: tasks.parentId,
      })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt), lt(tasks.dueAt, endOfToday)))
      .orderBy(asc(tasks.dueAt))
      .limit(6),

    // Unread @mentions — someone is waiting on you to see something.
    db
      .select({
        id: noteMentions.id,
        noteBody: notes.body,
        parentTable: notes.parentTable,
        parentId: notes.parentId,
        authorId: notes.authorId,
      })
      .from(noteMentions)
      .innerJoin(notes, eq(notes.id, noteMentions.noteId))
      .where(and(eq(noteMentions.mentionedUserId, userId), isNull(noteMentions.readAt)))
      .orderBy(desc(noteMentions.createdAt))
      .limit(3),

    // Hires / reimbursements sitting on this person's step.
    getLeadershipQueueForUser(userId, role).catch(() => []),

    // My deals going cold — active stage, no closer touch in a week.
    db
      .select({
        id: deals.id,
        name: deals.name,
        parkAddress: deals.parkAddress,
        closerLastTouch: deals.closerLastTouch,
      })
      .from(deals)
      .where(
        and(
          isNull(deals.deletedAt),
          or(eq(deals.ownerId, userId), eq(deals.opsOwnerId, userId)),
          inArray(deals.statusCode, activeStatuses),
          or(isNull(deals.closerLastTouch), lt(deals.closerLastTouch, daysAgo(STALE_DAYS))),
        ),
      )
      .orderBy(sql`${deals.closerLastTouch} ASC NULLS FIRST`)
      .limit(3),
  ]);

  const actions: NextAction[] = [];

  // 1) Overdue tasks — the loudest signal.
  for (const t of openTasks.filter((t) => t.dueAt && t.dueAt < now)) {
    const daysOver = Math.floor((now.getTime() - t.dueAt!.getTime()) / 86_400_000);
    actions.push({
      key: `task:${t.id}`,
      urgency: "rose",
      title: t.subject || "Untitled task",
      detail: daysOver === 0 ? "due earlier today" : `${daysOver}d overdue`,
      href: parentHref(t.parentTable, t.parentId),
    });
  }

  // 2) Unread mentions — a teammate is waiting on you.
  for (const m of mentions) {
    const firstLine = m.noteBody.split("\n")[0].trim();
    actions.push({
      key: `mention:${m.id}`,
      urgency: "amber",
      title: "You were mentioned",
      detail: firstLine.length > 70 ? firstLine.slice(0, 67) + "…" : firstLine,
      href: parentHref(m.parentTable, m.parentId),
    });
  }

  // 3) Approvals sitting on your desk (hires / reimbursements).
  for (const item of deskQueue) {
    actions.push({
      key: `${item.kind}:${item.id}`,
      urgency: "gold",
      title: item.kind === "hire" ? `Hire: ${item.title}` : `Reimbursement: ${item.title}`,
      detail: item.statusLabel,
      href: item.href,
    });
  }

  // 4) Tasks due later today.
  for (const t of openTasks.filter((t) => t.dueAt && t.dueAt >= now)) {
    actions.push({
      key: `task:${t.id}`,
      urgency: "amber",
      title: t.subject || "Untitled task",
      detail: "due today",
      href: parentHref(t.parentTable, t.parentId),
    });
  }

  // 5) My deals going cold.
  for (const d of staleDeals) {
    const idle = d.closerLastTouch
      ? `${Math.floor((now.getTime() - d.closerLastTouch.getTime()) / 86_400_000)}d since last touch`
      : "never touched";
    actions.push({
      key: `deal:${d.id}`,
      urgency: "amber",
      title: d.name || d.parkAddress || "(unnamed deal)",
      detail: idle,
      href: `/deals/${d.id}`,
    });
  }

  return actions.slice(0, MAX_ACTIONS);
}
