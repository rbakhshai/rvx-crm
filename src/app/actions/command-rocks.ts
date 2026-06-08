"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commandRocks } from "@/db/schema";
import { auth } from "@/lib/auth";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

const VALID_PERIODS = new Set(["week", "month", "quarter"] as const);

/** Add a rock for a teammate. */
export async function addCommandRockAction(
  assigneeId: string,
  title: string,
  period: "week" | "month" | "quarter" = "quarter",
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireUser();
  const trimmed = title.trim();
  if (!trimmed) return { ok: false, error: "Title required" };
  if (!VALID_PERIODS.has(period)) return { ok: false, error: "Invalid period" };

  // Tail-of-list position.
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${commandRocks.position}), 0)::int` })
    .from(commandRocks)
    .where(eq(commandRocks.assigneeId, assigneeId));

  const [row] = await db
    .insert(commandRocks)
    .values({
      assigneeId,
      title: trimmed,
      period,
      position: (maxPos ?? 0) + 1,
    })
    .returning({ id: commandRocks.id });

  revalidatePath("/ops/command");
  return { ok: true, id: row?.id };
}

/** Edit the title of an existing rock. */
export async function updateCommandRockAction(rockId: string, title: string): Promise<void> {
  await requireUser();
  const trimmed = title.trim();
  if (!trimmed) return;
  await db
    .update(commandRocks)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(eq(commandRocks.id, rockId));
  revalidatePath("/ops/command");
}

/** Toggle a rock done/undone. */
export async function toggleCommandRockAction(rockId: string, done: boolean): Promise<void> {
  const user = await requireUser();
  await db
    .update(commandRocks)
    .set({
      doneAt: done ? new Date() : null,
      doneById: done ? user.id : null,
      updatedAt: new Date(),
    })
    .where(eq(commandRocks.id, rockId));
  revalidatePath("/ops/command");
}

/** Remove a rock. */
export async function deleteCommandRockAction(rockId: string): Promise<void> {
  await requireUser();
  await db.delete(commandRocks).where(eq(commandRocks.id, rockId));
  revalidatePath("/ops/command");
}
