import { pgEnum, pgTable, text, timestamp, integer, jsonb, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { deals } from "./deals";

/**
 * Raw leads — parks uploaded in bulk (typically from a skip-trace CSV)
 * that need to be worked by the BD team before they become real deals.
 *
 * Workflow:
 *   1. Admin uploads a CSV → rows land here with status='pool'.
 *   2. BD requests next lead → server picks one (status='pool', oldest +
 *      fewest call attempts first) and atomically marks it status=
 *      'claimed', stamping claimedById + claimedAt.
 *   3. BD calls. Each attempt creates a raw_lead_dispositions row.
 *      - "no_answer" / "voicemail" / "busy" → lead recycles immediately:
 *         status back to 'pool', claimedById cleared, callAttempts++.
 *      - "wrong_number" → status='pool' but flagged for skip-trace.
 *      - "connected_*" outcomes keep the BD on the lead.
 *      - "qualified" → a deal is created, lead.convertedDealId is set,
 *         status='converted'.
 *      - "do_not_call" → status='dead'.
 *
 * Duplicate detection: indexed on (street, city, state). When a BD types
 * a new lead manually we check this combo before insert.
 *
 * Kitchen-sink fields: we capture the common columns explicitly and
 * stash whatever else the CSV had in rawData (jsonb) so nothing is lost.
 */
export const rawLeadStatus = pgEnum("raw_lead_status", [
  "pool",        // available to claim
  "claimed",     // a BD is actively working it
  "converted",   // became a deal (see convertedDealId)
  "dead",        // DNC, sold elsewhere, etc.
  "duplicate",   // collapsed into another raw_lead
]);

export const rawLeads = pgTable(
  "raw_leads",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

    // === Core identity (used for dedup + display) ===
    parkName: text("park_name"),
    street: text("street"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),

    // === Owner contact ===
    ownerName: text("owner_name"),
    ownerPhone: text("owner_phone"),
    ownerEmail: text("owner_email"),

    // === Optional explicit columns the CSV often carries ===
    pads: integer("pads"),
    listingStatus: text("listing_status"),
    source: text("source"),
    importedNotes: text("imported_notes"),

    // === Whatever else the CSV had — preserves the row ===
    rawData: jsonb("raw_data"),

    // === Workflow state ===
    status: rawLeadStatus("status").notNull().default("pool"),
    claimedById: text("claimed_by_id").references(() => user.id, { onDelete: "set null" }),
    claimedAt: timestamp("claimed_at"),
    callAttempts: integer("call_attempts").notNull().default(0),
    lastCallAt: timestamp("last_call_at"),
    lastCallById: text("last_call_by_id").references(() => user.id, { onDelete: "set null" }),

    // Conversion link if this lead became a real deal
    convertedDealId: text("converted_deal_id").references(() => deals.id, { onDelete: "set null" }),
    convertedAt: timestamp("converted_at"),

    // Provenance — used to bulk-undo a bad CSV upload
    uploadBatchId: text("upload_batch_id"),
    uploadedById: text("uploaded_by_id").references(() => user.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),

    // Soft delete (admin can purge but default to soft)
    deletedAt: timestamp("deleted_at"),
    deletedById: text("deleted_by_id").references(() => user.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    // Hot path: BD asks for the next available lead.
    poolIdx: index("raw_leads_pool_idx").on(t.status, t.callAttempts, t.createdAt),
    // Show me my claimed list.
    claimedIdx: index("raw_leads_claimed_idx").on(t.claimedById, t.status),
    // Duplicate detection on physical address.
    addressIdx: index("raw_leads_address_idx").on(t.street, t.city, t.state),
    // Group by upload batch (lets admins delete a whole upload at once).
    batchIdx: index("raw_leads_batch_idx").on(t.uploadBatchId),
  }),
);

export type RawLead = typeof rawLeads.$inferSelect;
export type NewRawLead = typeof rawLeads.$inferInsert;

/**
 * One row per call attempt. The disposition is the BD's classification
 * of what happened (no answer, voicemail, connected, qualified, DNC).
 *
 * The parent raw_leads row updates its denormalized callAttempts +
 * lastCallAt for cheap UI display, but this table is the source of
 * truth for "show me every contact attempt on this lead".
 */
export const rawLeadOutcome = pgEnum("raw_lead_outcome", [
  "no_answer",
  "voicemail",
  "busy",
  "wrong_number",
  "connected_interested",
  "connected_not_selling",
  "connected_thinking",
  "qualified",          // → triggers deal creation
  "do_not_call",        // → status='dead'
]);

export const rawLeadDispositions = pgTable(
  "raw_lead_dispositions",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    rawLeadId: text("raw_lead_id").notNull().references(() => rawLeads.id, { onDelete: "cascade" }),
    byUserId: text("by_user_id").references(() => user.id, { onDelete: "set null" }),
    outcome: rawLeadOutcome("outcome").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    leadIdx: index("raw_lead_disp_lead_idx").on(t.rawLeadId, t.createdAt),
    byUserIdx: index("raw_lead_disp_by_user_idx").on(t.byUserId, t.createdAt),
  }),
);

export type RawLeadDisposition = typeof rawLeadDispositions.$inferSelect;
export type NewRawLeadDisposition = typeof rawLeadDispositions.$inferInsert;
