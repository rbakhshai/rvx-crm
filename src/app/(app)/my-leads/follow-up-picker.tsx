"use client";

/**
 * Inline picker for manually setting / changing / clearing a lead's
 * next follow-up date from the My Leads table.
 *
 * UX: the current state shows as a chip ("Due now · 3d overdue" / "7d
 * cadence · in 4 days" / "No schedule"). Clicking the chip opens a
 * tiny popover with 7/14/30/45/90 buttons + a clear button.
 *
 * State is server-truth: the server action revalidates /my-leads so
 * the parent re-renders with the new date. We just fire-and-forget
 * with a transient "Saving…" label.
 */
import { useState, useTransition } from "react";
import { setLeadFollowUpAction } from "@/app/actions/leads";
import { fmtRelative } from "@/lib/date-format";
import { cn } from "@/lib/cn";

type Band = "overdue" | "due_today" | "upcoming" | "none";

const OPTIONS = [7, 14, 30, 45, 90] as const;

const BAND_TONES: Record<Band, string> = {
  overdue:   "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200",
  due_today: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200",
  upcoming:  "border-border bg-foreground/[0.02] text-foreground/80",
  none:      "border-dashed border-border bg-transparent text-muted",
};

export function FollowUpPicker({
  leadId,
  currentAt,
  cadenceDays,
  band,
}: {
  leadId: string;
  currentAt: string | null;
  cadenceDays: number | null;
  band: Band;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function set(days: number | null) {
    startTransition(async () => {
      await setLeadFollowUpAction(leadId, days);
      setOpen(false);
    });
  }

  const at = currentAt ? new Date(currentAt) : null;
  const label =
    band === "none"
      ? "Set follow-up"
      : band === "overdue"
        ? `Overdue · ${fmtRelative(at!)}`
        : band === "due_today"
          ? `Due today`
          : `${cadenceDays ? `${cadenceDays}d · ` : ""}${fmtRelative(at!)}`;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition hover:brightness-95",
          BAND_TONES[band],
          pending && "opacity-60",
        )}
      >
        {pending ? "Saving…" : label}
        <svg className="size-3 opacity-60" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && !pending && (
        <>
          {/* click-out shield */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 right-0 mt-1 w-44 rounded-lg border border-border bg-background shadow-lg p-1.5 space-y-0.5">
            {OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => set(d)}
                className={cn(
                  "w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium hover:bg-foreground/5 transition",
                  cadenceDays === d && "bg-foreground/5 font-bold",
                )}
              >
                In {d} days
                <span className="text-[10px] text-muted ml-1.5">
                  ({d === 7 ? "interested" : d === 14 ? "thinking" : d === 30 ? "not selling" : "custom"})
                </span>
              </button>
            ))}
            {at && (
              <>
                <div className="h-px bg-border my-1" />
                <button
                  onClick={() => set(null)}
                  className="w-full text-left rounded-md px-2.5 py-1.5 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"
                >
                  Clear schedule
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
