/**
 * Portal kit — the shared visual language for every role's home page.
 *
 * One product, many cockpits: each role dashboard composes these pieces
 * with its own accent color so the app feels cohesive while every seat
 * gets a page that's unmistakably theirs.
 */
import Link from "next/link";
import { ACCENTS, type AccentName } from "@/lib/role-portal";
import { cn } from "@/lib/cn";

/** The hero band at the top of every role portal. */
export function PortalHero({
  greeting,
  date,
  roleLabel,
  title,
  tagline,
  icon,
  accent,
  children,
}: {
  greeting: React.ReactNode;
  date: string;
  roleLabel: string;
  title: string;
  tagline: string;
  icon: string;
  accent: AccentName;
  /** Optional right-aligned content (e.g. a primary CTA). */
  children?: React.ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 sm:p-6 mb-5",
        a.border,
        a.heroGradient,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", a.chip)}>
              <span className="text-sm leading-none">{icon}</span>
              {roleLabel}
            </span>
            <span className="text-[11px] text-muted">{date}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{greeting}</h1>
          <p className={cn("text-sm font-medium mt-1", a.text)}>{title}</p>
          <p className="text-[13px] text-muted mt-0.5 max-w-xl">{tagline}</p>
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </section>
  );
}

/** A row of headline stats — the role's command bar. */
export function StatStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-5">
      {children}
    </div>
  );
}

/** One big number tile, accent-colored. Optionally a link. */
export function PortalStat({
  value,
  label,
  hint,
  accent,
  href,
  emphasize,
}: {
  value: React.ReactNode;
  label: string;
  hint?: string;
  accent: AccentName;
  href?: string;
  /** Lifts the tile with the accent background + ring (use for the hero metric). */
  emphasize?: boolean;
}) {
  const a = ACCENTS[accent];
  const inner = (
    <>
      <div className={cn("text-2xl sm:text-[1.7rem] font-bold tabular-nums leading-none", emphasize ? a.statText : "text-foreground")}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1.5 leading-tight">{label}</div>
      {hint && <div className="text-[11px] text-muted mt-0.5 leading-tight">{hint}</div>}
    </>
  );
  const base = cn(
    "rounded-xl border px-3.5 py-3 transition",
    emphasize ? cn(a.softBg, a.border, "ring-1", a.ring) : "border-border bg-background",
    href && "hover:bg-foreground/[0.03] hover:-translate-y-px",
  );
  return href ? (
    <Link href={href as never} className={base}>{inner}</Link>
  ) : (
    <div className={base}>{inner}</div>
  );
}

/** A labeled section header with the role accent. */
export function PortalSection({
  title,
  hint,
  accent,
  action,
  children,
  className,
}: {
  title: string;
  hint?: string;
  accent?: AccentName;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-5", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <div>
          <h2 className={cn(
            "text-[11px] uppercase tracking-widest font-semibold",
            accent ? ACCENTS[accent].text : "text-muted",
          )}>
            {title}
          </h2>
          {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** A card shell for a list/queue inside a section. */
export function PortalCard({
  children,
  className,
  accent,
  lift,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: AccentName;
  /** Add an accent ring to draw the eye. */
  lift?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-background p-4",
      lift && accent && cn("ring-1", ACCENTS[accent].ring),
      className,
    )}>
      {children}
    </div>
  );
}

/** Empty-state line for a queue. */
export function PortalEmpty({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted text-center py-6">{children}</div>;
}

/** A queue row: park/deal name + meta + trailing badge, linking out. */
export function QueueRow({
  href,
  primary,
  secondary,
  trailing,
}: {
  href: string;
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href as never}
      className="flex items-center justify-between gap-3 py-2.5 px-1 -mx-1 rounded-lg hover:bg-foreground/[0.03] transition"
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{primary}</div>
        {secondary && <div className="text-[11px] text-muted truncate mt-0.5">{secondary}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </Link>
  );
}

/** A primary CTA button styled in the role accent. */
export function PortalCta({ href, accent, children }: { href: string; accent: AccentName; children: React.ReactNode }) {
  const a = ACCENTS[accent];
  return (
    <Link
      href={href as never}
      className={cn("inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition hover:opacity-90", a.chip)}
    >
      {children}
    </Link>
  );
}

/** Deadline badge — how many days until/since a date. */
export function DeadlineBadge({ date, soonDays = 7 }: { date: Date | string | null; soonDays?: number }) {
  if (!date) return <span className="shrink-0 inline-flex items-center rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[10px] font-semibold text-muted">no date</span>;
  const d = typeof date === "string" ? new Date(date) : date;
  const diffDays = Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  let tone: string;
  let label: string;
  if (diffDays < 0) {
    tone = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30";
    label = `${Math.abs(diffDays)}d overdue`;
  } else if (diffDays === 0) {
    tone = "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30";
    label = "today";
  } else if (diffDays <= soonDays) {
    tone = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30";
    label = `${diffDays}d left`;
  } else {
    tone = "bg-foreground/[0.05] text-muted border-transparent";
    label = `${diffDays}d`;
  }
  return <span className={cn("shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", tone)}>{label}</span>;
}
