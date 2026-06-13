"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commandRocks } from "@/db/schema";
import { auth } from "@/lib/auth";

/**
 * Rock management is locked to the admin role for now (Reza only).
 * Everyone else sees rocks read-only on the Command tab. To loosen this
 * later, just expand the role check or move to a real permission key.
 */
async function requireRockAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    throw new Error("Only admins can manage rocks right now.");
  }
  return session.user;
}

const VALID_PERIODS = new Set(["week", "month", "quarter"] as const);

/** Add a rock for a teammate. */
export async function addCommandRockAction(
  assigneeId: string,
  title: string,
  period: "week" | "month" | "quarter" = "quarter",
): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireRockAdmin();
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

  revalidatePath("/mission-control");
  return { ok: true, id: row?.id };
}

/** Edit the title of an existing rock. */
export async function updateCommandRockAction(rockId: string, title: string): Promise<void> {
  await requireRockAdmin();
  const trimmed = title.trim();
  if (!trimmed) return;
  await db
    .update(commandRocks)
    .set({ title: trimmed, updatedAt: new Date() })
    .where(eq(commandRocks.id, rockId));
  revalidatePath("/mission-control");
}

/** Toggle a rock done/undone. */
export async function toggleCommandRockAction(rockId: string, done: boolean): Promise<void> {
  const u = await requireRockAdmin();
  await db
    .update(commandRocks)
    .set({
      doneAt: done ? new Date() : null,
      doneById: done ? u.id : null,
      updatedAt: new Date(),
    })
    .where(eq(commandRocks.id, rockId));
  revalidatePath("/mission-control");
}

/** Remove a rock. */
export async function deleteCommandRockAction(rockId: string): Promise<void> {
  await requireRockAdmin();
  await db.delete(commandRocks).where(eq(commandRocks.id, rockId));
  revalidatePath("/mission-control");
}

/** Reorder rocks — accepts array of {id, position} to bulk update. */
export async function reorderCommandRocksAction(
  updates: { id: string; position: number }[],
): Promise<void> {
  await requireRockAdmin();
  for (const { id, position } of updates) {
    await db
      .update(commandRocks)
      .set({ position, updatedAt: new Date() })
      .where(eq(commandRocks.id, id));
  }
  revalidatePath("/mission-control");
}
