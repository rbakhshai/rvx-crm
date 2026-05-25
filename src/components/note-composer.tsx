"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { createNoteAction } from "@/app/actions/notes";

export function NoteComposer({
  parentTable,
  parentId,
}: {
  parentTable: "contacts" | "deals" | "companies" | "bird_dogs";
  parentId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createNoteAction(parentTable, parentId, formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to save note");
        return;
      }
      setBody("");
      router.refresh();
      textareaRef.current?.focus();
    });
  }

  return (
    <form action={submit} className="rounded-lg border border-border p-3 bg-foreground/[0.015]">
      <textarea
        ref={textareaRef}
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Log a call, jot a thought, capture a follow-up…"
        rows={2}
        className="w-full resize-y bg-transparent text-sm placeholder:text-muted/70 focus:outline-none"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            const fd = new FormData();
            fd.set("body", body);
            submit(fd);
          }
        }}
      />
      <div className="flex items-center justify-between gap-3 mt-2">
        <div className="text-[11px] text-muted">
          {error ? <span className="text-red-600">{error}</span> : <>⌘ + Return to save</>}
        </div>
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? "Saving…" : "Add note"}
        </Button>
      </div>
    </form>
  );
}
