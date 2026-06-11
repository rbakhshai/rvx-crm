"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  saveSegueNotesAction,
  saveHeadlinesNotesAction,
  saveConcludeNotesAction,
  setMeetingRatingAction,
  snapshotScorecardAction,
  addActionItemAction,
  updateActionItemAction,
  toggleActionItemAction,
  deleteActionItemAction,
  carryForwardActionItemAction,
} from "@/app/actions/level10";
import { toast } from "sonner";

/**
 * Multi-line editor bound to a single (meetingDate, field) pair.
 *
 * Saves on:
 *   - clicking the Save button (explicit)
 *   - ⌘+Enter (keyboard)
 *   - blur (safety net so unsaved drafts can't vanish)
 *
 * Shows a "Saved Xm ago" indicator so the user can trust the state.
 */
export function MeetingTextarea({
  meetingDate,
  field,
  initial,
  initialSavedAt,
  placeholder,
  rows = 3,
}: {
  meetingDate: string;
  field: "segue" | "headlines" | "conclude";
  initial: string;
  initialSavedAt?: Date | string | null;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(initial);
  const [savedAt, setSavedAt] = useState<Date | null>(initialSavedAt ? new Date(initialSavedAt) : null);
  const [isPending, startTransition] = useTransition();
  const [flash, setFlash] = useState(false);
  const lastSaved = useRef(initial);

  useEffect(() => {
    setValue(initial);
    lastSaved.current = initial;
    setSavedAt(initialSavedAt ? new Date(initialSavedAt) : null);
  }, [initial, initialSavedAt, meetingDate]);

  function commit() {
    if (value === lastSaved.current) return;
    startTransition(async () => {
      try {
        if (field === "segue") await saveSegueNotesAction(meetingDate, value);
        else if (field === "headlines") await saveHeadlinesNotesAction(meetingDate, value);
        else await saveConcludeNotesAction(meetingDate, value);
        lastSaved.current = value;
        setSavedAt(new Date());
        setFlash(true);
        window.setTimeout(() => setFlash(false), 1200);
      } catch {
        setValue(lastSaved.current);
        toast.error("Couldn't save");
      }
    });
  }

  const isDirty = value !== lastSaved.current;

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        rows={rows}
        placeholder={placeholder}
        disabled={isPending}
        className={cn(
          "w-full resize-y rounded-md bg-background border text-sm leading-relaxed px-3 py-2 focus:outline-none focus:ring-1 transition",
          flash ? "border-lime-400 ring-lime-400" : "border-border focus:border-primary focus:ring-primary",
        )}
      />
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px]">
        <span className="text-muted">
          {isDirty ? (
            <span className="text-amber-700 dark:text-amber-400">unsaved · ⌘+Return or click Save</span>
          ) : savedAt ? (
            <span>
              {flash ? "Saved ✓" : `Saved ${relativeShort(savedAt)}`}
            </span>
          ) : (
            <span>auto-saves on blur · click Save to commit now</span>
          )}
        </span>
        <button
          type="button"
          onClick={commit}
          disabled={isPending || !isDirty}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-medium transition",
            isDirty
              ? "bg-primary text-primary-foreground hover:opacity-90"
              : "bg-foreground/[0.05] text-muted cursor-default",
          )}
        >
          {isPending ? "Saving…" : isDirty ? "Save" : "Saved"}
        </button>
      </div>
    </div>
  );
}

function relativeShort(d: Date): string {
  const ms = Date.now() - d.getTime();
  const s = Math.floor(ms / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  return `${dy}d ago`;
}

/**
 * 1-10 rating chips. Click the number to save; click again to clear.
 */
export function MeetingRating({
  meetingDate,
  initial,
}: {
  meetingDate: string;
  initial: number | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<number | null>(initial);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(initial);
  }, [initial, meetingDate]);

  function pick(n: number) {
    const next = value === n ? null : n;
    setValue(next);
    startTransition(async () => {
      try {
        await setMeetingRatingAction(meetingDate, next);
        router.refresh();
      } catch {
        setValue(initial);
      }
    });
  }

  return (
    <div className="flex gap-1.5 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const active = n === value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => pick(n)}
            disabled={isPending}
            aria-pressed={active}
            className={cn(
              "size-8 rounded-full text-xs font-semibold grid place-items-center border transition disabled:opacity-50",
              active
                ? "bg-foreground text-background border-foreground"
                : "bg-background border-border text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground",
            )}
          >
            {n}
          </button>
        );
      })}
      {value != null && (
        <span className="self-center text-[11px] text-muted ml-2">
          rated · click {value} again to clear
        </span>
      )}
    </div>
  );
}

/**
 * Snapshot button — used as both "Lock in scorecard now" (current week)
 * and "Refresh from current CRM data" (past week).
 */
export function RefreshSnapshotButton({
  meetingDate,
  label,
}: {
  meetingDate: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function snap() {
    startTransition(async () => {
      try {
        const r = await snapshotScorecardAction(meetingDate);
        toast.success(`Snapshot saved · ${r.count} metrics frozen`);
        router.refresh();
      } catch (e) {
        toast.error("Couldn't snapshot", { description: e instanceof Error ? e.message : "Try again" });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={snap}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/80 hover:bg-foreground/[0.04] transition disabled:opacity-50"
    >
      {isPending ? "Snapshotting…" : label}
    </button>
  );
}

// ============================================================================
// Action Items
// ============================================================================

export type Teammate = { id: string; name: string };

type ActionItem = {
  id: string;
  body: string;
  assigneeId: string | null;
  completedAt: string | null;
  meetingDate: string;
};

export function ActionItemsBlock({
  meetingDate,
  items,
  carryFromPrevious,
  teammates,
  isCurrentWeek,
}: {
  meetingDate: string;
  items: ActionItem[];
  /** Open items from the most recent prior meeting — for the EOS review step. */
  carryFromPrevious: ActionItem[];
  teammates: Teammate[];
  isCurrentWeek: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [draftAssignee, setDraftAssignee] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!draft.trim()) return;
    startTransition(async () => {
      const r = await addActionItemAction(meetingDate, draft, draftAssignee || null);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't add");
        return;
      }
      setDraft("");
      setDraftAssignee("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Review last week's open items (only on current week) */}
      {isCurrentWeek && carryFromPrevious.length > 0 && (
        <div className="rounded-lg border border-amber-300/40 bg-amber-50/40 dark:bg-amber-500/[0.04] p-3">
          <div className="text-[10px] uppercase tracking-widest text-amber-700 dark:text-amber-300 font-semibold mb-2">
            From last meeting — review
          </div>
          <ul className="space-y-1.5">
            {carryFromPrevious.map((it) => {
              const owner = teammates.find((t) => t.id === it.assigneeId);
              return (
                <li key={it.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 size-1.5 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px]">{it.body}</div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {owner ? `@${owner.name.split(" ")[0]}` : "unassigned"} · open from {fmtShortDate(it.meetingDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <ToggleItemButton itemId={it.id} completed={false} label="Done" />
                    <CarryForwardButton itemId={it.id} into={meetingDate} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* This meeting's items */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">
          Action items {items.length > 0 && <span className="text-foreground">· {items.length}</span>}
        </div>
        {items.length === 0 && (
          <p className="text-xs text-muted mb-2">
            No items yet. Capture commitments as you make them — review them at next Monday's L10.
          </p>
        )}
        <ul className="space-y-1.5">
          {items.map((it) => (
            <ActionRow key={it.id} item={it} teammates={teammates} />
          ))}
        </ul>

        {/* Add row */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. Marco to follow up with Smith Park by Wed"
            disabled={isPending}
            className="flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <select
            value={draftAssignee}
            onChange={(e) => setDraftAssignee(e.target.value)}
            disabled={isPending}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm cursor-pointer"
          >
            <option value="">(unassigned)</option>
            {teammates.map((t) => (
              <option key={t.id} value={t.id}>{t.name.split(" ")[0]}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            disabled={isPending || !draft.trim()}
            className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {isPending ? "Adding…" : "+ Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionRow({ item, teammates }: { item: ActionItem; teammates: Teammate[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(item.body);
  const [assigneeId, setAssigneeId] = useState(item.assigneeId ?? "");
  const [isPending, startTransition] = useTransition();
  const completed = !!item.completedAt;

  function toggle() {
    startTransition(async () => {
      await toggleActionItemAction(item.id, !completed);
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      await updateActionItemAction(item.id, { body, assigneeId: assigneeId || null });
      setEditing(false);
      router.refresh();
    });
  }

  function del() {
    if (!confirm("Delete this action item?")) return;
    startTransition(async () => {
      await deleteActionItemAction(item.id);
      router.refresh();
    });
  }

  const owner = teammates.find((t) => t.id === item.assigneeId);

  if (editing) {
    return (
      <li className="flex items-center gap-2 rounded-md border border-primary/40 bg-background p-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); save(); }
            if (e.key === "Escape") { e.preventDefault(); setEditing(false); setBody(item.body); }
          }}
          autoFocus
          className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none"
        />
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs cursor-pointer"
        >
          <option value="">(unassigned)</option>
          {teammates.map((t) => (
            <option key={t.id} value={t.id}>{t.name.split(" ")[0]}</option>
          ))}
        </select>
        <button onClick={save} disabled={isPending} className="text-xs text-primary hover:underline">save</button>
        <button onClick={() => { setEditing(false); setBody(item.body); }} className="text-xs text-muted hover:text-foreground">cancel</button>
      </li>
    );
  }

  return (
    <li className={cn("flex items-center gap-2 rounded-md hover:bg-foreground/[0.02] px-1.5 py-1", completed && "opacity-60")}>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={completed ? "Mark not done" : "Mark done"}
        className={cn(
          "size-4 shrink-0 rounded border transition disabled:opacity-50",
          completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-foreground/30 hover:border-foreground/60",
        )}
      >
        {completed ? "✓" : ""}
      </button>
      <span className={cn("flex-1 text-sm cursor-text", completed && "line-through")} onClick={() => setEditing(true)}>
        {item.body}
      </span>
      {owner && (
        <span className="text-[11px] text-muted shrink-0">@{owner.name.split(" ")[0]}</span>
      )}
      <button
        type="button"
        onClick={del}
        disabled={isPending}
        className="text-[11px] text-muted hover:text-rose-600 transition shrink-0"
      >
        ✕
      </button>
    </li>
  );
}

function ToggleItemButton({ itemId, completed, label }: { itemId: string; completed: boolean; label: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await toggleActionItemAction(itemId, !completed);
          router.refresh();
        })
      }
      disabled={isPending}
      className="rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 transition px-2 py-0.5 text-[11px] font-medium"
    >
      {label}
    </button>
  );
}

function CarryForwardButton({ itemId, into }: { itemId: string; into: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await carryForwardActionItemAction(itemId, into);
          toast.success("Carried forward to this week");
          router.refresh();
        })
      }
      disabled={isPending}
      className="rounded-md bg-foreground/[0.06] text-foreground/70 hover:bg-foreground/[0.1] transition px-2 py-0.5 text-[11px] font-medium"
    >
      Carry →
    </button>
  );
}

function fmtShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
