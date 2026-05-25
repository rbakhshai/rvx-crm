"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { auth } from "@/lib/auth";

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
  await db.insert(notes).values({
    parentTable: parentTable as never,
    parentId,
    body,
    authorId: user.id,
    type: "manual",
  });
  revalidatePath(`${PARENT_PATHS[parentTable]}/${parentId}`);
  return { ok: true };
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
