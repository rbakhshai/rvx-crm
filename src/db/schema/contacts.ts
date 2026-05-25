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
import { companies } from "./companies";

/**
 * Buyer lifecycle status. Ontraport encoded this with emojis + numeric prefixes;
 * we use semantic codes.
 */
export const buyerStatus = pgEnum("buyer_status", [
  "new_waiting_to_connect",
  "active_looking",
  "active_looking_hot", // 🔥 — high-engagement variant
  "deal_under_contract",
  "closed_bought_with_us",
  "paused_new_minimal_cash",
  "paused_temporary",
  "unresponsive",
  "disqualified",
]);

export const buyerQualificationTier = pgEnum("buyer_qualification_tier", [
  "tier_1_experienced_rvp_network",       // [1] Experienced RVP — Team/Network
  "tier_2_experienced_re_new_to_rvp",     // [2] Experienced RE Investor — Team/Network
  "tier_3_re_investor_small_scale",       // [3] RE Investor, Small Scale, New To RVP
  "tier_4_new_re_investor_250k_dp",       // [4] New Real Estate Investor, $250k DP
  "tier_5_new_re_investor_100k_dp",       // [5] New Real Estate Investor, $100k DP
]);

export const buyerLeadSource = pgEnum("buyer_lead_source", [
  "investor_popup",
  "seller_popup",
  "buyer_popup",
  "emailed_in",
  "rv_broker",
  "fb_messenger_inbound",
  "facebook_inbound_message",
  "facebook_groups",
  "meetup",
  "reza_outreach",
  "dan_outreach",
  "travis_outreach",
  "pace_zoom_call",
]);

export const deployableCashBucket = pgEnum("deployable_cash_bucket", [
  "under_100k",
  "100k_250k",
  "250k_500k",
  "500k_1m",
  "1m_plus",
]);

export const maxDealSizeBucket = pgEnum("max_deal_size_bucket", [
  "under_1m",
  "1m_5m",
  "5m_plus",
]);

export const exchangeUsing1031Bucket = pgEnum("exchange_1031_bucket", [
  "none",
  "under_250k",
  "250k_500k",
  "500k_1m",
  "1m_plus",
]);

export const fastestTurnaround = pgEnum("fastest_turnaround", [
  "asap",
  "this_quarter",
  "this_year",
  "sooner_than_later",
]);

export const financingOptions = pgEnum("financing_options", [
  "must_be_creative",
  "creative_or_conventional",
]);

export const buyerGpLp = pgEnum("buyer_gp_lp", [
  "investor_only",
  "operator_only",
  "operator_or_investor",
  "operator_open_to_wedge",
  "no_rvp_parks",
]);

export const bulkEmailStatus = pgEnum("bulk_email_status", [
  "single_opt_in",
  "double_opt_in",
  "opted_out",
  "hard_bounced",
]);

export const timeSinceLastActivityBucket = pgEnum("time_since_last_activity", [
  "today_hot",
  "this_week",
  "this_month",
  "more_than_month_cold",
]);

/**
 * Contacts = the buyer book. Ontraport had 176 buyers carrying $27.17M POF.
 * This table holds the full buy-box + qualification + compliance picture.
 */
export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),

    // Identity
    firstName: text("first_name"),
    lastName: text("last_name"),
    email: text("email"),
    phone: text("phone"),
    smsNumber: text("sms_number"),
    officePhone: text("office_phone"),
    fax: text("fax"),
    title: text("title"),
    timezone: text("timezone"),
    birthday: date("birthday"),

    // Address
    address: text("address"),
    address2: text("address_2"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    country: text("country"),

    // Social / links
    website: text("website"),
    facebookLink: text("facebook_link"),
    instagramLink: text("instagram_link"),
    linkedinLink: text("linkedin_link"),
    twitterLink: text("twitter_link"),
    blinqProfile: text("blinq_profile"),
    profileImageUrl: text("profile_image_url"),

    // Status & qualification
    status: buyerStatus("status"),
    qualificationTier: buyerQualificationTier("qualification_tier"),
    score: integer("score"),
    buyerNumber: integer("buyer_number").unique(),
    topTier: boolean("top_tier").notNull().default(false),
    timeSinceLastActivity: timeSinceLastActivityBucket("time_since_last_activity"),

    // BUY BOX
    parkTypePreferences: text("park_type_preferences").array(),
    targetStates: text("target_states").array(),
    strictStates: boolean("strict_states").notNull().default(false),
    padsDesiredMin: integer("pads_desired_min"),
    amountOfPadsDesiredBucket: text("amount_of_pads_desired_bucket"), // "40 or less" | "40+" | "75+" | "100+"
    maxDealSize: maxDealSizeBucket("max_deal_size"),
    minNoiUsd: numeric("min_noi_usd", { precision: 14, scale: 2 }),
    parkWithRestaurant: boolean("park_with_restaurant"),
    openToLeasedLand: boolean("open_to_leased_land").notNull(),

    // CAPITAL & FINANCING
    deployableCash: deployableCashBucket("deployable_cash"),
    willUse1031: boolean("will_use_1031"),
    using1031Amount: exchangeUsing1031Bucket("using_1031_amount"),
    pofAmount: numeric("pof_amount", { precision: 14, scale: 2 }),
    canProducePof: boolean("can_produce_pof"),
    pofFileUrl: text("pof_file_url"),
    pofAuthFormUrl: text("pof_auth_form_url"),
    pofConsentFormUrl: text("pof_consent_form_url"),
    financingOptions: financingOptions("financing_options"),
    currentFinancingResources: text("current_financing_resources").array(),
    fastestTurnaround: fastestTurnaround("fastest_turnaround"),
    investorType: text("investor_type").array(), // multi-select: institutional / pe / partnerships / individual
    gpLp: buyerGpLp("gp_lp"),

    // EXPERIENCE & BACKGROUND
    reiExperienceOutsideRvp: text("rei_experience_outside_rvp").array(),
    rvpClosedInPastBucket: text("rvp_closed_in_past_bucket"), // "0" | "1-3" | "4-10" | "10+"
    twelveMonthGoalsBucket: text("twelve_month_goals_bucket"), // same buckets
    buyersValuableSkills: text("buyers_valuable_skills").array(),
    describeSkillExperience: text("describe_skill_experience"),
    skillset: text("skillset").array(),

    // COMPLIANCE / NDA / MARKETING PREFS
    signedNcnda: boolean("signed_ncnda").notNull().default(false),
    signedNcndaAt: timestamp("signed_ncnda_at"),
    signedNcndaLink: text("signed_ncnda_link"),
    ndaAcceptanceCheckbox: boolean("nda_acceptance_checkbox").notNull().default(false),
    smsPermission: boolean("sms_permission").notNull().default(false),
    bulkEmailStatus: bulkEmailStatus("bulk_email_status").default("single_opt_in"),
    bulkSmsOptedOut: boolean("bulk_sms_opted_out").notNull().default(false),

    // COMMUNITY (Pace Morby ecosystem)
    subtoMember: boolean("subto_member").notNull().default(false),
    subtoMemberSince: text("subto_member_since"),
    ownersClubMember: boolean("owners_club_member").notNull().default(false),
    gatorMember: boolean("gator_member").notNull().default(false),
    topTierMember: boolean("top_tier_member").notNull().default(false),

    // INTAKE DETAILS
    intakeInterviewDate: date("intake_interview_date"),
    nameOfLlc: text("name_of_llc"),
    buyersAdditionalComments: text("buyers_additional_comments"),
    buyersAnythingElsePopup: text("buyers_anything_else_popup"),
    minReturnRequired: text("min_return_required"),

    // ATTRIBUTION (UTM-style first/last touch)
    firstLeadSource: text("first_lead_source"),
    firstMedium: text("first_medium"),
    firstCampaign: text("first_campaign"),
    firstContent: text("first_content"),
    firstTerm: text("first_term"),
    lastLeadSource: text("last_lead_source"),
    lastMedium: text("last_medium"),
    lastCampaign: text("last_campaign"),
    lastContent: text("last_content"),
    lastTerm: text("last_term"),
    buyerLeadSource: buyerLeadSource("buyer_lead_source"),
    referringPage: text("referring_page"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),

    // INTERNAL NOTES
    internalNotesBuyerContact: text("internal_notes_buyer_contact"),
    internalNotesBuyerCriteria: text("internal_notes_buyer_criteria"),
    internalNotesQualifyCredibility: text("internal_notes_qualify_credibility"),

    // RELATIONS
    ownerId: text("owner_id").references(() => user.id, { onDelete: "set null" }),
    companyId: text("company_id").references(() => companies.id, { onDelete: "set null" }),

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
  },
  (t) => ({
    emailIdx: index("contacts_email_idx").on(t.email),
    statusIdx: index("contacts_status_idx").on(t.status),
    qualTierIdx: index("contacts_qual_tier_idx").on(t.qualificationTier),
    ownerIdx: index("contacts_owner_idx").on(t.ownerId),
    legacyIdx: index("contacts_legacy_idx").on(t.legacyOntraportId),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
