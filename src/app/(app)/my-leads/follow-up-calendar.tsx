/**
 * Month-grid calendar of scheduled follow-ups — the visual answer to
 * "when are my callbacks?" (feedback #16000, Zach: an RVX-only
 * calendar separate from his personal one).
 *
 * Server component, zero client JS: month nav is plain links, cells
 * are read-only chips. Overdue days bleed red, today is ringed,
 * future scheduled days are blue. Click-through actions stay on the
 * list view — this is the at-a-glance layer.
 */
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { MyLeadRow } from "@/lib/my-leads";

export function FollowUpCalendar({
  rows,
  month, // "YYYY-MM"
}: {
  rows: MyLeadRow[];
  month: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const monthLabel = first.toLocaleString(undefined, { month: "long", year: "numeric" });

  // Grid bounds: Sunday on/before the 1st → Saturday on/after month end.
  const gridStart = new Date(first);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  const last = new Date(y, m, 0);
  const gridEnd = new Date(last);
  gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

  // Bucket follow-ups by local YYYY-MM-DD.
  const byDay = new Map<string, MyLeadRow[]>();
  for (const r of rows) {
    if (!r.nextFollowUpAt) continue;
    const d = r.nextFollowUpAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  const todayKey = (() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  })();

  // Prev / next month params.
  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;

  // Build day cells.
  const cells: Date[] = [];
  for (let d = new Date(gridStart); d <= gridEnd; d.setDate(d.getDate() + 1)) {
    cells.push(new Date(d));
  }

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <Link
          href={`/my-leads?view=calendar&m=${prev}`}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-foreground/[0.04] transition"
        >
          ← {prevLabel(prev)}
        </Link>
        <h2 className="text-sm font-bold">{monthLabel}</h2>
        <Link
          href={`/my-leads?view=calendar&m=${next}`}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-xs hover:bg-foreground/[0.04] transition"
        >
          {prevLabel(next)} →
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-border bg-foreground/[0.02]">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted font-semibold text-center">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const inMonth = d.getMonth() === m - 1;
            const isToday = key === todayKey;
            const isPast = key < todayKey;
            const dayRows = byDay.get(key) ?? [];
            const shown = dayRows.slice(0, 3);
            const extra = dayRows.length - shown.length;

            return (
              <div
                key={i}
                className={cn(
                  "min-h-24 border-b border-r border-border/60 p-1.5 align-top",
                  !inMonth && "bg-foreground/[0.015]",
                  isToday && "ring-2 ring-inset ring-amber-400",
                )}
              >
                <div className={cn(
                  "text-[11px] tabular-nums mb-1",
                  inMonth ? "text-foreground/70" : "text-muted/50",
                  isToday && "font-bold text-amber-700 dark:text-amber-400",
                )}>
                  {d.getDate()}
                </div>
                <div className="space-y-1">
                  {shown.map((r) => (
                    <div
                      key={r.leadId}
                      title={`${r.parkName ?? "(unnamed)"}${r.ownerName ? " · " + r.ownerName : ""}`}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-[10px] font-medium border",
                        isPast
                          ? "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/30"
                          : isToday
                            ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/30"
                            : "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/30",
                      )}
                    >
                      {r.parkName ?? r.ownerName ?? "(unnamed)"}
                    </div>
                  ))}
                  {extra > 0 && (
                    <div className="text-[10px] text-muted pl-1">+{extra} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        <span className="text-rose-700 dark:text-rose-400">Red</span> = overdue ·{" "}
        <span className="text-amber-700 dark:text-amber-400">amber</span> = today ·{" "}
        <span className="text-blue-700 dark:text-blue-400">blue</span> = scheduled. Switch to the
        List view to reschedule or clear.
      </p>
    </div>
  );
}

function prevLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: "short" });
}
