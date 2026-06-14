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
import { computeBadges, type Badge } from "@/lib/bd-badges";
import { getBdCareerStats, getBdDayStats } from "@/lib/bd-stats";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/cn";

function isPeriod(v: string | undefined): v is LeaderboardPeriod {
  return v === "week" || v === "month" || v === "all";
}

const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

export default async function AcquisitionDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_mission_control"))) notFound();

  const params = await searchParams;
  const period: LeaderboardPeriod = isPeriod(params.p) ? params.p : "week";

  const rows = await getLeaderboard(period);
  const meRow = rows.find((r) => r.userId === session.user.id) ?? null;
  const meRank = meRow ? rows.findIndex((r) => r.userId === session.user.id) + 1 : null;

  // Load badges for current user
  let myBadges: Badge[] = [];
  if (session.user.id) {
    try {
      const [career, day] = await Promise.all([
        getBdCareerStats(session.user.id),
        getBdDayStats(session.user.id),
      ]);
      myBadges = computeBadges(career, day);
    } catch {
      // Silently continue if stats unavailable
    }
  }

  return (
    <PageShell title="Acquisition Dashboard" width="wide">
      {/* Period toggle */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="inline-flex rounded-full border border-border bg-background p-1 text-xs">
          {(["week", "month", "all"] as const).map((p) => (
            <Link
              key={p}
              href={p === "week" ? "/acquisition/dashboard" : `/acquisition/dashboard?p=${p}`}
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
        {meRow && meRank != null && (
          <div className="text-[11px] text-muted">
            You: <span className="text-foreground font-medium">#{meRank}</span>
            {" · "}<span className="tabular-nums">{meRow.points}</span> pts
            {" · "}<span className="tabular-nums">{meRow.calls}</span> calls
          </div>
        )}
      </div>

      {/* My Badges */}
      {myBadges.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-background p-4">
          <h2 className="text-sm font-bold mb-3">Your badges</h2>
          <div className="flex flex-wrap gap-3">
            {myBadges.map((badge) => (
              <div
                key={badge.key}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border",
                  badge.earned
                    ? "border-foreground/20 bg-foreground/[0.03]"
                    : "border-foreground/10 bg-foreground/[0.02] opacity-50"
                )}
              >
                <div className="text-2xl">{badge.emoji}</div>
                <div className="text-[10px] font-medium text-center leading-tight">{badge.label}</div>
                {!badge.earned && (
                  <div className="text-[8px] text-muted text-center leading-tight">{badge.hint}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted">
            No activity {periodLabel(period).toLowerCase() === "all time" ? "yet" : `in the ${periodLabel(period).toLowerCase()}`}. Start
            working leads to appear on the leaderboard.
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
                  <tr
                    key={r.userId}
                    className={cn(
                      "border-t border-border transition",
                      r.userId === session.user.id
                        ? "bg-primary/[0.08] hover:bg-primary/10"
                        : "hover:bg-foreground/[0.02]",
                    )}
                  >
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
