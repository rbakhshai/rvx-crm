import { pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Per-person Command Rocks — the quarterly (or monthly / weekly)
 * commitments each teammate owns. Renders under their name on the
 * Mission Control / Command tab when the matching period is selected.
 *
 * Distinct from:
 *   - tasks (polymorphic on a parent record; smaller / daily)
 *   - Level 10 company rocks (hardcoded on the L10 page; org-wide)
 *
 * Keeping them simple: title + assignee + period + done. No status
 * pill / progress %, no checklist. EOS-style rocks are pass/fail.
 */
export const commandRocks = pgTable(
  "command_rocks",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    assigneeId: text("assignee_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** Display order within an assignee's list. */
    position: integer("position").notNull().default(0),
    /** "week" | "month" | "quarter" — drives which period view shows this rock. */
    period: text("period").notNull().default("quarter"),
    doneAt: timestamp("done_at"),
    doneById: text("done_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    assigneeIdx: index("command_rocks_assignee_idx").on(t.assigneeId, t.period, t.position),
  }),
);

export type CommandRock = typeof commandRocks.$inferSelect;
export type NewCommandRock = typeof commandRocks.$inferInsert;
