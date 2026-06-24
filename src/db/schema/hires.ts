import { pgEnum, pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * New Hire Requests — leadership-team workflow for vetting + approving
 * a new contract before it goes to the candidate.
 *
 * The flow (per Reza's spec in the Marco/Kevin email thread):
 *
 *   1. draft               — Requester (Marco / park mgr) drafts role + duties
 *   2. finance_review      — Kevin reviews finance / tax / legal template
 *   3. founder_review      — Reza reviews company effects / clauses / risks
 *   4. requester_review    — Back to requester for final remarks
 *   5. finalized           — Contract approved + ready to send to candidate
 *
 *   withdrawn              — Killed at any point
 *
 * Three candidate types — different templates downstream:
 *   employee | contractor_1099 | vendor
 *
 * Notes / discussion live in the polymorphic `notes` table with
 * parentTable='hires', so @mentions and the timeline UI Just Work.
 */
export const hireType = pgEnum("hire_type", [
  "employee",
  "contractor_1099",
  "vendor",
]);

export const hireStatus = pgEnum("hire_status", [
  "draft",
  "finance_review",
  "founder_review",
  "requester_review",
  "finalized",
  "withdrawn",
]);

/**
 * Which hiring queue a request belongs to. Same workflow engine, two
 * separate desks: leadership hires (Marco / park mgrs → Kevin → Reza)
 * live at /hires; acquisition hires (new BDs / acquisition reps, run by
 * the Acquisition Lead) live at /acquisition/new-hires. Existing rows
 * default to leadership.
 */
export const hireCategory = pgEnum("hire_category", [
  "leadership",
  "acquisition",
]);

export const hireRequests = pgTable(
  "hire_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

    // === Candidate ===
    candidateName: text("candidate_name").notNull(),
    candidateEmail: text("candidate_email"),
    candidatePhone: text("candidate_phone"),

    // === Classification ===
    type: hireType("type").notNull().default("contractor_1099"),
    status: hireStatus("status").notNull().default("draft"),
    /** Which desk owns this request — leadership vs acquisition. */
    category: hireCategory("category").notNull().default("leadership"),

    // === Context ===
    /** Which park / business unit is this hire for? Free-text so we
     *  can describe "Black Hills RV Park" or "HQ" without needing a
     *  parks table yet. */
    forUnit: text("for_unit"),
    /** Role title — e.g. "Trail Guide / Horse Handler". */
    roleTitle: text("role_title"),
    /** Big text body: duties, responsibilities, schedule. Markdown OK.
     *  Compensation / hours / start date live here too — keeping it
     *  one field for v1 so the requester can paste whatever's natural.
     */
    rolesAndDuties: text("roles_and_duties"),
    /** Finance / tax / legal notes — Kevin's pass. */
    financeNotes: text("finance_notes"),
    /** Reza's pass — company effects, clauses, risks. */
    founderNotes: text("founder_notes"),
    /** Requester's final remarks before finalize. */
    requesterFinalNotes: text("requester_final_notes"),

    // === People ===
    /** Who started the request (Marco / park mgr / whoever). */
    requestedById: text("requested_by_id")
      .references(() => user.id, { onDelete: "set null" }),

    // === Lifecycle ===
    finalizedAt: timestamp("finalized_at"),
    withdrawnAt: timestamp("withdrawn_at"),
    /** Why it was withdrawn — for the audit log. */
    withdrawnReason: text("withdrawn_reason"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedById: text("deleted_by_id").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => ({
    // Default list query: newest first, filterable by status.
    statusIdx: index("hire_requests_status_idx").on(t.status, t.createdAt),
    requesterIdx: index("hire_requests_requester_idx").on(t.requestedById),
    // Each desk lists only its own queue.
    categoryIdx: index("hire_requests_category_idx").on(t.category, t.status),
  }),
);

export type HireRequest = typeof hireRequests.$inferSelect;
export type NewHireRequest = typeof hireRequests.$inferInsert;
