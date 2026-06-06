/**
 * /issues/[id] — single-issue detail with discussion thread + solve flow.
 *
 * Discussion uses the polymorphic ActivityTimeline (parentTable='issues').
 * Solving captures a one-line summary and stamps solvedBy + solvedAt.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { issues, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../../page-shell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { Avatar } from "@/components/avatar";
import { fmtDate } from "@/lib/date-format";
import { IssueDetailControls } from "./controls";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  const [issue] = await db.select().from(issues).where(and(eq(issues.id, id), isNull(issues.deletedAt))).limit(1);
  if (!issue) notFound();

  const teammates = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(and(isNull(user.suspendedAt), isNull(user.deletedAt), ne(user.role, "bird_dog")))
    .orderBy(asc(user.name));

  const tMap = new Map(teammates.map((t) => [t.id, t]));
  const creator = issue.createdById ? tMap.get(issue.createdById) : null;
  const assignee = issue.assigneeId ? tMap.get(issue.assigneeId) : null;
  const solver = issue.solvedById ? tMap.get(issue.solvedById) : null;

  const priorityLabel =
    issue.priority === "red" ? "Critical" :
    issue.priority === "orange" ? "Within 24h" : "Next L10";

  const subtitleParts = [
    priorityLabel,
    `opened ${fmtDate(issue.createdAt)}`,
    creator?.name && `by ${creator.name}`,
  ].filter(Boolean) as string[];

  return (
    <PageShell
      title={issue.title}
      subtitle={subtitleParts.join(" · ")}
      width="default"
      action={
        <Link href={"/issues" as never} className="text-xs text-muted hover:text-foreground hover:underline">
          ← back to issues
        </Link>
      }
    >
      <div className="space-y-5">
        {/* Quick controls + assignee */}
        <IssueDetailControls
          issueId={issue.id}
          currentPriority={issue.priority}
          currentAssigneeId={issue.assigneeId}
          currentStatus={issue.status}
          teammates={teammates.map((t) => ({ id: t.id, name: t.name, firstName: t.name.split(/\s+/)[0] ?? t.name }))}
        />

        {/* Solved summary banner */}
        {issue.status === "solved" && issue.solutionSummary && (
          <div className="rounded-lg border border-emerald-300/60 bg-emerald-50/40 p-4 dark:bg-emerald-500/[0.04]">
            <div className="text-[10px] uppercase tracking-widest text-emerald-700 font-semibold mb-1">
              Solved {issue.solvedAt && `· ${fmtDate(issue.solvedAt)}`} {solver && `· by ${solver.name}`}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{issue.solutionSummary}</p>
          </div>
        )}

        {/* Assignee summary */}
        <div className="rounded-lg border border-border p-4 bg-foreground/[0.01] flex items-center justify-between">
          <div className="text-xs text-muted">
            Assigned to{" "}
            {assignee ? (
              <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                <Avatar name={assignee.name} id={assignee.id} />
                <span>{assignee.name}</span>
              </span>
            ) : (
              <span className="text-foreground/60">no one yet — pick someone above</span>
            )}
          </div>
        </div>

        {/* Discussion thread reuses the standard polymorphic timeline */}
        <ActivityTimeline parentTable="issues" parentId={issue.id} currentUserId={session.user.id} />
      </div>
    </PageShell>
  );
}
