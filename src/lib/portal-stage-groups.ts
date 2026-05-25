/**
 * Maps internal deal status codes (35+ of them) into ~7 friendly buckets
 * the bird dog cares about. They don't need to see "closer_first_contact_made"
 * vs "closer_under_negotiation" — that's our team's internal kanban.
 */

export type StageGroup = {
  code: string;
  label: string;
  description: string;
  tone: "neutral" | "active" | "won" | "lost" | "paused";
  /** Sort order in the portal — active stuff first, closed last */
  order: number;
};

export const STAGE_GROUPS: Record<string, StageGroup> = {
  new: {
    code: "new",
    label: "New — under review",
    description: "We just received it. Our team is reviewing.",
    tone: "neutral",
    order: 1,
  },
  contact: {
    code: "contact",
    label: "Talking with seller",
    description: "We're in touch with the seller, gathering info or negotiating.",
    tone: "active",
    order: 2,
  },
  uw: {
    code: "uw",
    label: "Underwriting",
    description: "Numbers are being reviewed by our underwriting team.",
    tone: "active",
    order: 3,
  },
  offer: {
    code: "offer",
    label: "Making an offer",
    description: "LOI is being drafted, sent, or negotiated.",
    tone: "active",
    order: 4,
  },
  contract: {
    code: "contract",
    label: "Under contract / due diligence",
    description: "PSA signed; in escrow and due diligence.",
    tone: "active",
    order: 5,
  },
  won: {
    code: "won",
    label: "Closed — RVX acquired",
    description: "We closed on this park. Commission incoming.",
    tone: "won",
    order: 6,
  },
  network: {
    code: "network",
    label: "Closed — network",
    description: "Closed via our network. Commission incoming.",
    tone: "won",
    order: 7,
  },
  drip: {
    code: "drip",
    label: "Drip / follow-up",
    description: "Seller's not ready right now — we're checking back periodically.",
    tone: "paused",
    order: 8,
  },
  lost: {
    code: "lost",
    label: "Closed — other buyer",
    description: "Park sold to someone else.",
    tone: "lost",
    order: 9,
  },
  dead: {
    code: "dead",
    label: "Not pursuing",
    description: "We're not moving forward on this one.",
    tone: "lost",
    order: 10,
  },
  unknown: {
    code: "unknown",
    label: "In progress",
    description: "Status not yet set.",
    tone: "neutral",
    order: 99,
  },
};

const STATUS_TO_GROUP: Record<string, keyof typeof STAGE_GROUPS> = {
  // New / intake
  new_lead_received: "new",
  pace_leads: "new",
  sent_back_to_bd: "new",
  incomplete_file: "new",

  // Closer talking with seller
  closer_first_contact_attempted: "contact",
  closer_first_contact_made: "contact",
  closer_under_negotiation: "contact",
  closer_gathering_docs: "contact",

  // Underwriting
  uw_ready_phase_2: "uw",
  uw_under_phase_2: "uw",

  // Offer / LOI
  loi_ready: "offer",
  loi_submitted: "offer",
  loi_in_negotiation: "offer",
  loi_signed_by_seller: "offer",
  loi_accepted_both_sides: "offer",

  // Under contract / DD
  tc_writing_psa: "contract",
  tc_psa_submitted: "contract",
  psa_accepted: "contract",
  dm_dispo_initiated: "contract",
  tc_dd_in_escrow: "contract",
  dd_completed_in_escrow: "contract",

  // Won
  closed_rvx_acquired: "won",
  closed_rvx_network: "network",

  // Drips / paused
  drip_7d: "drip",
  drip_14d: "drip",
  drip_30d: "drip",
  drip_45d: "drip",
  drip_90d: "drip",
  no_deal_90d_revisit: "drip",
  deal_pending_45d: "drip",
  listing_pulled_90_drip: "drip",

  // Lost / dead
  closed_other_buyer: "lost",
  not_pursuing_now: "dead",
  not_pursuing_never: "dead",
};

export function groupForStatus(statusCode: string | null | undefined): StageGroup {
  if (!statusCode) return STAGE_GROUPS.unknown;
  const key = STATUS_TO_GROUP[statusCode];
  return key ? STAGE_GROUPS[key] : STAGE_GROUPS.unknown;
}
