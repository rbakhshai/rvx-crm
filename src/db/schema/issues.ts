import { pgEnum, pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Issues (EOS-style IDS — Identify / Discuss / Solve).
 *
 * Team-wide operational issues: "Stripe webhook flaky", "Erica needs help
 * with the Florida park", "Should we change our buyer-intake form?". Not
 * tied to deals or contacts.
 *
 * Priority is one of three colored buckets:
 *   - red    critical / time-sensitive — drop everything
 *   - orange within the next 24 hours
 *   - green  can wait until the next L10 meeting
 *
 * Status flows: open -> discussing -> solved. Solved keeps the issue on
 * the books with a solution summary for posterity.
 *
 * Position is an integer for drag-ordering within a (priority, status)
 * lane. We renumber on every reorder; the list is small.
 */
export const issuePriority = pgEnum("issue_priority", ["red", "orange", "green"]);
export const issueStatus = pgEnum("issue_status", ["open", "discussing", "solved"]);

export const issues = pgTable(
  "issues",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    body: text("body"),                                              // Markdown, supports @mentions
    priority: issuePriority("priority").notNull().default("green"),
    status: issueStatus("status").notNull().default("open"),
    position: integer("position").notNull().default(0),              // sort key within priority lane
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    solvedAt: timestamp("solved_at"),
    solvedById: text("solved_by_id").references(() => user.id, { onDelete: "set null" }),
    solutionSummary: text("solution_summary"),                       // captured on solve
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedById: text("deleted_by_id").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => ({
    // Primary list query: open issues sorted by priority then position.
    lanesIdx: index("issues_lanes_idx").on(t.status, t.priority, t.position),
    assigneeIdx: index("issues_assignee_idx").on(t.assigneeId),
  }),
);

export type Issue = typeof issues.$inferSelect;
export type NewIssue = typeof issues.$inferInsert;
