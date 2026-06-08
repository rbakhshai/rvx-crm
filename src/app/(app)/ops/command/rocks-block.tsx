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
}: {
  assigneeId: string;
  period: "week" | "month" | "quarter";
  initialRocks: Rock[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
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
        {initialRocks.length === 0 && !showAdd && (
          <li className="text-[11px] text-muted italic">No rocks yet — click + to add</li>
        )}
        {initialRocks.map((r) => (
          <RockRow key={r.id} rock={r} />
        ))}
        {showAdd ? (
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

function RockRow({ rock }: { rock: Rock }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(rock.title);
  const [isPending, startTransition] = useTransition();
  const done = !!rock.doneAt;

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
    if (!confirm("Delete this rock?")) return;
    startTransition(async () => {
      await deleteCommandRockAction(rock.id);
      router.refresh();
    });
  }

  if (editing) {
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
    <li className={cn("group flex items-start gap-1.5 py-0.5", done && "opacity-60")}>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={done ? "Mark not done" : "Mark done"}
        className={cn(
          "mt-0.5 size-3.5 shrink-0 rounded border transition disabled:opacity-50",
          done
            ? "bg-lime-500 border-lime-500 text-white"
            : "border-foreground/30 hover:border-foreground/60",
        )}
      >
        {done ? <span className="block text-[8px] leading-none">✓</span> : null}
      </button>
      <span
        className={cn("flex-1 text-[12px] leading-snug cursor-text", done && "line-through")}
        onClick={() => setEditing(true)}
      >
        {rock.title}
      </span>
      <button
        type="button"
        onClick={del}
        disabled={isPending}
        className="text-[11px] text-muted hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"
        title="Delete"
      >
        ✕
      </button>
    </li>
  );
}
