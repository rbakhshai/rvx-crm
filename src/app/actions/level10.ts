"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { level10Meetings } from "@/db/schema";
import { auth } from "@/lib/auth";

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
