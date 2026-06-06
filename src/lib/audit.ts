/**
 * Audit log writer. Records one row in admin_audit_log for every
 * administrative action so an owner can answer "who did X and when?"
 *
 * Stable action keys live here so we can grep for who fires what.
 */
import { db } from "@/db";
import { adminAuditLog } from "@/db/schema";

export const AUDIT_ACTIONS = {
  USER_INVITED: "user.invited",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_SUSPENDED: "user.suspended",
  USER_UNSUSPENDED: "user.unsuspended",
  USER_DELETED: "user.deleted",
  USER_RESTORED: "user.restored",
  USER_PURGED: "user.purged",
  USER_PASSWORD_RESET: "user.password_reset",
  ROLE_PERMISSION_TOGGLED: "role.permission_toggled",
  ROLE_RESET_TO_DEFAULTS: "role.reset_to_defaults",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export async function recordAudit(opts: {
  actor: { id: string; name?: string | null; email?: string | null };
  action: AuditAction;
  target?: { kind: string; id: string; label?: string | null };
  meta?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(adminAuditLog).values({
    actorId: opts.actor.id,
    actorName: opts.actor.name ?? null,
    actorEmail: opts.actor.email ?? null,
    action: opts.action,
    targetKind: opts.target?.kind ?? null,
    targetId: opts.target?.id ?? null,
    targetLabel: opts.target?.label ?? null,
    meta: opts.meta ?? null,
  });
}
