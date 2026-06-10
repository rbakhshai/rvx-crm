import { pgEnum, pgTable, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Reimbursement Requests — leadership-team queue for "I need the
 * company to buy X for the park" requests. Light workflow:
 *
 *   1. pending    Submitted, waiting for review
 *   2. approved   Reza / Kevin approved; finance will purchase
 *   3. purchased  Bought (Kevin / Reza stamps the date)
 *   4. fulfilled  Item arrived at the park
 *
 *   declined     Killed at any point with a reason
 *
 * Fields modeled directly from Reza's spec: park / requestedAt /
 * neededBy / item / why / productUrl / requester. amountCents is
 * optional — sometimes the link tells the full story.
 */
export const reimbursementStatus = pgEnum("reimbursement_status", [
  "pending",
  "approved",
  "purchased",
  "fulfilled",
  "declined",
]);

export const reimbursementRequests = pgTable(
  "reimbursement_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

    // === Core fields (per Reza's spec) ===
    parkName: text("park_name"),
    /** When this was submitted. Defaults to NOW on insert. */
    requestedAt: timestamp("requested_at").notNull().defaultNow(),
    /** "Fulfillment day" — when the requester needs the item by. */
    neededBy: timestamp("needed_by"),
    itemDescription: text("item_description").notNull(),
    reason: text("reason"),
    productUrl: text("product_url"),
    /** Optional dollar estimate in cents. Stored as int — same convention
     *  as deals.list_price. NULL when unknown / link-only. */
    amountCents: integer("amount_cents"),

    // === Workflow ===
    status: reimbursementStatus("status").notNull().default("pending"),
    requestedById: text("requested_by_id")
      .references(() => user.id, { onDelete: "set null" }),

    // === Stamps along the workflow ===
    approvedAt: timestamp("approved_at"),
    approvedById: text("approved_by_id").references(() => user.id, { onDelete: "set null" }),
    purchasedAt: timestamp("purchased_at"),
    purchasedById: text("purchased_by_id").references(() => user.id, { onDelete: "set null" }),
    fulfilledAt: timestamp("fulfilled_at"),
    fulfilledById: text("fulfilled_by_id").references(() => user.id, { onDelete: "set null" }),
    declinedAt: timestamp("declined_at"),
    declinedById: text("declined_by_id").references(() => user.id, { onDelete: "set null" }),
    declineReason: text("decline_reason"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
    deletedById: text("deleted_by_id").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => ({
    statusIdx: index("reimbursement_requests_status_idx").on(t.status, t.requestedAt),
    requesterIdx: index("reimbursement_requests_requester_idx").on(t.requestedById),
  }),
);

export type ReimbursementRequest = typeof reimbursementRequests.$inferSelect;
export type NewReimbursementRequest = typeof reimbursementRequests.$inferInsert;
