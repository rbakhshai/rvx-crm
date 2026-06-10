"use client";

/**
 * Controlled textarea with a `@FirstName` mention popover.
 *
 * Extracted from NoteComposer so the same UX can power any free-text
 * field that needs @-mentions — note composers, the Issues Capture
 * form, future task descriptions, etc.
 *
 * Detection rule: a mention "trigger" is on whenever the caret sits
 * in a run that starts with `@` and contains no whitespace. We grab
 * everything from the `@` up to the caret as the query, look up
 * matching users by first-name prefix or full-name substring, and
 * show a small picker. Picking inserts `@FirstName ` (with trailing
 * space) so the user can keep typing.
 *
 * The component is fully controlled. Submission, error display, and
 * styling around it are the caller's responsibility — this is just
 * the input. Use the `inputClassName` prop to style the textarea
 * itself; use `disabled` / `rows` / `placeholder` as you would on a
 * native textarea.
 */
import { useEffect, useMemo, useRef, useState } from "react";

export type MentionableUser = {
  id: string;
  /** Display name, e.g. "Reza Bakhshai". */
  name: string;
  /** First name as typed after `@`. Always non-empty. */
  firstName: string;
};

export function MentionTextarea({
  value,
  onChange,
  mentionableUsers,
  placeholder,
  rows = 2,
  disabled,
  inputClassName,
  onSubmitShortcut,
}: {
  value: string;
  onChange: (next: string) => void;
  mentionableUsers: MentionableUser[];
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  inputClassName?: string;
  /** Called on ⌘/Ctrl + Return when the picker is closed. */
  onSubmitShortcut?: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // start = index of '@'; query = everything between '@'+1 and caret.
  const [trigger, setTrigger] = useState<{ start: number; query: string } | null>(null);
  const [highlight, setHighlight] = useState(0);

  // Filter candidates by typed query — first-name prefix wins, then
  // full-name substring. Cap at 6 to keep the popover small.
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

  useEffect(() => {
    if (candidates.length === 0) setHighlight(0);
    else if (highlight >= candidates.length) setHighlight(candidates.length - 1);
  }, [candidates.length, highlight]);

  /** Re-detect the trigger from the textarea's current state + caret. */
  function detectTrigger(text: string, caret: number) {
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
        // `@` only triggers at start-of-string or after whitespace —
        // skip mid-word cases like email addresses.
        if (before === undefined || /\s/.test(before)) {
          setTrigger({ start: i - 1, query: text.slice(i, caret) });
        } else {
          setTrigger(null);
        }
        return;
      }
      i--;
    }
    setTrigger(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    detectTrigger(e.target.value, e.target.selectionStart ?? e.target.value.length);
  }

  function handleSelectionChange() {
    const el = textareaRef.current;
    if (!el) return;
    detectTrigger(el.value, el.selectionStart ?? el.value.length);
  }

  function applyMention(u: MentionableUser) {
    if (!trigger) return;
    const before = value.slice(0, trigger.start);
    const after = value.slice(trigger.start + 1 + trigger.query.length);
    const inserted = `@${u.firstName} `;
    const next = before + inserted + after;
    const caret = (before + inserted).length;
    onChange(next);
    setTrigger(null);
    queueMicrotask(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
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

    // ⌘/Ctrl + Return — caller decides what to do (submit, save, etc.).
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && onSubmitShortcut) {
      e.preventDefault();
      onSubmitShortcut();
    }
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleSelectionChange}
        onClick={handleSelectionChange}
        onBlur={() => {
          // Delay-close so a popover click still fires.
          window.setTimeout(() => setTrigger(null), 100);
        }}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={inputClassName ?? "w-full resize-y bg-transparent text-sm placeholder:text-muted/70 focus:outline-none"}
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
    </div>
  );
}
