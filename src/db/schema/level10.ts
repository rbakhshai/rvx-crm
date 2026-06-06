import { pgTable, text, timestamp, integer, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * One row per weekly Level 10 meeting.
 *
 * meetingDate is the Monday of the week the meeting belongs to — used as
 * a natural key so two rows can't collide for the same week. If a team
 * runs L10 on Tuesday, the row still anchors to that week's Monday.
 *
 * V1 captures the lightweight fields the team types live during the
 * meeting:
 *   - Segue notes (good news + grounding)
 *   - Conclude notes (recap + action items)
 *   - Rating 1-10 (the EOS gut-check)
 *
 * The Scorecard + Rocks status remain LIVE-computed and not snapshotted
 * here. If you want historical scorecard photos later we can add a
 * sibling table, but that doubles write traffic.
 */
export const level10Meetings = pgTable(
  "level10_meetings",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    meetingDate: date("meeting_date").notNull(),
    segueNotes: text("segue_notes"),
    concludeNotes: text("conclude_notes"),
    rating: integer("rating"),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    dateUnique: uniqueIndex("level10_meeting_date_unique").on(t.meetingDate),
    byDate:     index("level10_meeting_by_date_idx").on(t.meetingDate),
  }),
);

export type Level10Meeting = typeof level10Meetings.$inferSelect;
export type NewLevel10Meeting = typeof level10Meetings.$inferInsert;

/**
 * Frozen snapshot of the L10 scorecard at the moment a meeting was run.
 * One row per (meetingDate, position).
 *
 *   - `actualNum` is the LIVE-computed number captured at snapshot time.
 *   - `metric` + `target` are stored as strings (free-form, edited by
 *     the team), so the snapshot reflects what was actually shown.
 *   - `format` lets the renderer reapply the right %/$/n display.
 *
 * Why this exists: when you open last Monday's L10 next month, you want
 * to see what the numbers were last Monday — not what they are right now.
 */
export const level10ScorecardSnapshots = pgTable(
  "level10_scorecard_snapshots",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    meetingDate: date("meeting_date").notNull(),
    position: integer("position").notNull(),
    metric: text("metric").notNull(),
    target: text("target").notNull(),
    actualNum: integer("actual_num").notNull(),
    format: text("format").notNull(),
    snapshotAt: timestamp("snapshot_at").notNull().defaultNow(),
  },
  (t) => ({
    byDateUnique: uniqueIndex("level10_snap_by_date_pos_unique").on(t.meetingDate, t.position),
    byMeeting:    index("level10_snap_by_meeting_idx").on(t.meetingDate),
  }),
);

export type Level10ScorecardSnapshot = typeof level10ScorecardSnapshots.$inferSelect;
export type NewLevel10ScorecardSnapshot = typeof level10ScorecardSnapshots.$inferInsert;
