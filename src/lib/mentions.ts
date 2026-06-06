/**
 * Mention parsing + outstanding-mentions query.
 *
 * Convention: a "@FirstName" token in a note body maps to a CRM user when
 * (case-insensitive) the token's full segment exactly equals one of the
 * roster's first names. Matching is greedy on the longest first name so
 * "@Jean Paul" resolves to "Jean Paul" rather than just "Jean".
 *
 * Notes are stored as raw markdown; mention edges are persisted to
 * `note_mentions` so we can ask "what's unread for user X" cheaply.
 */
import { and, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { noteMentions, notes, user } from "@/db/schema";

type ActiveUser = { id: string; name: string; firstName: string };

/**
 * Pull the active CRM roster (anyone whose @-mention should resolve).
 * Excludes suspended / deleted users and the external bird-dog portal role.
 * Cache-friendly: called per note save, ~10 rows.
 */
export async function loadActiveRoster(): Promise<ActiveUser[]> {
  const rows = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(
      and(
        isNull(user.suspendedAt),
        isNull(user.deletedAt),
        ne(user.role, "bird_dog"),
      ),
    );

  return rows
    .map((r) => {
      const first = r.name.split(/\s+/)[0] ?? r.name;
      return { id: r.id, name: r.name, firstName: first };
    })
    .filter((r) => r.firstName.length > 0);
}

/**
 * Parse a body and return the set of user IDs referenced. Behavior:
 *
 *  - Matches @FirstName (case-insensitive) bounded by start-of-string or
 *    whitespace on the left and a word boundary on the right.
 *  - Skips obvious email addresses: `foo@bar.com` — the `@` is preceded by
 *    a non-space character so the boundary rule rejects it.
 *  - Deduplicates: if you @Reza twice in one note you still only get one
 *    notification.
 */
export function parseMentions(body: string, roster: ActiveUser[]): string[] {
  if (!body || roster.length === 0) return [];
  // Build a regex from the first names, longest first.
  const escaped = [...roster]
    .sort((a, b) => b.firstName.length - a.firstName.length)
    .map((u) => u.firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(^|\\s)@(${escaped.join("|")})\\b`, "gi");

  const byFirstLower = new Map<string, ActiveUser>();
  for (const u of roster) {
    // First registered user with a given first name wins. Conflicting first
    // names should be resolved upstream (e.g. by enforcing unique handles).
    if (!byFirstLower.has(u.firstName.toLowerCase())) byFirstLower.set(u.firstName.toLowerCase(), u);
  }

  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const hit = byFirstLower.get(m[2].toLowerCase());
    if (hit) ids.add(hit.id);
  }
  return [...ids];
}

/**
 * Persist mention edges for a freshly created note. Pass the parent record
 * and the parsed user IDs; we insert one row per ID. Idempotent inserts
 * aren't strictly required — callers should only invoke this once per save.
 */
export async function recordMentions(args: {
  noteId: string;
  parentTable: "contacts" | "deals" | "companies" | "bird_dogs";
  parentId: string;
  mentionedUserIds: string[];
}): Promise<void> {
  if (args.mentionedUserIds.length === 0) return;
  await db.insert(noteMentions).values(
    args.mentionedUserIds.map((uid) => ({
      noteId: args.noteId,
      mentionedUserId: uid,
      parentTable: args.parentTable as never,
      parentId: args.parentId,
    })),
  );
}

export type OutstandingMention = {
  id: string;
  noteId: string;
  body: string;
  authorId: string | null;
  authorName: string | null;
  parentTable: "contacts" | "deals" | "companies" | "bird_dogs";
  parentId: string;
  mentionedAt: Date;
};

/**
 * Unread mentions for the current user, newest first. Used by the Today
 * page to show "you've been tagged in N notes".
 */
export async function getUnreadMentionsFor(userId: string, limit = 10): Promise<OutstandingMention[]> {
  const rows = await db
    .select({
      id: noteMentions.id,
      noteId: noteMentions.noteId,
      body: notes.body,
      authorId: notes.authorId,
      authorName: user.name,
      parentTable: noteMentions.parentTable,
      parentId: noteMentions.parentId,
      mentionedAt: noteMentions.createdAt,
    })
    .from(noteMentions)
    .innerJoin(notes, eq(notes.id, noteMentions.noteId))
    .leftJoin(user, eq(user.id, notes.authorId))
    .where(and(eq(noteMentions.mentionedUserId, userId), isNull(noteMentions.readAt)))
    .orderBy(desc(noteMentions.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    noteId: r.noteId,
    body: r.body,
    authorId: r.authorId,
    authorName: r.authorName,
    parentTable: r.parentTable as OutstandingMention["parentTable"],
    parentId: r.parentId,
    mentionedAt: r.mentionedAt,
  }));
}

/** Total unread count — used for sidebar badge / today-page header. */
export async function countUnreadMentionsFor(userId: string): Promise<number> {
  const rows = await db
    .select({ id: noteMentions.id })
    .from(noteMentions)
    .where(and(eq(noteMentions.mentionedUserId, userId), isNull(noteMentions.readAt)));
  return rows.length;
}

/**
 * Mark a set of mention rows as read for the current user. Restricts the
 * update to rows the user actually owns — protects against ID guessing.
 */
export async function markMentionsRead(userId: string, mentionIds: string[]): Promise<void> {
  if (mentionIds.length === 0) return;
  await db
    .update(noteMentions)
    .set({ readAt: new Date() })
    .where(and(eq(noteMentions.mentionedUserId, userId), inArray(noteMentions.id, mentionIds)));
}

/** Mark every unread mention as read. Used by the "Clear all" button. */
export async function markAllMentionsRead(userId: string): Promise<number> {
  const result = await db
    .update(noteMentions)
    .set({ readAt: new Date() })
    .where(and(eq(noteMentions.mentionedUserId, userId), isNull(noteMentions.readAt)))
    .returning({ id: noteMentions.id });
  return result.length;
}
