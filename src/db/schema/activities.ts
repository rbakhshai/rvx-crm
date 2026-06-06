import { pgEnum, pgTable, text, timestamp, index, integer } from "drizzle-orm/pg-core";
import { user } from "./auth";

// ===== shared parent enum =====

/**
 * Which table the note/activity is attached to. Polymorphic FK pattern —
 * we validate at the app layer rather than relying on Postgres to enforce.
 */
export const activityParentTable = pgEnum("activity_parent_table", [
  "contacts",
  "deals",
  "companies",
  "bird_dogs",
  "issues",
]);

export const noteType = pgEnum("note_type", [
  "manual",          // user typed it in the composer
  "call_log",        // logged from a call
  "form_submission", // captured from an intake form (Phase 2)
]);

/**
 * Notes attached to any core record. Polymorphic on (parentTable, parentId).
 * Mirrors Ontraport's notes object (1,156 entries at audit time, mostly
 * deal-level by Marco/Reza/Erica).
 */
export const notes = pgTable(
  "notes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    parentTable: activityParentTable("parent_table").notNull(),
    parentId: text("parent_id").notNull(),
    body: text("body").notNull(),
    type: noteType("type").notNull().default("manual"),
    authorId: text("author_id").references(() => user.id, { onDelete: "set null" }),
    // Optional Ontraport note id — set during sync so re-runs skip duplicates.
    legacyOntraportId: integer("legacy_ontraport_id"),
    // Author name as recorded in Ontraport, used when we can't match the
    // Ontraport user to a local user (e.g. Erica not yet invited).
    legacyAuthorName: text("legacy_author_name"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    parentIdx: index("notes_parent_idx").on(t.parentTable, t.parentId, t.createdAt),
    authorIdx: index("notes_author_idx").on(t.authorId),
    legacyIdx: index("notes_legacy_idx").on(t.legacyOntraportId),
  }),
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

/**
 * One row per @-mention inside a note body. Lets us answer "what notes
 * mention me, unread?" with a cheap indexed query instead of regex-scanning
 * every note. Persisted at note save time by parsing @FirstName tokens
 * against the active user roster.
 *
 *   - readAt is null until the mentioned user dismisses it.
 *   - parentTable/parentId duplicate the note's parent so we can link
 *     straight to the record without joining notes.
 */
export const noteMentions = pgTable(
  "note_mentions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    noteId: text("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
    mentionedUserId: text("mentioned_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    parentTable: activityParentTable("parent_table").notNull(),
    parentId: text("parent_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    readAt: timestamp("read_at"),
  },
  (t) => ({
    forUserIdx: index("note_mentions_for_user_idx").on(t.mentionedUserId, t.readAt, t.createdAt),
    noteIdx: index("note_mentions_note_idx").on(t.noteId),
  }),
);

export type NoteMention = typeof noteMentions.$inferSelect;
export type NewNoteMention = typeof noteMentions.$inferInsert;

// ===== tasks =====

export const taskType = pgEnum("task_type", [
  "task",   // generic to-do
  "call",   // outbound or follow-up call
  "email",  // outbound email
  "admin",  // CRM / paperwork
]);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    parentTable: activityParentTable("parent_table").notNull(),
    parentId: text("parent_id").notNull(),
    subject: text("subject").notNull(),
    body: text("body"),
    type: taskType("type").notNull().default("task"),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => user.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at"),
    completedAt: timestamp("completed_at"),
    completedById: text("completed_by_id").references(() => user.id, { onDelete: "set null" }),
    outcome: text("outcome"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    parentIdx: index("tasks_parent_idx").on(t.parentTable, t.parentId, t.dueAt),
    assigneeOpenIdx: index("tasks_assignee_open_idx").on(t.assigneeId, t.completedAt, t.dueAt),
    dueIdx: index("tasks_due_idx").on(t.dueAt),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
