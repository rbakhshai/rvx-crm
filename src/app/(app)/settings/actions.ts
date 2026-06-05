"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rolePermissions, user as userTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";
import {
  DEFAULT_PERMISSIONS,
  ROLES,
  type PermissionKey,
  type Role,
  ALL_PERMISSION_KEYS,
} from "@/lib/permissions";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  // Specific check: manage_roles for the toggle endpoint, manage_users for the assign endpoint.
  // The caller passes the right key.
  return session.user;
}

/**
 * Seed missing (role, permission_key) rows from the code defaults.
 * Idempotent — safe to call on every page load. Returns the live state.
 */
export async function ensureRolePermissionsSeeded(): Promise<void> {
  const existing = await db.select({ role: rolePermissions.role, key: rolePermissions.permissionKey }).from(rolePermissions);
  const have = new Set(existing.map((r) => `${r.role}:${r.key}`));

  const inserts: Array<{ role: Role; permissionKey: PermissionKey; enabled: boolean }> = [];
  for (const r of ROLES) {
    for (const key of ALL_PERMISSION_KEYS) {
      if (have.has(`${r.value}:${key}`)) continue;
      inserts.push({ role: r.value, permissionKey: key, enabled: DEFAULT_PERMISSIONS[r.value][key] });
    }
  }
  if (inserts.length > 0) {
    await db.insert(rolePermissions).values(inserts);
  }
}

/**
 * Set a (role, permission) cell. Called from each checkbox toggle in the
 * /settings/roles matrix.
 */
export async function setRolePermissionAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  await requirePermission(user, "manage_roles");

  const role = String(formData.get("role") ?? "") as Role;
  const key = String(formData.get("key") ?? "") as PermissionKey;
  const enabled = String(formData.get("enabled") ?? "") === "true";

  if (!(role in DEFAULT_PERMISSIONS)) throw new Error("Invalid role");

  await db
    .insert(rolePermissions)
    .values({ role, permissionKey: key, enabled, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [rolePermissions.role, rolePermissions.permissionKey],
      set: { enabled, updatedAt: new Date() },
    });

  revalidatePath("/settings/roles");
  revalidatePath("/settings/users");
}

/** Assign a role to a user from /settings/users. */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  await requirePermission(user, "manage_users");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!userId) throw new Error("Missing userId");
  if (!(role in DEFAULT_PERMISSIONS)) throw new Error("Invalid role");

  await db.update(userTable).set({ role }).where(eq(userTable.id, userId));

  revalidatePath("/settings/users");
}

/** Restore all of a single role's permissions to the code defaults. */
export async function resetRoleToDefaultsAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  await requirePermission(user, "manage_roles");

  const role = String(formData.get("role") ?? "") as Role;
  if (!(role in DEFAULT_PERMISSIONS)) throw new Error("Invalid role");

  const values = ALL_PERMISSION_KEYS.map((key) => ({
    role,
    permissionKey: key,
    enabled: DEFAULT_PERMISSIONS[role][key],
    updatedAt: new Date(),
  }));

  for (const v of values) {
    await db
      .insert(rolePermissions)
      .values(v)
      .onConflictDoUpdate({
        target: [rolePermissions.role, rolePermissions.permissionKey],
        set: { enabled: v.enabled, updatedAt: v.updatedAt },
      });
  }

  revalidatePath("/settings/roles");
  // also silence import warning
  void and;
}
