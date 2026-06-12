/**
 * Company announcements — leadership posts visible to every BD on
 * their Today hub (Bird Dog spec Phase 4: "Leadership can post
 * updates visible to all Bird Dogs").
 *
 * Soft-delete via deletedAt so a removed post disappears everywhere
 * without losing the audit trail.
 */
import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    body: text("body").notNull(),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => ({
    // Feed query: newest non-deleted first.
    feedIdx: index("announcements_feed_idx").on(t.deletedAt, t.createdAt),
  }),
);

export type Announcement = typeof announcements.$inferSelect;
