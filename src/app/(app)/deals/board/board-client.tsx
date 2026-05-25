"use client";

import { useOptimistic, useState, startTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Badge } from "@/components/badge";
import { cn } from "@/lib/cn";
import { DEAL_PRIORITY_OPTIONS } from "@/lib/options";
import { updateDealStatusByRoleAction } from "../actions";

const priorityTone = { hot: "danger", warm: "warning", cold: "info" } as const;
const priorityLabel = new Map(DEAL_PRIORITY_OPTIONS.map((o) => [o.value, o.label]));

export type DealCard = {
  id: string;
  name: string | null;
  parkAddress: string | null;
  parkCity: string | null;
  parkState: string | null;
  padsCount: number | null;
  listPrice: string | null;
  agreedPurchasePrice: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  dealPriority: string | null;
  role: string; // computed lane assignment
};

export type Lane = { key: string; label: string; subtitle: string };

type Move = { dealId: string; toRole: string };

function moveDeal(state: DealCard[], move: Move): DealCard[] {
  return state.map((d) => (d.id === move.dealId ? { ...d, role: move.toRole } : d));
}

export function DndBoard({ initialDeals, lanes }: { initialDeals: DealCard[]; lanes: Lane[] }) {
  const [optimisticDeals, applyMove] = useOptimistic<DealCard[], Move>(initialDeals, moveDeal);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const dealsByRole = new Map<string, DealCard[]>();
  for (const d of optimisticDeals) {
    const arr = dealsByRole.get(d.role) ?? [];
    arr.push(d);
    dealsByRole.set(d.role, arr);
  }
  const activeDeal = activeId ? optimisticDeals.find((d) => d.id === activeId) : null;

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
    setError(null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const dealId = String(e.active.id);
    const toRole = e.over ? String(e.over.id) : null;
    if (!toRole) return;
    const current = optimisticDeals.find((d) => d.id === dealId);
    if (!current || current.role === toRole) return;

    startTransition(async () => {
      applyMove({ dealId, toRole });
      const result = await updateDealStatusByRoleAction(dealId, toRole);
      if (!result.ok) {
        setError(result.error ?? "Failed to update status");
      }
    });
  }

  return (
    <>
      {error && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="-mx-8 px-8 overflow-x-auto pb-4">
          <div className="flex gap-3 min-w-max">
            {lanes.map((lane) => (
              <DroppableLane key={lane.key} lane={lane} deals={dealsByRole.get(lane.key) ?? []} />
            ))}
          </div>
        </div>
        <DragOverlay>{activeDeal ? <Card deal={activeDeal} dragging /> : null}</DragOverlay>
      </DndContext>
    </>
  );
}

function DroppableLane({ lane, deals }: { lane: Lane; deals: DealCard[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: lane.key });
  return (
    <div className="w-72 shrink-0">
      <div className="px-1 mb-2">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">{lane.label}</h3>
          <span className="text-xs text-muted tabular-nums">{deals.length}</span>
        </div>
        <p className="text-[11px] text-muted">{lane.subtitle}</p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "space-y-2 min-h-[140px] rounded-lg p-1 transition-colors",
          isOver ? "bg-primary/[0.06] outline outline-2 outline-primary/40" : "",
        )}
      >
        {deals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-foreground/[0.015] p-3 text-[11px] text-muted text-center">
            Drop here
          </div>
        ) : (
          deals.map((d) => <DraggableCard key={d.id} deal={d} />)
        )}
      </div>
    </div>
  );
}

function DraggableCard({ deal }: { deal: DealCard }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "select-none touch-none",
        isDragging ? "opacity-30" : "",
      )}
    >
      <Card deal={deal} />
    </div>
  );
}

function Card({ deal, dragging }: { deal: DealCard; dragging?: boolean }) {
  const title = deal.name || deal.parkAddress || "(unnamed)";
  const location = [deal.parkCity, deal.parkState].filter(Boolean).join(", ");
  const price = deal.agreedPurchasePrice ?? deal.listPrice;

  const inner = (
    <div
      className={cn(
        "rounded-lg border bg-background p-3 transition",
        dragging
          ? "border-primary shadow-lg cursor-grabbing"
          : "border-border hover:border-foreground/30 hover:shadow-sm cursor-grab",
      )}
    >
      <div className="text-sm font-medium leading-tight line-clamp-2">{title}</div>
      {location && <div className="text-[11px] text-muted mt-1">{location}</div>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-[11px] text-muted tabular-nums">
          {price ? `$${Number(price).toLocaleString()}` : "—"}
          {deal.padsCount ? ` · ${deal.padsCount} pads` : ""}
        </div>
        {deal.dealPriority && (
          <Badge tone={priorityTone[deal.dealPriority as keyof typeof priorityTone] ?? "default"}>
            {priorityLabel.get(deal.dealPriority)}
          </Badge>
        )}
      </div>
      {deal.statusLabel && (
        <div className="mt-2 text-[10px] text-muted truncate" title={deal.statusLabel}>
          {deal.statusLabel}
        </div>
      )}
    </div>
  );

  // In the overlay we don't want a link; in normal render we DO want it for clickability.
  if (dragging) return inner;
  return (
    <Link href={`/deals/${deal.id}`} onClick={(e) => e.stopPropagation()}>
      {inner}
    </Link>
  );
}
