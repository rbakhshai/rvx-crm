/**
 * Due Diligence — modeled after the master DD worksheet.
 * Each table is keyed by deal_id. Single-deal queries are the only access
 * pattern, so we index on deal_id everywhere.
 */
import { pgEnum, pgTable, text, timestamp, date, integer, numeric, boolean, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { deals } from "./deals";

// ============================================================================
// CHECKLIST — backbone tracker. Each deal gets ~38 seeded items on creation.
// ============================================================================

export const ddChecklistSection = pgEnum("dd_checklist_section", [
  "contracts_legal",          // Contracts, Legal & Third Party Reports
  "quotes_needed",            // Insurance quotes
  "financial_resident",       // Rent rolls, P&L, tax returns, leases
  "city_county_state",        // Zoning, licenses, codes, eviction regs
  "market_demographics",      // Market comps, demographics, test ad
  "utilities_infra",          // Water/sewer/gas/electric checks
  "physical_inspections",     // Maps, photos
  "park_owned_homes",         // POH titles & report
  "budgets_valuation",        // Park valuation, NOI max plan
]);

export const ddChecklistItems = pgTable(
  "dd_checklist_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    section: ddChecklistSection("section").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull(),
    dateOrdered: date("date_ordered"),
    scheduledCompletion: date("scheduled_completion"),
    doneAt: timestamp("done_at"),
    doneById: text("done_by_id").references(() => user.id, { onDelete: "set null" }),
    notes: text("notes"),
    /** Optional URL to the artifact (PDF link, drive folder, etc.) */
    artifactUrl: text("artifact_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_checklist_deal_idx").on(t.dealId, t.sortOrder) }),
);

// ============================================================================
// CAPITAL EXPENDITURES — planned repairs/upgrades
// ============================================================================

export const ddCapxType = pgEnum("dd_capx_type", [
  "roads",
  "water_lines",
  "sewer_lines",
  "gas",
  "electricity",
  "landscaping",
  "buildings",
  "park_owned_homes",
  "other",
]);

export const ddCapxItems = pgTable(
  "dd_capx_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    type: ddCapxType("type").notNull(),
    description: text("description"),
    expectedCost: numeric("expected_cost", { precision: 14, scale: 2 }),
    timeline: text("timeline"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_capx_deal_idx").on(t.dealId) }),
);

// ============================================================================
// WALK-THROUGHS — physical inspection log
// ============================================================================

export const ddWalkThroughs = pgTable(
  "dd_walk_throughs",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    inspectedAt: date("inspected_at").notNull(),
    inspectedById: text("inspected_by_id").references(() => user.id, { onDelete: "set null" }),
    problemsFound: text("problems_found"),
    problemsCorrected: text("problems_corrected"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_walk_deal_idx").on(t.dealId, t.inspectedAt) }),
);

// ============================================================================
// NEGOTIATION ITEMS — issues to negotiate with seller before close
// ============================================================================

export const ddNegotiationItems = pgTable(
  "dd_negotiation_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    problem: text("problem").notNull(),
    solution: text("solution"),
    estimatedCost: numeric("estimated_cost", { precision: 14, scale: 2 }),
    timeline: text("timeline"),
    resolvedAt: timestamp("resolved_at"),
    resolution: text("resolution"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_neg_deal_idx").on(t.dealId) }),
);

// ============================================================================
// NOI MAXIMIZATION PLAN — income increases + expense reductions
// ============================================================================

export const ddNoiDirection = pgEnum("dd_noi_direction", ["increase_income", "reduce_expense"]);

export const ddNoiItems = pgTable(
  "dd_noi_items",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    direction: ddNoiDirection("direction").notNull(),
    item: text("item").notNull(),
    /** Estimated annual NOI impact in dollars (positive = good) */
    noiImpact: numeric("noi_impact", { precision: 14, scale: 2 }),
    timeline: text("timeline"),
    implementedAt: timestamp("implemented_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_noi_deal_idx").on(t.dealId, t.direction) }),
);

// ============================================================================
// PARK-OWNED HOMES & BUILDINGS — physical asset inventory
// ============================================================================

export const ddPohCategory = pgEnum("dd_poh_category", ["park_owned_home", "building_or_structure"]);

export const ddParkOwnedHomes = pgTable(
  "dd_park_owned_homes",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    category: ddPohCategory("category").notNull().default("park_owned_home"),
    /** Space # for homes; structure type label for buildings */
    spaceNumberOrType: text("space_number_or_type"),
    status: text("status"),     // rented / vacant / for sale / condemned, etc.
    year: text("year"),         // mfr year for homes; build year for structures
    size: text("size"),         // e.g. "14x70" or "1200 sqft"
    condition: text("condition"),
    marketValue: numeric("market_value", { precision: 12, scale: 2 }),
    listOfRepairs: text("list_of_repairs"),
    costOfRepairs: numeric("cost_of_repairs", { precision: 12, scale: 2 }),
    use: text("use"),           // buildings only — "office" / "laundry" / "storage" etc.
    titleVerified: boolean("title_verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_poh_deal_idx").on(t.dealId, t.category) }),
);

// ============================================================================
// RENT ROLL — per-space rental record snapshot
// ============================================================================

export const ddRentRollEntries = pgTable(
  "dd_rent_roll_entries",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    /** Snapshot date — supports multiple month-end snapshots per deal */
    asOfDate: date("as_of_date").notNull().defaultNow(),
    spaceNumber: text("space_number"),
    residentName: text("resident_name"),
    securityDeposit: numeric("security_deposit", { precision: 10, scale: 2 }),
    moveInDate: date("move_in_date"),
    delinquentBalance: numeric("delinquent_balance", { precision: 10, scale: 2 }),
    lotRent: numeric("lot_rent", { precision: 10, scale: 2 }),
    rentalHomeRent: numeric("rental_home_rent", { precision: 10, scale: 2 }),
    notePayment: numeric("note_payment", { precision: 10, scale: 2 }),
    otherCharges: numeric("other_charges", { precision: 10, scale: 2 }),
    paymentsReceived: numeric("payments_received", { precision: 10, scale: 2 }),
    utilityBillback: numeric("utility_billback", { precision: 10, scale: 2 }),
    /** = lot + home + note + other + billback - payments  (computed in app) */
    totalDue: numeric("total_due", { precision: 10, scale: 2 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_rent_roll_deal_idx").on(t.dealId, t.asOfDate) }),
);

// ============================================================================
// COMPARABLES — market study (RV/MH parks, apartments, SFH)
// ============================================================================

export const ddComparableType = pgEnum("dd_comparable_type", [
  "rv_or_mh_park",
  "apartment",
  "single_family",
]);

export const ddComparables = pgTable(
  "dd_comparables",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    type: ddComparableType("type").notNull(),
    name: text("name"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    phone: text("phone"),
    /** Park: pads/spaces. Apt/SFH: unit count or "1bed/2bed/3bed" mix as text. */
    spacesOrUnits: text("spaces_or_units"),
    rentLow: numeric("rent_low", { precision: 10, scale: 2 }),
    rentHigh: numeric("rent_high", { precision: 10, scale: 2 }),
    occupiedCount: integer("occupied_count"),
    vacantCount: integer("vacant_count"),
    utilitiesIncluded: text("utilities_included"), // "W,S,T" etc.
    moveInSpecials: text("move_in_specials"),
    salesPrice: numeric("sales_price", { precision: 12, scale: 2 }), // SFH only
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_comparable_deal_idx").on(t.dealId, t.type) }),
);

// ============================================================================
// DD CONTACTS — DD-specific roster (purchase, govt, utilities, vendors, market)
//
// We keep these separate from the main `contacts` table because they're often
// one-off per deal (a Phase 1 environmental firm in TX won't be reused in OK).
// ============================================================================

export const ddContactCategory = pgEnum("dd_contact_category", [
  "purchase",      // Seller, Broker, Title, Loan, Surveyor, Phase 1, Insurance, Attorney, Accountant
  "government",    // Planning, Building, Courthouse, Fire, Police, Health, Assessor, Tax
  "utility",       // Water, Sewer, Electric, Gas, Trash, Cable, Telephone
  "vendor",        // Plumber, Roto Rooter, Electrician, Landscaping, etc.
  "market",        // Chamber, MH dealer, Realtor, Mover
]);

export const ddContacts = pgTable(
  "dd_contacts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    dealId: text("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    category: ddContactCategory("category").notNull(),
    /** Role label — e.g. "Title Company", "Plumber 1", "Planning & Zoning". */
    role: text("role").notNull(),
    contactName: text("contact_name"),
    phone: text("phone"),
    fax: text("fax"),
    email: text("email"),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({ dealIdx: index("dd_contacts_deal_idx").on(t.dealId, t.category) }),
);

// ============================================================================
// Future: a free-form Q&A table per DD contact (the questions on each tab).
// Holding off — those questions are interview prompts more than data fields.
// Can be added as a `dd_contact_qa` table later if the team wants to record
// answers structurally instead of in a notes blob.
// ============================================================================

// ----- type exports -----

export type DdChecklistItem = typeof ddChecklistItems.$inferSelect;
export type DdCapxItem = typeof ddCapxItems.$inferSelect;
export type DdWalkThrough = typeof ddWalkThroughs.$inferSelect;
export type DdNegotiationItem = typeof ddNegotiationItems.$inferSelect;
export type DdNoiItem = typeof ddNoiItems.$inferSelect;
export type DdParkOwnedHome = typeof ddParkOwnedHomes.$inferSelect;
export type DdRentRollEntry = typeof ddRentRollEntries.$inferSelect;
export type DdComparable = typeof ddComparables.$inferSelect;
export type DdContact = typeof ddContacts.$inferSelect;
