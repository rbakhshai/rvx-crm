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
  | "viewer";

/**
 * Visible roles, in display order. Order is the canonical org hierarchy
 * the user pinned: Admin, COS, COO, Closer, Underwriter, DD, Dispo, CFO, TC.
 *
 * acquisitions_manager and bird_dog_manager are relabeled in place to
 * COS / COO so existing role assignments (Reza, Erica) keep their granted
 * permissions — only the display label changes.
 *
 * Viewer is intentionally absent. bird_dog is omitted because it's an
 * external-portal role assigned automatically, not a CRM role anyone
 * picks from a dropdown.
 */
export const ROLES: ReadonlyArray<{ value: Role; label: string; description: string }> = [
  { value: "admin",                label: "Admin",       description: "Full access. Reserved for owners." },
  { value: "acquisitions_manager", label: "COS",         description: "Chief of Staff — runs acquisitions + triage." },
  { value: "bird_dog_manager",     label: "COO",         description: "Chief Operating Officer — owns scouts + ops." },
  { value: "closer",               label: "Closer",      description: "Negotiates with sellers." },
  { value: "underwriter",          label: "Underwriter", description: "Phase 2 financial review." },
  { value: "due_diligence",        label: "DD",          description: "Runs DD on under-contract deals." },
  { value: "dispo_manager",        label: "Dispo",       description: "Routes deals to buyer network." },
  { value: "cfo",                  label: "CFO",         description: "Reads financials + revenue." },
  { value: "transaction_coord",    label: "TC",          description: "Owns PSA + escrow paperwork." },
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
  | "manage_users" | "manage_roles";

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
      { key: "view_revenue", label: "See revenue dashboard", description: "Stripe revenue on /admin/revenue" },
      { key: "view_pipeline_value", label: "See pipeline value", description: "Dollar totals across deals" },
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

export const DEFAULT_PERMISSIONS: Record<Role, Record<PermissionKey, boolean>> = {
  admin: ALL,

  acquisitions_manager: grant(
    "create_deals", "edit_deals",
    "create_contacts", "edit_contacts",
    "create_companies", "edit_companies",
    "create_bird_dogs", "edit_bird_dogs",
    "use_triage_cockpit", "dispo_to_buyers",
    "view_pipeline_value",
  ),

  closer: grant(
    "create_deals", "edit_deals",
    "create_contacts", "edit_contacts",
    "edit_companies",
    "use_triage_cockpit", "dispo_to_buyers",
    "view_pipeline_value",
  ),

  bird_dog_manager: grant(
    "create_deals", "edit_deals",
    "create_contacts", "edit_contacts",
    "create_bird_dogs", "edit_bird_dogs",
    "view_pipeline_value",
  ),

  transaction_coord: grant(
    "edit_deals",
    "edit_contacts", "edit_companies",
    "view_pipeline_value",
  ),

  underwriter: grant(
    "edit_deals",
    "view_pipeline_value",
  ),

  dispo_manager: grant(
    "edit_deals",
    "edit_contacts",
    "dispo_to_buyers",
    "view_pipeline_value",
  ),

  cfo: grant(
    "view_pipeline_value",
    "view_revenue",
  ),

  due_diligence: grant(
    "edit_deals",
    "view_pipeline_value",
  ),

  // viewer is deprecated — kept for DB-enum compatibility only.
  // Any user still on this role gets zero permissions until reassigned.
  viewer: grant(),

  // Bird dogs go to the external portal, not the CRM — no perms here.
  bird_dog: grant(),
};
