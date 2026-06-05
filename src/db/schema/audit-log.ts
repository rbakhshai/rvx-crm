/**
 * Admin audit log. One row per administrative action so an owner can
 * always answer "who did X and when?" — invites, role changes, permission
 * toggles, suspensions, deletions.
 *
 * Intentionally generic so future actions can log without schema changes:
 *   actorId  - who did the thing
 *   action   - stable string key, e.g. "user.invited", "role.permission_toggled"
 *   target   - optional kind+id pair the action affected
 *   meta     - free-form JSON for extra context (old/new role, key, etc.)
 */
import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    actorId: text("actor_id").notNull(),
    actorName: text("actor_name"),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetKind: text("target_kind"),
    targetId: text("target_id"),
    targetLabel: text("target_label"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    createdAtIdx: index("admin_audit_log_created_at_idx").on(t.createdAt),
    actorIdx: index("admin_audit_log_actor_idx").on(t.actorId),
  }),
);

export type AdminAuditLogRow = typeof adminAuditLog.$inferSelect;
