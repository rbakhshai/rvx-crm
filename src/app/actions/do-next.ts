"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { doNextSkips, tasks } from "@/db/schema";
import { auth } from "@/lib/auth";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user.id;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function skipDoNextItemAction(itemKind: string, itemId: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .insert(doNextSkips)
    .values({ userId, itemKind, itemId, skippedForDate: todayUtc() })
    .onConflictDoNothing();
  revalidatePath("/today");
}

/** Mark a task complete directly from the Do Next card. */
export async function completeDoNextTaskAction(taskId: string): Promise<void> {
  const userId = await requireUserId();
  await db
    .update(tasks)
    .set({ completedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.assigneeId, userId)));
  revalidatePath("/today");
  revalidatePath("/tasks");
}
