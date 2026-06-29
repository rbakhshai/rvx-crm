/**
 * Server-side permission checks. Reads from role_permissions, falling back
 * to the code defaults if no row exists yet (e.g., a permission key added
 * in code but not yet seeded into the DB).
 *
 * Two helpers:
 *   hasPermission(user, key)     -> boolean
 *   requirePermission(user, key) -> throws Error if not allowed
 *
 * In a Server Component / Server Action just await one of these; in a
 * Client Component, pass the boolean down as a prop.
 */
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rolePermissions } from "@/db/schema";
import { DEFAULT_PERMISSIONS, type PermissionKey, type Role } from "./permissions";
import { getEffectiveRole } from "./view-as";

type UserLike = { role?: string | null };

function asRole(role: string | null | undefined): Role | null {
  if (!role) return null;
  if (role in DEFAULT_PERMISSIONS) return role as Role;
  return null;
}

/**
 * Per-request memoized full permission map, keyed by the raw role
 * string. React's cache() dedupes repeat calls within a single render
 * or server action, so a page that checks 5 permissions makes ONE
 * role_permissions query instead of 5 (and resolves "view as" once).
 */
const cachedPermissionsFor = cache(getPermissionsFor);

export async function hasPermission(
  user: UserLike | null | undefined,
  key: PermissionKey,
): Promise<boolean> {
  // Route through the cached bulk map — "view as" + the DB lookup happen
  // once per request no matter how many keys are checked. Non-admins
  // pass through unchanged.
  const map = await cachedPermissionsFor(user?.role ?? null);
  return map[key] ?? false;
}

export async function requirePermission(
  user: UserLike | null | undefined,
  key: PermissionKey,
): Promise<void> {
  if (!(await hasPermission(user, key))) {
    throw new Error(`Permission denied: ${key}`);
  }
}

/**
 * Bulk fetch a full permission map for a role — used by the layout to
 * render the nav (so we don't make 10 DB calls per page).
 */
export async function getPermissionsFor(role: string | null | undefined): Promise<Record<PermissionKey, boolean>> {
  const r = asRole(await getEffectiveRole(role));
  if (!r) return Object.fromEntries((Object.keys(DEFAULT_PERMISSIONS.admin) as PermissionKey[]).map((k) => [k, false])) as Record<PermissionKey, boolean>;

  const rows = await db
    .select({ permissionKey: rolePermissions.permissionKey, enabled: rolePermissions.enabled })
    .from(rolePermissions)
    .where(eq(rolePermissions.role, r));

  const dbMap = new Map(rows.map((row) => [row.permissionKey, row.enabled]));
  const defaults = DEFAULT_PERMISSIONS[r];
  const out = {} as Record<PermissionKey, boolean>;
  for (const k of Object.keys(defaults) as PermissionKey[]) {
    out[k] = dbMap.has(k) ? dbMap.get(k)! : defaults[k];
  }
  return out;
}
