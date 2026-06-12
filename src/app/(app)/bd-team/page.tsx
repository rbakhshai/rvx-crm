/**
 * /bd-team — leadership-only pulse of the bird-dog roster.
 *
 * Top: "Needs attention" strip (not onboarded / gone quiet / overdue
 * backlog) so Erica's eye lands on problems first. Below: the full
 * roster with today's dials vs goal, streak, week trend, points,
 * overdue follow-ups, last activity, and onboarding status.
 *
 * Numbers come from lib/bd-team (same math as each BD's own hub, so
 * the manager and the BD always agree on the score).
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../page-shell";
import { getBdTeamPulse, type BdTeamRow } from "@/lib/bd-team";
import { Avatar } from "@/components/avatar";
import { fmtRelative, fmtDate } from "@/lib/date-format";
import { cn } from "@/lib/cn";

const LEVEL_LABEL: Record<string, string> = {
  bd_level_1: "L1",
  bd_level_2: "L2",
  bd_level_3: "L3",
};

const FLAG_META: Record<BdTeamRow["flags"][number], { label: string; tone: string }> = {
  not_onboarded: {
    label: "Hasn't finished onboarding",
    tone: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/40",
  },
  quiet: {
    label: "No dials in 48h",
    tone: "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-500/10 dark:text-rose-200 dark:border-rose-500/40",
  },
  overdue_backlog: {
    label: "Overdue follow-up backlog",
    tone: "bg-violet-50 text-violet-800 border-violet-300 dark:bg-violet-500/10 dark:text-violet-200 dark:border-violet-500/40",
  },
};

export default async function BdTeamPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_bd_team"))) {
    return (
      <PageShell title="BD Team" subtitle="You don't have permission to view the team pulse.">
        <p className="text-sm text-muted">Ask an admin to grant you the &quot;See BD Team&quot; capability.</p>
      </PageShell>
    );
  }

  const rows = await getBdTeamPulse();
  const flagged = rows.filter((r) => r.flags.length > 0);
  const goal = rows[0]?.goal ?? 40;
  const teamCallsToday = rows.reduce((acc, r) => acc + r.callsToday, 0);

  return (
    <PageShell
      title="BD Team"
      subtitle={
        rows.length === 0
          ? "The bird-dog roster, live."
          : `${rows.length} bird dog${rows.length === 1 ? "" : "s"} · ${teamCallsToday} team dials today · daily goal ${goal}/BD.`
      }
      action={
        <Link href="/bd-leaderboard" className="text-xs text-muted hover:text-foreground">
          Leaderboard →
        </Link>
      }
      width="wide"
    >
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center text-sm text-muted">
          No bird-dog accounts yet. They&apos;ll appear here the moment you create them in{" "}
          <Link href="/settings/users" className="text-foreground hover:underline">Team &amp; roles</Link>
          {" "}— with onboarding status, dials, and streaks tracked from day one.
        </div>
      ) : (
        <>
          {/* Needs attention */}
          {flagged.length > 0 && (
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="inline-block size-2 rounded-full bg-rose-500" />
                <h2 className="text-sm font-bold">Needs attention</h2>
                <span className="text-xs text-muted tabular-nums">· {flagged.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {flagged.map((r) => (
                  <div key={r.userId} className="rounded-xl border border-border bg-background p-3.5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar name={r.name} id={r.userId} size="md" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{r.name}</div>
                        <div className="text-[10px] text-muted uppercase tracking-widest">
                          BD {LEVEL_LABEL[r.role] ?? ""} · {r.lastActivityAt ? `active ${fmtRelative(r.lastActivityAt)}` : "no activity yet"}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.flags.map((f) => (
                        <span
                          key={f}
                          className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold", FLAG_META[f].tone)}
                        >
                          {FLAG_META[f].label}
                          {f === "overdue_backlog" && ` (${r.overdueFollowUps})`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Roster */}
          <div className="overflow-x-auto rounded-xl border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-foreground/[0.02]">
                <tr>
                  <Th>BD</Th>
                  <Th right>Today</Th>
                  <Th right>Streak</Th>
                  <Th right>Week</Th>
                  <Th right>Points</Th>
                  <Th right>Overdue</Th>
                  <Th right>Skips 30d</Th>
                  <Th>Last active</Th>
                  <Th>Onboarding</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const wow = r.callsThisWeek - r.callsPriorWeek;
                  const pct = Math.min(100, Math.round((r.callsToday / r.goal) * 100));
                  return (
                    <tr key={r.userId} className="border-t border-border hover:bg-foreground/[0.02] transition">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} id={r.userId} size="md" />
                          <div>
                            <div className="font-semibold">{r.name}</div>
                            <div className="text-[10px] text-muted uppercase tracking-widest">BD {LEVEL_LABEL[r.role] ?? ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-foreground/[0.06] overflow-hidden">
                            <div
                              className={cn("h-full", pct >= 100 ? "bg-emerald-500" : "bg-lime-400")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-sm font-medium w-14 text-right">
                            {r.callsToday}/{r.goal}
                          </span>
                        </div>
                        {r.connectsToday > 0 && (
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                            {r.connectsToday} connect{r.connectsToday === 1 ? "" : "s"}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.streak > 0 ? <span>🔥 {r.streak}</span> : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="tabular-nums">{r.callsThisWeek}</span>
                        {(r.callsThisWeek > 0 || r.callsPriorWeek > 0) && (
                          <span className={cn(
                            "ml-1.5 text-[10px] tabular-nums",
                            wow > 0 ? "text-emerald-700 dark:text-emerald-400" : wow < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted",
                          )}>
                            {wow > 0 ? "▲" : wow < 0 ? "▼" : "—"}{Math.abs(wow)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.weekPoints}
                        {r.weekRank != null && <span className="text-[10px] text-muted ml-1">#{r.weekRank}</span>}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.overdueFollowUps > 0 ? (
                          <span className={cn(r.overdueFollowUps >= 5 && "text-rose-700 dark:text-rose-400 font-semibold")}>
                            {r.overdueFollowUps}
                          </span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {r.skips30d > 0 ? (
                          <span
                            className={cn(r.skips30d >= 10 && "text-amber-700 dark:text-amber-400 font-semibold")}
                            title={r.recentSkipReasons.length > 0 ? `Recent reasons:\n• ${r.recentSkipReasons.join("\n• ")}` : undefined}
                          >
                            {r.skips30d}
                          </span>
                        ) : (
                          <span className="text-muted">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-foreground/75">
                        {r.lastActivityAt ? fmtRelative(r.lastActivityAt) : <span className="text-muted">never</span>}
                      </td>
                      <td className="px-3 py-3">
                        {r.acksAt ? (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold" title={`Expectations acknowledged ${fmtDate(r.acksAt)}`}>
                            ✓ {fmtDate(r.acksAt)}
                          </span>
                        ) : r.onboardedAt ? (
                          <span className="inline-flex items-center rounded-full border border-border bg-foreground/[0.04] px-2 py-0.5 text-[10px] font-semibold text-foreground/70" title="Onboarded before the acknowledgment checklist existed">
                            ✓ legacy
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200 px-2 py-0.5 text-[10px] font-semibold">
                            ⏳ pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageShell>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn(
      "px-3 py-2.5 text-[11px] uppercase tracking-widest text-muted font-semibold whitespace-nowrap",
      right ? "text-right" : "text-left",
    )}>
      {children}
    </th>
  );
}
