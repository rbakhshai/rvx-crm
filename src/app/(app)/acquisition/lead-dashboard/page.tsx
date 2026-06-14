import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "@/app/(app)/page-shell";
import {
  getLeaderboard,
  periodLabel,
  type LeaderboardPeriod,
} from "@/lib/bd-leaderboard";
import { getBdTeamPulse } from "@/lib/bd-team";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/cn";
import { fmtRelative } from "@/lib/date-format";

function isPeriod(v: string | undefined): v is LeaderboardPeriod {
  return v === "week" || v === "month" || v === "all";
}

const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };
const LEVEL_LABEL: Record<string, string> = {
  bd_level_1: "L1",
  bd_level_2: "L2",
  bd_level_3: "L3",
};

export default async function AcquisitionLeadDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_mission_control"))) notFound();

  const params = await searchParams;
  const period: LeaderboardPeriod = isPeriod(params.p) ? params.p : "week";

  const [rows, bdTeam] = await Promise.all([
    getLeaderboard(period),
    getBdTeamPulse().catch(() => []),
  ]);

  const goal = bdTeam[0]?.goal ?? 40;
  const teamCallsToday = bdTeam.reduce((acc, r) => acc + r.callsToday, 0);

  return (
    <PageShell title="Acquisition Lead Dashboard" width="wide">
      {/* Leaderboard Section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold mb-4">Team Leaderboard</h2>

        {/* Period toggle */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="inline-flex rounded-full border border-border bg-background p-1 text-xs">
            {(["week", "month", "all"] as const).map((p) => (
              <Link
                key={p}
                href={p === "week" ? "/acquisition/lead-dashboard" : `/acquisition/lead-dashboard?p=${p}`}
                className={cn(
                  "rounded-full px-3.5 py-1 transition",
                  period === p
                    ? "bg-foreground text-background font-semibold"
                    : "text-foreground/70 hover:text-foreground",
                )}
              >
                {periodLabel(p)}
              </Link>
            ))}
          </div>
          {rows.length > 0 && (
            <div className="text-[11px] text-muted">
              <span>{teamCallsToday} team dials today · daily goal {goal}/BD</span>
            </div>
          )}
        </div>

        {/* Leaderboard table */}
        <div className="rounded-xl border border-border bg-background overflow-hidden">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted">
              No activity {periodLabel(period).toLowerCase() === "all time" ? "yet" : `in the ${periodLabel(period).toLowerCase()}`}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-foreground/[0.02]">
                  <tr>
                    <Th>#</Th>
                    <Th>BD</Th>
                    <Th right>Calls</Th>
                    <Th right>Connects</Th>
                    <Th right>Qualified</Th>
                    <Th right>LOIs</Th>
                    <Th right>PSAs</Th>
                    <Th right>Points</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.userId} className="border-t border-border hover:bg-foreground/[0.02] transition">
                      <Td>{MEDAL[i] || `#${i + 1}`}</Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Avatar name={r.name} id={r.userId} size="sm" />
                          <span>{r.name}</span>
                        </div>
                      </Td>
                      <Td right>{r.calls}</Td>
                      <Td right>{r.connects}</Td>
                      <Td right>{r.qualified}</Td>
                      <Td right>{r.lois}</Td>
                      <Td right>{r.psas}</Td>
                      <Td right className="font-semibold">{r.points}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bird Dog Capacity Section */}
      <div>
        <h2 className="text-lg font-bold mb-4">Bird Dog Capacity</h2>

        {bdTeam.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center text-sm text-muted">
            No bird-dog accounts yet.
          </div>
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {bdTeam.map((r) => {
                  const wow = r.callsThisWeek - r.callsPriorWeek;
                  const pct = Math.min(100, Math.round((r.callsToday / r.goal) * 100));
                  return (
                    <tr key={r.userId} className="border-t border-border hover:bg-foreground/[0.02] transition">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={r.name} id={r.userId} size="sm" />
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
                          <span
                            className={cn(
                              "ml-1.5 text-[10px] tabular-nums",
                              wow > 0 ? "text-emerald-700 dark:text-emerald-400" : wow < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted",
                            )}
                          >
                            {wow > 0 ? "▲" : wow < 0 ? "▼" : "—"}
                            {Math.abs(wow)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-medium">{r.weekPoints}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.overdueFollowUps > 0 ? r.overdueFollowUps : "—"}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{r.skips30d > 0 ? r.skips30d : "—"}</td>
                      <td className="px-3 py-3 text-muted text-sm">
                        {r.lastActivityAt ? fmtRelative(r.lastActivityAt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("px-3 py-2 text-[10px] font-semibold text-muted uppercase tracking-wide", right && "text-right")}>
      {children}
    </th>
  );
}

function Td({ children, right, className }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return <td className={cn("px-3 py-2.5", right && "text-right", className)}>{children}</td>;
}
