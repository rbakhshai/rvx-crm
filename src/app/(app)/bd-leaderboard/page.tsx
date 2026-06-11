/**
 * /bd-leaderboard — Kevin's gamification dashboard.
 *
 * Period filter (week / month / all). Sortable by points (default).
 * Highlights the currently-signed-in user's row.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../page-shell";
import {
  getLeaderboard,
  periodLabel,
  POINT_RULES,
  type LeaderboardPeriod,
  type LeaderboardRow,
} from "@/lib/bd-leaderboard";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/cn";

function isPeriod(v: string | undefined): v is LeaderboardPeriod {
  return v === "week" || v === "month" || v === "all";
}

const MEDAL: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

export default async function BdLeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_leaderboard"))) notFound();

  const params = await searchParams;
  const period: LeaderboardPeriod = isPeriod(params.p) ? params.p : "week";

  const rows = await getLeaderboard(period);
  const meRow = rows.find((r) => r.userId === session.user.id) ?? null;
  const meRank = meRow ? rows.findIndex((r) => r.userId === session.user.id) + 1 : null;

  return (
    <PageShell
      title="Leaderboard"
      subtitle={`Bird-dog team only · Calls, connects, qualifieds, LOIs, PSAs — ${periodLabel(period).toLowerCase()}.`}
      width="default"
    >
      {/* Period toggle */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="inline-flex rounded-full border border-border bg-background p-1 text-xs">
          {(["week", "month", "all"] as const).map((p) => (
            <Link
              key={p}
              href={p === "week" ? "/bd-leaderboard" : `/bd-leaderboard?p=${p}`}
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

      {/* Leaderboard table */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-12 text-center text-sm text-muted">
          No activity {periodLabel(period).toLowerCase() === "all time" ? "yet" : `in the ${periodLabel(period).toLowerCase()}`}. Once the team
          starts working leads at <Link href="/bd-triage" className="text-foreground hover:underline">/bd-triage</Link>, scores show up here.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
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
                <Row key={r.userId} row={r} rank={i + 1} isMe={r.userId === session.user.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Point rules legend */}
      <div className="mt-6 rounded-xl border border-border bg-foreground/[0.02] p-4">
        <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2">
          Scoring
        </div>
        <ul className="text-xs text-foreground/80 space-y-1 leading-relaxed">
          <li>Each call → <strong>{POINT_RULES.call} pt</strong></li>
          <li>Each owner-connect → <strong>{POINT_RULES.connect} pts</strong> (5× volume bonus)</li>
          <li>Each qualified lead → <strong>{POINT_RULES.qualified} pts</strong></li>
          <li>Each LOI sent (downstream credit) → <strong>{POINT_RULES.loi} pts</strong></li>
          <li>Each PSA signed (downstream credit) → <strong>{POINT_RULES.psa} pts</strong></li>
        </ul>
        <p className="text-[11px] text-muted mt-3">
          LOI + PSA credit flows to whoever fired the &quot;qualified&quot; disposition that created the deal — the BD who first
          got the seller into closing.
        </p>
      </div>
    </PageShell>
  );
}

function Row({ row, rank, isMe }: { row: LeaderboardRow; rank: number; isMe: boolean }) {
  const medal = MEDAL[rank - 1];
  return (
    <tr className={cn("border-t border-border", isMe && "bg-lime-50/40 dark:bg-lime-500/[0.05]")}>
      <td className="px-3 py-3 tabular-nums">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn("font-semibold", rank <= 3 ? "text-foreground" : "text-muted")}>
            #{rank}
          </span>
          {medal && <span className="text-base">{medal}</span>}
        </span>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={row.name} id={row.userId} size="md" />
          <div>
            <div className="font-semibold text-sm">{row.name}</div>
            {isMe && <div className="text-[10px] uppercase tracking-widest text-lime-700 dark:text-lime-400 font-semibold">You</div>}
          </div>
        </div>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{row.calls}</td>
      <td className="px-3 py-3 text-right tabular-nums">
        {row.connects}
        {row.calls > 0 && (
          <span className="text-[10px] text-muted ml-1.5">
            {Math.round(row.connectRate * 100)}%
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">
        {row.qualified}
        {row.connects > 0 && (
          <span className="text-[10px] text-muted ml-1.5">
            {Math.round(row.qualifyRate * 100)}%
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{row.lois}</td>
      <td className="px-3 py-3 text-right tabular-nums">{row.psas}</td>
      <td className="px-3 py-3 text-right tabular-nums font-bold">{row.points}</td>
    </tr>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[11px] uppercase tracking-widest text-muted font-semibold whitespace-nowrap",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}
