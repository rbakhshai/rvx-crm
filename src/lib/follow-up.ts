/**
 * Follow-up cadence config shared between the server action
 * (dispositionLeadAction, setLeadFollowUpAction) and any client UI that
 * surfaces the picker (FollowUpPicker on /my-leads, the disposition
 * panel on /bd-triage).
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
 *   interested  → 7 days  — hot, don't lose momentum
 *   thinking    → 14 days — giving them space to mull
 *   not_selling → 30 days — touch back in a month
 */
export const DEFAULT_FOLLOW_UP_DAYS: Record<string, number> = {
  connected_interested: 7,
  connected_thinking: 14,
  connected_not_selling: 30,
};
