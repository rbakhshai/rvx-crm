import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { contacts } from "./contacts";
import { companies } from "./companies";
import { birdDogs } from "./bird-dogs";
import { dealStatuses } from "./lookups";

export const dealPriority = pgEnum("deal_priority", [
  "cold",  // ⛄️
  "warm",  // 🌤️
  "hot",   // 🔥
]);

export const parkType = pgEnum("park_type", [
  "long_term",
  "short_term",
  "mixed",
]);

export const dispoStage = pgEnum("dispo_stage", [
  "sent_to_primary_buyer",
  "sending_to_buyer_2_3_4",
  "send_to_rv_park_groups",
  "post_to_subto_group",
  "send_to_email_list",
]);

export const callDisposition = pgEnum("call_disposition", [
  "first_contact_attempted",
  "first_contact_made",
  "interested_negotiating",
  "gathering_docs",
  "not_selling_7d",
  "not_selling_14d",
  "not_selling_30d",
  "not_selling_45d",
  "not_selling_90d",
  "not_pursuing_dnc",
]);

export const dealLeadSource = pgEnum("deal_lead_source", [
  "bird_dog",
  "direct_seller_rvx_website",
  "outside_source_rvx_website",
]);

export const recentActivityBucket = pgEnum("recent_activity_bucket", [
  "last_week",
  "last_month",
  "more_than_month",
]);

export const weeklyOfferReview = pgEnum("weekly_offer_review", [
  "passed",
  "failed",
]);

export const escrowFeeResponsibility = pgEnum("escrow_fee_responsibility", [
  "buyer",
  "seller",
  "buyer_seller_50_50",
]);

export const transferTaxResponsibility = pgEnum("transfer_tax_responsibility", [
  "100_seller",
  "100_buyer",
  "50_50",
]);

export const titlePolicyResponsibility = pgEnum("title_policy_responsibility", [
  "seller",
  "buyer",
]);

/**
 * Deals = RV parks in the pipeline. 349 records in Ontraport at migration time.
 * Hosts the 40-stage pipeline (see deal_statuses lookup), versioned LOI/PSA/AA
 * tracking (see loi_rounds, psa_rounds, aa_rounds), full financials, documents.
 */
export const deals = pgTable(
  "deals",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

    // Identity
    name: text("name"), // Deal Name
    profileImageUrl: text("profile_image_url"),

    // PROPERTY DETAILS
    parkAddress: text("park_address"),
    parkCity: text("park_city"),
    parkState: text("park_state"),
    parkType: parkType("park_type"),
    padsCount: integer("pads_count"),
    cabinsCount: text("cabins_count"),       // free text in source ("# Of Cabins (If Applicable)")
    tentSitesCount: text("tent_sites_count"), // free text
    hotelMotelCount: text("hotel_motel_count"),
    totalUnits: integer("total_units"),
    acresCount: text("acres_count"), // free text
    fullHookupPads: text("full_hookup_pads"), // free text
    waterSystemType: text("water_system_type"),       // city / well
    septicSystemType: text("septic_system_type"),     // septic / city
    septicCountLastServiced: text("septic_count_last_serviced"),
    electricalDetail: text("electrical_detail"), // "how many 30 amp, how many 50 amp"
    padsOnSeparateMeters: text("pads_on_separate_meters"),
    occupancyPct: numeric("occupancy_pct", { precision: 5, scale: 2 }),
    mixUse: text("mix_use"),
    amenities: text("amenities").array(),
    googleMapUrl: text("google_map_url"),
    spatialPictureUrl: text("spatial_picture_url"),
    listingLink: text("listing_link"),
    propertyWebsite: text("property_website"),
    hasRestaurant: boolean("has_restaurant").notNull().default(false),
    repairsOrDeferredMaintenance: text("repairs_or_deferred_maintenance"),
    whatMakesThisSpecial: text("what_makes_this_special"),
    motivationToSell: text("motivation_to_sell"),
    lookingToRetire: text("looking_to_retire"),
    ideallyCloseDate: text("ideally_close_date"),
    managerInPlace: text("manager_in_place"),
    ownsOtherParks: text("owns_other_parks"),
    otherIncomeStreams: text("other_income_streams"),
    anyOtherDebtsLiens: text("any_other_debts_liens"),
    taxesCurrent: text("taxes_current"),
    ownedTheParkLong: text("owned_the_park_long"),
    permissionToShareFinancials: boolean("permission_to_share_financials"),
    importantSellerTerms: text("important_seller_terms"),

    // FINANCIALS — LISTED
    listPrice: numeric("list_price", { precision: 14, scale: 2 }),
    listNoi: numeric("list_noi", { precision: 14, scale: 2 }),
    listCapRate: text("list_cap_rate"),
    openToCreative: boolean("open_to_creative").notNull().default(false),

    // FINANCIALS — AGREED
    agreedPurchasePrice: numeric("agreed_purchase_price", { precision: 14, scale: 2 }),
    agreedCapRate: text("agreed_cap_rate"),
    cashOffer: numeric("cash_offer", { precision: 14, scale: 2 }),
    sellerFinanceDownPayment: numeric("seller_finance_down_payment", { precision: 14, scale: 2 }),
    sellerFinanceAmount: numeric("seller_finance_amount", { precision: 14, scale: 2 }),
    sellerFinanceInterestRate: text("seller_finance_interest_rate"),
    sellerFinanceAmortYears: text("seller_finance_amort_years"),
    sellerFinanceBalloonYears: text("seller_finance_balloon_years"),
    hybridPurchasePrice: numeric("hybrid_purchase_price", { precision: 14, scale: 2 }),
    hybridDownPayment: numeric("hybrid_down_payment", { precision: 14, scale: 2 }),
    hybridInterestRate: numeric("hybrid_interest_rate", { precision: 6, scale: 3 }),
    hybridAmortYears: integer("hybrid_amort_years"),
    bankInterestRate: text("bank_interest_rate"),
    bankAmortYears: text("bank_amort_years"),
    equityContribution: numeric("equity_contribution", { precision: 14, scale: 2 }),
    totalAssignmentPayout: numeric("total_assignment_payout", { precision: 14, scale: 2 }),
    expectedWinPercent: integer("expected_win_percent"),

    // CURRENT LIABILITIES (from seller)
    currentMortgageDebt: text("current_mortgage_debt"),
    currentMortgagePayment: text("current_mortgage_payment"),
    currentMortgageInterestRate: text("current_mortgage_interest_rate"),
    currentMortgageBalloonDate: text("current_mortgage_balloon_date"),

    // WORKFLOW STATE
    statusCode: text("status_code").references(() => dealStatuses.code, { onDelete: "set null" }),
    dispoStage: dispoStage("dispo_stage"),
    dealPriority: dealPriority("deal_priority"),
    callDisposition: callDisposition("call_disposition"),
    weeklyOfferReview: weeklyOfferReview("weekly_offer_review"),
    recentActivity: recentActivityBucket("recent_activity"),
    readyForReview: boolean("ready_for_review").notNull().default(false),
    updateStatusReadyForUw: boolean("update_status_ready_for_uw").notNull().default(false),

    // SOURCE / INTAKE
    leadSource: dealLeadSource("lead_source"),

    // BIRD DOG (also FK; denormalized fields preserved from Ontraport)
    birdDogId: text("bird_dog_id").references(() => birdDogs.id, { onDelete: "set null" }),
    birdDogFirstName: text("bird_dog_first_name"),
    birdDogLastName: text("bird_dog_last_name"),
    birdDogPhone: text("bird_dog_phone"),
    birdDogEmail: text("bird_dog_email"),
    birdDogAdditionalNotes: text("bird_dog_additional_notes"),
    birdDogSharedDriveUrl: text("bird_dog_shared_drive_url"),
    updateToBirdDog: text("update_to_bird_dog"),
    birdDogLeadNonRvx: boolean("bird_dog_lead_non_rvx").notNull().default(false),

    // DOCUMENT URLs (R2-backed)
    marketingPackageUrl: text("marketing_package_url"),
    pAndLUrl: text("p_and_l_url"),
    appraisalUrl: text("appraisal_url"),
    additionalFinancialsUrl: text("additional_financials_url"),
    additionalFinancialsUrl2: text("additional_financials_url_2"),
    additionalFile1Url: text("additional_file_1_url"),
    additionalFile2Url: text("additional_file_2_url"),
    additionalFile3Url: text("additional_file_3_url"),
    rvxOnePagerUrl: text("rvx_one_pager_url"),
    rvxFivePagerUrl: text("rvx_five_pager_url"),
    buyerLevel1FinancialsUrl: text("buyer_level_1_financials_url"),
    buyerFullDueDiligenceUrl: text("buyer_full_due_diligence_url"),
    dataRoomUrl: text("data_room_url"),
    createDataRoomUrl: text("create_data_room_url"),

    // DATES & TIMELINE
    emdDueDate: date("emd_due_date"),
    emdAmount: numeric("emd_amount", { precision: 14, scale: 2 }),
    emdDeposited: date("emd_deposited"),
    escrowOpened: date("escrow_opened"),
    inspectionPeriodEnd: date("inspection_period_end"),
    psaCoeDate: date("psa_coe_date"),
    updatedCoeDate2: date("updated_coe_date_2"),
    updatedCoeDate3: date("updated_coe_date_3"),
    closerLastTouch: timestamp("closer_last_touch"),

    // FEE RESPONSIBILITY
    escrowFeeResponsibility: escrowFeeResponsibility("escrow_fee_responsibility"),
    transferTaxResponsibility: transferTaxResponsibility("transfer_tax_responsibility"),
    titlePolicyResponsibility: titlePolicyResponsibility("title_policy_responsibility"),

    // AI
    aiSummaryMd: text("ai_summary_md"),
    shareableAiSummary: text("shareable_ai_summary"),

    // INTERNAL NOTES (phase-based, as in Ontraport)
    acquisitionManagerNotes: text("acquisition_manager_notes"),
    offerDeliveryInternalNotes: text("offer_delivery_internal_notes"),
    closerFinalNotes: text("closer_final_notes"),
    phase4InternalNotes: text("phase_4_internal_notes"),
    phase5InternalNotes: text("phase_5_internal_notes"),

    // RELATIONS
    confirmedBuyerId: text("confirmed_buyer_id").references(() => contacts.id, { onDelete: "set null" }),
    secondaryBuyerId: text("secondary_buyer_id").references(() => contacts.id, { onDelete: "set null" }),
    sellerCompanyId: text("seller_company_id").references(() => companies.id, { onDelete: "set null" }),
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    opsOwnerId: text("ops_owner_id").references(() => user.id, { onDelete: "set null" }),

    // MARKETING PREFS
    bulkEmailOptedOut: boolean("bulk_email_opted_out").notNull().default(false),

    // MIGRATION / AUDIT
    legacyOntraportId: integer("legacy_ontraport_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at"),
    lastEmailReceivedAt: timestamp("last_email_received_at"),
    lastEmailSentAt: timestamp("last_email_sent_at"),
    lastSmsReceivedAt: timestamp("last_sms_received_at"),
    lastSmsSentAt: timestamp("last_sms_sent_at"),
    lastCallLoggedAt: timestamp("last_call_logged_at"),
    lastNote: text("last_note"),
    ipAddress: text("ip_address"),
  },
  (t) => ({
    statusIdx: index("deals_status_idx").on(t.statusCode),
    parkStateIdx: index("deals_park_state_idx").on(t.parkState),
    priorityIdx: index("deals_priority_idx").on(t.dealPriority),
    closerLastTouchIdx: index("deals_closer_last_touch_idx").on(t.closerLastTouch),
    ownerIdx: index("deals_owner_idx").on(t.ownerId),
    confirmedBuyerIdx: index("deals_confirmed_buyer_idx").on(t.confirmedBuyerId),
    sellerCompanyIdx: index("deals_seller_company_idx").on(t.sellerCompanyId),
    birdDogIdx: index("deals_bird_dog_idx").on(t.birdDogId),
    legacyIdx: index("deals_legacy_idx").on(t.legacyOntraportId),
  }),
);

export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;

/** Round status for LOI/PSA/AA — each round is one row, tracked dates. */
const roundColumns = {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(), // 1, 2, 3 in Ontraport
  sentAt: date("sent_at"),
  acceptedAt: date("accepted_at"),
  rejectedAt: date("rejected_at"),
  contingentNote: text("contingent_note"), // 🟡 from source
  contractUrl: text("contract_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};

export const loiRounds = pgTable("loi_rounds", roundColumns);
export const psaRounds = pgTable("psa_rounds", roundColumns);
export const aaRounds = pgTable("aa_rounds", roundColumns);

export type LoiRound = typeof loiRounds.$inferSelect;
export type PsaRound = typeof psaRounds.$inferSelect;
export type AaRound = typeof aaRounds.$inferSelect;
