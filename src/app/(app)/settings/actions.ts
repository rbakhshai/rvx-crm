"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rolePermissions, user as userTable, account as accountTable } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { recycleUserClaimedLeads } from "@/lib/leads-orphan";
import { sendNotification } from "@/lib/email";
import { teamInviteEmail, passwordResetEmail } from "@/lib/email-templates";
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
  return session.user;
}

// ============================================================================
// Role permissions
// ============================================================================

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

export async function setRolePermissionAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_roles");

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

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: AUDIT_ACTIONS.ROLE_PERMISSION_TOGGLED,
    target: { kind: "role", id: role, label: role },
    meta: { permissionKey: key, enabled },
  });

  revalidatePath("/settings/roles");
  revalidatePath("/settings/users");
}

export async function resetRoleToDefaultsAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_roles");

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

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: AUDIT_ACTIONS.ROLE_RESET_TO_DEFAULTS,
    target: { kind: "role", id: role, label: role },
  });

  revalidatePath("/settings/roles");
  void and;
}

// ============================================================================
// User management
// ============================================================================

export async function setUserRoleAction(formData: FormData): Promise<void> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_users");

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!userId) throw new Error("Missing userId");
  if (!(role in DEFAULT_PERMISSIONS)) throw new Error("Invalid role");

  const [before] = await db.select({ role: userTable.role, name: userTable.name, email: userTable.email }).from(userTable).where(eq(userTable.id, userId)).limit(1);
  if (!before) throw new Error("User not found");
  if (before.role === role) return;

  await db.update(userTable).set({ role, updatedAt: new Date() }).where(eq(userTable.id, userId));

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: AUDIT_ACTIONS.USER_ROLE_CHANGED,
    target: { kind: "user", id: userId, label: before.name ?? before.email },
    meta: { from: before.role, to: role },
  });

  revalidatePath("/settings/users");
}

/**
 * Generates a strong-but-readable temporary password the admin can share
 * manually with the invited teammate. Format: 3 dictionary-style chunks +
 * 4 digits. Example: "willow-river-cove-4192".
 *
 * Picked words avoid ambiguous look-alikes (no "rho", "mu") so it's easy
 * to type once.
 */
function generateTempPassword(): string {
  const words = [
    "amber","aspen","birch","blue","brook","cedar","clay","clover","cove","crow",
    "delta","ember","fawn","fern","forest","glen","gold","grove","harbor","heath",
    "hill","ivy","kite","lake","leaf","mist","moss","oak","ocean","onyx",
    "otter","park","peak","pine","plum","quill","raven","ridge","river","rose",
    "sage","salt","sand","seed","shade","sky","slate","sparrow","spruce","starlight",
    "stone","stream","summit","sun","thistle","valley","vine","willow","wren",
  ];
  // crypto.randomInt (not Math.random) — temp passwords are credentials,
  // so they must be unpredictable. randomInt is unbiased over its range.
  const pick = () => words[randomInt(words.length)];
  const digits = String(randomInt(1000, 10000));
  return `${pick()}-${pick()}-${pick()}-${digits}`;
}

/**
 * Create a new user with a temp password. Returns the temp password so the
 * admin can copy it from the toast and share it with the team member.
 *
 * Direct DB insertion (not auth.api.signUpEmail) so we don't accidentally
 * auto-sign-in as the new user — that's what kicked the admin out before.
 *
 * Phase B will swap this for a real Resend invite email.
 */
export async function inviteUserAction(formData: FormData): Promise<{ tempPassword: string; email: string; name: string; emailStatus: "sent" | "logged_only" | "failed" }> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_users");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "viewer") as Role;

  if (!name) throw new Error("Name is required");
  if (!email) throw new Error("Email is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email format");
  if (!(role in DEFAULT_PERMISSIONS)) throw new Error("Invalid role");

  const existing = await db.select({ id: userTable.id }).from(userTable).where(eq(userTable.email, email)).limit(1);
  if (existing.length > 0) throw new Error("A user with that email already exists");

  const tempPassword = generateTempPassword();
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(tempPassword);

  const userId = crypto.randomUUID();
  await db.insert(userTable).values({
    id: userId,
    name,
    email,
    role,
    emailVerified: false,
  });
  await db.insert(accountTable).values({
    id: crypto.randomUUID(),
    userId,
    accountId: email,
    providerId: "credential",
    password: hashed,
  });

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: AUDIT_ACTIONS.USER_INVITED,
    target: { kind: "user", id: userId, label: name },
    meta: { email, role },
  });

  // Fire the invite email (no-op if no provider configured; the admin will
  // still see the temp password in the toast as a manual fallback).
  const tmpl = teamInviteEmail({
    name,
    email,
    tempPassword,
    inviterName: actor.name ?? "An admin",
  });
  const send = await sendNotification({
    kind: "team_invite",
    to: email,
    subject: tmpl.subject,
    bodyMd: tmpl.bodyMd,
    payload: { userId, role, inviterId: actor.id },
  });

  revalidatePath("/settings/users");
  return { tempPassword, email, name, emailStatus: send.status };
}

/**
 * Generate a fresh temp password for an existing user. Used when a team
 * member forgets their password — admin clicks "Reset password" and shares
 * the new temp password with them.
 */
export async function resetUserPasswordAction(userId: string): Promise<{ tempPassword: string; name: string; email: string; emailStatus: "sent" | "logged_only" | "failed" }> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_users");

  if (!userId) throw new Error("Missing userId");

  const [target] = await db.select({ id: userTable.id, name: userTable.name, email: userTable.email }).from(userTable).where(eq(userTable.id, userId)).limit(1);
  if (!target) throw new Error("User not found");

  const tempPassword = generateTempPassword();
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(tempPassword);

  await db
    .update(accountTable)
    .set({ password: hashed, updatedAt: new Date() })
    .where(and(eq(accountTable.userId, userId), eq(accountTable.providerId, "credential")));

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
    target: { kind: "user", id: userId, label: target.name ?? target.email },
  });

  const tmpl = passwordResetEmail({
    name: target.name,
    email: target.email,
    tempPassword,
    resetterName: actor.name ?? "An admin",
  });
  const send = await sendNotification({
    kind: "password_reset",
    to: target.email,
    subject: tmpl.subject,
    bodyMd: tmpl.bodyMd,
    payload: { userId, resetterId: actor.id },
  });

  revalidatePath("/settings/users");
  return { tempPassword, name: target.name, email: target.email, emailStatus: send.status };
}

export async function setUserSuspendedAction(userId: string, suspend: boolean): Promise<void> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_users");

  if (!userId) throw new Error("Missing userId");
  if (userId === actor.id) throw new Error("You can't suspend yourself");

  const [target] = await db.select({ name: userTable.name, email: userTable.email }).from(userTable).where(eq(userTable.id, userId)).limit(1);
  if (!target) throw new Error("User not found");

  await db
    .update(userTable)
    .set({
      suspendedAt: suspend ? new Date() : null,
      suspendedById: suspend ? actor.id : null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  // Orphan-park policy: when a BD is suspended, recycle every lead
  // they had actively claimed back to the pool so another teammate
  // can pick them up. Notes survive — they live in
  // raw_lead_dispositions, which is keyed off the lead, not the user.
  const recycled = suspend ? await recycleUserClaimedLeads(userId) : 0;

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: suspend ? AUDIT_ACTIONS.USER_SUSPENDED : AUDIT_ACTIONS.USER_UNSUSPENDED,
    target: { kind: "user", id: userId, label: target.name ?? target.email },
    meta: recycled > 0 ? { recycledLeads: recycled } : undefined,
  });

  revalidatePath("/settings/users");
  if (recycled > 0) {
    revalidatePath("/admin/leads");
    revalidatePath("/lead-work");
  }
}

export async function deleteUserAction(userId: string): Promise<void> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_users");

  if (!userId) throw new Error("Missing userId");
  if (userId === actor.id) throw new Error("You can't delete yourself");

  const [target] = await db.select({ name: userTable.name, email: userTable.email }).from(userTable).where(eq(userTable.id, userId)).limit(1);
  if (!target) throw new Error("User not found");

  await db
    .update(userTable)
    .set({
      deletedAt: new Date(),
      deletedById: actor.id,
      // also auto-suspend so any leftover sessions can't act
      suspendedAt: new Date(),
      suspendedById: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  // Orphan-park policy — same as on suspend, but covers the case
  // where the admin goes straight to delete without suspending first.
  const recycled = await recycleUserClaimedLeads(userId);

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: AUDIT_ACTIONS.USER_DELETED,
    target: { kind: "user", id: userId, label: target.name ?? target.email },
    meta: recycled > 0 ? { recycledLeads: recycled } : undefined,
  });

  revalidatePath("/settings/users");
  if (recycled > 0) {
    revalidatePath("/admin/leads");
    revalidatePath("/lead-work");
  }
}

export async function restoreUserAction(userId: string): Promise<void> {
  const actor = await requireAdmin();
  await requirePermission(actor, "manage_users");

  if (!userId) throw new Error("Missing userId");

  const [target] = await db.select({ name: userTable.name, email: userTable.email }).from(userTable).where(eq(userTable.id, userId)).limit(1);
  if (!target) throw new Error("User not found");

  await db
    .update(userTable)
    .set({
      deletedAt: null,
      deletedById: null,
      suspendedAt: null,
      suspendedById: null,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId));

  await recordAudit({
    actor: { id: actor.id, name: actor.name, email: actor.email },
    action: AUDIT_ACTIONS.USER_RESTORED,
    target: { kind: "user", id: userId, label: target.name ?? target.email },
  });

  revalidatePath("/settings/users");
}
