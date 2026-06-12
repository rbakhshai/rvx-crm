/**
 * Voluntary offboarding (Bird Dog spec Phase 14) — a BD self-selects
 * "taking a break" or "leaving the team" from their Today hub. The
 * exit questionnaire answers land here; their parks are released back
 * to the pool by the same action (notes stay on the parks).
 *
 * Leadership reviews these on /bd-team and decides what to do with the
 * account (pause vs. remove) — the survey never touches auth itself.
 */
import { pgEnum, pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const bdExitKind = pgEnum("bd_exit_kind", ["break", "leave"]);

export const bdExitSurveys = pgTable(
  "bd_exit_surveys",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: bdExitKind("kind").notNull(),
    /** { reason, hardestPart, wouldHaveHelped, referralPartner, anythingElse } */
    answers: jsonb("answers").notNull(),
    /** How many parks (claims + scheduled follow-ups) were released. */
    parksReleased: text("parks_released"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    recentIdx: index("bd_exit_surveys_recent_idx").on(t.createdAt),
  }),
);

export type BdExitSurvey = typeof bdExitSurveys.$inferSelect;
