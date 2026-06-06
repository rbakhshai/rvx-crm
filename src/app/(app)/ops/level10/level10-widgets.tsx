"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  saveSegueNotesAction,
  saveConcludeNotesAction,
  setMeetingRatingAction,
  snapshotScorecardAction,
} from "@/app/actions/level10";
import { toast } from "sonner";

/**
 * Multi-line editor bound to a single (meetingDate, field) pair. Saves
 * on blur or ⌘+Enter; flashes a brief outline so the user knows the
 * save landed.
 */
export function MeetingTextarea({
  meetingDate,
  field,
  initial,
  placeholder,
  rows = 3,
}: {
  meetingDate: string;
  field: "segue" | "conclude";
  initial: string;
  placeholder?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const lastSaved = useRef(initial);

  useEffect(() => {
    setValue(initial);
    lastSaved.current = initial;
  }, [initial, meetingDate]);

  function commit() {
    if (value === lastSaved.current) return;
    startTransition(async () => {
      try {
        if (field === "segue") await saveSegueNotesAction(meetingDate, value);
        else await saveConcludeNotesAction(meetingDate, value);
        lastSaved.current = value;
        setSaved(true);
        window.setTimeout(() => setSaved(false), 1200);
      } catch {
        // Roll back on failure.
        setValue(lastSaved.current);
      }
    });
  }

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      rows={rows}
      placeholder={placeholder}
      disabled={isPending}
      className={cn(
        "w-full resize-y rounded-md bg-background border text-sm leading-relaxed px-3 py-2 focus:outline-none focus:ring-1",
        saved ? "border-lime-400 ring-lime-400" : "border-border focus:border-primary focus:ring-primary",
      )}
    />
  );
}

/**
 * 1-10 rating chips. Click the number to save; click again to clear.
 * Saves to the meeting row for the given date.
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
        setValue(initial); // rollback
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
 * "Lock in scorecard" / "Refresh snapshot" button. Either way, it calls
 * the same upsert action — text is just framing for which week is open.
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
