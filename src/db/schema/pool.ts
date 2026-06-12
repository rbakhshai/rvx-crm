/**
 * "The Pool" — Reza's 10-10-10 leadership profit share.
 *
 *   Own 10 parks in 10 years; 10% of the portfolio's distributable
 *   cash flow goes into a pool, paid quarterly to leadership members
 *   who are past their 4-year cliff. Split by years-of-service points
 *   (a year-7 member holds 7 points), active members only.
 *
 * pool_members holds the roster + seat-start dates (the 4-year clock).
 * pool_distributions is the payout ledger — each row snapshots the
 * per-member split AT THE TIME it was recorded, so later roster changes
 * never rewrite history.
 */
import { pgTable, text, timestamp, date, boolean, integer, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const poolMembers = pgTable(
  "pool_members",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    /** When their leadership seat (and the 4-year clock) started. */
    seatStartAt: date("seat_start_at").notNull(),
    /** Leaving the team = inactive = out of the pool next quarter. */
    active: boolean("active").notNull().default(true),
    addedById: text("added_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: uniqueIndex("pool_members_user_idx").on(t.userId),
  }),
);

export const poolDistributions = pgTable(
  "pool_distributions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    /** e.g. "2030-Q1" */
    quarter: text("quarter").notNull(),
    totalCents: integer("total_cents").notNull(),
    /** [{ userId, name, points, cents }] — frozen at record time. */
    split: jsonb("split").notNull(),
    notes: text("notes"),
    recordedById: text("recorded_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    recentIdx: index("pool_distributions_recent_idx").on(t.createdAt),
  }),
);

export type PoolMember = typeof poolMembers.$inferSelect;
export type PoolDistribution = typeof poolDistributions.$inferSelect;
