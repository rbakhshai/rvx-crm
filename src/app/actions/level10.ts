"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { level10Meetings, level10ScorecardSnapshots } from "@/db/schema";
import { auth } from "@/lib/auth";
import { mondayOf } from "@/lib/level10-week";
import {
  SCORECARD_DEFINITIONS,
  computeScorecardActuals,
} from "@/lib/level10-scorecard";
import { getOpsBlocks } from "@/lib/ops-content";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
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
  patch: Partial<{ segueNotes: string | null; concludeNotes: string | null; rating: number | null }>,
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

/** Save the Conclude text for a specific meeting week. */
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
