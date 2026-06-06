/**
 * Per-day "skip" log for the Do Next stack. When a user dismisses an item
 * for today, we record (user, kind, id, date) here so the same item
 * doesn't reappear until tomorrow.
 */
import { pgTable, text, date, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const doNextSkips = pgTable(
  "do_next_skips",
  {
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    itemKind: text("item_kind").notNull(),       // "task" | "at_risk" | "new_lead"
    itemId: text("item_id").notNull(),
    skippedForDate: date("skipped_for_date").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.itemKind, t.itemId, t.skippedForDate] }),
  }),
);
