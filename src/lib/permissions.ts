/**
 * Permission registry — canonical list of what users can do in the CRM,
 * plus per-role defaults. The defaults are SEEDED into role_permissions
 * on first visit to /settings/roles; after that the DB is the source of
 * truth and admins can toggle freely.
 *
 * Permission keys are stable strings — never rename without a migration.
 * Use the `PermissionKey` type everywhere a permission is checked.
 */

/**
 * Role values must still match the database pgEnum (`user_role` in
 * src/db/schema/auth.ts). The DB enum still carries `viewer` for
 * compatibility, but it is no longer offered as an internal role —
 * users on `viewer` keep working but have no granted permissions.
 */
export type Role =
  | "admin"
  | "acquisitions_manager"
  | "closer"
  | "bird_dog_manager"
  | "bird_dog"
  | "transaction_coord"
  | "underwriter"
  | "dispo_manager"
  | "cfo"
  | "due_diligence"
  | "viewer"
  | "bd_level_1"
  | "bd_level_2"
  | "bd_level_3"
  | "park_manager";

/**
 * Visible roles, in the canonical org hierarchy you pinned:
 *   Admin · Sales & Marketing · Operations · Finance · BD level 1/2/3 ·
 *   Closer · UW · DD · TC · Dispo
 *
 * The role *enum values* (acquisitions_manager, bird_dog_manager, cfo)
 * stayed put so existing seat assignments and permission grants still
 * work — only the human-readable labels changed to functional names:
 *   acquisitions_manager → "Sales & Marketing"  (Erica)
 *   bird_dog_manager     → "Operations"          (Marco)
 *   cfo                  → "Finance"             (Kevin)
 *
 * `bd_level_1/2/3` are internal seats under Sales & Marketing (Erica
 * manages bird-dog sourcing); their starter permissions mirror the
 * Operations grant and can be tuned per-role in /settings/roles.
 *
 * Viewer is intentionally absent. `bird_dog` (lowercase) is also omitted
 * because it's the external-portal role assigned to scouts, not a CRM
 * role anyone picks from a dropdown.
 */
export const ROLES: ReadonlyArray<{ value: Role; label: string; description: string }> = [
  { value: "admin",                label: "Admin",              description: "Full access. Reserved for owners." },
  { value: "acquisitions_manager", label: "Sales & Marketing",  description: "Runs sales, marketing, and the bird-dog team." },
  { value: "bird_dog_manager",     label: "Operations",         description: "Runs operations — closing, DD, escrow, post-close." },
  { value: "cfo",                  label: "Finance",            description: "Owns books, revenue, and financial reporting." },
  { value: "park_manager",         label: "Park Manager",       description: "Runs day-to-day at a specific park. Leadership tier for New Hires." },
  { value: "bd_level_1",           label: "BD level 1",         description: "Senior bird-dog seat." },
  { value: "bd_level_2",           label: "BD level 2",         description: "Mid-tier bird-dog seat." },
  { value: "bd_level_3",           label: "BD level 3",         description: "Junior bird-dog seat." },
  { value: "closer",               label: "Closer",             description: "Negotiates with sellers." },
  { value: "underwriter",          label: "UW",                 description: "Phase 2 financial review." },
  { value: "due_diligence",        label: "DD",                 description: "Runs DD on under-contract deals." },
  { value: "transaction_coord",    label: "TC",                 description: "Owns PSA + escrow paperwork." },
  { value: "dispo_manager",        label: "Dispo",              description: "Routes deals to buyer network." },
];

// ============================================================================
// Permission keys + groupings
// ============================================================================

export type PermissionKey =
  | "create_deals" | "edit_deals" | "delete_deals"
  | "create_contacts" | "edit_contacts" | "delete_contacts"
  | "create_companies" | "edit_companies" | "delete_companies"
  | "create_bird_dogs" | "edit_bird_dogs" | "delete_bird_dogs"
  | "view_trash" | "restore_from_trash" | "purge_permanently"
  | "view_revenue" | "view_pipeline_value"
  | "dispo_to_buyers" | "use_triage_cockpit"
  | "manage_users" | "manage_roles"
  // Per-tab visibility — every left-sidebar entry has a key here so admins
  // can toggle which roles see which tabs from /settings/roles.
  | "view_mission_control"
  | "view_dashboard"
  | "view_today"
  | "view_tasks"
  | "view_issues"
  | "view_pipeline"
  | "view_contacts"
  | "view_bird_dogs_directory"
  | "view_hires"
  | "manage_hires"
  | "view_reimbursements"
  | "manage_reimbursements";

export type PermissionGroup = {
  label: string;
  permissions: Array<{ key: PermissionKey; label: string; description: string }>;
};

export const PERMISSION_GROUPS: ReadonlyArray<PermissionGroup> = [
  {
    label: "Deals",
    permissions: [
      { key: "create_deals", label: "Create deals", description: "Add a new deal" },
      { key: "edit_deals", label: "Edit deals", description: "Change deal fields, stage, owners" },
      { key: "delete_deals", label: "Delete deals", description: "Soft-delete a deal (move to trash)" },
    ],
  },
  {
    label: "Buyers",
    permissions: [
      { key: "create_contacts", label: "Create buyers", description: "Add a new buyer contact" },
      { key: "edit_contacts", label: "Edit buyers", description: "Change buyer fields and criteria" },
      { key: "delete_contacts", label: "Delete buyers", description: "Soft-delete a buyer" },
    ],
  },
  {
    label: "Sellers",
    permissions: [
      { key: "create_companies", label: "Create sellers", description: "Add a new seller / company" },
      { key: "edit_companies", label: "Edit sellers", description: "Change seller fields" },
      { key: "delete_companies", label: "Delete sellers", description: "Soft-delete a seller" },
    ],
  },
  {
    label: "Bird Dogs",
    permissions: [
      { key: "create_bird_dogs", label: "Create bird dogs", description: "Add a new bird dog (team member)" },
      { key: "edit_bird_dogs", label: "Edit bird dogs", description: "Change bird dog status, level" },
      { key: "delete_bird_dogs", label: "Delete bird dogs", description: "Soft-delete a bird dog" },
    ],
  },
  {
    label: "Trash",
    permissions: [
      { key: "view_trash", label: "See trash", description: "Open the /trash page" },
      { key: "restore_from_trash", label: "Restore from trash", description: "Bring soft-deleted records back" },
      { key: "purge_permanently", label: "Delete forever", description: "Hard-delete from trash — irreversible" },
    ],
  },
  {
    label: "Workflow",
    permissions: [
      { key: "dispo_to_buyers", label: "Dispo to buyers", description: "Send deal email to buyer list" },
      { key: "use_triage_cockpit", label: "Use triage cockpit", description: "Open /triage to work the closer queue" },
    ],
  },
  {
    label: "Money / Sensitive",
    permissions: [
      { key: "view_revenue", label: "See Park Performance", description: "Owned-park revenue + ROI dashboard" },
      { key: "view_pipeline_value", label: "See pipeline value", description: "Dollar totals across deals" },
    ],
  },
  {
    label: "Sidebar Tabs",
    permissions: [
      { key: "view_mission_control", label: "See Mission Control", description: "/mission-control top-level tab" },
      { key: "view_dashboard", label: "See Dashboard", description: "/dashboard per-role dashboard" },
      { key: "view_today", label: "See Today", description: "/today daily driver" },
      { key: "view_tasks", label: "See Tasks", description: "/tasks queue" },
      { key: "view_issues", label: "See Issues", description: "/issues IDS board" },
      { key: "view_pipeline", label: "See Pipeline", description: "/triage, /deals, /deals/board" },
      { key: "view_contacts", label: "See Contacts", description: "Buyers + Sellers tabs" },
      { key: "view_bird_dogs_directory", label: "See Bird Dogs", description: "/bird-dogs roster top-level tab" },
      { key: "view_hires", label: "See New Hires", description: "/hires leadership-only hiring workflow" },
      { key: "view_reimbursements", label: "See Reimbursements", description: "/reimbursements leadership-only purchase requests" },
    ],
  },
  {
    label: "New Hires",
    permissions: [
      { key: "manage_hires", label: "Create + advance hires", description: "Open a new request, edit fields, move it through the workflow" },
    ],
  },
  {
    label: "Reimbursements",
    permissions: [
      { key: "manage_reimbursements", label: "Create + approve reimbursements", description: "Submit a purchase request, approve / decline / mark purchased / mark fulfilled" },
    ],
  },
  {
    label: "Admin",
    permissions: [
      { key: "manage_users", label: "Manage users", description: "Add users, assign roles" },
      { key: "manage_roles", label: "Manage role permissions", description: "Toggle which permissions each role has" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: ReadonlyArray<PermissionKey> = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

// ============================================================================
// Role defaults — initial seed of the role_permissions table.
// Admins can change anything after seed.
// ============================================================================

/** Helper to build a default row from a list of granted permissions. */
function grant(...keys: PermissionKey[]): Record<PermissionKey, boolean> {
  const out = Object.fromEntries(ALL_PERMISSION_KEYS.map((k) => [k, false])) as Record<PermissionKey, boolean>;
  for (const k of keys) out[k] = true;
  return out;
}

/** Admin gets everything; explicit so the registry doc reads cleanly. */
const ALL: Record<PermissionKey, boolean> = grant(...ALL_PERMISSION_KEYS);

/**
 * Standard nav-tab visibility for any internal CRM user. Every role
 * starts with these; an admin can revoke per-role from /settings/roles.
 * Park Performance (view_revenue) is intentionally OUT so it stays
 * gated to roles that explicitly grant it.
 */
const STANDARD_NAV: PermissionKey[] = [
  "view_mission_control",
  "view_dashboard",
  "view_today",
  "view_tasks",
  "view_issues",
  "view_pipeline",
  "view_contacts",
  "view_bird_dogs_directory",
];

export const DEFAULT_PERMISSIONS: Record<Role, Record<PermissionKey, boolean>> = {
  admin: ALL,

  // Sales & Marketing role (Erica). Effectively a working admin: keeps
  // delete + trash permissions so she can clean up records (you noted
  // only you + Erica should ever delete).
  acquisitions_manager: grant(
    ...STANDARD_NAV,
    "create_deals", "edit_deals", "delete_deals",
    "create_contacts", "edit_contacts", "delete_contacts",
    "create_companies", "edit_companies", "delete_companies",
    "create_bird_dogs", "edit_bird_dogs", "delete_bird_dogs",
    "use_triage_cockpit", "dispo_to_buyers",
    "view_pipeline_value",
    "view_trash", "restore_from_trash", "purge_permanently",
    "view_hires", "manage_hires",
    "view_reimbursements", "manage_reimbursements",
  ),

  // Closer — generic role for future hires. View Park Performance was
  // an exception granted for Marco; new closers can be flipped on per
  // role in /settings/roles if desired.
  closer: grant(
    ...STANDARD_NAV,
    "create_deals", "edit_deals",
    "create_contacts", "edit_contacts",
    "edit_companies",
    "use_triage_cockpit", "dispo_to_buyers",
    "view_pipeline_value",
  ),

  // Operations role (Marco). Keeps the closer workflow — triage cockpit
  // + dispo. Also gets Park Performance since Marco needs the revenue
  // signal while he's closing live deals.
  bird_dog_manager: grant(
    ...STANDARD_NAV,
    "create_deals", "edit_deals",
    "create_contacts", "edit_contacts",
    "create_bird_dogs", "edit_bird_dogs",
    "use_triage_cockpit", "dispo_to_buyers",
    "view_pipeline_value", "view_revenue",
    "view_hires", "manage_hires",
    "view_reimbursements", "manage_reimbursements",
  ),

  transaction_coord: grant(
    ...STANDARD_NAV,
    "edit_deals",
    "edit_contacts", "edit_companies",
    "view_pipeline_value",
  ),

  underwriter: grant(
    ...STANDARD_NAV,
    "edit_deals",
    "view_pipeline_value",
  ),

  dispo_manager: grant(
    ...STANDARD_NAV,
    "edit_deals",
    "edit_contacts",
    "dispo_to_buyers",
    "view_pipeline_value",
  ),

  // Finance (Kevin) sees Park Performance + the Hires queue (he runs
  // the finance/tax/legal pass on every new hire request).
  cfo: grant(
    ...STANDARD_NAV,
    "view_pipeline_value",
    "view_revenue",
    "view_hires", "manage_hires",
    "view_reimbursements", "manage_reimbursements",
  ),

  due_diligence: grant(
    ...STANDARD_NAV,
    "edit_deals",
    "view_pipeline_value",
  ),

  // viewer is deprecated — kept for DB-enum compatibility only.
  // Any user still on this role gets zero permissions until reassigned.
  viewer: grant(),

  // Bird dogs go to the external portal, not the CRM — no perms here.
  bird_dog: grant(),

  // Bird-dog tier seats. Starter grants mirror Operations (bird_dog_manager)
  // so new accounts are functional out of the box; tune via /settings/roles.
  bd_level_1: grant(
    ...STANDARD_NAV,
    "create_deals", "edit_deals",
    "create_contacts", "edit_contacts",
    "create_bird_dogs", "edit_bird_dogs",
    "view_pipeline_value",
  ),
  bd_level_2: grant(
    ...STANDARD_NAV,
    "edit_deals",
    "edit_contacts",
    "create_bird_dogs", "edit_bird_dogs",
    "view_pipeline_value",
  ),
  bd_level_3: grant(
    ...STANDARD_NAV,
    "edit_contacts",
    "edit_bird_dogs",
    "view_pipeline_value",
  ),

  // Park manager (Lyn). Runs operations at a specific park; counts as
  // leadership for the New Hires queue (so she can initiate hire
  // requests for her park's staff). Light grants beyond Hires +
  // standard nav — they can be widened from /settings/roles later.
  park_manager: grant(
    ...STANDARD_NAV,
    "view_hires", "manage_hires",
    "view_reimbursements", "manage_reimbursements",
  ),
};
