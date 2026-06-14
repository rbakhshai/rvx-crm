/**
 * User-customized column layouts for list pages (Contacts, Companies, Deals).
 * Stores which columns are visible, in what order, per user per list type.
 *
 * Scope: "contacts" | "companies" | "deals"
 * Columns: array of {key: string, visible: boolean, order: number}
 */
import { pgTable, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const userListPreferences = pgTable(
  "user_list_preferences",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(), // "contacts" | "companies" | "deals"
    columns: jsonb("columns").notNull().$type<Array<{ key: string; visible: boolean; order: number }>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userScopeIdx: index("user_list_preferences_user_scope_idx").on(t.userId, t.scope),
  }),
);

export type UserListPreferences = typeof userListPreferences.$inferSelect;
export type UserListPreferencesInsert = typeof userListPreferences.$inferInsert;
