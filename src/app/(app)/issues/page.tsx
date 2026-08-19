/**
 * /issues — team-wide IDS (Identify / Discuss / Solve) board.
 *
 * Top of page: quick capture form for new issues.
 * Below: open issues in three priority lanes (red / orange / green). Drag
 * to reorder within a lane or move between lanes. Solved issues collapse
 * into a SOLVED section at the bottom.
 *
 * Two views, toggled by ?view=priority|owner:
 *   - priority  (default) three lanes ordered red-orange-green
 *   - owner     columns per teammate so we can read each other's bandwidth
 */
import { headers } from "next/headers";
import { and, asc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { issues, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";
import { IssuesBoard } from "./issues-board";
import { requirePagePermission } from "@/lib/page-guard";

type View = "priority" | "owner";

function isView(v: string | undefined): v is View {
  return v === "priority" || v === "owner";
}

export default async function IssuesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; show_solved?: string }>;
}) {
  await requirePagePermission("view_issues");
  const params = await searchParams;
  const view: View = isView(params.view) ? params.view : "priority";
  const showSolved = params.show_solved === "1";

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [openRows, solvedRows, teammates] = await Promise.all([
    db
      .select()
      .from(issues)
      .where(and(isNull(issues.deletedAt), ne(issues.status, "solved")))
      .orderBy(
        sql`CASE ${issues.priority} WHEN 'red' THEN 0 WHEN 'orange' THEN 1 ELSE 2 END`,
        // Within a priority lane: items with a date come first, soonest
        // first; undated items sit after, ordered by drag position.
        // Manual drag still wins via position (next clause) once dates
        // are equal.
        sql`${issues.dueAt} ASC NULLS LAST`,
        asc(issues.position),
      ),
    showSolved
      ? db
          .select()
          .from(issues)
          .where(and(isNull(issues.deletedAt), eq(issues.status, "solved")))
          .orderBy(sql`${issues.solvedAt} DESC NULLS LAST`)
          .limit(50)
      : Promise.resolve([] as never[]),
    db
      .select({ id: user.id, name: user.name, role: user.role })
      .from(user)
      .where(
        and(
          isNull(user.suspendedAt),
          isNull(user.deletedAt),
          ne(user.role, "bird_dog"),
        ),
      )
      .orderBy(asc(user.name)),
  ]);

  // Count outstanding mentions on issues for the header chip.
  const mineOutstanding = openRows.filter((i) => i.assigneeId === session.user.id).length;
  void isNotNull;

  return (
    <PageShell
      title="Issues"
      subtitle="Identify, discuss, solve. Drag to reprioritize. Use @ to tag a teammate."
      width="wide"
    >
      <IssuesBoard
        view={view}
        showSolved={showSolved}
        currentUserId={session.user.id}
        issues={openRows.map(serializeIssue)}
        solvedIssues={solvedRows.map(serializeIssue)}
        teammates={teammates.map((t) => ({
          id: t.id,
          name: t.name,
          firstName: t.name.split(/\s+/)[0] ?? t.name,
        }))}
        mineOutstanding={mineOutstanding}
      />
    </PageShell>
  );
}

function serializeIssue(i: typeof issues.$inferSelect) {
  return {
    id: i.id,
    title: i.title,
    body: i.body,
    priority: i.priority,
    status: i.status,
    position: i.position,
    createdById: i.createdById,
    assigneeId: i.assigneeId,
    dueAt: i.dueAt?.toISOString() ?? null,
    solvedAt: i.solvedAt?.toISOString() ?? null,
    solvedById: i.solvedById,
    solutionSummary: i.solutionSummary,
    createdAt: i.createdAt.toISOString(),
    updatedAt: i.updatedAt.toISOString(),
  };
}

export type SerializedIssue = ReturnType<typeof serializeIssue>;
