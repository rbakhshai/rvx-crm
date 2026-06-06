"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DEAL_PRIORITY_OPTIONS } from "@/lib/options";
import {
  bulkReassignDealOwnerAction,
  bulkSetDealPriorityAction,
} from "@/app/actions/bulk";

type Owner = { id: string; name: string };

const popoverWrap = "rounded-lg border border-border bg-surface shadow-2xl p-2 min-w-44";

export function ReassignOwnerPopover({
  owners,
  close,
  ids,
}: {
  owners: Owner[];
  close: () => void;
  ids: string[];
}) {
  const [pending, setPending] = useState(false);
  async function pick(ownerId: string | null) {
    setPending(true);
    try {
      const { count } = await bulkReassignDealOwnerAction(ids, ownerId);
      toast.success(`Reassigned ${count} deal${count === 1 ? "" : "s"}`);
      close();
    } catch (e) {
      toast.error("Couldn't reassign", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={popoverWrap}>
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium px-1.5 py-1">Reassign owner</div>
      <button
        type="button"
        onClick={() => pick(null)}
        disabled={pending}
        className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-foreground/[0.05] text-muted"
      >
        Unassign
      </button>
      {owners.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => pick(o.id)}
          disabled={pending}
          className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-foreground/[0.05]"
        >
          {o.name}
        </button>
      ))}
    </div>
  );
}

export function ChangePriorityPopover({ close, ids }: { close: () => void; ids: string[] }) {
  const [pending, setPending] = useState(false);
  async function pick(p: "hot" | "warm" | "cold" | null) {
    setPending(true);
    try {
      const { count } = await bulkSetDealPriorityAction(ids, p);
      toast.success(`Updated priority on ${count} deal${count === 1 ? "" : "s"}`);
      close();
    } catch (e) {
      toast.error("Couldn't update", { description: e instanceof Error ? e.message : "Try again." });
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={popoverWrap}>
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium px-1.5 py-1">Change priority</div>
      {DEAL_PRIORITY_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => pick(o.value as "hot" | "warm" | "cold")}
          disabled={pending}
          className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-foreground/[0.05]"
        >
          {o.label}
        </button>
      ))}
      <button
        type="button"
        onClick={() => pick(null)}
        disabled={pending}
        className="block w-full text-left text-xs px-2 py-1.5 rounded hover:bg-foreground/[0.05] text-muted"
      >
        Clear priority
      </button>
    </div>
  );
}
