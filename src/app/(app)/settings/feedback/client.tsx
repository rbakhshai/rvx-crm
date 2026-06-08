"use client";

import { useOptimistic, useState, useTransition, startTransition as startReactTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/cn";
import {
  reorderFeedbackAction,
  setFeedbackStatusAction,
  setFeedbackNotesAction,
  deleteFeedbackAction,
} from "@/app/actions/feedback";
import type { SerializedFeedback } from "./page";

type Status = "new" | "in_progress" | "done" | "wontfix";

const STATUS_LABEL: Record<Status, string> = {
  new: "New",
  in_progress: "In progress",
  done: "Done",
  wontfix: "Won't fix",
};

const STATUS_TONE: Record<Status, string> = {
  new:         "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  done:        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  wontfix:     "bg-foreground/[0.05] text-foreground/60 border-border",
};

export function FeedbackQueueClient({
  openItems,
  resolvedItems,
}: {
  openItems: SerializedFeedback[];
  resolvedItems: SerializedFeedback[];
}) {
  const router = useRouter();
  const [optimisticOpen, setOptimisticOpen] = useOptimistic<SerializedFeedback[], string[]>(
    openItems,
    (state, orderedIds) => {
      const byId = new Map(state.map((s) => [s.id, s]));
      return orderedIds.map((id) => byId.get(id)).filter(Boolean) as SerializedFeedback[];
    },
  );

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const activeIdx = optimisticOpen.findIndex((i) => i.id === e.active.id);
    const overIdx = optimisticOpen.findIndex((i) => i.id === e.over!.id);
    if (activeIdx === -1 || overIdx === -1) return;

    const next = arrayMove(optimisticOpen, activeIdx, overIdx);
    const orderedIds = next.map((i) => i.id);

    startReactTransition(() => {
      setOptimisticOpen(orderedIds);
    });

    reorderFeedbackAction(orderedIds).then((r) => {
      if (!r.ok) toast.error("Reorder failed");
    });
  }

  return (
    <div className="space-y-8">
      {/* Open queue */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold tracking-tight">
            Open <span className="text-muted font-normal">· {optimisticOpen.length}</span>
          </h2>
          <p className="text-[11px] text-muted">drag rows to reorder priority</p>
        </div>
        {optimisticOpen.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-10 text-center text-sm text-muted">
            No open feedback. The team will let you know what to fix or build.
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={optimisticOpen.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {optimisticOpen.map((item) => (
                  <SortableRow key={item.id} item={item} onChange={() => router.refresh()} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* Resolved */}
      {resolvedItems.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-tight text-muted">
              Done <span className="font-normal">· last {resolvedItems.length}</span>
            </h2>
          </div>
          <ul className="space-y-2 opacity-70">
            {resolvedItems.map((item) => (
              <Row key={item.id} item={item} dragHandle={null} onChange={() => router.refresh()} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function SortableRow({ item, onChange }: { item: SerializedFeedback; onChange: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <Row
        item={item}
        dragHandle={
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted hover:text-foreground px-1 py-0.5 leading-none shrink-0"
            aria-label="Drag to reorder"
            title="Drag to reorder"
          >
            ⋮⋮
          </button>
        }
        onChange={onChange}
      />
    </li>
  );
}

function Row({
  item,
  dragHandle,
  onChange,
}: {
  item: SerializedFeedback;
  dragHandle: React.ReactNode;
  onChange: () => void;
}) {
  const [status, setStatus] = useState<Status>(item.status as Status);
  const [notes, setNotes] = useState(item.internalNotes ?? "");
  const [showNotes, setShowNotes] = useState(false);
  const [isPending, startTransition] = useTransition();

  function changeStatus(s: Status) {
    setStatus(s);
    startTransition(async () => {
      try {
        await setFeedbackStatusAction(item.id, s);
        toast.success(`Status → ${STATUS_LABEL[s]}`);
        onChange();
      } catch {
        toast.error("Couldn't update");
        setStatus(item.status as Status);
      }
    });
  }

  function saveNotes() {
    if (notes === (item.internalNotes ?? "")) return;
    startTransition(async () => {
      try {
        await setFeedbackNotesAction(item.id, notes);
        toast.success("Notes saved");
        onChange();
      } catch {
        toast.error("Couldn't save");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this feedback item? Cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteFeedbackAction(item.id);
        toast.success("Deleted");
        onChange();
      } catch {
        toast.error("Couldn't delete");
      }
    });
  }

  const kindBadge =
    item.kind === "feature"
      ? { icon: "✨", label: "FEATURE", tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30" }
      : { icon: "🐛", label: "BUG",     tone: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30" };

  return (
    <div className="rounded-xl border border-border bg-background hover:border-foreground/30 transition">
      <div className="flex items-start gap-3 p-3">
        {dragHandle}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider border", kindBadge.tone)}>
              {kindBadge.icon} {kindBadge.label}
            </span>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider border", STATUS_TONE[status])}>
              {STATUS_LABEL[status]}
            </span>
            <span className="text-[11px] text-muted">
              {item.name} · <a href={`mailto:${item.email}`} className="hover:underline">{item.email}</a>
              {item.submittedByName && item.submittedByName !== item.name && (
                <span> · session: {item.submittedByName}</span>
              )}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{item.body}</p>
          {showNotes && (
            <div className="mt-3 pt-3 border-t border-border">
              <label className="text-[10px] uppercase tracking-widest text-muted font-semibold">
                Internal notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                rows={2}
                placeholder="Triage notes — not visible to submitter"
                className="mt-1 w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <div className="mt-2 flex items-center gap-3 text-[11px]">
            <select
              value={status}
              onChange={(e) => changeStatus(e.target.value as Status)}
              disabled={isPending}
              className="rounded-md border border-border bg-background px-2 py-0.5 text-[11px] cursor-pointer"
            >
              <option value="new">New</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="wontfix">Won&apos;t fix</option>
            </select>
            <button
              type="button"
              onClick={() => setShowNotes((v) => !v)}
              className="text-muted hover:text-foreground"
            >
              {showNotes ? "− notes" : (item.internalNotes ? "+ notes (filled)" : "+ notes")}
            </button>
            <span className="ml-auto text-muted">{relativeAgo(item.createdAt)}</span>
            <button
              type="button"
              onClick={remove}
              disabled={isPending}
              className="text-muted hover:text-rose-600 transition"
              title="Delete"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function relativeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}
