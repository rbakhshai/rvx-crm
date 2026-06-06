import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { notes, user } from "@/db/schema";
import { NoteComposer, type MentionableUser } from "./note-composer";
import { DeleteNoteButton } from "./delete-note-button";
import { Section } from "./section";
import { fmtDate } from "@/lib/date-format";

type ParentTable = "contacts" | "deals" | "companies" | "bird_dogs";

/**
 * Render a note body with @FirstName tokens highlighted. A token matches if
 * its first segment equals (case-insensitive) any team user's first name. We
 * match longest first so "@Jean Paul" wins over "@Jean" when both exist.
 *
 * Plain text outside @-tokens is returned as a string fragment. The output
 * is React.ReactNode[] safe to render under whitespace-pre-wrap.
 */
function renderWithMentions(body: string, firstNames: string[]): React.ReactNode[] {
  if (firstNames.length === 0) return [body];
  // Build a regex of all first names, longest first, escaped.
  const sorted = [...firstNames].sort((a, b) => b.length - a.length).map(escapeRegex);
  const re = new RegExp(`@(${sorted.join("|")})\\b`, "gi");
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) out.push(body.slice(last, m.index));
    out.push(
      <span
        key={`m-${i++}`}
        className="inline-block bg-primary/10 text-primary rounded-sm px-1 font-medium"
      >
        @{m[1]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatRelative(d: Date) {
  const now = Date.now();
  const diffMs = now - d.getTime();
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diffMs < min) return "just now";
  if (diffMs < hr) return `${Math.floor(diffMs / min)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hr)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return fmtDate(d);
}

export async function ActivityTimeline({
  parentTable,
  parentId,
  currentUserId,
}: {
  parentTable: ParentTable;
  parentId: string;
  currentUserId?: string;
}) {
  const [noteRows, mentionableUsers] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(and(eq(notes.parentTable, parentTable as never), eq(notes.parentId, parentId)))
      .orderBy(desc(notes.createdAt))
      .limit(100),
    // Anyone who can log in to the CRM is mentionable — minus suspended,
    // deleted, and the external bird-dog portal accounts. Self can still
    // mention themselves; harmless and sometimes useful as a TODO marker.
    db
      .select({ id: user.id, name: user.name, email: user.email })
      .from(user)
      .where(
        and(
          isNull(user.suspendedAt),
          isNull(user.deletedAt),
          ne(user.role, "bird_dog"),
        ),
      )
      .orderBy(asc(user.name)),
  ]);

  const authorIds = [...new Set(noteRows.map((n) => n.authorId).filter((x): x is string => !!x))];
  // Reuse the mentionableUsers list as the author lookup when possible;
  // fall back to a small extra query for authors not in that set (e.g.
  // legacy imported notes whose author was suspended / deleted).
  const inMentionable = new Map(mentionableUsers.map((u) => [u.id, u]));
  const missingAuthorIds = authorIds.filter((id) => !inMentionable.has(id));
  const extraAuthors = missingAuthorIds.length
    ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, missingAuthorIds))
    : [];
  const authorMap = new Map<string, { id: string; name: string; email: string }>([
    ...mentionableUsers.map((u) => [u.id, u] as [string, typeof u]),
    ...extraAuthors.map((u) => [u.id, u] as [string, typeof u]),
  ]);

  // First name list passed to renderWithMentions. We index by first name
  // because that's what users type — "@reza" not "@reza bakhshai".
  const mentionableFirstNames = mentionableUsers
    .map((u) => u.name.split(/\s+/)[0])
    .filter((n): n is string => !!n && n.length > 0);

  const composerUsers: MentionableUser[] = mentionableUsers.map((u) => ({
    id: u.id,
    name: u.name,
    firstName: u.name.split(/\s+/)[0] ?? u.name,
  }));

  return (
    <Section title="Activity" description="Notes, calls, and follow-ups. ⌘+Return to save.">
      <NoteComposer parentTable={parentTable} parentId={parentId} mentionableUsers={composerUsers} />

      {noteRows.length === 0 ? (
        <div className="text-xs text-muted text-center py-6">No activity yet — add the first note.</div>
      ) : (
        <ol className="space-y-3">
          {noteRows.map((n) => {
            const author = n.authorId ? authorMap.get(n.authorId) : null;
            const canDelete = currentUserId && n.authorId === currentUserId;
            return (
              <li key={n.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="flex items-baseline gap-2 text-xs">
                    <span className="font-medium text-foreground">
                      {author?.name ?? n.legacyAuthorName ?? "Unknown"}
                      {!author?.name && n.legacyAuthorName && (
                        <span className="text-muted font-normal text-[10px] ml-1">(imported)</span>
                      )}
                    </span>
                    <span className="text-muted">·</span>
                    <span className="text-muted" title={n.createdAt.toLocaleString()}>
                      {formatRelative(n.createdAt)}
                    </span>
                    {n.type !== "manual" && (
                      <>
                        <span className="text-muted">·</span>
                        <span className="text-muted capitalize">{n.type.replace(/_/g, " ")}</span>
                      </>
                    )}
                  </div>
                  {canDelete && (
                    <DeleteNoteButton noteId={n.id} parentTable={parentTable} parentId={parentId} />
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {renderWithMentions(n.body, mentionableFirstNames)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
