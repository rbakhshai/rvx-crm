/**
 * Value-mapping tables from Ontraport dropdown option IDs → our enum codes.
 * Sourced from the audit (raw/snapshot-2026-05-24.md). When you add a new
 * dropdown option in Ontraport, add the row here too.
 */

// ---- contacts (buyers) ----

export const BUYER_STATUS_MAP: Record<string, string> = {
  "542": "disqualified",            // "8. Disqualified – Doesn't meet your criteria"
  "544": "unresponsive",            // "5. Unresponsive – Not replying"
  "546": "closed_bought_with_us",   // "4. Closed – Bought a deal with Us"
  "547": "paused_temporary",        // "7. Paused – Temporarily not looking"
  "548": "active_looking",          // "1. Active – looking and responsive"
  "710": "deal_under_contract",     // "3. Deal Under Contract"
  "716": "active_looking_hot",      // "2. Active – looking and responsive 🔥"
  "758": "paused_new_minimal_cash", // "6. Paused - New Investor Minimal Cash"
  "977": "new_waiting_to_connect",  // "New Buyer - Reached Out - Waiting to Connect"
};

export const QUALIFICATION_TIER_MAP: Record<string, string> = {
  "824": "tier_5_new_re_investor_100k_dp",
  "825": "tier_4_new_re_investor_250k_dp",
  "826": "tier_3_re_investor_small_scale",
  "827": "tier_2_experienced_re_new_to_rvp",
  "828": "tier_1_experienced_rvp_network",
};

export const BUYER_LEAD_SOURCE_MAP: Record<string, string> = {
  "397": "investor_popup",
  "398": "seller_popup",
  "399": "buyer_popup",
  "431": "emailed_in",
  "444": "rv_broker",
  "452": "fb_messenger_inbound",
  "564": "reza_outreach",
  "697": "facebook_inbound_message",
  "759": "facebook_groups",
  "766": "meetup",
  "849": "dan_outreach",
  "850": "travis_outreach",
  // 851 = "Erika / Jason Outreach" — REMOVED by user 2026-05-24, drop on import
  "968": "pace_zoom_call",
};

export const DEPLOYABLE_CASH_MAP: Record<string, string> = {
  "1189": "1m_plus",
  "1190": "500k_1m",
  "1191": "250k_500k",
  "1192": "100k_250k",
  "1193": "under_100k",
};

export const DEPLOYABLE_CASH_ARCHIVED_MAP: Record<string, string> = {
  // f2809 — archived field, maps to same buckets
  "861": "1m_plus",
  "862": "500k_1m",
  "863": "250k_500k",
  "864": "under_100k",
};

export const MAX_DEAL_SIZE_MAP: Record<string, string> = {
  "852": "5m_plus",  // "$5 Million +"
  "853": "1m_5m",    // "$1 - 5 Million"
  "854": "under_1m", // "Under $1 Million"
};

export const EXCHANGE_1031_MAP: Record<string, string> = {
  "954": "1m_plus",
  "955": "500k_1m",
  "956": "250k_500k",
  "957": "under_250k",
  "958": "none",
};

export const FASTEST_TURNAROUND_MAP: Record<string, string> = {
  "869": "this_year",
  "870": "this_quarter",
  "871": "sooner_than_later",
  "872": "asap",
};

export const FINANCING_OPTIONS_MAP: Record<string, string> = {
  "946": "must_be_creative",
  "947": "creative_or_conventional",
};

export const GP_LP_MAP: Record<string, string> = {
  "1167": "investor_only",
  "1168": "operator_or_investor",
  "1169": "operator_only",
  "1170": "operator_open_to_wedge",
  "1171": "no_rvp_parks",
};

// Multi-select (list) value maps — same option IDs, returned as array

export const PARK_TYPE_MAP: Record<string, string> = {
  "637": "worker_type",
  "638": "tourist_destination",
  "639": "transient_overnight",
  "640": "long_term_residential_well",
  "641": "rustic_primitive",
  "642": "luxury_resort",
  "643": "campground_wooded",
  "644": "age_restricted",
  "789": "seasonal_rv",
  "798": "long_term_residential_low",
  "923": "year_round_rv",
};

export const INVESTOR_TYPE_MAP: Record<string, string> = {
  "924": "institutional",
  "925": "private_equity",
  "926": "basic_partnerships",
  "927": "individual",
};

export const FINANCING_RESOURCES_MAP: Record<string, string> = {
  "865": "syndicate",
  "866": "other_investors",
  "867": "private_money",
  "868": "bank",
  "906": "cash",
};

export const REI_EXPERIENCE_MAP: Record<string, string> = {
  "914": "bare_land_dev",
  "915": "mobile_home_park",
  "916": "commercial_indus",
  "917": "commercial_retail",
  "918": "commercial_mf",
  "919": "residential_mf",
  "920": "residential_sf",
};

export const VALUABLE_SKILLS_MAP: Record<string, string> = {
  "996": "contractor",
  "997": "fund_management",
  "998": "capital_raising",
  "999": "hospitality_tourism",
  "1000": "business_management",
  "1001": "network",
  "1002": "wholesaling_realtor",
  "1003": "transaction_coord",
  "1004": "underwriting",
  "1037": "skilled_trade",
};

// Free-text buckets (not enums — stored as text)

export const PADS_DESIRED_MAP: Record<string, string> = {
  "1044": "40_or_less",
  "1045": "40_plus",
  "1046": "75_plus",
  "1047": "100_plus",
};

export const RVP_CLOSED_MAP: Record<string, string> = {
  "940": "10_plus",
  "941": "4_10",
  "942": "1_3",
  "943": "0",
};

export const TWELVE_MONTH_GOALS_MAP: Record<string, string> = {
  "932": "10_plus",
  "933": "4_10",
  "934": "2_3",
  "935": "1",
};

// ---- BIRD DOGS ----

// Maps Ontraport's f2970 Bird Dog Status option IDs → our birdDogStatuses.code values.
// Source: get_object_meta(10004).
export const BIRD_DOG_STATUS_MAP: Record<string, string> = {
  "1049": "not_active",
  "1050": "on_watch",
  "1051": "active",
  "1144": "executive_team",
  "1173": "email_1_interview",
  "1174": "email_2_interview",
  "1175": "interview_scheduled",
  "1176": "interview_no_show",
  "1177": "denied_discovery_scammer",
  "1178": "onboarding_packet_sent",
  "1180": "hold_see_notes",
  "1181": "taking_break",
  "1182": "agreement_sent",
  "1183": "active_half_time",
  "1184": "denied_not_good_fit",
  "1185": "agreement_follow_up",
  "1186": "no_replies_ghosted",
  "1187": "denied_not_right_now",
  "1188": "delayed_start",
  "1194": "denied_non_exclusive_only",
  "1195": "onboarding_packet_follow",
};

// f3082 Acquisition Level
export const BIRD_DOG_ACQUISITION_LEVEL_MAP: Record<string, "senior" | "junior" | "onboarding"> = {
  "1097": "senior",
  "1098": "junior",
  "1099": "onboarding",
};

// f3001 Completed Training (drop) — 1062=Yes, 1061=No
export const BIRD_DOG_TRAINING_DONE_MAP: Record<string, boolean> = {
  "1061": false,
  "1062": true,
};

// f3042 Ethics Training Status
export const BIRD_DOG_ETHICS_MAP: Record<string, "no" | "in_progress" | "yes"> = {
  "1068": "no",
  "1069": "in_progress",
  "1070": "yes",
};

// ---- DEALS ----

// f2667 Deal Status → our dealStatuses.code values.
// Source: get_object_meta(149).
export const DEAL_STATUS_MAP: Record<string, string> = {
  "808": "closer_first_contact_attempted",
  "811": "closed_rvx_acquired",
  "813": "dd_completed_in_escrow",
  "814": "tc_dd_in_escrow",
  "820": "tc_writing_psa",
  "821": "loi_accepted_both_sides",
  "822": "loi_ready",
  "823": "uw_ready_phase_2",
  "829": "deal_pending_45d",
  "830": "closed_other_buyer",
  "831": "listing_pulled_90_drip",
  "835": "psa_accepted",
  "837": "no_deal_90d_revisit",
  "838": "not_pursuing_now",
  "845": "new_lead_received",
  "976": "incomplete_file",
  "1064": "closer_under_negotiation",
  "1071": "pace_leads",
  "1072": "closer_first_contact_made",
  "1080": "not_pursuing_never",
  "1085": "dm_dispo_initiated",
  "1086": "tc_psa_submitted",
  "1087": "loi_submitted",
  "1089": "uw_under_phase_2",
  "1136": "loi_signed_by_seller",
  "1150": "closed_rvx_network",
  "1151": "loi_in_negotiation",
  "1152": "drip_90d",
  "1153": "drip_45d",
  "1154": "drip_30d",
  "1155": "drip_14d",
  "1156": "drip_7d",
  "1172": "sent_back_to_bd",
  "1217": "closer_gathering_docs",
};

// f3059 Lead Source
export const DEAL_LEAD_SOURCE_MAP: Record<string, "bird_dog" | "direct_seller_rvx_website" | "outside_source_rvx_website"> = {
  "1073": "bird_dog",
  "1075": "direct_seller_rvx_website",
  "1092": "outside_source_rvx_website",
};

// f3175 Park Type
export const DEAL_PARK_TYPE_MAP: Record<string, "long_term" | "short_term" | "mixed"> = {
  "1220": "mixed",
  "1221": "long_term",
  "1222": "short_term",
};

// f2672 Deal Priority
export const DEAL_PRIORITY_MAP: Record<string, "cold" | "warm" | "hot"> = {
  "832": "cold",
  "833": "warm",
  "834": "hot",
};

// sales_stage Dispo Stage
export const DEAL_DISPO_STAGE_MAP: Record<string, "sent_to_primary_buyer" | "sending_to_buyer_2_3_4" | "send_to_rv_park_groups" | "post_to_subto_group" | "send_to_email_list"> = {
  "602": "sent_to_primary_buyer",
  "611": "send_to_rv_park_groups",
  "612": "post_to_subto_group",
  "613": "send_to_email_list",
  "717": "sending_to_buyer_2_3_4",
};

// expected_close_timeframe Call Disposition
export const DEAL_CALL_DISPOSITION_MAP: Record<string, "first_contact_attempted" | "first_contact_made" | "interested_negotiating" | "gathering_docs" | "not_selling_7d" | "not_selling_14d" | "not_selling_30d" | "not_selling_45d" | "not_selling_90d" | "not_pursuing_dnc"> = {
  "1206": "not_selling_30d",
  "1207": "not_selling_14d",
  "1208": "interested_negotiating",
  "1209": "first_contact_made",
  "1215": "gathering_docs",
  "1216": "first_contact_attempted",
  "1223": "not_selling_90d",
  "1224": "not_selling_45d",
  "1225": "not_selling_7d",
  "1227": "not_pursuing_dnc",
};

// recent_activity Recent Activity bucket
export const DEAL_RECENT_ACTIVITY_MAP: Record<string, "last_week" | "last_month" | "more_than_month"> = {
  "18": "last_week",
  "19": "last_month",
  "20": "more_than_month",
};

// f3169 Weekly Offer Review
export const DEAL_WEEKLY_REVIEW_MAP: Record<string, "passed" | "failed"> = {
  "1213": "failed",
  "1214": "passed",
};

// f2857 Escrow Fee
export const DEAL_ESCROW_FEE_MAP: Record<string, "buyer" | "seller" | "buyer_seller_50_50"> = {
  "969": "buyer_seller_50_50",
  "970": "buyer",
  "1005": "seller",
};

// f2859 Transfer Tax
export const DEAL_TRANSFER_TAX_MAP: Record<string, "100_seller" | "100_buyer" | "50_50"> = {
  "973": "100_seller",
  "974": "100_buyer",
  "975": "50_50",
};

// f2858 Title Policy
export const DEAL_TITLE_POLICY_MAP: Record<string, "seller" | "buyer"> = {
  "971": "seller",
  "972": "buyer",
};

// f3085 Amenities (multi-select). We store labels as text[] since the schema
// is unconstrained — Ontraport adds new amenities frequently.
export const DEAL_AMENITIES_MAP: Record<string, string> = {
  "1103": "Event Space",
  "1104": "Gravel Pads",
  "1105": "Mail Services",
  "1106": "Gated Entry",
  "1107": "Security",
  "1108": "Walking Trails",
  "1109": "Pickleball Court",
  "1110": "Mini Golf",
  "1111": "Hot Tub / Spa",
  "1112": "Swimming Pool",
  "1113": "Playground",
  "1114": "Dog Park",
  "1115": "Camp Store",
  "1116": "Snack Bar",
  "1117": "Ice Sales",
  "1118": "Firewood",
  "1119": "Mountain Views",
  "1120": "Kayak Rentals",
  "1121": "Boat Rentals",
  "1122": "Boat Ramp",
  "1123": "Fishing Access",
  "1124": "Private Beach",
  "1125": "Ocean Access",
  "1126": "River Access",
  "1127": "Lake Access",
  "1128": "Waterfront",
  "1129": "Cement Pads",
  "1130": "Dump Station",
  "1131": "Laundry",
};

// ---- COMPANIES ----

export const COMPANY_RELATIONSHIP_MAP: Record<string, "realtor" | "owner" | "owner_realtor"> = {
  "708": "realtor",
  "807": "owner",
  "959": "owner_realtor",
};

export const COMPANY_REVENUE_MAP: Record<string, string> = {
  "32": "under_1m",
  "33": "1m_5m",
  "34": "5m_20m",
  "35": "20m_50m",
  "36": "50m_100m",
  "37": "100m_plus",
};

export const COMPANY_EMPLOYEE_MAP: Record<string, string> = {
  "64": "1000_plus",
  "65": "200_1000",
  "66": "50_200",
  "67": "10_50",
  "68": "under_10",
};

// Yes/No dropdowns → boolean
export const YES_NO_MAP: Record<string, boolean> = {
  // Park with restaurant (f2830)
  "905": true,  "904": false,
  // Open to leased land (f2979)
  "1056": true, "1055": false,
  // Will use 1031 (f2807)
  "856": true,  "855": false,
  // Can produce POF (f2832)
  "922": true,  "921": false,
  // Signed NCNDA (f2675)
  "844": true,  "843": false,
};

// bulk_mail: Ontraport codes
// 0 = single opt-in, 1 = double opt-in, 2 = ... varies. Audit said 542... actually
// looking at observed data: contacts have bulk_mail="2" which based on the field meta
// for editable check fields means "Double Opt-In". Keeping conservative mapping.
export const BULK_MAIL_MAP: Record<string, string> = {
  "0": "single_opt_in",
  "1": "double_opt_in",
  "2": "double_opt_in",
  "-2": "opted_out",
  "-3": "hard_bounced",
};

// ---- helpers ----

// Ontraport list-field encoding:  asterisk-slash-asterisk-123-asterisk-slash-asterisk-456-...
// becomes ["123", "456"]. Empty list is "" or the sentinel; return [].
export function parseOntraportList(v: unknown): string[] {
  if (typeof v !== "string" || !v.length || v === "*/*") return [];
  return v.split("*/*").map((s) => s.trim()).filter(Boolean);
}

/** Lookup a single dropdown ID; return undefined if unmapped/empty. */
export function mapValue(map: Record<string, string>, v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v);
  if (!s || s === "0") return undefined;
  return map[s];
}

/** Lookup a list dropdown; return mapped values, dropping unmapped. */
export function mapList(map: Record<string, string>, v: unknown): string[] {
  return parseOntraportList(v)
    .map((id) => map[id])
    .filter((x): x is string => !!x);
}

/** Convert Ontraport unix-second timestamp string to Date (or undefined). */
export function tsToDate(v: unknown): Date | undefined {
  if (v == null || v === "" || v === "0") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return undefined;
  return new Date(n * 1000);
}

/** Convert Ontraport date string (YYYY-MM-DD or unix) to a date-only string. */
export function tsToDateStr(v: unknown): string | undefined {
  const d = tsToDate(v);
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

/** Ontraport check field: "1" → true, "0"/"" → false. */
export function checkToBool(v: unknown): boolean {
  if (v === 1 || v === true) return true;
  return v === "1";
}

/** Ontraport yes/no dropdown → boolean | undefined (null when unmapped). */
export function yesNoToBool(v: unknown): boolean | undefined {
  if (v == null || v === "" || v === "0") return undefined;
  return YES_NO_MAP[String(v)];
}

/** Trim string; return undefined for empty. */
export function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s.length ? s : undefined;
}

/** Numeric string → number (or undefined). */
export function num(v: unknown): number | undefined {
  if (v == null || v === "" || v === "0") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Numeric / price string passthrough — keep as string for drizzle numeric columns. */
export function price(v: unknown): string | undefined {
  if (v == null || v === "" || v === "0" || v === "0.00") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return String(n);
}
