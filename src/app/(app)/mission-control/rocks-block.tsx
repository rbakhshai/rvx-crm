"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import {
  addCommandRockAction,
  updateCommandRockAction,
  toggleCommandRockAction,
  deleteCommandRockAction,
  reorderCommandRocksAction,
} from "@/app/actions/command-rocks";

type Rock = {
  id: string;
  title: string;
  doneAt: string | null;
};

/**
 * Rocks list rendered under a teammate's name on the Command tab.
 * Each rock: checkbox + click-to-edit title + delete button. New rocks
 * added via an inline "+ Add rock" input.
 */
export function RocksBlock({
  assigneeId,
  period,
  initialRocks,
  canEdit,
}: {
  assigneeId: string;
  period: "week" | "month" | "quarter";
  initialRocks: Rock[];
  /** Only admin can add / edit / toggle / delete rocks right now. */
  canEdit: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [rocks, setRocks] = useState(initialRocks);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    const t = draft.trim();
    if (!t) return;
    startTransition(async () => {
      const r = await addCommandRockAction(assigneeId, t, period);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't add");
        return;
      }
      setDraft("");
      setShowAdd(false);
      router.refresh();
    });
  }

  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      return;
    }

    const draggedIdx = rocks.findIndex((r) => r.id === draggedId);
    const targetIdx = rocks.findIndex((r) => r.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedId(null);
      return;
    }

    const newRocks = [...rocks];
    const [moved] = newRocks.splice(draggedIdx, 1);
    newRocks.splice(targetIdx, 0, moved);

    setRocks(newRocks);
    setDraggedId(null);

    startTransition(async () => {
      await reorderCommandRocksAction(
        newRocks.map((r, i) => ({ id: r.id, position: i + 1 }))
      );
    });
  }

  const periodLabel = period === "quarter" ? "Quarterly" : period === "month" ? "Monthly" : "Weekly";

  return (
    <div className="mt-2">
      <div className="text-[10px] uppercase tracking-widest text-lime-700 dark:text-lime-400 font-semibold mb-1.5">
        {periodLabel} Rocks
        {initialRocks.length > 0 && (
          <span className="ml-1.5 text-muted font-normal">· {initialRocks.length}</span>
        )}
      </div>
      <ul className="space-y-1">
        {rocks.length === 0 && !showAdd && (
          <li className="text-[11px] text-muted italic">
            {canEdit ? "No rocks yet — click + to add" : "No rocks yet"}
          </li>
        )}
        {rocks.map((r) => (
          <RockRow
            key={r.id}
            rock={r}
            canEdit={canEdit}
            isDragging={draggedId === r.id}
            onDragStart={(e) => handleDragStart(e, r.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, r.id)}
          />
        ))}
        {!canEdit ? null : showAdd ? (
          <li className="flex items-center gap-1.5">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); add(); }
                if (e.key === "Escape") { e.preventDefault(); setShowAdd(false); setDraft(""); }
              }}
              autoFocus
              placeholder="Rock title…"
              disabled={isPending}
              className="flex-1 rounded-md border border-primary/40 bg-background px-2 py-1 text-[12px] focus:outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={add}
              disabled={isPending || !draft.trim()}
              className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[11px] font-medium hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setDraft(""); }}
              className="text-[11px] text-muted hover:text-foreground"
            >
              cancel
            </button>
          </li>
        ) : (
          <li>
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="text-[11px] text-muted hover:text-foreground transition"
            >
              + Add rock
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

function RockRow({
  rock,
  canEdit,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  rock: Rock;
  canEdit: boolean;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rock.title);
  const [isPending, startTransition] = useTransition();
  const done = !!rock.doneAt;
  // Empty-title rocks render as italic muted placeholders.
  const isPlaceholder = rock.title.trim().length === 0;

  function toggle() {
    startTransition(async () => {
      await toggleCommandRockAction(rock.id, !done);
      router.refresh();
    });
  }

  function save() {
    if (title.trim() === rock.title) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await updateCommandRockAction(rock.id, title);
      setEditing(false);
      router.refresh();
    });
  }

  function del() {
    startTransition(async () => {
      await deleteCommandRockAction(rock.id);
      router.refresh();
    });
  }

  if (editing && canEdit) {
    return (
      <li className="flex items-center gap-1.5">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { e.preventDefault(); setEditing(false); setTitle(rock.title); }
          }}
          autoFocus
          disabled={isPending}
          className="flex-1 rounded-md border border-primary/40 bg-background px-2 py-1 text-[12px] focus:outline-none focus:border-primary"
        />
        <button onClick={save} disabled={isPending} className="text-[11px] text-primary hover:underline">save</button>
        <button onClick={() => { setEditing(false); setTitle(rock.title); }} className="text-[11px] text-muted hover:text-foreground">cancel</button>
      </li>
    );
  }

  return (
    <li
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={cn(
        "group flex items-start gap-1.5 py-0.5 rounded transition",
        isDragging && "opacity-50 bg-primary/10",
        canEdit && "cursor-grab active:cursor-grabbing",
      )}
    >
      <button
        type="button"
        onClick={canEdit ? toggle : undefined}
        disabled={!canEdit || isPending}
        aria-label={done ? "Mark not done" : "Mark done"}
        className={cn(
          "mt-0.5 size-3.5 shrink-0 rounded border transition",
          done
            ? "bg-lime-500 border-lime-500 text-white"
            : "border-foreground/30",
          canEdit && !done && "hover:border-foreground/60",
          !canEdit && "cursor-default opacity-70",
        )}
      >
        {done ? <span className="block text-[8px] leading-none">✓</span> : null}
      </button>
      <span
        className={cn(
          "flex-1 text-[12px] leading-snug",
          done && "line-through",
          isPlaceholder && "italic text-muted",
          canEdit ? "cursor-text" : "cursor-default",
        )}
        onClick={canEdit ? () => setEditing(true) : undefined}
        title={canEdit ? "Click to edit" : undefined}
      >
        {isPlaceholder ? (canEdit ? "Click to fill in" : "(empty)") : rock.title}
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={del}
          disabled={isPending}
          className="text-[11px] text-muted hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
          title="Delete"
        >
          ✕
        </button>
      )}
    </li>
  );
}
