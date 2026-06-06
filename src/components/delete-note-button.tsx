"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteNoteAction } from "@/app/actions/notes";

export function DeleteNoteButton({
  noteId,
  parentTable,
  parentId,
}: {
  noteId: string;
  parentTable: "contacts" | "deals" | "companies" | "bird_dogs" | "issues";
  parentId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this note?")) return;
        startTransition(async () => {
          await deleteNoteAction(noteId, parentTable, parentId);
          router.refresh();
        });
      }}
      className="text-[11px] text-muted hover:text-red-600 disabled:opacity-50"
    >
      {isPending ? "…" : "delete"}
    </button>
  );
}
