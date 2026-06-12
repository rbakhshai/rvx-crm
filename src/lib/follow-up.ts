/**
 * Follow-up cadence config shared between the server action
 * (dispositionLeadAction, setLeadFollowUpAction) and any client UI that
 * surfaces the picker (FollowUpPicker on /my-leads, the disposition
 * panel on /lead-work).
 *
 * Lives in lib/ rather than actions/ so the constants can be imported
 * from both sides without violating "use server" file rules (which
 * forbid non-async exports).
 */

/** Whitelist of valid manual snooze choices on /my-leads + bd-triage UI. */
export const FOLLOW_UP_DAYS_OPTIONS = [7, 14, 30, 45, 90] as const;

/**
 * Default follow-up cadence per connected outcome. The BD can override
 * by passing followUpDays on dispositionLeadAction, or change later via
 * setLeadFollowUpAction from /my-leads.
 *
 * Rationale (tuned for RV-park sourcing):
 *   interested        → 7 days   hot, don't lose momentum
 *   manager_only      → 7 days   bug the manager weekly until they pass
 *   thinking          → 14 days  giving them space to mull
 *   not_selling       → 30 days  touch back in a month
 *   future_maybe      → 90 days  long-tail re-check
 *   selling_to_family → 90 days  near-dead but worth a 1-quarter knock
 */
export const DEFAULT_FOLLOW_UP_DAYS: Record<string, number> = {
  connected_interested: 7,
  connected_manager_only: 7,
  connected_thinking: 14,
  connected_not_selling: 30,
  connected_future_maybe: 90,
  connected_selling_to_family: 90,
};

/**
 * Single source of truth for the connected_* outcome set. Used by
 * server actions (RECYCLE_OUTCOMES whitelist, follow-up mode filter)
 * AND by client UIs (bd-triage button group, leaderboard scoring).
 *
 * Adding a new sub-status: append here AND to rawLeadOutcome in
 * db/schema/leads.ts, then run db:push.
 */
export const CONNECTED_OUTCOMES = [
  "connected_interested",
  "connected_manager_only",
  "connected_thinking",
  "connected_not_selling",
  "connected_future_maybe",
  "connected_selling_to_family",
] as const;

export type ConnectedOutcome = (typeof CONNECTED_OUTCOMES)[number];

export function isConnectedOutcome(o: string): o is ConnectedOutcome {
  return (CONNECTED_OUTCOMES as readonly string[]).includes(o);
}
