/**
 * AI-generated morning briefs. One row per (user, date) so we don't burn
 * Claude credits on every /today page load.
 */
import { pgTable, text, integer, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const dailyBriefs = pgTable(
  "daily_briefs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    forDate: date("for_date").notNull(),       // calendar day the brief is for (UTC)
    contentMd: text("content_md").notNull(),
    model: text("model"),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userDateIdx: uniqueIndex("daily_briefs_user_date_idx").on(t.userId, t.forDate),
  }),
);

export type DailyBrief = typeof dailyBriefs.$inferSelect;
