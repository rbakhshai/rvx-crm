import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notes, user } from "@/db/schema";
import { NoteComposer } from "./note-composer";
import { DeleteNoteButton } from "./delete-note-button";
import { Section } from "./section";

type ParentTable = "contacts" | "deals" | "companies" | "bird_dogs";

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
  return d.toLocaleDateString();
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
  const noteRows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.parentTable, parentTable as never), eq(notes.parentId, parentId)))
    .orderBy(desc(notes.createdAt))
    .limit(100);

  const authorIds = [...new Set(noteRows.map((n) => n.authorId).filter((x): x is string => !!x))];
  const authors = authorIds.length
    ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(inArray(user.id, authorIds))
    : [];
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  return (
    <Section title="Activity" description="Notes, calls, and follow-ups. ⌘+Return to save.">
      <NoteComposer parentTable={parentTable} parentId={parentId} />

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
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.body}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}
