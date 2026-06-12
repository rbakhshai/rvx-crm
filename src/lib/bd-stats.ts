/**
 * Per-BD daily performance stats — powers the BD Today hub and the
 * BD-flavored AI morning brief.
 *
 * Gamification model (the loop that brings them back):
 *   • Daily call goal — ring fills as they dial. Default lives in
 *     ops_content (scope "bd.daily_call_goal") so leadership can tune
 *     it without a deploy; falls back to 40.
 *   • Streak — consecutive weekdays hitting the goal. Today counts
 *     once they hit it (so the flame "lights up" live mid-day, and
 *     yesterday's streak isn't broken by a morning view).
 *   • Week rank — position on this week's leaderboard.
 */
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getOpsBlocks } from "./ops-content";
import { getLeaderboard } from "./bd-leaderboard";

export type BdDayStats = {
  goal: number;
  callsToday: number;
  connectsToday: number;
  qualifiedToday: number;
  callsThisWeek: number;
  /** Calls in the 7 days before this week — week-over-week trend. */
  callsPriorWeek: number;
  /** Qualified submissions in the last 7 days (spec Phase 5 metric). */
  qualifiedThisWeek: number;
  /** Consecutive weekdays (incl. today once met) hitting the goal. */
  streak: number;
  /** True when today's goal is met — the flame is lit. */
  goalMetToday: boolean;
  /** 1-based rank on this week's leaderboard; null = not on board yet. */
  weekRank: number | null;
  weekPoints: number;
  boardSize: number;
};

const DEFAULT_GOAL = 40;

export async function getBdDayStats(userId: string): Promise<BdDayStats> {
  const blocks = await getOpsBlocks("bd.");
  const goalRaw = parseInt(blocks.get("bd.daily_call_goal") ?? "", 10);
  const goal = Number.isFinite(goalRaw) && goalRaw > 0 ? goalRaw : DEFAULT_GOAL;

  // Per-day disposition counts for the trailing 30 days, one round-trip.
  // Day boundaries in UTC — consistent with the rest of the app's
  // date handling; close enough for a streak mechanic.
  const result = await db.execute(sql`
    SELECT
      (d.created_at AT TIME ZONE 'UTC')::date AS day,
      COUNT(*)::int AS calls,
      COUNT(*) FILTER (WHERE d.outcome::text LIKE 'connected_%')::int AS connects,
      COUNT(*) FILTER (WHERE d.outcome = 'qualified')::int AS qualified
    FROM raw_lead_dispositions d
    WHERE d.by_user_id = ${userId}
      AND d.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY 1
  `);
  const rows = ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (result as unknown as Array<Record<string, unknown>>)) ?? [];

  const byDay = new Map<string, { calls: number; connects: number; qualified: number }>();
  for (const r of rows) {
    byDay.set(String(r.day), {
      calls: Number(r.calls) || 0,
      connects: Number(r.connects) || 0,
      qualified: Number(r.qualified) || 0,
    });
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const today = byDay.get(todayKey) ?? { calls: 0, connects: 0, qualified: 0 };
  const goalMetToday = today.calls >= goal;

  // Streak: walk back from today (or yesterday if today's not met yet),
  // skipping weekends — a BD who crushes Mon–Fri keeps the flame
  // through the weekend.
  let streak = goalMetToday ? 1 : 0;
  const cursor = new Date();
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  for (let i = 0; i < 30; i++) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const key = cursor.toISOString().slice(0, 10);
      if ((byDay.get(key)?.calls ?? 0) >= goal) streak++;
      else break;
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  // Calls this week (last 7 days — matches the leaderboard window) and
  // the prior 7 days for the week-over-week trend chip.
  const weekFloor = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const priorFloor = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let callsThisWeek = 0;
  let callsPriorWeek = 0;
  let qualifiedThisWeek = 0;
  for (const [day, v] of byDay) {
    if (day >= weekFloor) {
      callsThisWeek += v.calls;
      qualifiedThisWeek += v.qualified;
    } else if (day >= priorFloor) callsPriorWeek += v.calls;
  }

  // Rank from the existing leaderboard query.
  const board = await getLeaderboard("week");
  const idx = board.findIndex((r) => r.userId === userId);

  return {
    goal,
    callsToday: today.calls,
    connectsToday: today.connects,
    qualifiedToday: today.qualified,
    callsThisWeek,
    callsPriorWeek,
    qualifiedThisWeek,
    streak,
    goalMetToday,
    weekRank: idx >= 0 ? idx + 1 : null,
    weekPoints: idx >= 0 ? board[idx].points : 0,
    boardSize: board.length,
  };
}

export type BdCareerStats = {
  totalCalls: number;
  totalConnects: number;
  totalQualified: number;
  /** All-time LOI / PSA credits from the leaderboard attribution. */
  lois: number;
  psas: number;
};

/**
 * Career totals — power the milestone badges. One aggregate over the
 * BD's full disposition history plus the all-time leaderboard row for
 * downstream LOI/PSA credit.
 */
export async function getBdCareerStats(userId: string): Promise<BdCareerStats> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS calls,
      COUNT(*) FILTER (WHERE outcome::text LIKE 'connected_%')::int AS connects,
      COUNT(*) FILTER (WHERE outcome = 'qualified')::int AS qualified
    FROM raw_lead_dispositions
    WHERE by_user_id = ${userId}
  `);
  const rows = ((result as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (result as unknown as Array<Record<string, unknown>>)) ?? [];
  const r = rows[0] ?? {};

  const allTime = await getLeaderboard("all");
  const meRow = allTime.find((b) => b.userId === userId);

  return {
    totalCalls: Number(r.calls) || 0,
    totalConnects: Number(r.connects) || 0,
    totalQualified: Number(r.qualified) || 0,
    lois: meRow?.lois ?? 0,
    psas: meRow?.psas ?? 0,
  };
}
