import { pgEnum, pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * In-app feedback / bug-report queue.
 *
 * Submitted via the floating "?" widget in the bottom-right corner of
 * every CRM page. Anyone on the team can submit (name + email captured
 * so the admin can follow up); admins triage in /settings/feedback,
 * where rows are drag-orderable to set priority.
 */
export const feedbackKind = pgEnum("feedback_kind", ["feature", "bug"]);

export const feedbackStatus = pgEnum("feedback_status", [
  "new",          // freshly submitted, untriaged
  "in_progress",  // being worked on
  "done",         // shipped / closed
  "wontfix",      // declined / out of scope
]);

export const feedbackSubmissions = pgTable(
  "feedback_submissions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    kind: feedbackKind("kind").notNull(),
    status: feedbackStatus("status").notNull().default("new"),
    /** Display name supplied at submit time (not joined to the user table). */
    name: text("name").notNull(),
    /** Email captured for follow-up — independent of any user account. */
    email: text("email").notNull(),
    body: text("body").notNull(),
    /** Drag-order rank inside the admin queue; smaller = higher priority. */
    position: integer("position").notNull().default(0),
    /** Internal notes added by an admin while triaging — not visible to submitter. */
    internalNotes: text("internal_notes"),
    /** Best-effort: the user id at submit time if the floater fired while signed in. */
    submittedById: text("submitted_by_id").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    resolvedById: text("resolved_by_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    queueIdx:  index("feedback_queue_idx").on(t.status, t.position),
    byStatus:  index("feedback_status_idx").on(t.status, t.createdAt),
  }),
);

export type FeedbackSubmission = typeof feedbackSubmissions.$inferSelect;
export type NewFeedbackSubmission = typeof feedbackSubmissions.$inferInsert;
