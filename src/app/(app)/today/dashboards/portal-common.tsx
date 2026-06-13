/**
 * Shared footer for every role portal: "My tasks" + the live team
 * activity pulse, side by side. Each dashboard ends with this so the
 * daily-driver basics are always one scroll away, no matter the seat.
 */
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { fetchRecentActivity } from "@/lib/dashboard-queries";
import { ActivityPulse } from "@/components/activity-pulse";
import { Badge } from "@/components/badge";
import { fmtDate } from "@/lib/date-format";
import Link from "next/link";
import { PortalCard, PortalEmpty, PortalSection } from "../portal-kit";

const DAY_MS = 24 * 60 * 60 * 1000;

function dueLabel(d: Date | null): { label: string; tone: "danger" | "warning" | "muted" } {
  if (!d) return { label: "no due", tone: "muted" };
  const diff = d.getTime() - Date.now();
  if (diff < 0) {
    const days = Math.ceil(-diff / DAY_MS);
    return { label: days === 0 ? "due today" : `${days}d overdue`, tone: "danger" };
  }
  if (diff < DAY_MS) return { label: "due today", tone: "warning" };
  if (diff < 7 * DAY_MS) return { label: `${Math.ceil(diff / DAY_MS)}d`, tone: "muted" };
  return { label: fmtDate(d), tone: "muted" };
}

export async function PortalFooter({ userId, activityLimit = 18 }: { userId: string; activityLimit?: number }) {
  const [myTasks, activity] = await Promise.all([
    db
      .select({ id: tasks.id, subject: tasks.subject, body: tasks.body, dueAt: tasks.dueAt, parentTable: tasks.parentTable, parentId: tasks.parentId })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt)))
      .orderBy(sql`${tasks.dueAt} ASC NULLS LAST`)
      .limit(8),
    fetchRecentActivity(activityLimit).catch(() => []),
  ]);

  return (
    <div className="grid lg:grid-cols-2 gap-4 mt-1">
      <PortalSection title="My tasks" hint="Sorted by due date" action={<Link href="/tasks" className="text-[11px] text-muted hover:text-foreground">All tasks →</Link>}>
        <PortalCard>
          {myTasks.length === 0 ? (
            <PortalEmpty>Inbox zero. Nice. 🎉</PortalEmpty>
          ) : (
            <ul className="divide-y divide-border -mx-1">
              {myTasks.map((t) => {
                const due = dueLabel(t.dueAt);
                const href =
                  t.parentTable === "deals" ? `/deals/${t.parentId}`
                  : t.parentTable === "contacts" ? `/contacts/${t.parentId}`
                  : t.parentTable === "companies" ? `/companies/${t.parentId}`
                  : t.parentTable === "bird_dogs" ? `/bird-dogs/${t.parentId}`
                  : "/tasks";
                return (
                  <li key={t.id}>
                    <Link href={href as never} className="flex items-start justify-between gap-3 py-2.5 px-1 -mx-1 rounded hover:bg-foreground/[0.03]">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{t.subject}</div>
                        {t.body && <div className="text-[11px] text-muted truncate mt-0.5">{t.body}</div>}
                      </div>
                      <Badge tone={due.tone}>{due.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </PortalCard>
      </PortalSection>

      <PortalSection title="Team activity" hint="Live across the company">
        <ActivityPulse events={activity} />
      </PortalSection>
    </div>
  );
}
