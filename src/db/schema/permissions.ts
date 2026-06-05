/**
 * Per-role permission grants. One row per (role, permission_key).
 * Source of truth at runtime; canonical defaults live in
 * src/lib/permissions.ts and seed this table on first visit to
 * /settings/roles.
 */
import { pgTable, text, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { userRole } from "./auth";

export const rolePermissions = pgTable(
  "role_permissions",
  {
    role: userRole("role").notNull(),
    permissionKey: text("permission_key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.role, t.permissionKey] }),
  }),
);

export type RolePermissionRow = typeof rolePermissions.$inferSelect;
