/**
 * Super-admin "View as" — lets the CEO (admin role) experience the app
 * exactly as any other role sees it.
 *
 * Mechanism: a cookie holds the role being previewed. hasPermission /
 * getPermissionsFor resolve the EFFECTIVE role (cookie wins when the
 * real role is admin), so every page gate, nav filter, and server
 * action automatically reflects the previewed role — a faithful
 * preview, including losing admin powers while it's active. The
 * sidebar picker + exit banner are always rendered off the REAL role,
 * so the admin can never lock themselves out.
 *
 * Only `admin` can activate it, and the cookie is ignored for everyone
 * else — a non-admin sending the cookie by hand changes nothing.
 */
import { cookies } from "next/headers";
import { ROLES, type Role } from "./permissions";

export const VIEW_AS_COOKIE = "rvx_view_as_role";

/** Roles an admin may preview. bird_dog is excluded (external portal,
 *  different shell); viewer is deprecated. */
export const VIEWABLE_ROLES: ReadonlyArray<{ value: Role; label: string }> = ROLES
  .filter((r) => r.value !== "admin")
  .map((r) => ({ value: r.value, label: r.label }));

const VIEWABLE_SET = new Set(VIEWABLE_ROLES.map((r) => r.value));

/**
 * The role to use for permission checks. Falls back to the real role
 * whenever: not an admin, no cookie, invalid cookie value, or we're
 * outside a request scope (cookies() throws during static generation).
 */
export async function getEffectiveRole(
  realRole: string | null | undefined,
): Promise<string | null | undefined> {
  if (realRole !== "admin") return realRole;
  try {
    const jar = await cookies();
    const v = jar.get(VIEW_AS_COOKIE)?.value;
    if (v && VIEWABLE_SET.has(v as Role)) return v;
  } catch {
    // Not in a request context — behave as the real role.
  }
  return realRole;
}

/** The active preview role, or null when not previewing. */
export async function getActiveViewAs(
  realRole: string | null | undefined,
): Promise<Role | null> {
  if (realRole !== "admin") return null;
  try {
    const jar = await cookies();
    const v = jar.get(VIEW_AS_COOKIE)?.value;
    if (v && VIEWABLE_SET.has(v as Role)) return v as Role;
  } catch {
    /* outside request scope */
  }
  return null;
}
