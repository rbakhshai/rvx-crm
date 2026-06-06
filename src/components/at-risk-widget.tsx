import Link from "next/link";
import { Badge } from "@/components/badge";
import { describeRisk, type Risk } from "@/lib/at-risk";

/**
 * "Needs your eyes" — deals auto-flagged as going cold, LOI stalled,
 * stuck in stage, or DD behind schedule. One-click into the deal drawer.
 */
export function AtRiskWidget({ risks }: { risks: Risk[] }) {
  return (
    <section className="rounded-xl border border-border bg-background p-5">
      <header className="flex items-baseline justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold inline-flex items-center gap-1.5">
            <span className="text-base">⚠️</span> Needs your eyes
          </h3>
          {risks.length > 0 && (
            <p className="text-[11px] text-muted mt-0.5">Auto-flagged deals going cold or stalled</p>
          )}
        </div>
        {risks.length > 0 && <span className="text-xs text-muted tabular-nums">{risks.length}</span>}
      </header>

      {risks.length === 0 ? (
        <p className="text-xs text-muted text-center py-4">Nothing on fire. Your pipeline is healthy 🎯</p>
      ) : (
        <ul className="divide-y divide-border -mx-1">
          {risks.map((r) => {
            const { icon, label } = describeRisk(r.kind);
            const priorityTone = r.priority === "hot" ? "danger" : r.priority === "warm" ? "warning" : null;
            return (
              <li key={r.dealId}>
                <Link
                  href={r.href as never}
                  className="flex items-start gap-3 py-2.5 px-1 rounded hover:bg-foreground/[0.03] transition"
                >
                  <span className="text-base shrink-0 mt-0.5" aria-hidden>{icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {r.title}
                      {priorityTone && (
                        <Badge tone={priorityTone}>{r.priority}</Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted truncate">
                      {label}
                      {r.loc && <span> · {r.loc}</span>}
                    </div>
                    <div className="text-[11px] text-foreground/70 mt-0.5">{r.reason}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
