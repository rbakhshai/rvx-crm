/**
 * Pure UI building blocks shared by every Ops Machine page. No client
 * state — these are server-renderable.
 */
import type { ReactNode } from "react";

/**
 * The page header pattern shared across tabs:
 *   small green caps-label · big bold heading · optional right-side chip
 */
export function OpsHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4 mb-6">
      <div>
        <div className="text-[11px] font-medium uppercase tracking-widest text-muted">
          {eyebrow}
        </div>
        <h1 className="text-4xl font-bold tracking-tight mt-1">{title}</h1>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

/** A small colored caps label, used to group cards into sections. */
export function SectionLabel({
  tone = "lime",
  children,
}: {
  tone?: "lime" | "red" | "blue" | "muted";
  children: ReactNode;
}) {
  const color =
    tone === "lime" ? "text-lime-700 dark:text-lime-400" :
    tone === "red"  ? "text-rose-700 dark:text-rose-400" :
    tone === "blue" ? "text-sky-700 dark:text-sky-400" :
                       "text-muted";
  return (
    <div className={`text-[11px] uppercase tracking-widest font-semibold ${color} mb-3`}>
      {children}
    </div>
  );
}

/**
 * Card with a left-edge accent — matches the priorities card and
 * initiative cards in the screenshots.
 */
export function AccentCard({
  accent = "lime",
  className = "",
  children,
}: {
  accent?: "lime" | "red" | "blue" | "none";
  className?: string;
  children: ReactNode;
}) {
  const edge =
    accent === "lime" ? "border-l-4 border-l-lime-400" :
    accent === "red"  ? "border-l-4 border-l-rose-400" :
    accent === "blue" ? "border-l-4 border-l-sky-400" :
                         "";
  return (
    <section className={`rounded-xl border border-border bg-background ${edge} ${className}`}>
      {children}
    </section>
  );
}

/**
 * Clickable time-chip toggles. Backed by ?period=week|month|quarter in
 * the URL — the page reads that param and filters accordingly.
 *
 *   <TimeToggle pathname="/ops/command" period="quarter" />
 *
 * Server component (no client state) — each chip is a Link.
 */
import Link from "next/link";

export type Period = "week" | "month" | "quarter";

const OPTIONS: Array<{ key: Period; label: string }> = [
  { key: "week",    label: "This Week" },
  { key: "month",   label: "This Month" },
  { key: "quarter", label: "This Quarter" },
];

export function TimeToggle({
  pathname,
  period = "quarter",
}: {
  pathname: string;
  period?: Period;
}) {
  return (
    <div className="inline-flex gap-1.5">
      {OPTIONS.map((o) => {
        const isActive = o.key === period;
        const href = o.key === "quarter" ? pathname : `${pathname}?period=${o.key}`;
        return (
          <Link
            key={o.key}
            href={href as never}
            className={
              "inline-flex items-center rounded-full px-3 py-1 text-xs border transition " +
              (isActive
                ? "bg-foreground text-background border-foreground font-semibold"
                : "bg-background text-foreground/70 border-border hover:bg-foreground/[0.04]")
            }
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export function parsePeriod(p: string | undefined): Period {
  return p === "week" || p === "month" ? p : "quarter";
}

/** Window in milliseconds for a Period, used to filter due dates. */
export function periodDays(p: Period): number {
  return p === "week" ? 7 : p === "month" ? 30 : 90;
}

/** Status pill, mirroring the Founder OS look. */
export function StatusPill({
  tone,
  children,
}: {
  tone: "on_track" | "off_track" | "behind" | "not_started" | "keep" | "ahead";
  children: ReactNode;
}) {
  const styles: Record<string, string> = {
    on_track:    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    off_track:   "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
    behind:      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    not_started: "bg-foreground/[0.05] text-foreground/60 border-border",
    keep:        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    ahead:       "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  };
  const labels: Record<string, string> = {
    on_track: "ON TRACK", off_track: "OFF TRACK", behind: "BEHIND",
    not_started: "NOT STARTED", keep: "KEEP", ahead: "AHEAD",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider border ${styles[tone]}`}
    >
      {children ?? labels[tone]}
    </span>
  );
}
