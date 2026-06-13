"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, asc, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { level10ActionItems, level10Meetings, level10ScorecardSnapshots } from "@/db/schema";
import { auth } from "@/lib/auth";
import { mondayOf } from "@/lib/level10-week";
import {
  SCORECARD_DEFINITIONS,
  computeScorecardActuals,
} from "@/lib/level10-scorecard";
import { getOpsBlocks } from "@/lib/ops-content";

/**
 * L10 meetings are a leadership ritual — BD-tier seats can see Mission
 * Control but shouldn't be writing meeting notes / ratings / action
 * items. Kerry (due_diligence) IS included here: she sits in the L10
 * and owns action items, unlike the ops_content editor set.
 */
const L10_WRITER_ROLES = new Set([
  "admin",
  "acquisitions_manager",
  "bird_dog_manager",
  "cfo",
  "park_manager",
  "due_diligence",
]);

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  if (!L10_WRITER_ROLES.has((session.user as { role?: string }).role ?? "")) {
    throw new Error("Only the leadership team can edit L10 meetings");
  }
  return session.user;
}

/** Upsert helper: get-or-create the row for a given meeting date. */
async function ensureMeeting(meetingDate: string, userId: string | null) {
  const [existing] = await db
    .select()
    .from(level10Meetings)
    .where(eq(level10Meetings.meetingDate, meetingDate))
    .limit(1);
  if (existing) return existing;
  const [row] = await db
    .insert(level10Meetings)
    .values({ meetingDate, createdById: userId ?? undefined })
    .returning();
  return row;
}

async function patchMeeting(
  meetingDate: string,
  patch: Partial<{ segueNotes: string | null; headlinesNotes: string | null; employeeHeadlineNotes: string | null; concludeNotes: string | null; rating: number | null }>,
): Promise<void> {
  const user = await requireUser();
  await ensureMeeting(meetingDate, user.id);
  await db
    .update(level10Meetings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(level10Meetings.meetingDate, meetingDate));

  // Auto-snapshot the scorecard while this week is still active. Past
  // meetings stay frozen — saving a backfill note to last June's meeting
  // shouldn't overwrite the numbers we captured then.
  if (meetingDate === mondayOf(new Date())) {
    await snapshotScorecardAction(meetingDate).catch((e) => {
      console.error("[level10] auto-snapshot failed:", e);
    });
  }

  revalidatePath("/ops/level10");
}

/** Save the Segue text for a specific meeting week. */
export async function saveSegueNotesAction(meetingDate: string, notes: string): Promise<void> {
  await patchMeeting(meetingDate, { segueNotes: notes });
}

/** Save the Headlines text for a specific meeting week. */
export async function saveHeadlinesNotesAction(meetingDate: string, notes: string): Promise<void> {
  await patchMeeting(meetingDate, { headlinesNotes: notes });
}

/** Save the Employee/Customer Headline text for a specific meeting week. */
export async function saveEmployeeHeadlineNotesAction(meetingDate: string, notes: string): Promise<void> {
  await patchMeeting(meetingDate, { employeeHeadlineNotes: notes });
}

export async function saveConcludeNotesAction(meetingDate: string, notes: string): Promise<void> {
  await patchMeeting(meetingDate, { concludeNotes: notes });
}

/** Set the 1-10 meeting rating for a specific meeting week (null clears). */
export async function setMeetingRatingAction(meetingDate: string, rating: number | null): Promise<void> {
  const clean = rating == null ? null : Math.min(10, Math.max(1, Math.round(rating)));
  await patchMeeting(meetingDate, { rating: clean });
}

/**
 * Take a fresh snapshot of the scorecard for a given meeting week.
 * Upserts one row per metric — re-running this replaces last snapshot.
 *
 * Internally called on every save during the CURRENT week (so the
 * snapshot stays in sync while the team's working live). Also exposed
 * as a manual action so admins can "freeze" or "refresh" on demand.
 */
export async function snapshotScorecardAction(meetingDate: string): Promise<{ ok: boolean; count: number }> {
  await requireUser();

  const [actuals, blocks] = await Promise.all([
    computeScorecardActuals(),
    getOpsBlocks("level10."),
  ]);

  const rows = SCORECARD_DEFINITIONS.map((m, i) => {
    const metricScope = `level10.scorecard.${i}.metric`;
    const targetScope = `level10.scorecard.${i}.target`;
    const metric = blocks.get(metricScope) ?? m.metric;
    const target = blocks.get(targetScope) ?? defaultTargetString(m.target, m.format);
    return {
      meetingDate,
      position: i,
      metric,
      target,
      actualNum: actuals[i] ?? 0,
      format: m.format,
    };
  });

  // Upsert each (meetingDate, position) — INSERT … ON CONFLICT DO UPDATE.
  for (const r of rows) {
    await db
      .insert(level10ScorecardSnapshots)
      .values(r)
      .onConflictDoUpdate({
        target: [level10ScorecardSnapshots.meetingDate, level10ScorecardSnapshots.position],
        set: {
          metric: r.metric,
          target: r.target,
          actualNum: r.actualNum,
          format: r.format,
          snapshotAt: new Date(),
        },
      });
  }

  revalidatePath("/ops/level10");
  return { ok: true, count: rows.length };
}

function defaultTargetString(n: number, fmt: "n" | "pct"): string {
  return fmt === "pct" ? `${n}%` : String(n);
}

// ============================================================================
// Action items (to-dos captured during the Conclude section)
// ============================================================================

/** Add a new action item to a meeting. */
export async function addActionItemAction(
  meetingDate: string,
  body: string,
  assigneeId: string | null,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await requireUser();
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: "Item body required" };

  await ensureMeeting(meetingDate, user.id);

  // Tail-of-list position so new items don't jump ahead of existing ones.
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${level10ActionItems.position}), 0)::int` })
    .from(level10ActionItems)
    .where(eq(level10ActionItems.meetingDate, meetingDate));

  const [row] = await db
    .insert(level10ActionItems)
    .values({
      meetingDate,
      body: trimmed,
      assigneeId: assigneeId || null,
      createdById: user.id,
      position: (maxPos ?? 0) + 1,
    })
    .returning({ id: level10ActionItems.id });

  revalidatePath("/ops/level10");
  return { ok: true, id: row?.id };
}

/** Update the body / assignee on an existing item. */
export async function updateActionItemAction(
  itemId: string,
  patch: { body?: string; assigneeId?: string | null },
): Promise<void> {
  await requireUser();
  const set: Partial<{ body: string; assigneeId: string | null; updatedAt: Date }> = { updatedAt: new Date() };
  if (patch.body !== undefined) set.body = patch.body.trim();
  if (patch.assigneeId !== undefined) set.assigneeId = patch.assigneeId || null;
  await db.update(level10ActionItems).set(set).where(eq(level10ActionItems.id, itemId));
  revalidatePath("/ops/level10");
}

/** Toggle complete / incomplete. */
export async function toggleActionItemAction(itemId: string, completed: boolean): Promise<void> {
  const user = await requireUser();
  await db
    .update(level10ActionItems)
    .set({
      completedAt: completed ? new Date() : null,
      completedById: completed ? user.id : null,
      updatedAt: new Date(),
    })
    .where(eq(level10ActionItems.id, itemId));
  revalidatePath("/ops/level10");
}

/** Permanently remove an action item. */
export async function deleteActionItemAction(itemId: string): Promise<void> {
  await requireUser();
  await db.delete(level10ActionItems).where(eq(level10ActionItems.id, itemId));
  revalidatePath("/ops/level10");
}

/**
 * "Carry forward" — copy an open item from a previous meeting into the
 * current week. The original stays where it is (you can still see it
 * when scrolling back); the new copy gets a fresh row on the current
 * meeting so it's part of next week's review.
 */
export async function carryForwardActionItemAction(
  itemId: string,
  intoMeetingDate: string,
): Promise<void> {
  const user = await requireUser();
  const [source] = await db
    .select({ body: level10ActionItems.body, assigneeId: level10ActionItems.assigneeId })
    .from(level10ActionItems)
    .where(eq(level10ActionItems.id, itemId))
    .limit(1);
  if (!source) return;

  await ensureMeeting(intoMeetingDate, user.id);
  const [{ maxPos }] = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${level10ActionItems.position}), 0)::int` })
    .from(level10ActionItems)
    .where(eq(level10ActionItems.meetingDate, intoMeetingDate));

  await db.insert(level10ActionItems).values({
    meetingDate: intoMeetingDate,
    body: source.body,
    assigneeId: source.assigneeId,
    createdById: user.id,
    position: (maxPos ?? 0) + 1,
  });

  revalidatePath("/ops/level10");
}

// Mark imports as referenced for the eslint pass — used by future
// listing actions / EOS analytics queries.
void and;
void asc;
void desc;
void isNull;
void lt;
