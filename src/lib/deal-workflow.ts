/**
 * Deal workflow — maps roles to their deal stages and responsible statuses.
 *
 * As deals mature, they flow through the pipeline:
 *   BD L1/L2 → Closer L3 → Underwriter → TC/PM → DD → Dispo → Operations → Finance
 *
 * Each role sees deals in their stage(s) and is responsible for moving them forward.
 */

export const ROLE_TO_STATUS_GROUP: Record<string, string[]> = {
  bd_level_1: ["am"],
  bd_level_2: ["am"],
  closer: ["closer"],
  underwriter: ["uw"],
  transaction_coord: ["tc"],
  park_manager: ["tc"],
  due_diligence: ["tc"],
  dispo_manager: ["dm"],
  cfo: ["closed"],
  acquisitions_manager: ["am", "uw", "closer", "pm", "tc", "dm", "closed"],
  bird_dog_manager: ["am", "uw", "closer", "pm", "tc", "dm", "closed"],
  admin: ["am", "uw", "closer", "pm", "tc", "dm", "closed", "dead", "parked", "drip", "misc"],
};

export function getStatusGroupsForRole(role: string | null | undefined): string[] {
  if (!role) return ["closed"];
  return ROLE_TO_STATUS_GROUP[role] || [];
}

export const STATUS_ROLE_LABELS: Record<string, string> = {
  am: "Acquisitions",
  uw: "Underwriting",
  closer: "Closing",
  pm: "Project Management",
  tc: "Transactions",
  dm: "Dispositions",
  drip: "Follow-Up",
  parked: "Parked",
  closed: "Closed",
  dead: "Dead",
  misc: "Miscellaneous",
};
