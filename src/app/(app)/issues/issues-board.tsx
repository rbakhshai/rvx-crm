"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, startTransition as startReactTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/cn";
import { createIssueAction, reorderIssueAction } from "@/app/actions/issues";
import type { SerializedIssue } from "./page";

type Teammate = { id: string; name: string; firstName: string };

const PRIORITIES = [
  { key: "red",    label: "Critical",   subtitle: "Time-sensitive — drop everything",   dot: "bg-rose-500" },
  { key: "orange", label: "Within 24h", subtitle: "Address today or tomorrow",          dot: "bg-amber-500" },
  { key: "green",  label: "Next L10",   subtitle: "Park it for the weekly meeting",     dot: "bg-emerald-500" },
] as const;

type PriorityKey = (typeof PRIORITIES)[number]["key"];

export function IssuesBoard({
  view,
  showSolved,
  currentUserId,
  issues,
  solvedIssues,
  teammates,
  mineOutstanding,
}: {
  view: "priority" | "owner";
  showSolved: boolean;
  currentUserId: string;
  issues: SerializedIssue[];
  solvedIssues: SerializedIssue[];
  teammates: Teammate[];
  mineOutstanding: number;
}) {
  const router = useRouter();

  return (
    <div className="space-y-5">
      <Capture teammates={teammates} defaultAssigneeId={currentUserId} />

      <ViewToggle view={view} showSolved={showSolved} mineOutstanding={mineOutstanding} />

      {view === "priority" ? (
        <PriorityBoard issues={issues} teammates={teammates} />
      ) : (
        <OwnerBoard issues={issues} teammates={teammates} />
      )}

      {showSolved && solvedIssues.length > 0 && (
        <SolvedLog issues={solvedIssues} teammates={teammates} />
      )}

      {/* Touch unused router import — keeps lint happy if we ever drop the
          inline router.push from the children. */}
      <span hidden onClick={() => router.refresh()} />
    </div>
  );
}

// ============================================================================
// Capture form — quick-add at the top of the page
// ============================================================================

function Capture({
  teammates,
  defaultAssigneeId,
}: {
  teammates: Teammate[];
  defaultAssigneeId: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<PriorityKey>("green");
  const [assigneeId, setAssigneeId] = useState<string>(defaultAssigneeId);
  const [isPending, startTransition] = useTransition();
  const [showBody, setShowBody] = useState(false);

  function submit() {
    if (!title.trim()) return;
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("priority", priority);
    fd.set("assigneeId", assigneeId);
    startTransition(async () => {
      const result = await createIssueAction(fd);
      if (!result.ok) {
        toast.error("Couldn't capture", { description: result.error });
        return;
      }
      toast.success("Captured");
      setTitle("");
      setBody("");
      setPriority("green");
      setShowBody(false);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-foreground/[0.01] p-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="What's the issue? — press Enter to capture"
          className="flex-1 min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={isPending}
        />
        <PriorityPicker value={priority} onChange={setPriority} />
        <select
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1.5 text-sm cursor-pointer"
          disabled={isPending}
        >
          <option value="">(unassigned)</option>
          {teammates.map((t) => (
            <option key={t.id} value={t.id}>{t.firstName}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !title.trim()}
          className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
        >
          {isPending ? "Capturing…" : "+ Capture"}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
        <button type="button" onClick={() => setShowBody((v) => !v)} className="hover:text-foreground">
          {showBody ? "− hide details" : "+ add details / @mention"}
        </button>
        <span>·</span>
        <span>Tip: use <code className="bg-foreground/[0.06] rounded px-1">@FirstName</code> to tag a teammate.</span>
      </div>

      {showBody && (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="What's the context? @Erica what do you think?"
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={isPending}
        />
      )}
    </section>
  );
}

function PriorityPicker({
  value,
  onChange,
}: {
  value: PriorityKey;
  onChange: (v: PriorityKey) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background overflow-hidden">
      {PRIORITIES.map((p) => {
        const active = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange(p.key)}
            title={p.label}
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1.5 text-xs transition",
              active && "bg-foreground/[0.04] font-medium",
              !active && "hover:bg-foreground/[0.02] text-foreground/70",
            )}
          >
            <span className={cn("size-2 rounded-full", p.dot)} />
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// View toggle (priority | owner) + show-solved
// ============================================================================

function ViewToggle({
  view,
  showSolved,
  mineOutstanding,
}: {
  view: "priority" | "owner";
  showSolved: boolean;
  mineOutstanding: number;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="inline-flex rounded-md border border-border bg-background overflow-hidden text-xs">
        <Link
          href={"/issues?view=priority" + (showSolved ? "&show_solved=1" : "") as never}
          className={cn(
            "px-3 py-1.5 transition",
            view === "priority" ? "bg-foreground/[0.04] font-medium text-foreground" : "text-foreground/70 hover:bg-foreground/[0.02]",
          )}
        >
          By priority
        </Link>
        <Link
          href={"/issues?view=owner" + (showSolved ? "&show_solved=1" : "") as never}
          className={cn(
            "px-3 py-1.5 transition border-l border-border",
            view === "owner" ? "bg-foreground/[0.04] font-medium text-foreground" : "text-foreground/70 hover:bg-foreground/[0.02]",
          )}
        >
          By teammate
        </Link>
      </div>
      <div className="flex items-center gap-3 text-xs">
        {mineOutstanding > 0 && (
          <span className="text-muted">
            <span className="text-foreground font-medium">{mineOutstanding}</span> assigned to you
          </span>
        )}
        <Link
          href={`/issues?view=${view}${showSolved ? "" : "&show_solved=1"}` as never}
          className="text-muted hover:text-foreground hover:underline"
        >
          {showSolved ? "Hide solved" : "Show solved"}
        </Link>
      </div>
    </div>
  );
}

// ============================================================================
// Priority board (3 lanes)
// ============================================================================

function PriorityBoard({ issues, teammates }: { issues: SerializedIssue[]; teammates: Teammate[] }) {
  const [optimistic, setOptimistic] = useOptimistic<
    SerializedIssue[],
    { movedId: string; toPriority: PriorityKey; orderedIds: string[] }
  >(issues, (state, move) => {
    // Apply move locally so the UI snaps before the server returns.
    const moved = state.find((i) => i.id === move.movedId);
    if (!moved) return state;
    const updated: SerializedIssue = { ...moved, priority: move.toPriority };
    // Strip out moved + replace it positionally per orderedIds within the lane.
    const others = state.filter((i) => i.id !== move.movedId);
    const positionMap = new Map(move.orderedIds.map((id, idx) => [id, idx]));
    // Reorder everything in the target lane by ordered ids, keep other lanes as-is.
    const inLane = [...others.filter((i) => i.priority === move.toPriority), updated]
      .filter((i) => positionMap.has(i.id))
      .sort((a, b) => (positionMap.get(a.id) ?? 0) - (positionMap.get(b.id) ?? 0));
    const outOfLane = others.filter((i) => i.priority !== move.toPriority);
    return [...outOfLane, ...inLane];
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const lanes = PRIORITIES.map((p) => ({
    ...p,
    items: optimistic.filter((i) => i.priority === p.key),
  }));

  function findLaneByItemId(id: string): PriorityKey | null {
    return optimistic.find((i) => i.id === id)?.priority ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;

    const activeIdStr = String(e.active.id);
    const overId = String(e.over.id);

    // If dropped onto a lane container directly (id = "lane:red" etc.), the
    // item goes to the end of that lane. Else dropped onto another card.
    let targetPriority: PriorityKey;
    let orderedIds: string[];

    if (overId.startsWith("lane:")) {
      targetPriority = overId.slice("lane:".length) as PriorityKey;
      const inLane = optimistic.filter((i) => i.priority === targetPriority && i.id !== activeIdStr);
      orderedIds = [...inLane.map((i) => i.id), activeIdStr];
    } else {
      const overLane = findLaneByItemId(overId);
      if (!overLane) return;
      targetPriority = overLane;
      const inLane = optimistic.filter((i) => i.priority === targetPriority);
      const activeIdx = inLane.findIndex((i) => i.id === activeIdStr);
      const overIdx = inLane.findIndex((i) => i.id === overId);
      let next: SerializedIssue[];
      if (activeIdx === -1) {
        // Moved from another lane: insert at overIdx
        const moved = optimistic.find((i) => i.id === activeIdStr);
        if (!moved) return;
        next = [...inLane.slice(0, overIdx), moved, ...inLane.slice(overIdx)];
      } else {
        next = arrayMove(inLane, activeIdx, overIdx);
      }
      orderedIds = next.map((i) => i.id);
    }

    // Apply optimistic move
    startReactTransition(() => {
      setOptimistic({ movedId: activeIdStr, toPriority: targetPriority, orderedIds });
    });

    // Persist
    reorderIssueAction({ movedId: activeIdStr, toPriority: targetPriority, orderedIds }).then((res) => {
      if (!res.ok) toast.error("Reorder failed");
    });
  }

  const active = activeId ? optimistic.find((i) => i.id === activeId) : null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid lg:grid-cols-3 gap-4">
        {lanes.map((lane) => (
          <PriorityLane key={lane.key} lane={lane} teammates={teammates} />
        ))}
      </div>

      <DragOverlay>
        {active ? (
          <div className="rotate-1">
            <IssueCard issue={active} teammates={teammates} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PriorityLane({
  lane,
  teammates,
}: {
  lane: (typeof PRIORITIES)[number] & { items: SerializedIssue[] };
  teammates: Teammate[];
}) {
  return (
    <DroppableColumn id={`lane:${lane.key}`}>
      <div className="rounded-xl border border-border bg-foreground/[0.015] flex flex-col min-h-[180px]">
        <header className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="inline-flex items-center gap-2">
            <span className={cn("size-2 rounded-full", lane.dot)} />
            <h3 className="text-sm font-semibold">{lane.label}</h3>
            <span className="text-[11px] text-muted">({lane.items.length})</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted hidden sm:inline">
            {lane.subtitle}
          </span>
        </header>
        <SortableContext items={lane.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex-1 p-2 space-y-2">
            {lane.items.length === 0 && (
              <li className="text-xs text-muted text-center py-6">drop issues here</li>
            )}
            {lane.items.map((i) => (
              <SortableCard key={i.id} issue={i} teammates={teammates} />
            ))}
          </ul>
        </SortableContext>
      </div>
    </DroppableColumn>
  );
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  // SortableContext drives in-lane reorder; useDroppable makes the WHOLE
  // lane (including empty space) accept a drop so the dragged card can
  // land in an empty lane.
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(isOver && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-xl")}>
      {children}
    </div>
  );
}

// ============================================================================
// Owner board (per-teammate columns)
// ============================================================================

function OwnerBoard({ issues, teammates }: { issues: SerializedIssue[]; teammates: Teammate[] }) {
  // Owner columns are: Unassigned + every teammate, in the same order they
  // were passed. Each column lists that owner's open issues, priority-
  // grouped within the column with a colored dot prefix.
  const buckets: Array<{ id: string | null; label: string; firstName: string; items: SerializedIssue[] }> = [
    { id: null, label: "Unassigned", firstName: "—", items: issues.filter((i) => !i.assigneeId) },
    ...teammates.map((t) => ({
      id: t.id,
      label: t.firstName,
      firstName: t.firstName,
      items: issues.filter((i) => i.assigneeId === t.id),
    })),
  ];

  // Sort each bucket by canonical priority order, then position.
  const PRI_ORDER: Record<PriorityKey, number> = { red: 0, orange: 1, green: 2 };
  for (const b of buckets) {
    b.items.sort((a, b2) => PRI_ORDER[a.priority] - PRI_ORDER[b2.priority] || a.position - b2.position);
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {buckets.map((b) => (
        <div key={b.id ?? "unassigned"} className="rounded-xl border border-border bg-foreground/[0.015] flex flex-col">
          <header className="flex items-center justify-between px-3 py-2 border-b border-border">
            <div className="inline-flex items-center gap-2">
              {b.id ? <Avatar name={b.label} id={b.id} /> : <span className="size-5 rounded-full border border-dashed border-border" />}
              <h3 className="text-sm font-semibold">{b.label}</h3>
              <span className="text-[11px] text-muted">({b.items.length})</span>
            </div>
          </header>
          <ul className="flex-1 p-2 space-y-2 min-h-[120px]">
            {b.items.length === 0 ? (
              <li className="text-xs text-muted text-center py-4">no open issues</li>
            ) : (
              b.items.map((i) => <IssueCard key={i.id} issue={i} teammates={teammates} />)
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// IssueCard — used in lanes, owner columns, and drag overlay
// ============================================================================

function SortableCard({ issue, teammates }: { issue: SerializedIssue; teammates: Teammate[] }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <IssueCard issue={issue} teammates={teammates} />
    </li>
  );
}

function IssueCard({
  issue,
  teammates,
  dragging,
}: {
  issue: SerializedIssue;
  teammates: Teammate[];
  dragging?: boolean;
}) {
  const assignee = teammates.find((t) => t.id === issue.assigneeId) ?? null;
  const dot = issue.priority === "red" ? "bg-rose-500" : issue.priority === "orange" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <Link
      href={`/issues/${issue.id}` as never}
      onClick={(e) => {
        // Don't follow the link while we're dragging.
        if (dragging) e.preventDefault();
      }}
      className={cn(
        "block rounded-lg border border-border bg-background p-3 shadow-sm hover:bg-foreground/[0.02] transition",
        dragging && "shadow-xl",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className={cn("mt-1.5 size-2 rounded-full shrink-0", dot)} aria-hidden />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-snug">{issue.title}</div>
          {issue.body && (
            <p className="mt-0.5 text-[12px] text-muted line-clamp-2 leading-snug">{issue.body}</p>
          )}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted">
              {timeAgo(issue.createdAt)}
            </span>
            {assignee ? (
              <Avatar name={assignee.name} id={assignee.id} />
            ) : (
              <span className="text-[10px] text-muted">unassigned</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Solved log
// ============================================================================

function SolvedLog({ issues, teammates }: { issues: SerializedIssue[]; teammates: Teammate[] }) {
  return (
    <section className="rounded-xl border border-border bg-background mt-6">
      <header className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-foreground/30" />
          Solved <span className="text-muted font-normal">({issues.length})</span>
        </h3>
      </header>
      <ul className="divide-y divide-border">
        {issues.map((i) => {
          const solver = teammates.find((t) => t.id === i.solvedById) ?? null;
          return (
            <li key={i.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium line-through decoration-muted/50">{i.title}</div>
                  {i.solutionSummary && (
                    <p className="text-[12px] text-foreground/70 mt-1 leading-relaxed">→ {i.solutionSummary}</p>
                  )}
                </div>
                <span className="text-[11px] text-muted shrink-0 inline-flex items-center gap-1">
                  {solver && <Avatar name={solver.name} id={solver.id} />}
                  {i.solvedAt ? timeAgo(i.solvedAt) : ""}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================================

function timeAgo(iso: string): string {
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
