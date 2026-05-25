/**
 * Pure helpers for the triage cockpit — shared between server queries and
 * the client form. Kept out of actions.ts because "use server" files can
 * only export async functions.
 */

export type Queue = "new" | "mine" | "stale";

export const NEW_STATUSES = [
  "new_lead_received",
  "pace_leads",
  "sent_back_to_bd",
  "incomplete_file",
] as const;

export const ACTIVE_CLOSER_STATUSES = [
  "closer_first_contact_attempted",
  "closer_first_contact_made",
  "closer_under_negotiation",
  "closer_gathering_docs",
] as const;

export const QUEUE_LABELS: Record<Queue, string> = {
  new: "New leads",
  mine: "My active",
  stale: "Stale (>2d)",
};

/**
 * The seven call outcomes Marco picks between, in the order they appear in
 * the cockpit. Keyboard 1-7 binds to these in the client.
 */
export const CALL_OUTCOMES: { code: string; label: string; nextStatus: string | null }[] = [
  { code: "first_contact_attempted",  label: "First contact attempted",  nextStatus: "closer_first_contact_attempted" },
  { code: "first_contact_made",        label: "First contact made",        nextStatus: "closer_first_contact_made" },
  { code: "interested_negotiating",    label: "Interested / negotiating",  nextStatus: "closer_under_negotiation" },
  { code: "gathering_docs",            label: "Gathering docs",            nextStatus: "closer_gathering_docs" },
  { code: "not_selling_7d",            label: "Not selling — 7-day drip",  nextStatus: "drip_7d" },
  { code: "not_selling_30d",           label: "Not selling — 30-day drip", nextStatus: "drip_30d" },
  { code: "not_pursuing_dnc",          label: "Not pursuing — DNC",        nextStatus: "not_pursuing_never" },
];

export function suggestedStatusForOutcome(outcome: string | null | undefined): string | null {
  if (!outcome) return null;
  return CALL_OUTCOMES.find((o) => o.code === outcome)?.nextStatus ?? null;
}

export function humanOutcome(code: string): string {
  return code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildTriageUrl(queue: Queue, dealId: string | null): string {
  const qs = new URLSearchParams({ q: queue });
  if (dealId) qs.set("id", dealId);
  return `/triage?${qs.toString()}`;
}
