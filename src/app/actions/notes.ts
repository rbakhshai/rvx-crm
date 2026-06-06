"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { loadActiveRoster, parseMentions, recordMentions, markMentionsRead, markAllMentionsRead } from "@/lib/mentions";

const PARENT_PATHS: Record<string, string> = {
  contacts: "/contacts",
  deals: "/deals",
  companies: "/companies",
  bird_dogs: "/bird-dogs",
};

const ALLOWED_PARENTS = new Set(Object.keys(PARENT_PATHS));

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

export type NoteActionResult = { ok: boolean; error?: string };

export async function createNoteAction(
  parentTable: string,
  parentId: string,
  formData: FormData,
): Promise<NoteActionResult> {
  const user = await requireUser();
  if (!ALLOWED_PARENTS.has(parentTable)) {
    return { ok: false, error: "Invalid parent type" };
  }
  const body = String(formData.get("body") ?? "").trim();
  if (!body) {
    return { ok: false, error: "Note cannot be empty" };
  }
  const [newNote] = await db
    .insert(notes)
    .values({
      parentTable: parentTable as never,
      parentId,
      body,
      authorId: user.id,
      type: "manual",
    })
    .returning({ id: notes.id });

  // Persist @-mention edges so the recipients see this in their Today feed.
  // Self-mentions are allowed (useful as TODO markers); they just show up
  // in your own outstanding list.
  if (newNote) {
    const roster = await loadActiveRoster();
    const mentioned = parseMentions(body, roster);
    if (mentioned.length > 0) {
      await recordMentions({
        noteId: newNote.id,
        parentTable: parentTable as "contacts" | "deals" | "companies" | "bird_dogs",
        parentId,
        mentionedUserIds: mentioned,
      });
      // Revalidate /today for any mentioned user — cheap blanket revalidate
      // is fine here.
      revalidatePath("/today");
    }
  }

  revalidatePath(`${PARENT_PATHS[parentTable]}/${parentId}`);
  return { ok: true };
}

/**
 * Mark a list of mention rows as read for the current user. Used by the
 * Today widget when the user dismisses individual mentions.
 */
export async function markMentionsReadAction(mentionIds: string[]): Promise<void> {
  const user = await requireUser();
  await markMentionsRead(user.id, mentionIds);
  revalidatePath("/today");
}

/** Clear every outstanding mention for the current user. */
export async function clearAllMentionsAction(): Promise<void> {
  const user = await requireUser();
  await markAllMentionsRead(user.id);
  revalidatePath("/today");
}

export async function deleteNoteAction(
  noteId: string,
  parentTable: string,
  parentId: string,
): Promise<void> {
  const user = await requireUser();
  if (!ALLOWED_PARENTS.has(parentTable)) return;
  // Only the author can delete their own note (admins TODO)
  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.authorId, user.id)));
  revalidatePath(`${PARENT_PATHS[parentTable]}/${parentId}`);
}
