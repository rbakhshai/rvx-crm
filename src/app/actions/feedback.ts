"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { feedbackSubmissions } from "@/db/schema";
import { auth } from "@/lib/auth";

const VALID_KINDS = new Set(["feature", "bug"] as const);
const VALID_STATUSES = new Set(["new", "in_progress", "done", "wontfix"] as const);

export type SubmitFeedbackResult = { ok: boolean; error?: string };

/**
 * Submit a new feedback item via the floating ? widget. Captures the
 * signed-in user's id when available, but the name + email fields are
 * what the admin queue displays — so the form asks every time and we
 * trust whatever the submitter types.
 */
export async function submitFeedbackAction(formData: FormData): Promise<SubmitFeedbackResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const kind = String(formData.get("kind") ?? "feature");
  const body = String(formData.get("body") ?? "").trim();

  if (!name) return { ok: false, error: "Tell us your name" };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Email looks off" };
  if (!VALID_KINDS.has(kind as never)) return { ok: false, error: "Pick a type" };
  if (!body || body.length < 5) return { ok: false, error: "Add a few words" };

  // Best-effort capture of who submitted — surfaces in the admin row but
  // shouldn't block submission if the session lookup fails.
  let submittedById: string | null = null;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    submittedById = session?.user.id ?? null;
  } catch {
    submittedById = null;
  }

  // Tail-of-queue position so new items don't jump ahead of existing
  // triage order.
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${feedbackSubmissions.position}), 0)::int` })
    .from(feedbackSubmissions);

  await db.insert(feedbackSubmissions).values({
    kind: kind as "feature" | "bug",
    name,
    email,
    body,
    submittedById,
    position: (maxPos ?? 0) + 1000,
  });

  revalidatePath("/settings/feedback");
  return { ok: true };
}

async function requireAdminUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

/**
 * Drag-end handler from the admin queue. Receives the new ordered list
 * of submission ids and renumbers their positions in one transaction.
 */
export async function reorderFeedbackAction(orderedIds: string[]): Promise<{ ok: boolean }> {
  await requireAdminUser();
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx
        .update(feedbackSubmissions)
        .set({ position: (i + 1) * 1000, updatedAt: new Date() })
        .where(eq(feedbackSubmissions.id, orderedIds[i]));
    }
  });
  revalidatePath("/settings/feedback");
  return { ok: true };
}

export async function setFeedbackStatusAction(
  feedbackId: string,
  status: "new" | "in_progress" | "done" | "wontfix",
): Promise<void> {
  const user = await requireAdminUser();
  if (!VALID_STATUSES.has(status as never)) return;

  const resolved = status === "done" || status === "wontfix";
  await db
    .update(feedbackSubmissions)
    .set({
      status,
      resolvedAt: resolved ? new Date() : null,
      resolvedById: resolved ? user.id : null,
      updatedAt: new Date(),
    })
    .where(eq(feedbackSubmissions.id, feedbackId));
  revalidatePath("/settings/feedback");
}

export async function setFeedbackNotesAction(feedbackId: string, notes: string): Promise<void> {
  await requireAdminUser();
  await db
    .update(feedbackSubmissions)
    .set({ internalNotes: notes, updatedAt: new Date() })
    .where(eq(feedbackSubmissions.id, feedbackId));
  revalidatePath("/settings/feedback");
}

export async function deleteFeedbackAction(feedbackId: string): Promise<void> {
  await requireAdminUser();
  await db.delete(feedbackSubmissions).where(eq(feedbackSubmissions.id, feedbackId));
  revalidatePath("/settings/feedback");
}
