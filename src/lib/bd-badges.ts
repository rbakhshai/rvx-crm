/**
 * Milestone badges for the BD hub — computed live from career + day
 * stats, no persistence. A badge is "earned" the moment the data says
 * so and can't be lost (except streak-based ones, which reflect the
 * current streak by design — that's the habit hook).
 *
 * Ordering = the journey: first call → first connect → first qualified
 * → volume tiers → downstream credits. The unearned ones render
 * grayscale so a new BD sees the whole ladder on day one.
 */
import type { BdCareerStats, BdDayStats } from "./bd-stats";

export type Badge = {
  key: string;
  emoji: string;
  label: string;
  /** Short "how to get it" shown on unearned badges. */
  hint: string;
  earned: boolean;
};

export function computeBadges(career: BdCareerStats, day: BdDayStats): Badge[] {
  return [
    {
      key: "first_call",
      emoji: "📞",
      label: "First call",
      hint: "Log your first disposition",
      earned: career.totalCalls >= 1,
    },
    {
      key: "first_connect",
      emoji: "🗣️",
      label: "First connect",
      hint: "Get an owner on the phone",
      earned: career.totalConnects >= 1,
    },
    {
      key: "first_qualified",
      emoji: "✅",
      label: "First qualified",
      hint: "Hand a seller to the closers",
      earned: career.totalQualified >= 1,
    },
    {
      key: "calls_100",
      emoji: "💯",
      label: "100 calls",
      hint: "Career total",
      earned: career.totalCalls >= 100,
    },
    {
      key: "calls_1000",
      emoji: "🚀",
      label: "1,000 calls",
      hint: "Career total",
      earned: career.totalCalls >= 1000,
    },
    {
      key: "streak_5",
      emoji: "🔥",
      label: "5-day streak",
      hint: "Hit your goal five weekdays running",
      earned: day.streak >= 5,
    },
    {
      key: "first_loi",
      emoji: "📨",
      label: "First LOI",
      hint: "A lead you qualified got an offer",
      earned: career.lois >= 1,
    },
    {
      key: "first_psa",
      emoji: "🏆",
      label: "First PSA",
      hint: "A lead you qualified went under contract",
      earned: career.psas >= 1,
    },
  ];
}
