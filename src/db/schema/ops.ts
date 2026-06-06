import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Ops Machine (Founder OS) — editable content blocks.
 *
 * The /ops dashboard is largely structured prose: priority titles,
 * vision sections, journey stage descriptions, scorecard metric names,
 * etc. Rather than a table per kind we use one polymorphic content
 * store keyed by a string "scope".
 *
 *   scope examples:
 *     "command.priority.1.title"
 *     "vision.team.for_the_team.body"
 *     "journey.acquisitions.stage.3.description"
 *     "flywheel.spoke.4.title"
 *
 * Pages read by scope prefix and fall back to a code-side default when
 * no row exists — so a fresh install renders the seeded content without
 * needing a separate seed migration.
 */
export const opsContent = pgTable("ops_content", {
  scope: text("scope").primaryKey(),
  bodyMd: text("body_md").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedById: text("updated_by_id").references(() => user.id, { onDelete: "set null" }),
});

export type OpsContent = typeof opsContent.$inferSelect;
