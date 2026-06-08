/**
 * /settings/feedback — admin queue for in-app feedback submissions.
 *
 * Pulls every row from feedback_submissions sorted by status then
 * position. Drag handles let admins reorder within a status to set
 * priority; status select drives state machine (new -> in_progress
 * -> done / wontfix); internal notes captured for triage context.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { feedbackSubmissions, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { SettingsShell } from "../settings-shell";
import { FeedbackQueueClient } from "./client";

export default async function FeedbackQueuePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "manage_users"))) {
    return (
      <SettingsShell active="/settings/feedback" subtitle="You don't have permission to view feedback.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;Manage users&quot; capability.</p>
      </SettingsShell>
    );
  }

  const [open, resolved, submitters] = await Promise.all([
    db
      .select()
      .from(feedbackSubmissions)
      .where(
        and(
          isNull(feedbackSubmissions.resolvedAt),
        ),
      )
      .orderBy(asc(feedbackSubmissions.position), asc(feedbackSubmissions.createdAt)),
    db
      .select()
      .from(feedbackSubmissions)
      .where(
        and(
          // Resolved means done or wontfix — same column.
          eq(feedbackSubmissions.status, "done"),
        ),
      )
      .orderBy(asc(feedbackSubmissions.position))
      .limit(20),
    // Names for the "submitted by" badge — small lookup, do it once.
    db.select({ id: user.id, name: user.name }).from(user),
  ]);
  const userMap = new Map(submitters.map((u) => [u.id, u.name]));

  return (
    <SettingsShell
      active="/settings/feedback"
      subtitle="Feature requests + bug reports submitted from the in-app ? widget. Drag rows to set priority."
    >
      <FeedbackQueueClient
        openItems={open.map((f) => serialize(f, userMap))}
        resolvedItems={resolved.map((f) => serialize(f, userMap))}
      />
    </SettingsShell>
  );
}

function serialize(
  f: typeof feedbackSubmissions.$inferSelect,
  userMap: Map<string, string>,
) {
  return {
    id: f.id,
    kind: f.kind,
    status: f.status,
    name: f.name,
    email: f.email,
    body: f.body,
    position: f.position,
    internalNotes: f.internalNotes,
    submittedByName: f.submittedById ? userMap.get(f.submittedById) ?? null : null,
    createdAt: f.createdAt.toISOString(),
    resolvedAt: f.resolvedAt?.toISOString() ?? null,
  };
}

export type SerializedFeedback = ReturnType<typeof serialize>;
