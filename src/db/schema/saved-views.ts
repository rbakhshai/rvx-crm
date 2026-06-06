/**
 * User-pinned filter combinations for list pages. "My hot deals",
 * "Stuck >14d", "Closing this month" — click once, apply the whole
 * filter set instead of re-picking chips every time.
 *
 * Scope is the list page key: "deals" | "contacts" | "companies" | "bird_dogs".
 * Params is a frozen snapshot of the URL search params at save time.
 */
import { pgTable, text, jsonb, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const savedViews = pgTable(
  "saved_views",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    scope: text("scope").notNull(),       // "deals" | "contacts" | "companies" | "bird_dogs"
    label: text("label").notNull(),
    params: jsonb("params").notNull(),    // { phase: "closer", priority: "hot", ... }
    sortOrder: integer("sort_order").notNull().default(0),
    isPinned: boolean("is_pinned").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userScopeIdx: index("saved_views_user_scope_idx").on(t.userId, t.scope, t.sortOrder),
  }),
);

export type SavedView = typeof savedViews.$inferSelect;
