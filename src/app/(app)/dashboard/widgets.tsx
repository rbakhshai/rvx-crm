import Link from "next/link";
import { Badge } from "@/components/badge";
import { cn } from "@/lib/cn";

const priorityTone: Record<string, "danger" | "warning" | "info" | "default"> = {
  hot: "danger",
  warm: "warning",
  cold: "info",
};

// ---- shared widget shell ----

export function Widget({
  title,
  hint,
  count,
  href,
  children,
  className,
}: {
  title: string;
  hint?: string;
  count?: number | string;
  href?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-background p-5", className)}>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
        </div>
        {count !== undefined && (
          href ? (
            <Link href={href as never} className="text-xs text-muted hover:text-foreground tabular-nums">
              {count} →
            </Link>
          ) : (
            <span className="text-xs text-muted tabular-nums">{count}</span>
          )
        )}
      </div>
      {children}
    </section>
  );
}

// ---- small reusable rows ----

export function ListLink({
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
    <Link href={href as never} className="flex items-center justify-between gap-3 py-2 px-1 -mx-1 rounded hover:bg-foreground/[0.03]">
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate">{primary}</div>
        {secondary && <div className="text-[11px] text-muted truncate">{secondary}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </Link>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted text-center py-4">{children}</div>;
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted font-medium">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <div className="text-[11px] text-muted">{hint}</div>}
      </div>
    </div>
  );
}

export function PriorityBadge({ priority }: { priority: string | null }) {
  if (!priority) return null;
  return <Badge tone={priorityTone[priority] ?? "default"}>{priority}</Badge>;
}

function relativeDays(d: Date | null): string {
  if (!d) return "never";
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function StaleBadge({ since }: { since: Date | null }) {
  const days = since ? Math.floor((Date.now() - since.getTime()) / (24 * 60 * 60 * 1000)) : null;
  if (since == null) return <Badge tone="danger">never touched</Badge>;
  if (days! >= 14) return <Badge tone="danger">{days}d</Badge>;
  if (days! >= 7) return <Badge tone="warning">{days}d</Badge>;
  return <Badge tone="muted">{relativeDays(since)}</Badge>;
}

export function nameOf(first: string | null, last: string | null): string {
  return [first, last].filter(Boolean).join(" ") || "(unnamed)";
}

export function money(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString()}`;
}

export function moneyShort(v: number | string | null | undefined): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n.toLocaleString()}`;
}
