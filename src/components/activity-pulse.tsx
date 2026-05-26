import Link from "next/link";
import type { ActivityEvent } from "@/lib/dashboard-queries";

function fmtRelative(d: Date): string {
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

const KIND_ACCENT: Record<ActivityEvent["kind"], string> = {
  note: "border-foreground/10",
  call_log: "border-amber-300/60",
  form_submission: "border-blue-300/60",
  new_deal: "border-emerald-300/60",
  dispo: "border-fuchsia-300/60",
};

export function ActivityPulse({ events }: { events: ActivityEvent[] }) {
  return (
    <section className="rounded-xl border border-border bg-background">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <span className="relative inline-flex">
              <span className="size-2 rounded-full bg-green-500" />
              <span className="absolute inset-0 size-2 rounded-full bg-green-500 animate-ping opacity-75" />
            </span>
            Live activity
          </h2>
          <p className="text-[11px] text-muted mt-0.5">The heartbeat of the business — refresh for fresh data</p>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted">{events.length} events</span>
      </header>

      {events.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted">
          No recent activity yet. Submit a lead or log a call to populate this feed.
        </div>
      ) : (
        <ol className="divide-y divide-border max-h-[480px] overflow-y-auto">
          {events.map((e) => {
            const inner = (
              <>
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 size-8 rounded-full bg-foreground/[0.04] border ${KIND_ACCENT[e.kind]} grid place-items-center text-base`}>
                    {e.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      <time className="text-[11px] text-muted shrink-0 tabular-nums">{fmtRelative(e.at)}</time>
                    </div>
                    {e.detail && (
                      <p className="text-[12px] text-foreground/70 mt-0.5 truncate">{e.detail}</p>
                    )}
                    {e.authorName && (
                      <p className="text-[11px] text-muted mt-0.5">by {e.authorName}</p>
                    )}
                  </div>
                </div>
              </>
            );
            return (
              <li key={e.id}>
                {e.href ? (
                  <Link
                    href={e.href as never}
                    className="block px-4 py-3 hover:bg-foreground/[0.02] transition"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="px-4 py-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
