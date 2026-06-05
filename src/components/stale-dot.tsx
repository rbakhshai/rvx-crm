/**
 * Tiny colored dot that flags a record's freshness.
 *   green  — touched in last 3 days
 *   amber  — 7–13 days since last touch
 *   red    — 14+ days
 *   gray   — never touched
 * Default zone (3–6 days) shows no dot, so the eye is only drawn to outliers.
 */
import { cn } from "@/lib/cn";

const DAY_MS = 24 * 60 * 60 * 1000;

type Tone = "fresh" | "ok" | "warn" | "stale" | "never";

function tone(since: Date | null | undefined): Tone {
  if (!since) return "never";
  const days = (Date.now() - new Date(since).getTime()) / DAY_MS;
  if (days < 3) return "fresh";
  if (days < 7) return "ok";
  if (days < 14) return "warn";
  return "stale";
}

const dotColor: Record<Tone, string> = {
  fresh: "bg-emerald-500",
  ok: "bg-foreground/20",
  warn: "bg-amber-500",
  stale: "bg-rose-500",
  never: "bg-foreground/15 ring-1 ring-foreground/20",
};

function relative(d: Date | null | undefined): string {
  if (!d) return "never touched";
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.floor(ms / DAY_MS);
  if (days < 1) return "touched today";
  if (days === 1) return "touched yesterday";
  if (days < 7) return `touched ${days}d ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString();
}

export function StaleDot({
  since,
  className,
}: {
  since: Date | null | undefined;
  className?: string;
}) {
  const t = tone(since);
  return (
    <span
      className={cn("inline-block size-2 rounded-full shrink-0", dotColor[t], className)}
      title={relative(since)}
      aria-label={relative(since)}
    />
  );
}

/**
 * Dot + relative text. Used where there's room for the label.
 */
export function StaleLabel({ since }: { since: Date | null | undefined }) {
  const t = tone(since);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn("inline-block size-2 rounded-full", dotColor[t])} />
      <span className={cn(t === "stale" && "text-rose-700", t === "warn" && "text-amber-700", t === "never" && "text-muted")}>
        {relative(since)}
      </span>
    </span>
  );
}
