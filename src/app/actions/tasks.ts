"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { auth } from "@/lib/auth";

const PARENT_PATHS: Record<string, string> = {
  contacts: "/contacts",
  deals: "/deals",
  companies: "/companies",
  bird_dogs: "/bird-dogs",
};
const ALLOWED_PARENTS = new Set(Object.keys(PARENT_PATHS));
const ALLOWED_TYPES = new Set(["task", "call", "email", "admin"]);

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

function revalidateBoth(parentTable: string, parentId: string) {
  revalidatePath(`${PARENT_PATHS[parentTable] ?? ""}/${parentId}`);
  revalidatePath("/tasks");
  revalidatePath("/mission-control");
}

export type TaskActionResult = { ok: boolean; error?: string };

export async function createTaskAction(
  parentTable: string,
  parentId: string,
  formData: FormData,
): Promise<TaskActionResult> {
  const user = await requireUser();
  if (!ALLOWED_PARENTS.has(parentTable)) return { ok: false, error: "Invalid parent type" };

  const subject = String(formData.get("subject") ?? "").trim();
  if (!subject) return { ok: false, error: "Subject is required" };

  const type = String(formData.get("type") ?? "task");
  if (!ALLOWED_TYPES.has(type)) return { ok: false, error: "Invalid type" };

  const assigneeId = String(formData.get("assigneeId") ?? "") || user.id;
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const dueAt = dueAtRaw ? new Date(dueAtRaw) : null;
  if (dueAt && isNaN(dueAt.getTime())) return { ok: false, error: "Invalid due date" };

  const body = String(formData.get("body") ?? "").trim() || null;

  await db.insert(tasks).values({
    parentTable: parentTable as never,
    parentId,
    subject,
    body,
    type: type as never,
    assigneeId,
    createdById: user.id,
    dueAt,
  });
  revalidateBoth(parentTable, parentId);
  return { ok: true };
}

// A task can only be completed/reopened/deleted by the person it's
// assigned to or the person who created it. Scoping the WHERE (rather
// than a separate fetch) means an unauthorized id is a no-op, not an
// error — no info leak about which ids exist.
function ownedByUser(taskId: string, userId: string) {
  return and(
    eq(tasks.id, taskId),
    or(eq(tasks.assigneeId, userId), eq(tasks.createdById, userId)),
  );
}

export async function completeTaskAction(taskId: string, parentTable: string, parentId: string): Promise<void> {
  const user = await requireUser();
  await db
    .update(tasks)
    .set({ completedAt: new Date(), completedById: user.id, updatedAt: new Date() })
    .where(ownedByUser(taskId, user.id));
  revalidateBoth(parentTable, parentId);
}

export async function uncompleteTaskAction(taskId: string, parentTable: string, parentId: string): Promise<void> {
  const user = await requireUser();
  await db
    .update(tasks)
    .set({ completedAt: null, completedById: null, outcome: null, updatedAt: new Date() })
    .where(ownedByUser(taskId, user.id));
  revalidateBoth(parentTable, parentId);
}

export async function deleteTaskAction(taskId: string, parentTable: string, parentId: string): Promise<void> {
  const user = await requireUser();
  await db.delete(tasks).where(ownedByUser(taskId, user.id));
  revalidateBoth(parentTable, parentId);
}
