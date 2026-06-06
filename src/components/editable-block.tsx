"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveOpsBlockAction } from "@/app/actions/ops";
import { cn } from "@/lib/cn";

/**
 * Click-to-edit text bound to a single ops_content scope.
 *
 *   <EditableBlock
 *     scope="command.priority.1.title"
 *     initial={blocks.get("command.priority.1.title") ?? "Default value"}
 *     revalidate="/ops/command"
 *     variant="title"
 *   />
 *
 * Click swaps the rendered text into an <input> or <textarea>; blur or
 * Esc saves. ⌘+Enter also saves (handy for multiline). The component
 * never controls layout — it inherits the typography of whatever it
 * sits inside, with the `variant` only nudging the editor's padding.
 *
 * Empty content renders a faded placeholder so blank slots are obvious.
 */
type Variant = "inline" | "title" | "block";

export function EditableBlock({
  scope,
  initial,
  revalidate,
  multiline = false,
  variant = "inline",
  placeholder = "Click to edit…",
  className,
}: {
  scope: string;
  initial: string;
  revalidate: string;
  multiline?: boolean;
  variant?: Variant;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Sync from server when initial prop changes (e.g. after revalidate).
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  function startEdit() {
    setEditing(true);
    // Focus + caret-at-end on the next tick once the editor mounts.
    queueMicrotask(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  }

  function commit() {
    setEditing(false);
    if (value === initial) return;
    startTransition(async () => {
      try {
        await saveOpsBlockAction(scope, value, revalidate);
        setSavedFlash(true);
        window.setTimeout(() => setSavedFlash(false), 1200);
      } catch {
        // Roll back to the server value on save failure.
        setValue(initial);
      }
    });
  }

  function cancel() {
    setValue(initial);
    setEditing(false);
  }

  const isEmpty = value.trim().length === 0;
  const display = isEmpty ? placeholder : value;
  const displayClasses = cn(
    "inline-block w-full cursor-text rounded-sm transition",
    isEmpty && "text-muted/70 italic",
    !isEmpty && "hover:bg-foreground/[0.04] dark:hover:bg-foreground/[0.06]",
    isEmpty && "hover:bg-foreground/[0.03] dark:hover:bg-foreground/[0.05]",
    "px-0.5 -mx-0.5",
    className,
  );

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={startEdit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startEdit();
          }
        }}
        className={displayClasses}
        title={`Edit · ${scope}`}
        data-saved={savedFlash ? "true" : undefined}
        style={savedFlash ? { boxShadow: "0 0 0 1px var(--color-primary)" } : undefined}
      >
        {multiline ? renderMultiline(display) : display}
        {isPending && <span className="text-[10px] text-muted ml-1.5">saving…</span>}
      </span>
    );
  }

  const editorPadding =
    variant === "title" ? "px-2 py-1" :
    variant === "block" ? "px-3 py-2" :
    "px-1.5 py-0.5";

  if (multiline) {
    return (
      <textarea
        ref={(el) => {
          inputRef.current = el;
        }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
        }}
        rows={Math.max(2, value.split("\n").length)}
        className={cn(
          "w-full resize-y rounded-sm bg-background border border-primary/50 outline-none focus:border-primary text-inherit font-inherit leading-inherit",
          editorPadding,
          className,
        )}
      />
    );
  }

  return (
    <input
      type="text"
      ref={(el) => {
        inputRef.current = el;
      }}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          cancel();
        }
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        }
      }}
      className={cn(
        "w-full rounded-sm bg-background border border-primary/50 outline-none focus:border-primary text-inherit font-inherit leading-inherit",
        editorPadding,
        className,
      )}
    />
  );
}

/** Preserve newlines and basic line-break formatting in display. */
function renderMultiline(text: string): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((l, i) => (
    <span key={i}>
      {l}
      {i < lines.length - 1 && <br />}
    </span>
  ));
}
