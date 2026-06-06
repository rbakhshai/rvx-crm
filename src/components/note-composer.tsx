"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { createNoteAction } from "@/app/actions/notes";

export type MentionableUser = {
  id: string;
  /** Full display name, e.g. "Reza Bakhshai". */
  name: string;
  /** First name as the user would type after `@`. Always non-empty. */
  firstName: string;
};

/**
 * NoteComposer with an @-mention popover.
 *
 * Detection rule: a mention "trigger" is on whenever the caret sits in a
 * run that starts with `@` and contains no whitespace. We grab everything
 * from the `@` up to the caret as the query, look up matching users by
 * first-name prefix or full-name substring, and show a small picker.
 *
 * On pick we replace the trigger range with `@FirstName ` (trailing space)
 * so the user can keep typing without a manual gap.
 */
export function NoteComposer({
  parentTable,
  parentId,
  mentionableUsers,
}: {
  parentTable: "contacts" | "deals" | "companies" | "bird_dogs";
  parentId: string;
  mentionableUsers: MentionableUser[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mention picker state. `trigger.start` is the index of the `@`; everything
  // between `start+1` and the caret is the live query string.
  const [trigger, setTrigger] = useState<{ start: number; query: string } | null>(null);
  const [highlight, setHighlight] = useState(0);

  // Filter the candidate list against the typed query. We prioritize first-
  // name prefix matches, then any substring of the full name.
  const candidates = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    if (q.length === 0) return mentionableUsers.slice(0, 6);
    const prefix = mentionableUsers.filter((u) => u.firstName.toLowerCase().startsWith(q));
    const seen = new Set(prefix.map((u) => u.id));
    const sub = mentionableUsers.filter(
      (u) => !seen.has(u.id) && u.name.toLowerCase().includes(q),
    );
    return [...prefix, ...sub].slice(0, 6);
  }, [trigger, mentionableUsers]);

  // Clamp the highlighted index whenever the candidate list changes.
  useEffect(() => {
    if (candidates.length === 0) {
      setHighlight(0);
    } else if (highlight >= candidates.length) {
      setHighlight(candidates.length - 1);
    }
  }, [candidates.length, highlight]);

  /**
   * Re-detect the trigger from the current textarea state. Called after every
   * change/keyup to keep `trigger` in sync with the caret position.
   */
  function detectTrigger(text: string, caret: number) {
    // Walk left from caret until whitespace or `@`. If we hit `@` first and
    // the char before is start-of-string or whitespace, we're in a trigger.
    let i = caret;
    while (i > 0) {
      const ch = text[i - 1];
      if (!ch) break;
      if (/\s/.test(ch)) {
        setTrigger(null);
        return;
      }
      if (ch === "@") {
        const before = text[i - 2];
        if (before === undefined || /\s/.test(before)) {
          setTrigger({ start: i - 1, query: text.slice(i, caret) });
        } else {
          // `@` mid-word (e.g. email address) — don't open the picker.
          setTrigger(null);
        }
        return;
      }
      i--;
    }
    setTrigger(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setBody(e.target.value);
    detectTrigger(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function handleSelectionChange() {
    const el = textareaRef.current;
    if (!el) return;
    detectTrigger(el.value, el.selectionStart ?? el.value.length);
  }

  function applyMention(u: MentionableUser) {
    if (!trigger) return;
    const before = body.slice(0, trigger.start);
    const after = body.slice(trigger.start + 1 + trigger.query.length);
    const inserted = `@${u.firstName} `;
    const next = before + inserted + after;
    const caret = (before + inserted).length;
    setBody(next);
    setTrigger(null);
    // Restore focus + caret on the next tick so React commits the value first.
    queueMicrotask(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createNoteAction(parentTable, parentId, formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to save note");
        return;
      }
      setBody("");
      setTrigger(null);
      router.refresh();
      textareaRef.current?.focus();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Picker hot-keys take priority when open.
    if (trigger && candidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % candidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + candidates.length) % candidates.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pick = candidates[highlight];
        if (pick) applyMention(pick);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setTrigger(null);
        return;
      }
    }

    // ⌘ + Return submits whether or not the picker is open (only if not
    // intercepted above).
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      const fd = new FormData();
      fd.set("body", body);
      submit(fd);
    }
  }

  return (
    <form action={submit} className="rounded-lg border border-border p-3 bg-foreground/[0.015] relative">
      <textarea
        ref={textareaRef}
        name="body"
        value={body}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleSelectionChange}
        onClick={handleSelectionChange}
        onBlur={() => {
          // Delay-close so a click on a candidate row still fires.
          window.setTimeout(() => setTrigger(null), 100);
        }}
        placeholder="Log a call, jot a thought, capture a follow-up… (@ to mention)"
        rows={2}
        className="w-full resize-y bg-transparent text-sm placeholder:text-muted/70 focus:outline-none"
      />

      {trigger && candidates.length > 0 && (
        <ul
          role="listbox"
          aria-label="Mention a teammate"
          className="absolute z-20 left-3 top-full mt-1 w-64 rounded-md border border-border bg-background shadow-lg overflow-hidden"
        >
          {candidates.map((u, i) => {
            const active = i === highlight;
            return (
              <li
                key={u.id}
                role="option"
                aria-selected={active}
                // onMouseDown (not onClick) so it fires before textarea's onBlur
                // closes the picker.
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyMention(u);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={
                  "px-3 py-1.5 cursor-pointer flex items-baseline justify-between gap-3 text-sm " +
                  (active ? "bg-primary/10 text-foreground" : "hover:bg-foreground/[0.04]")
                }
              >
                <span className="font-medium truncate">{u.name}</span>
                <span className="text-[11px] text-muted shrink-0">@{u.firstName}</span>
              </li>
            );
          })}
        </ul>
      )}

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
