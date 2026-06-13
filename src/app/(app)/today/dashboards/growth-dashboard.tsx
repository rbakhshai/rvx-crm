/**
 * Growth portal (acquisitions_manager / Sales & Marketing — Erica).
 *
 * Her engine is the bird-dog team and the lead flow it produces. This
 * page surfaces: today's lead flow, who on the team needs attention,
 * the recruiting queue, and this week's board — everything she manages.
 */
import Link from "next/link";
import { getMissionTiles } from "@/lib/mission-control";
import { getBdTeamPulse, getBdApplicationQueue } from "@/lib/bd-team";
import { getLeaderboard } from "@/lib/bd-leaderboard";
import { fmtDateWithWeekday, fmtRelative } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/cn";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty, QueueRow, PortalCta } from "../portal-kit";
import { PortalFooter } from "./portal-common";

const ACCENT = "blue" as const;

const FLAG_META: Record<string, { label: string; tone: string }> = {
  not_onboarded:      { label: "Not onboarded", tone: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300" },
  quiet:              { label: "Gone quiet",    tone: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  overdue_backlog:    { label: "Overdue backlog", tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  submission_drought: { label: "No subs 21d",   tone: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
  ready_l2:           { label: "Ready → L2",    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  ready_l3:           { label: "Ready → L3",    tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
};

export async function GrowthDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [tiles, team, apps, board] = await Promise.all([
    getMissionTiles().catch(() => null),
    getBdTeamPulse().catch(() => []),
    getBdApplicationQueue().catch(() => []),
    getLeaderboard("week").catch(() => []),
  ]);

  const flagged = team.filter((t) => t.flags.length > 0);
  const activeToday = team.filter((t) => t.callsToday > 0).length;
  const wow = tiles ? tiles.leadsWeek - tiles.leadsLastWeek : 0;

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Sales & Marketing"
        title="Growth Command"
        tagline="Your bird-dog engine, lead flow, and recruiting funnel."
        icon="📈"
        accent={ACCENT}
      >
        <PortalCta href="/bd-team" accent={ACCENT}>Open BD Team →</PortalCta>
      </PortalHero>

      {tiles && (
        <StatStrip>
          <PortalStat accent={ACCENT} emphasize value={tiles.leadsToday} label="Leads today" hint="qualified subs" />
          <PortalStat accent={ACCENT} value={tiles.leadsWeek} label="Leads · 7d"
            hint={wow === 0 ? "flat vs last wk" : `${wow > 0 ? "▲" : "▼"} ${Math.abs(wow)} vs last wk`} />
          <PortalStat accent={ACCENT} value={tiles.dialsToday} label="Dials today" />
          <PortalStat accent={ACCENT} value={`${activeToday}/${team.length}`} label="BDs dialing today" />
          <PortalStat accent={ACCENT} value={tiles.bdAppsPending} label="Applications" href="/bd-team" />
          <PortalStat accent={ACCENT} value={flagged.length} label="Need attention" hint="flagged BDs" />
        </StatStrip>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <PortalSection title="Team needs attention" accent={ACCENT} hint="Quiet, behind, or ready for promotion"
          action={<Link href="/bd-team" className="text-[11px] text-muted hover:text-foreground">Full roster →</Link>} className="mb-0">
          <PortalCard accent={ACCENT} lift={flagged.length > 0}>
            {flagged.length === 0 ? (
              <PortalEmpty>Whole team's healthy. 🌱</PortalEmpty>
            ) : (
              <ul className="space-y-2">
                {flagged.slice(0, 8).map((t) => (
                  <li key={t.userId} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar name={t.name} id={t.userId} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{t.name}</div>
                        <div className="text-[11px] text-muted">
                          {t.callsToday} today · {t.acceptedSubs} accepted subs
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 shrink-0 max-w-[55%]">
                      {t.flags.map((f) => (
                        <span key={f} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", FLAG_META[f]?.tone)}>
                          {FLAG_META[f]?.label ?? f}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PortalCard>
        </PortalSection>

        <PortalSection title="Applications awaiting review" accent={ACCENT} hint="Newest first"
          action={<Link href="/bd-team" className="text-[11px] text-muted hover:text-foreground">Review →</Link>} className="mb-0">
          <PortalCard>
            {apps.length === 0 ? (
              <PortalEmpty>No applications waiting.</PortalEmpty>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {apps.slice(0, 8).map((a) => (
                  <QueueRow
                    key={a.id}
                    href={`/bird-dogs/${a.id}`}
                    primary={a.name}
                    secondary={a.email ?? undefined}
                    trailing={a.qualified
                      ? <span className="shrink-0 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-semibold">✅ all 5 acks</span>
                      : <span className="shrink-0 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">⚠️ referral path</span>}
                  />
                ))}
              </ul>
            )}
          </PortalCard>
        </PortalSection>
      </div>

      <PortalSection title="This week's board" accent={ACCENT}
        action={<Link href="/bd-leaderboard" className="text-[11px] text-muted hover:text-foreground">Full leaderboard →</Link>}>
        <PortalCard>
          {board.length === 0 ? (
            <PortalEmpty>No activity yet this week.</PortalEmpty>
          ) : (
            <ul className="space-y-1.5">
              {board.slice(0, 5).map((r, i) => {
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
                return (
                  <li key={r.userId} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-foreground/[0.03]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-semibold tabular-nums w-7">{medal}</span>
                      <Avatar name={r.name} id={r.userId} />
                      <span className="text-sm truncate">{r.name}</span>
                    </div>
                    <span className="text-sm tabular-nums font-semibold shrink-0">{r.points} pts</span>
                  </li>
                );
              })}
            </ul>
          )}
        </PortalCard>
      </PortalSection>

      <PortalFooter userId={userId} />
    </>
  );
}
