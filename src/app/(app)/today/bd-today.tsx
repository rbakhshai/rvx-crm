/**
 * BD Today — the bird dog's personal hub, rendered instead of the
 * standard /today grid for bd_level_* roles.
 *
 * Design goal (Reza): a cohesive, need-to-know daily loop the BD
 * WANTS to open every morning —
 *   1. AI coach brief (their numbers, their callbacks, their rank)
 *   2. Daily goal ring + streak flame (the habit mechanics)
 *   3. One unmissable CTA: work follow-ups first, then fresh leads
 *   4. Mini leaderboard — top 3 + where they sit
 *   5. The weekly call card
 *
 * Everything on this page is THEIRS: no company pipeline, no dollar
 * totals, no other BDs' lead data.
 */
import Link from "next/link";
import { getBdDayStats, getBdCareerStats } from "@/lib/bd-stats";
import { computeBadges } from "@/lib/bd-badges";
import { getFollowUpsDueForUser, followUpBand } from "@/lib/my-leads";
import { getLeaderboard } from "@/lib/bd-leaderboard";
import { getQueueCountsForUser } from "@/app/actions/leads";
import { getOrCreateDailyBrief } from "@/app/actions/daily-brief";
import { getOpsBlocks } from "@/lib/ops-content";
import { DailyBrief } from "@/components/daily-brief";
import { TeamMeetingWidget } from "@/components/team-meeting-widget";
import { Avatar } from "@/components/avatar";
import { fmtRelative } from "@/lib/date-format";
import { cn } from "@/lib/cn";

export async function BdToday({ userId, userName }: { userId: string; userName: string }) {
  const [stats, career, followUps, counts, board, brief, meetingBlocks] = await Promise.all([
    getBdDayStats(userId).catch(() => null),
    getBdCareerStats(userId).catch(() => null),
    getFollowUpsDueForUser(userId, 8).catch(() => []),
    getQueueCountsForUser().catch(() => ({ fresh: 0, followup: 0 })),
    getLeaderboard("week").catch(() => []),
    getOrCreateDailyBrief(userId),
    getOpsBlocks("today.meeting.").catch(() => new Map<string, string>()),
  ]);

  const badges = stats && career ? computeBadges(career, stats) : [];
  const earnedCount = badges.filter((b) => b.earned).length;

  // Week-over-week delta for the trend chip on the goal card.
  const wow = stats ? stats.callsThisWeek - stats.callsPriorWeek : 0;

  const goal = stats?.goal ?? 40;
  const calls = stats?.callsToday ?? 0;
  const pct = Math.min(100, Math.round((calls / goal) * 100));
  const overdue = followUps.filter((f) => followUpBand(f.nextFollowUpAt) === "overdue").length;

  return (
    <div className="space-y-5">
      {/* AI coach brief */}
      {brief && <DailyBrief contentMd={brief.contentMd} createdAt={brief.createdAt} />}

      {/* Goal + streak + rank strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Goal ring */}
        <div className="rounded-xl border border-border bg-background p-4 flex items-center gap-4">
          <GoalRing pct={pct} met={stats?.goalMetToday ?? false} />
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none">
              {calls}<span className="text-sm text-muted font-medium"> / {goal}</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">
              Calls today
            </div>
            {stats && stats.connectsToday > 0 && (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                {stats.connectsToday} connect{stats.connectsToday === 1 ? "" : "s"}
                {stats.qualifiedToday > 0 && ` · ${stats.qualifiedToday} qualified 🎉`}
              </div>
            )}
            {stats && (stats.callsThisWeek > 0 || stats.callsPriorWeek > 0) && (
              <div className={cn(
                "text-[11px] mt-0.5",
                wow > 0 ? "text-emerald-700 dark:text-emerald-400" : wow < 0 ? "text-rose-700 dark:text-rose-400" : "text-muted",
              )}>
                {wow > 0 ? "▲" : wow < 0 ? "▼" : "—"} {Math.abs(wow)} vs last week
              </div>
            )}
          </div>
        </div>

        {/* Streak */}
        <div className="rounded-xl border border-border bg-background p-4 flex items-center gap-4">
          <div className={cn("text-4xl", (stats?.streak ?? 0) > 0 ? "" : "grayscale opacity-40")}>🔥</div>
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none">{stats?.streak ?? 0}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">
              Day streak
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {stats?.goalMetToday
                ? "Goal hit — flame's lit for today."
                : `Hit ${goal} calls to ${(stats?.streak ?? 0) > 0 ? "keep" : "start"} the streak.`}
            </div>
          </div>
        </div>

        {/* Rank */}
        <div className="rounded-xl border border-border bg-background p-4 flex items-center gap-4">
          <div className="text-4xl">🏆</div>
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none">
              {stats?.weekRank ? `#${stats.weekRank}` : "—"}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1">
              This week · {stats?.weekPoints ?? 0} pts
            </div>
            <Link href="/bd-leaderboard" className="text-[11px] text-primary hover:underline mt-0.5 inline-block">
              Full leaderboard →
            </Link>
          </div>
        </div>
      </div>

      {/* The one decision: what to dial next */}
      <div className="rounded-2xl border border-border bg-background p-5">
        <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-3">
          Start dialing
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/bd-triage?mode=followup"
            className={cn(
              "rounded-xl border p-4 transition group",
              counts.followup > 0
                ? "border-amber-300 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                : "border-border bg-foreground/[0.02] opacity-60",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-bold">🔁 Follow-ups first</span>
              <span className="text-2xl font-bold tabular-nums">{counts.followup}</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {overdue > 0
                ? `${overdue} overdue — these are warm conversations. Work them before fresh.`
                : counts.followup > 0
                  ? "Scheduled callbacks — warmest calls of your day."
                  : "Nothing due. Go get fresh ones."}
            </p>
          </Link>
          <Link
            href="/bd-triage"
            className={cn(
              "rounded-xl border p-4 transition",
              counts.fresh > 0
                ? "border-border bg-background hover:bg-foreground/[0.03]"
                : "border-border bg-foreground/[0.02] opacity-60",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-bold">📞 Fresh leads</span>
              <span className="text-2xl font-bold tabular-nums">{counts.fresh}</span>
            </div>
            <p className="text-[11px] text-muted mt-1">
              {counts.fresh > 0 ? "New owners nobody's reached yet." : "Pool's empty — ping Erica for a new list."}
            </p>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Today's callbacks */}
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
              Your callbacks
            </span>
            <Link href="/my-leads" className="text-[11px] text-primary hover:underline">All my leads →</Link>
          </div>
          {followUps.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">No callbacks due. Clean slate. 🌅</p>
          ) : (
            <ul className="divide-y divide-border">
              {followUps.map((f) => {
                const band = followUpBand(f.nextFollowUpAt);
                return (
                  <li key={f.leadId} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{f.parkName ?? f.ownerName ?? "(unnamed)"}</div>
                      <div className="text-[11px] text-muted">
                        {[f.city, f.state].filter(Boolean).join(", ")} · {fmtRelative(f.nextFollowUpAt)}
                      </div>
                    </div>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                      band === "overdue"
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
                    )}>
                      {band === "overdue" ? "Overdue" : "Today"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {/* Mini leaderboard — top 3 + you */}
          <div className="rounded-xl border border-border bg-background p-4">
            <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
              This week's board
            </span>
            {board.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">No activity yet this week — be first on the board.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {board.slice(0, 3).map((r, i) => (
                  <BoardRow key={r.userId} rank={i + 1} name={r.name} id={r.userId} points={r.points} isMe={r.userId === userId} />
                ))}
                {stats?.weekRank && stats.weekRank > 3 && (
                  <>
                    <li className="text-center text-muted text-xs">⋯</li>
                    <BoardRow rank={stats.weekRank} name={userName} id={userId} points={stats.weekPoints} isMe />
                  </>
                )}
              </ul>
            )}
          </div>

          {/* Badge ladder — the whole journey visible from day one */}
          {badges.length > 0 && (
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-muted font-semibold">
                  Milestones
                </span>
                <span className="text-[11px] text-muted tabular-nums">{earnedCount} / {badges.length}</span>
              </div>
              <ul className="grid grid-cols-4 gap-2">
                {badges.map((b) => (
                  <li
                    key={b.key}
                    title={b.earned ? b.label : `${b.label} — ${b.hint}`}
                    className={cn(
                      "rounded-lg border p-2 text-center transition",
                      b.earned
                        ? "border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10"
                        : "border-border bg-foreground/[0.02] grayscale opacity-50",
                    )}
                  >
                    <div className="text-xl leading-none">{b.emoji}</div>
                    <div className="text-[9px] font-semibold mt-1 leading-tight">{b.label}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weekly call */}
          <TeamMeetingWidget
            canEdit={false}
            title={meetingBlocks.get("today.meeting.title") ?? ""}
            url={meetingBlocks.get("today.meeting.url") ?? ""}
            notes={meetingBlocks.get("today.meeting.notes") ?? ""}
          />
        </div>
      </div>
    </div>
  );
}

function BoardRow({ rank, name, id, points, isMe }: { rank: number; name: string; id: string; points: number; isMe?: boolean }) {
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <li className={cn(
      "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5",
      isMe && "bg-lime-50/60 dark:bg-lime-500/[0.06]",
    )}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold tabular-nums w-7">{medal ?? `#${rank}`}</span>
        <Avatar name={name} id={id} />
        <span className={cn("text-sm truncate", isMe && "font-bold")}>{isMe ? "You" : name}</span>
      </div>
      <span className="text-sm tabular-nums font-semibold shrink-0">{points} pts</span>
    </li>
  );
}

function GoalRing({ pct, met }: { pct: number; met: boolean }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-foreground/10" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          className={met ? "stroke-emerald-500" : "stroke-amber-500"}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-bold tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
