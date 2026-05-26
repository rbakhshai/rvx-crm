import Link from "next/link";
import type { FunnelStage } from "@/lib/dashboard-queries";

function fmtMoneyShort(cents: number): string {
  const n = cents / 100;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1_000).toFixed(0)}K`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

const STAGE_TONE: Record<FunnelStage["key"], { bar: string; ring: string; label: string }> = {
  leads:    { bar: "bg-blue-400",   ring: "ring-blue-200",   label: "text-blue-900" },
  talking:  { bar: "bg-amber-400",  ring: "ring-amber-200",  label: "text-amber-900" },
  offer:    { bar: "bg-fuchsia-500",ring: "ring-fuchsia-200",label: "text-fuchsia-900" },
  contract: { bar: "bg-emerald-500",ring: "ring-emerald-200",label: "text-emerald-900" },
  closed:   { bar: "bg-yellow-500", ring: "ring-yellow-200", label: "text-yellow-900" },
};

export function PipelineFunnel({
  stages,
  totalActiveValueCents,
  totalActiveCount,
  closedValueCents,
  closedCount,
}: {
  stages: FunnelStage[];
  totalActiveValueCents: number;
  totalActiveCount: number;
  closedValueCents: number;
  closedCount: number;
}) {
  // Funnel width: each stage's bar is proportional to its $ value vs the
  // largest stage. If everything is 0, we still show equal-width bars.
  const maxValueCents = Math.max(...stages.map((s) => s.valueCents), 1);

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-b from-foreground/[0.02] to-transparent p-6">
      {/* Hero — total active pipeline value */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-muted font-medium">
            Active pipeline value
          </div>
          <div className="mt-1 flex items-baseline gap-3 flex-wrap">
            <span className="text-4xl font-semibold tabular-nums">
              {fmtMoneyShort(totalActiveValueCents)}
            </span>
            <span className="text-sm text-muted">
              across {totalActiveCount} deal{totalActiveCount === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-widest text-muted font-medium">
            Closed-deal value
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums text-yellow-700">
            {fmtMoneyShort(closedValueCents)}
          </div>
          <div className="text-xs text-muted">
            {closedCount} acquired / network
          </div>
        </div>
      </div>

      {/* Funnel */}
      <div className="mt-6 space-y-3">
        {stages.map((s, i) => {
          const pct = (s.valueCents / maxValueCents) * 100;
          const conversion =
            i > 0 && stages[i - 1].count > 0
              ? Math.round((s.count / stages[i - 1].count) * 100)
              : null;
          const tone = STAGE_TONE[s.key];
          const href = `/deals?stage=${s.key}`;
          return (
            <div key={s.key}>
              {conversion !== null && (
                <div className="ml-2 mb-1 flex items-center gap-1.5 text-[10px] text-muted">
                  <span className="inline-block w-px h-3 bg-border" />
                  <span>{conversion}% advance to {s.label.toLowerCase()}</span>
                </div>
              )}
              <Link
                href={href as never}
                className="flex items-center gap-3 group rounded-md hover:bg-foreground/[0.02] -mx-1 px-1 py-0.5 transition"
                title={`Show ${s.count} ${s.label.toLowerCase()} deal${s.count === 1 ? "" : "s"}`}
              >
                <div className="w-28 shrink-0 text-right">
                  <div className="text-sm font-medium group-hover:text-primary transition">{s.label}</div>
                  <div className="text-[10px] text-muted">{s.description}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="relative h-9 rounded-md bg-foreground/[0.04] overflow-hidden ring-1 ring-transparent group-hover:ring-foreground/10 transition">
                    <div
                      className={`absolute inset-y-0 left-0 ${tone.bar} transition-all`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                    <div className="relative h-full flex items-center justify-between px-3 text-[12px] font-medium">
                      <span className={s.count > 0 ? "text-foreground" : "text-muted"}>
                        {s.count} deal{s.count === 1 ? "" : "s"}
                      </span>
                      <span className="tabular-nums">
                        {s.valueCents > 0 ? fmtMoneyShort(s.valueCents) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-foreground/30 group-hover:text-foreground/70 transition text-xs">→</span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
