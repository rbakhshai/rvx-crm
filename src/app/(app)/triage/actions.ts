"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { birdDogs, dealStatuses, deals, notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/email";
import {
  ACTIVE_CLOSER_STATUSES,
  NEW_STATUSES,
  type Queue,
  buildTriageUrl,
  humanOutcome,
} from "./lib";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

function queueWhere(queue: Queue, userId: string) {
  // Every queue filter implicitly excludes soft-deleted deals.
  const notDeleted = isNull(deals.deletedAt);
  switch (queue) {
    case "new":
      return and(inArray(deals.statusCode, NEW_STATUSES as unknown as string[]), notDeleted)!;
    case "stale": {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      return and(
        inArray(deals.statusCode, ACTIVE_CLOSER_STATUSES as unknown as string[]),
        or(isNull(deals.closerLastTouch), lt(deals.closerLastTouch, twoDaysAgo)),
        notDeleted,
      )!;
    }
    case "mine":
      return and(
        eq(deals.ownerId, userId),
        or(
          inArray(deals.statusCode, NEW_STATUSES as unknown as string[]),
          inArray(deals.statusCode, ACTIVE_CLOSER_STATUSES as unknown as string[]),
        ),
        notDeleted,
      )!;
  }
}

export type QueueDealSummary = {
  id: string;
  name: string | null;
  parkAddress: string | null;
  parkCity: string | null;
  parkState: string | null;
  statusCode: string | null;
  closerLastTouch: Date | null;
  createdAt: Date;
};

export async function listQueue(queue: Queue, userId: string): Promise<QueueDealSummary[]> {
  return await db
    .select({
      id: deals.id,
      name: deals.name,
      parkAddress: deals.parkAddress,
      parkCity: deals.parkCity,
      parkState: deals.parkState,
      statusCode: deals.statusCode,
      closerLastTouch: deals.closerLastTouch,
      createdAt: deals.createdAt,
    })
    .from(deals)
    .where(queueWhere(queue, userId))
    .orderBy(
      queue === "stale"
        ? asc(sql`COALESCE(${deals.closerLastTouch}, ${deals.createdAt})`)
        : asc(deals.createdAt),
    )
    .limit(50);
}

export async function listStatusOptions() {
  return await db
    .select({
      code: dealStatuses.code,
      label: dealStatuses.label,
      role: dealStatuses.role,
    })
    .from(dealStatuses)
    .where(eq(dealStatuses.isActive, true))
    .orderBy(asc(dealStatuses.sortOrder));
}

/**
 * Save the closer's call log + advance the deal. Optionally fires an email to
 * the bird dog with the `updateToBirdDog` message. Redirects to the next deal
 * in queue (or back to the queue index if empty).
 */
export async function triageDealAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "");
  if (!dealId) throw new Error("Missing dealId");

  const queue = String(formData.get("queue") ?? "new") as Queue;
  const action = String(formData.get("action") ?? "next"); // "next" | "stay" | "skip"

  if (action === "skip") {
    const nextId = await findNextInQueue(queue, user.id, dealId);
    revalidatePath("/triage");
    redirect(buildTriageUrl(queue, nextId) as never);
  }

  const callOutcome = String(formData.get("callOutcome") ?? "").trim() || null;
  const noteBody = String(formData.get("note") ?? "").trim();
  const updateToBirdDog = String(formData.get("updateToBirdDog") ?? "").trim();
  const newStatusCode = String(formData.get("statusCode") ?? "").trim() || null;
  const notifyBirdDog = formData.get("notifyBirdDog") === "on";

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) throw new Error("Deal not found");

  const updates: Partial<typeof deals.$inferInsert> = {
    closerLastTouch: new Date(),
    updatedAt: new Date(),
  };
  if (callOutcome) updates.callDisposition = callOutcome as never;
  if (newStatusCode) updates.statusCode = newStatusCode;
  if (updateToBirdDog) updates.updateToBirdDog = updateToBirdDog;
  if (noteBody) updates.lastNote = noteBody.slice(0, 500);

  await db.update(deals).set(updates).where(eq(deals.id, dealId));

  if (noteBody || callOutcome) {
    const header = callOutcome ? `📞 ${humanOutcome(callOutcome)}` : "📞 Call logged";
    const body = noteBody ? `${header}\n\n${noteBody}` : header;
    await db.insert(notes).values({
      parentTable: "deals",
      parentId: dealId,
      type: "call_log",
      authorId: user.id,
      body,
    });
  }

  if (notifyBirdDog && deal.birdDogId && updateToBirdDog) {
    const [bd] = await db
      .select({ firstName: birdDogs.firstName, email: birdDogs.email })
      .from(birdDogs)
      .where(eq(birdDogs.id, deal.birdDogId))
      .limit(1);

    if (bd?.email) {
      const dealTitle = deal.name || deal.parkAddress || "your lead";
      const appUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      await sendNotification({
        kind: "deal_status_changed",
        to: bd.email,
        subject: `[RVX] Update on ${dealTitle}`,
        bodyMd: [
          `Hi ${bd.firstName ?? "there"},`,
          ``,
          `Quick update on the lead you submitted: **${dealTitle}**`,
          ``,
          updateToBirdDog,
          ``,
          `— ${user.name ?? "The RVX team"}`,
          ``,
          `(Track your leads anytime: ${appUrl}/bird-dog-portal)`,
        ].join("\n"),
        fromName: user.name ?? undefined,
        payload: { dealId: deal.id, birdDogId: deal.birdDogId, kind: "bird_dog_update" },
      });
    }
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/triage");
  revalidatePath("/notifications");

  if (action === "stay") {
    redirect(buildTriageUrl(queue, dealId) as never);
  }
  const nextId = await findNextInQueue(queue, user.id, dealId);
  redirect(buildTriageUrl(queue, nextId) as never);
}

async function findNextInQueue(queue: Queue, userId: string, currentId: string): Promise<string | null> {
  const rows = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(queueWhere(queue, userId), sql`${deals.id} <> ${currentId}`))
    .orderBy(
      queue === "stale"
        ? asc(sql`COALESCE(${deals.closerLastTouch}, ${deals.createdAt})`)
        : asc(deals.createdAt),
    )
    .limit(1);
  return rows[0]?.id ?? null;
}
