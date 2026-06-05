/**
 * Maps the 5 high-level "funnel" stages a CEO cares about to the set of
 * internal deal status codes that belong to each. Used by both the dashboard
 * funnel chart and the deals list page's ?stage= filter.
 */

export type PipelineStageKey = "leads" | "talking" | "offer" | "contract" | "closed";

export const PIPELINE_STAGES: ReadonlyArray<{
  key: PipelineStageKey;
  label: string;
  description: string;
  statuses: string[];
}> = [
  {
    key: "leads",
    label: "Leads",
    description: "Just came in",
    statuses: ["new_lead_received", "pace_leads", "sent_back_to_bd", "incomplete_file"],
  },
  {
    key: "talking",
    label: "Talking",
    description: "Closer engaged with seller",
    statuses: [
      "closer_first_contact_attempted",
      "closer_first_contact_made",
      "closer_under_negotiation",
      "closer_gathering_docs",
    ],
  },
  {
    key: "offer",
    label: "Offer",
    description: "Underwriting + LOI in motion",
    statuses: [
      "uw_ready_phase_2",
      "uw_under_phase_2",
      "loi_ready",
      "loi_submitted",
      "loi_in_negotiation",
      "loi_signed_by_seller",
      "loi_accepted_both_sides",
    ],
  },
  {
    key: "contract",
    label: "Contract",
    description: "PSA + due diligence",
    statuses: [
      "tc_writing_psa",
      "tc_psa_submitted",
      "psa_accepted",
      "dm_dispo_initiated",
      "tc_dd_in_escrow",
      "dd_completed_in_escrow",
    ],
  },
  {
    key: "closed",
    label: "Closed",
    description: "RVX acquired or routed via network",
    statuses: ["closed_rvx_acquired", "closed_rvx_network"],
  },
];

const KEYS = new Set<string>(PIPELINE_STAGES.map((s) => s.key));

export function isPipelineStageKey(v: string | undefined): v is PipelineStageKey {
  return !!v && KEYS.has(v);
}

export function statusesForStage(key: PipelineStageKey): string[] {
  return PIPELINE_STAGES.find((s) => s.key === key)?.statuses ?? [];
}

export function labelForStage(key: PipelineStageKey): string {
  return PIPELINE_STAGES.find((s) => s.key === key)?.label ?? key;
}

/**
 * Role-based phase chips for the /deals filter. Each role buckets a subset
 * of the 34+ granular statuses. Maps 1:1 with the kanban lanes — so a deal
 * tagged "uw" appears on the Underwriting lane AND under this filter chip.
 *
 * Ordered to match the natural progression (intake → close → drip → dead).
 */
export const DEAL_PHASE_ROLES = [
  { value: "am", label: "Acquisitions", description: "New intake" },
  { value: "uw", label: "Underwriting", description: "Phase 1/2 review" },
  { value: "closer", label: "Closer", description: "Contact + negotiation" },
  { value: "pm", label: "LOI", description: "Letter of intent" },
  { value: "tc", label: "PSA / Escrow", description: "Contract + DD" },
  { value: "dm", label: "Dispo", description: "Sending to buyers" },
  { value: "closed", label: "Closed (won)", description: "RVX acquired or network" },
  { value: "drip", label: "Drip", description: "Follow-up cadence" },
  { value: "parked", label: "Parked", description: "Pending revisit" },
  { value: "dead", label: "Dead", description: "Not pursuing" },
  { value: "misc", label: "Misc", description: "Edge cases" },
] as const;

export type DealPhaseRole = (typeof DEAL_PHASE_ROLES)[number]["value"];

const ROLE_VALUES = new Set<string>(DEAL_PHASE_ROLES.map((r) => r.value));

export function isDealPhaseRole(v: string | undefined): v is DealPhaseRole {
  return !!v && ROLE_VALUES.has(v);
}
