"use client";

/**
 * The Level 10 agenda — numbered rows mirroring the classic EOS card,
 * each with a live section timer so the meeting stays on schedule
 * visually.
 *
 * Flow:
 *   • "Start meeting" begins section 1's countdown.
 *   • Clicking any row (or "Next section") switches the active section:
 *     the prior section's clock FREEZES at its final reading and the
 *     new section starts fresh. You can jump anywhere — EOS meetings
 *     sometimes loop back.
 *   • Active countdown turns red at ≤2:00 remaining.
 *   • Past zero it flips to "+m:ss" in red and counts UP — the visual
 *     overage everyone can see.
 *   • Frozen sections keep their final reading: green check + time
 *     used when under budget, red "+overage" when over.
 *   • Rows also scroll the page to the matching content section.
 *
 * Timer state is intentionally client-only (no persistence): it's a
 * live meeting instrument, not a record. Refreshing the page resets
 * it, which doubles as the reset button.
 */
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type AgendaSection = {
  key: string;
  title: string;
  minutes: number;
  /** DOM id of the matching content section — row click scrolls to it. */
  anchorId: string;
  emoji: string;
};

type SectionState = {
  /** Seconds spent — final reading once frozen. */
  elapsed: number;
  status: "pending" | "active" | "done";
};

export function AgendaTimer({ sections }: { sections: AgendaSection[] }) {
  const [started, setStarted] = useState(false);
  const [states, setStates] = useState<SectionState[]>(
    sections.map(() => ({ elapsed: 0, status: "pending" })),
  );
  const activeIdx = states.findIndex((s) => s.status === "active");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // One global 1s tick that bumps the active section's elapsed counter.
  useEffect(() => {
    if (activeIdx < 0) return;
    tickRef.current = setInterval(() => {
      setStates((prev) =>
        prev.map((s, i) => (i === activeIdx ? { ...s, elapsed: s.elapsed + 1 } : s)),
      );
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [activeIdx]);

  function activate(idx: number) {
    setStarted(true);
    setStates((prev) =>
      prev.map((s, i) => {
        if (i === idx) return { ...s, status: "active" };
        // Freeze whatever was running; leave untouched sections alone.
        if (s.status === "active") return { ...s, status: "done" };
        return s;
      }),
    );
    // Scroll the content for this section into view.
    document.getElementById(sections[idx].anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function finishMeeting() {
    setStates((prev) => prev.map((s) => (s.status === "active" ? { ...s, status: "done" } : s)));
  }

  const totalMinutes = sections.reduce((acc, s) => acc + s.minutes, 0);
  const allDoneOrPending = activeIdx < 0;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden mb-8">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-foreground/[0.02]">
        <div>
          <h2 className="text-base font-bold tracking-tight">The Level 10 agenda</h2>
          <p className="text-[11px] text-muted">{totalMinutes} minutes · click a row to jump sections</p>
        </div>
        {!started ? (
          <button
            type="button"
            onClick={() => activate(0)}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
          >
            ▶ Start meeting
          </button>
        ) : !allDoneOrPending ? (
          <div className="flex items-center gap-2">
            {activeIdx < sections.length - 1 && (
              <button
                type="button"
                onClick={() => activate(activeIdx + 1)}
                className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition"
              >
                Next section →
              </button>
            )}
            <button
              type="button"
              onClick={finishMeeting}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-foreground/[0.04] transition"
            >
              ■ End
            </button>
          </div>
        ) : (
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
            Meeting ended — refresh to reset
          </span>
        )}
      </div>

      <ol>
        {sections.map((section, i) => {
          const st = states[i];
          const remaining = section.minutes * 60 - st.elapsed;
          const isActive = st.status === "active";
          const isDone = st.status === "done";
          const over = remaining < 0;
          const warning = isActive && !over && remaining <= 120;

          return (
            <li key={section.key}>
              <button
                type="button"
                onClick={() => activate(i)}
                className={cn(
                  "w-full flex items-center gap-3 px-2 py-2.5 border-t border-border text-left transition",
                  isActive
                    ? "bg-amber-50 dark:bg-amber-500/[0.08]"
                    : "hover:bg-foreground/[0.02]",
                )}
              >
                {/* Number block */}
                <span className={cn(
                  "flex items-center justify-center size-9 shrink-0 text-base font-bold font-serif",
                  "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900",
                )}>
                  {i + 1}
                </span>
                <span className="text-lg shrink-0" aria-hidden>{section.emoji}</span>
                <span className={cn("flex-1 text-sm font-bold tracking-tight", isDone && "text-muted")}>
                  {section.title}
                </span>

                {/* Timer chip */}
                <TimerChip
                  minutes={section.minutes}
                  remaining={remaining}
                  isActive={isActive}
                  isDone={isDone}
                  over={over}
                  warning={warning}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TimerChip({
  minutes,
  remaining,
  isActive,
  isDone,
  over,
  warning,
}: {
  minutes: number;
  remaining: number;
  isActive: boolean;
  isDone: boolean;
  over: boolean;
  warning: boolean;
}) {
  // Pending — static duration label, like the printed agenda.
  if (!isActive && !isDone) {
    return (
      <span className="shrink-0 rounded-full bg-foreground/[0.06] px-3 py-1 text-[11px] font-bold tabular-nums text-foreground/70">
        {minutes} MIN
      </span>
    );
  }

  const abs = Math.abs(remaining);
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  const clock = `${m}:${String(s).padStart(2, "0")}`;

  if (isDone) {
    return over ? (
      <span className="shrink-0 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 px-3 py-1 text-[11px] font-bold tabular-nums">
        +{clock} over
      </span>
    ) : (
      <span className="shrink-0 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 px-3 py-1 text-[11px] font-bold tabular-nums">
        ✓ {clock} left
      </span>
    );
  }

  // Active.
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-3 py-1 text-[11px] font-bold tabular-nums",
        over
          ? "bg-rose-600 text-white animate-pulse"
          : warning
            ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
            : "bg-amber-400 text-amber-950",
      )}
    >
      {over ? `+${clock}` : clock}
    </span>
  );
}
