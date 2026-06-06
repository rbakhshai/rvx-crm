"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { issues, notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { loadActiveRoster, parseMentions, recordMentions } from "@/lib/mentions";

const VALID_PRIORITIES = new Set(["red", "orange", "green"] as const);
type Priority = "red" | "orange" | "green";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

export type CreateIssueResult = { ok: boolean; id?: string; error?: string };

/**
 * Capture a new issue from the top-of-page composer. We don't accept a
 * status from the form — every new issue starts "open".
 *
 * Position is assigned to the tail of the (priority) lane so new entries
 * don't jump the queue.
 */
export async function createIssueAction(formData: FormData): Promise<CreateIssueResult> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const priorityRaw = String(formData.get("priority") ?? "green") as Priority;
  const priority: Priority = VALID_PRIORITIES.has(priorityRaw) ? priorityRaw : "green";
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;

  if (!title) return { ok: false, error: "Title is required" };

  // Tail-of-lane position. Cheap to compute; the list won't get large.
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${issues.position}), 0)::int` })
    .from(issues)
    .where(and(eq(issues.priority, priority), isNull(issues.deletedAt)));

  const [row] = await db
    .insert(issues)
    .values({
      title,
      body,
      priority,
      assigneeId,
      createdById: user.id,
      position: (maxPos ?? 0) + 1000,
    })
    .returning({ id: issues.id });

  // If the issue has a description, store a "first note" so the body
  // anchors a real notes row — same polymorphic pattern as every other
  // entity. Mention edges hang off that note's id. The discussion thread
  // on the issue detail page is just more notes against the same parent.
  if (row && body) {
    const [descNote] = await db
      .insert(notes)
      .values({
        parentTable: "issues" as never,
        parentId: row.id,
        body,
        authorId: user.id,
        type: "manual",
      })
      .returning({ id: notes.id });

    if (descNote) {
      const roster = await loadActiveRoster();
      const mentioned = parseMentions(body, roster);
      if (mentioned.length > 0) {
        await recordMentions({
          noteId: descNote.id,
          parentTable: "issues" as never,
          parentId: row.id,
          mentionedUserIds: mentioned,
        });
      }
    }
  }

  revalidatePath("/issues");
  revalidatePath("/today");
  return { ok: true, id: row?.id };
}

/**
 * Drag-end handler. Receives the issue id, the target priority bucket,
 * and the ordered list of issue ids that should land in that lane after
 * the move. We renumber every position in the lane with spacing of 1000
 * so future inserts have room without rebalancing.
 *
 * No-op (besides revalidate) if the issue is already in the right place.
 */
export async function reorderIssueAction(args: {
  movedId: string;
  toPriority: Priority;
  orderedIds: string[];
}): Promise<{ ok: boolean }> {
  await requireUser();
  if (!VALID_PRIORITIES.has(args.toPriority)) return { ok: false };

  // Run as a single transaction: change priority on the moved row, then
  // renumber every row in the target lane. Bulk update via VALUES table
  // would be marginally faster but the list is tiny.
  await db.transaction(async (tx) => {
    await tx
      .update(issues)
      .set({ priority: args.toPriority, updatedAt: new Date() })
      .where(eq(issues.id, args.movedId));

    for (let i = 0; i < args.orderedIds.length; i++) {
      const id = args.orderedIds[i];
      await tx.update(issues).set({ position: (i + 1) * 1000 }).where(eq(issues.id, id));
    }
  });

  revalidatePath("/issues");
  return { ok: true };
}

/** Inline-edit priority via the priority chip on a card. */
export async function setIssuePriorityAction(issueId: string, priority: Priority): Promise<void> {
  await requireUser();
  if (!VALID_PRIORITIES.has(priority)) return;
  await db.update(issues).set({ priority, updatedAt: new Date() }).where(eq(issues.id, issueId));
  revalidatePath("/issues");
}

/** Inline-edit assignee via the avatar picker. */
export async function setIssueAssigneeAction(issueId: string, assigneeId: string | null): Promise<void> {
  await requireUser();
  await db
    .update(issues)
    .set({ assigneeId: assigneeId && assigneeId.length > 0 ? assigneeId : null, updatedAt: new Date() })
    .where(eq(issues.id, issueId));
  revalidatePath("/issues");
}

/**
 * Mark an issue solved. We expect the team to capture a short solution
 * summary so the SOLVED list reads like a logbook. Solved issues stay
 * visible — they're useful for the L10 retrospective.
 */
export async function solveIssueAction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!issueId) return { ok: false, error: "Missing issue" };
  if (!summary) return { ok: false, error: "Summarize the solution" };

  await db
    .update(issues)
    .set({
      status: "solved",
      solvedAt: new Date(),
      solvedById: user.id,
      solutionSummary: summary,
      updatedAt: new Date(),
    })
    .where(eq(issues.id, issueId));

  revalidatePath("/issues");
  revalidatePath(`/issues/${issueId}`);
  return { ok: true };
}

/** Reopen a solved issue (clears solution metadata). */
export async function reopenIssueAction(issueId: string): Promise<void> {
  await requireUser();
  await db
    .update(issues)
    .set({
      status: "open",
      solvedAt: null,
      solvedById: null,
      solutionSummary: null,
      updatedAt: new Date(),
    })
    .where(eq(issues.id, issueId));
  revalidatePath("/issues");
}

/** Soft delete — keep audit trail. */
export async function deleteIssueAction(issueId: string): Promise<void> {
  const user = await requireUser();
  await db
    .update(issues)
    .set({ deletedAt: new Date(), deletedById: user.id })
    .where(eq(issues.id, issueId));
  revalidatePath("/issues");
}

/** Used by the priority sort so callers get the same canonical order. */
export function priorityOrder(p: Priority): number {
  return p === "red" ? 0 : p === "orange" ? 1 : 2;
}

export async function listIssues() {
  return await db
    .select()
    .from(issues)
    .where(isNull(issues.deletedAt))
    .orderBy(
      sql`CASE ${issues.priority} WHEN 'red' THEN 0 WHEN 'orange' THEN 1 ELSE 2 END`,
      asc(issues.position),
    );
}
