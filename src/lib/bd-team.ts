/**
 * BD Team pulse — Erica's manager view of the bird-dog roster.
 *
 * Answers the four questions a BD manager asks every morning:
 *   1. Who's dialing today (and against what goal)?
 *   2. Who's gone quiet?
 *   3. Who's sitting on overdue follow-ups?
 *   4. Who hasn't finished onboarding yet?
 *
 * Built from four round-trips regardless of team size:
 *   roster → per-user/day disposition counts (30d) → overdue follow-up
 *   counts → this week's leaderboard. Streak math mirrors lib/bd-stats
 *   so the number a BD sees on their hub matches what Erica sees here.
 */
import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { bdExitSurveys, user } from "@/db/schema";
import { getOpsBlocks } from "./ops-content";
import { getLeaderboard } from "./bd-leaderboard";

export type BdTeamRow = {
  userId: string;
  name: string;
  role: string;            // bd_level_1 | bd_level_2 | bd_level_3
  goal: number;
  callsToday: number;
  connectsToday: number;
  callsThisWeek: number;
  callsPriorWeek: number;
  streak: number;
  weekPoints: number;
  weekRank: number | null;
  overdueFollowUps: number;
  /** Leads skipped without calling, trailing 30 days (leadership-only signal). */
  skips30d: number;
  /** Up to 3 most-recent skip reasons, for the hover tooltip. */
  recentSkipReasons: string[];
  lastActivityAt: Date | null;
  onboardedAt: Date | null;
  /** When the expectations checklist was acknowledged (null = never). */
  acksAt: string | null;
  /** Manager flags, precomputed so the UI just renders chips. */
  flags: Array<"not_onboarded" | "quiet" | "overdue_backlog" | "submission_drought">;
};

const BD_ROLES = ["bd_level_1", "bd_level_2", "bd_level_3"] as const;
const DEFAULT_GOAL = 40;
/** "Quiet" = no disposition in this many hours (and account old enough to have dialed). */
const QUIET_HOURS = 48;
const OVERDUE_BACKLOG_THRESHOLD = 5;

export async function getBdTeamPulse(): Promise<BdTeamRow[]> {
  const roster = await db
    .select({
      id: user.id,
      name: user.name,
      role: user.role,
      onboardedAt: user.onboardedAt,
      onboardingAcks: user.onboardingAcks,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(
      and(
        inArray(user.role, [...BD_ROLES]),
        isNull(user.deletedAt),
        isNull(user.suspendedAt),
      ),
    );
  if (roster.length === 0) return [];

  const ids = roster.map((r) => r.id);
  // ids come straight from our own user table (UUIDs) — safe to inline
  // as a SQL array literal for the raw aggregate queries below.
  const idArray = `ARRAY[${ids.map((i) => `'${i}'`).join(",")}]`;

  const blocks = await getOpsBlocks("bd.");
  const goalRaw = parseInt(blocks.get("bd.daily_call_goal") ?? "", 10);
  const goal = Number.isFinite(goalRaw) && goalRaw > 0 ? goalRaw : DEFAULT_GOAL;

  // Per-user/day counts, trailing 30 days — powers today/week/streak.
  const dayResult = await db.execute(sql`
    SELECT
      d.by_user_id AS user_id,
      (d.created_at AT TIME ZONE 'UTC')::date AS day,
      COUNT(*)::int AS calls,
      COUNT(*) FILTER (WHERE d.outcome::text LIKE 'connected_%')::int AS connects,
      COUNT(*) FILTER (WHERE d.outcome = 'qualified')::int AS qualified,
      MAX(d.created_at) AS last_at
    FROM raw_lead_dispositions d
    WHERE d.by_user_id = ANY(${sql.raw(idArray)})
      AND d.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1, 2
  `);
  const dayRows = ((dayResult as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (dayResult as unknown as Array<Record<string, unknown>>)) ?? [];

  // Overdue follow-up backlog per user.
  const overdueResult = await db.execute(sql`
    SELECT rl.last_call_by_id AS user_id, COUNT(*)::int AS overdue
    FROM raw_leads rl
    WHERE rl.last_call_by_id = ANY(${sql.raw(idArray)})
      AND rl.deleted_at IS NULL
      AND rl.next_follow_up_at IS NOT NULL
      AND rl.next_follow_up_at <= NOW()
      AND rl.status NOT IN ('dead', 'converted')
    GROUP BY 1
  `);
  const overdueRows = ((overdueResult as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (overdueResult as unknown as Array<Record<string, unknown>>)) ?? [];
  const overdueByUser = new Map(overdueRows.map((r) => [String(r.user_id), Number(r.overdue) || 0]));

  // Skip log, trailing 30 days — the anti-cherry-picking signal. Count
  // plus the 3 most-recent reasons for the tooltip. Leadership-only by
  // construction: this lib is only called from the perm-gated /bd-team.
  const skipResult = await db.execute(sql`
    SELECT
      s.by_user_id AS user_id,
      COUNT(*)::int AS skips,
      (ARRAY_AGG(s.reason ORDER BY s.created_at DESC))[1:3] AS recent
    FROM raw_lead_skips s
    WHERE s.by_user_id = ANY(${sql.raw(idArray)})
      AND s.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  `);
  const skipRows = ((skipResult as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (skipResult as unknown as Array<Record<string, unknown>>)) ?? [];
  const skipsByUser = new Map(
    skipRows.map((r) => [
      String(r.user_id),
      {
        count: Number(r.skips) || 0,
        recent: Array.isArray(r.recent) ? (r.recent as string[]).filter(Boolean) : [],
      },
    ]),
  );

  const board = await getLeaderboard("week");

  // Index day rows per user.
  const byUser = new Map<string, Map<string, { calls: number; connects: number; qualified: number }>>();
  const lastActivity = new Map<string, Date>();
  for (const r of dayRows) {
    const uid = String(r.user_id);
    if (!byUser.has(uid)) byUser.set(uid, new Map());
    byUser.get(uid)!.set(String(r.day), {
      calls: Number(r.calls) || 0,
      connects: Number(r.connects) || 0,
      qualified: Number(r.qualified) || 0,
    });
    const at = new Date(r.last_at as string);
    if (!lastActivity.has(uid) || at > lastActivity.get(uid)!) lastActivity.set(uid, at);
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const weekFloor = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const priorFloor = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const droughtFloor = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows: BdTeamRow[] = roster.map((u) => {
    const days = byUser.get(u.id) ?? new Map<string, { calls: number; connects: number; qualified: number }>();
    const today = days.get(todayKey) ?? { calls: 0, connects: 0, qualified: 0 };

    let callsThisWeek = 0;
    let callsPriorWeek = 0;
    for (const [day, v] of days) {
      if (day >= weekFloor) callsThisWeek += v.calls;
      else if (day >= priorFloor) callsPriorWeek += v.calls;
    }

    // Streak — same weekday-skipping walk as lib/bd-stats.
    let streak = today.calls >= goal ? 1 : 0;
    const cursor = new Date();
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    for (let i = 0; i < 30; i++) {
      const dow = cursor.getUTCDay();
      if (dow !== 0 && dow !== 6) {
        const key = cursor.toISOString().slice(0, 10);
        if ((days.get(key)?.calls ?? 0) >= goal) streak++;
        else break;
      }
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }

    const boardIdx = board.findIndex((b) => b.userId === u.id);
    const lastAt = lastActivity.get(u.id) ?? null;
    const overdue = overdueByUser.get(u.id) ?? 0;
    const acks = u.onboardingAcks as { keys?: string[]; at?: string } | null;

    const flags: BdTeamRow["flags"] = [];
    if (!u.onboardedAt) flags.push("not_onboarded");
    // Quiet: onboarded, but no dial in QUIET_HOURS — and give brand-new
    // accounts the same grace window before flagging.
    const accountAgeMs = Date.now() - new Date(u.createdAt).getTime();
    const sinceActivityMs = lastAt ? Date.now() - lastAt.getTime() : accountAgeMs;
    if (u.onboardedAt && sinceActivityMs > QUIET_HOURS * 60 * 60 * 1000) flags.push("quiet");
    if (overdue >= OVERDUE_BACKLOG_THRESHOLD) flags.push("overdue_backlog");
    // Spec Phase 12 signal: no qualified submission in 21 days. This is
    // the same condition the claim-time reaper uses to auto-release the
    // BD's follow-up pipeline — the flag tells leadership it happened.
    if (u.onboardedAt && accountAgeMs > 21 * 24 * 60 * 60 * 1000) {
      let qualified21d = 0;
      for (const [day, v] of days) {
        if (day >= droughtFloor) qualified21d += v.qualified;
      }
      if (qualified21d === 0) flags.push("submission_drought");
    }

    return {
      userId: u.id,
      name: u.name,
      role: u.role,
      goal,
      callsToday: today.calls,
      connectsToday: today.connects,
      callsThisWeek,
      callsPriorWeek,
      streak,
      weekPoints: boardIdx >= 0 ? board[boardIdx].points : 0,
      weekRank: boardIdx >= 0 ? boardIdx + 1 : null,
      overdueFollowUps: overdue,
      skips30d: skipsByUser.get(u.id)?.count ?? 0,
      recentSkipReasons: skipsByUser.get(u.id)?.recent ?? [],
      lastActivityAt: lastAt,
      onboardedAt: u.onboardedAt,
      acksAt: acks?.at ?? null,
      flags,
    };
  });

  // Most active first; flagged folks still pop via the attention strip.
  rows.sort((a, b) => b.callsToday - a.callsToday || b.callsThisWeek - a.callsThisWeek || a.name.localeCompare(b.name));
  return rows;
}

export type BdExitRow = {
  id: string;
  name: string;
  kind: "break" | "leave";
  reason: string;
  referralPartner: boolean;
  parksReleased: number;
  createdAt: Date;
};

/** Break/leave requests from the last 60 days, newest first (Phase 14). */
export async function getRecentBdExits(): Promise<BdExitRow[]> {
  const floor = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: bdExitSurveys.id,
      name: user.name,
      kind: bdExitSurveys.kind,
      answers: bdExitSurveys.answers,
      parksReleased: bdExitSurveys.parksReleased,
      createdAt: bdExitSurveys.createdAt,
    })
    .from(bdExitSurveys)
    .leftJoin(user, eq(user.id, bdExitSurveys.userId))
    .where(gte(bdExitSurveys.createdAt, floor))
    .orderBy(desc(bdExitSurveys.createdAt))
    .limit(20);

  return rows.map((r) => {
    const a = (r.answers ?? {}) as { reason?: string; referralPartner?: boolean };
    return {
      id: r.id,
      name: r.name ?? "(deleted account)",
      kind: r.kind,
      reason: a.reason ?? "—",
      referralPartner: !!a.referralPartner,
      parksReleased: parseInt(r.parksReleased ?? "0", 10) || 0,
      createdAt: r.createdAt,
    };
  });
}
