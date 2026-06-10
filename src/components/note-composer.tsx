"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { createNoteAction } from "@/app/actions/notes";
import { MentionTextarea, type MentionableUser } from "./mention-textarea";

export type { MentionableUser };

/**
 * Composer for adding a note to any parent record. Wraps the shared
 * MentionTextarea primitive so the @-popover behavior stays consistent
 * with every other capture surface in the app.
 */
export function NoteComposer({
  parentTable,
  parentId,
  mentionableUsers,
}: {
  parentTable: "contacts" | "deals" | "companies" | "bird_dogs" | "issues";
  parentId: string;
  mentionableUsers: MentionableUser[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // Ref kept so the form action can grab the current body even if the
  // user's still mid-keystroke when they hit ⌘+Return.
  const bodyRef = useRef("");
  bodyRef.current = body;

  function doSubmit() {
    if (!bodyRef.current.trim()) return;
    setError(null);
    const fd = new FormData();
    fd.set("body", bodyRef.current);
    startTransition(async () => {
      const result = await createNoteAction(parentTable, parentId, fd);
      if (!result.ok) {
        setError(result.error ?? "Failed to save note");
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form
      action={() => doSubmit()}
      className="rounded-lg border border-border p-3 bg-foreground/[0.015]"
    >
      <MentionTextarea
        value={body}
        onChange={setBody}
        mentionableUsers={mentionableUsers}
        placeholder="Log a call, jot a thought, capture a follow-up… (@ to mention)"
        rows={2}
        disabled={isPending}
        onSubmitShortcut={doSubmit}
      />

      <div className="flex items-center justify-between gap-3 mt-2">
        <div className="text-[11px] text-muted">
          {error ? <span className="text-red-600">{error}</span> : <>⌘ + Return to save · @ to mention</>}
        </div>
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
