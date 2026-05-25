/**
 * Lookup option lists for form selects. Keep in sync with schema enums.
 * One source of truth for labels users see.
 */
import type { SelectOption } from "@/components/form-field";

export const BUYER_STATUS_OPTIONS: SelectOption[] = [
  { value: "new_waiting_to_connect",  label: "New — waiting to connect" },
  { value: "active_looking",          label: "Active — looking" },
  { value: "active_looking_hot",      label: "Active 🔥 — high engagement" },
  { value: "deal_under_contract",     label: "Deal under contract" },
  { value: "closed_bought_with_us",   label: "Closed — bought with us" },
  { value: "paused_new_minimal_cash", label: "Paused — new investor, minimal cash" },
  { value: "paused_temporary",        label: "Paused — temporary" },
  { value: "unresponsive",            label: "Unresponsive" },
  { value: "disqualified",            label: "Disqualified" },
];

export const QUALIFICATION_TIER_OPTIONS: SelectOption[] = [
  { value: "tier_1_experienced_rvp_network",   label: "[1] Experienced RVP — team/network" },
  { value: "tier_2_experienced_re_new_to_rvp", label: "[2] Experienced RE investor — new to RVP" },
  { value: "tier_3_re_investor_small_scale",   label: "[3] RE investor — small scale, new to RVP" },
  { value: "tier_4_new_re_investor_250k_dp",   label: "[4] New RE investor — $250k DP" },
  { value: "tier_5_new_re_investor_100k_dp",   label: "[5] New RE investor — $100k DP" },
];

export const BUYER_LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { value: "investor_popup",         label: "Investor popup" },
  { value: "seller_popup",           label: "Seller popup" },
  { value: "buyer_popup",            label: "Buyer popup" },
  { value: "emailed_in",             label: "Emailed in" },
  { value: "rv_broker",              label: "RV broker" },
  { value: "fb_messenger_inbound",   label: "FB Messenger inbound" },
  { value: "facebook_inbound_message", label: "Facebook inbound" },
  { value: "facebook_groups",        label: "Facebook groups" },
  { value: "meetup",                 label: "Meetup" },
  { value: "reza_outreach",          label: "Reza outreach" },
  { value: "dan_outreach",           label: "Dan outreach" },
  { value: "travis_outreach",        label: "Travis outreach" },
  { value: "pace_zoom_call",         label: "Pace Zoom call" },
];

export const DEPLOYABLE_CASH_OPTIONS: SelectOption[] = [
  { value: "under_100k", label: "$0 – $100k" },
  { value: "100k_250k",  label: "$100k – $250k" },
  { value: "250k_500k",  label: "$250k – $500k" },
  { value: "500k_1m",    label: "$500k – $1M" },
  { value: "1m_plus",    label: "$1M+" },
];

export const MAX_DEAL_SIZE_OPTIONS: SelectOption[] = [
  { value: "under_1m", label: "Under $1M" },
  { value: "1m_5m",    label: "$1M – $5M" },
  { value: "5m_plus",  label: "$5M+" },
];

export const EXCHANGE_1031_OPTIONS: SelectOption[] = [
  { value: "none",       label: "Not using 1031" },
  { value: "under_250k", label: "Less than $250k" },
  { value: "250k_500k",  label: "$250k – $500k" },
  { value: "500k_1m",    label: "$500k – $1M" },
  { value: "1m_plus",    label: "$1M+" },
];

export const FASTEST_TURNAROUND_OPTIONS: SelectOption[] = [
  { value: "asap",              label: "ASAP" },
  { value: "sooner_than_later", label: "Sooner than later" },
  { value: "this_quarter",      label: "This quarter" },
  { value: "this_year",         label: "This year sometime" },
];

export const FINANCING_OPTIONS_OPTIONS: SelectOption[] = [
  { value: "must_be_creative",         label: "Must be creative financing" },
  { value: "creative_or_conventional", label: "Creative or conventional — either" },
];

export const GP_LP_OPTIONS: SelectOption[] = [
  { value: "investor_only",          label: "Investor only" },
  { value: "operator_or_investor",   label: "Operator or investor" },
  { value: "operator_only",          label: "Operator only" },
  { value: "operator_open_to_wedge", label: "Operator open to wedge" },
  { value: "no_rvp_parks",           label: "No RVP parks" },
];

export const PARK_TYPE_OPTIONS: SelectOption[] = [
  { value: "worker_type",                  label: "Worker-type parks" },
  { value: "tourist_destination",          label: "Tourist / destination" },
  { value: "transient_overnight",          label: "Transient / overnight" },
  { value: "long_term_residential_well",   label: "Long-term residential — well-kept" },
  { value: "long_term_residential_low",    label: "Long-term residential — low-income" },
  { value: "rustic_primitive",             label: "Rustic / primitive" },
  { value: "luxury_resort",                label: "Luxury / resort" },
  { value: "campground_wooded",            label: "Campground / wooded" },
  { value: "age_restricted",               label: "Age-restricted" },
  { value: "seasonal_rv",                  label: "Seasonal RV parks" },
  { value: "year_round_rv",                label: "Year-round RV parks" },
];

export const REI_EXPERIENCE_OPTIONS: SelectOption[] = [
  { value: "bare_land_dev",    label: "Bare land development" },
  { value: "mobile_home_park", label: "Mobile home parks" },
  { value: "commercial_indus", label: "Commercial — industrial" },
  { value: "commercial_retail",label: "Commercial — retail" },
  { value: "commercial_mf",    label: "Commercial — multi-family" },
  { value: "residential_mf",   label: "Residential — multi-family" },
  { value: "residential_sf",   label: "Residential — single-family" },
];

export const VALUABLE_SKILLS_OPTIONS: SelectOption[] = [
  { value: "contractor",            label: "Contractor" },
  { value: "fund_management",       label: "Fund management" },
  { value: "capital_raising",       label: "Capital raising" },
  { value: "hospitality_tourism",   label: "Hospitality / tourism" },
  { value: "business_management",   label: "Business management" },
  { value: "network",               label: "Valuable RE network" },
  { value: "wholesaling_realtor",   label: "Wholesaling / realtor" },
  { value: "transaction_coord",     label: "Transaction coordination" },
  { value: "underwriting",          label: "Underwriting" },
  { value: "skilled_trade",         label: "Skilled trade" },
];

export const INVESTOR_TYPE_OPTIONS: SelectOption[] = [
  { value: "institutional",         label: "Institutional" },
  { value: "private_equity",        label: "Private equity" },
  { value: "basic_partnerships",    label: "Basic partnerships" },
  { value: "individual",            label: "Individual" },
];

export const FINANCING_RESOURCES_OPTIONS: SelectOption[] = [
  { value: "syndicate",             label: "Syndicate" },
  { value: "other_investors",       label: "Other investors / partners" },
  { value: "private_money",         label: "Private money lenders" },
  { value: "bank",                  label: "Bank / institutional lenders" },
  { value: "cash",                  label: "Cash — no capital raising" },
];

export const PADS_DESIRED_BUCKETS: SelectOption[] = [
  { value: "40_or_less", label: "40 or less" },
  { value: "40_plus",    label: "40+" },
  { value: "75_plus",    label: "75+" },
  { value: "100_plus",   label: "100+" },
];

export const RVP_CLOSED_BUCKETS: SelectOption[] = [
  { value: "0",     label: "0" },
  { value: "1_3",   label: "1 – 3" },
  { value: "4_10",  label: "4 – 10" },
  { value: "10_plus", label: "10+" },
];

export const TWELVE_MONTH_GOAL_BUCKETS: SelectOption[] = [
  { value: "1",        label: "1" },
  { value: "2_3",      label: "2 – 3" },
  { value: "4_10",     label: "4 – 10" },
  { value: "10_plus",  label: "10+" },
];

/* ------------ DEAL OPTIONS ------------ */

export const DEAL_PRIORITY_OPTIONS: SelectOption[] = [
  { value: "cold", label: "⛄️ Cold" },
  { value: "warm", label: "🌤️ Warm" },
  { value: "hot",  label: "🔥 Hot" },
];

export const PARK_TYPE_DEAL_OPTIONS: SelectOption[] = [
  { value: "long_term",  label: "Long-term" },
  { value: "short_term", label: "Short-term" },
  { value: "mixed",      label: "Mixed (short + long)" },
];

export const DISPO_STAGE_OPTIONS: SelectOption[] = [
  { value: "sent_to_primary_buyer",  label: "Sent to primary buyer" },
  { value: "sending_to_buyer_2_3_4", label: "Sending to buyer 2/3/4" },
  { value: "send_to_rv_park_groups", label: "Send to RV park groups" },
  { value: "post_to_subto_group",    label: "Post to Subto group" },
  { value: "send_to_email_list",     label: "Send to email list" },
];

export const CALL_DISPOSITION_OPTIONS: SelectOption[] = [
  { value: "first_contact_attempted", label: "First contact attempted" },
  { value: "first_contact_made",      label: "First contact made" },
  { value: "interested_negotiating",  label: "Interested / negotiating" },
  { value: "gathering_docs",          label: "Gathering docs" },
  { value: "not_selling_7d",          label: "Not selling now — 7-day reminder" },
  { value: "not_selling_14d",         label: "Not selling now — 14-day reminder" },
  { value: "not_selling_30d",         label: "Not selling now — 30-day reminder" },
  { value: "not_selling_45d",         label: "Not selling now — 45-day reminder" },
  { value: "not_selling_90d",         label: "Not selling now — 90-day reminder" },
  { value: "not_pursuing_dnc",        label: "Not pursuing — DNC" },
];

export const DEAL_LEAD_SOURCE_OPTIONS: SelectOption[] = [
  { value: "bird_dog",                   label: "Bird dog" },
  { value: "direct_seller_rvx_website",  label: "Direct seller — RVX website" },
  { value: "outside_source_rvx_website", label: "Outside source — RVX website" },
];

export const WEEKLY_OFFER_REVIEW_OPTIONS: SelectOption[] = [
  { value: "passed", label: "🟢 Passed" },
  { value: "failed", label: "🔴 Failed" },
];

export const ESCROW_FEE_OPTIONS: SelectOption[] = [
  { value: "buyer",              label: "100% Buyer" },
  { value: "seller",             label: "100% Seller" },
  { value: "buyer_seller_50_50", label: "50/50 Buyer/Seller" },
];

export const TRANSFER_TAX_OPTIONS: SelectOption[] = [
  { value: "100_seller", label: "100% Seller pays" },
  { value: "100_buyer",  label: "100% Buyer pays" },
  { value: "50_50",      label: "50/50 split" },
];

export const TITLE_POLICY_OPTIONS: SelectOption[] = [
  { value: "seller", label: "Seller pays" },
  { value: "buyer",  label: "Buyer pays" },
];

export const AMENITIES_OPTIONS: SelectOption[] = [
  "Event Space","Gravel Pads","Mail Services","Gated Entry","Security","Walking Trails",
  "Pickleball Court","Mini Golf","Hot Tub / Spa","Swimming Pool","Playground","Dog Park",
  "Camp Store","Snack Bar","Ice Sales","Firewood","Mountain Views","Kayak Rentals",
  "Boat Rentals","Boat Ramp","Fishing Access","Private Beach","Ocean Access","River Access",
  "Lake Access","Waterfront","Cement Pads","Dump Station","Laundry",
].map((s) => ({ value: s.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label: s }));

/* ------------ COMPANY OPTIONS ------------ */

export const COMPANY_RELATIONSHIP_OPTIONS: SelectOption[] = [
  { value: "realtor",       label: "Realtor" },
  { value: "owner",         label: "Owner" },
  { value: "owner_realtor", label: "Owner who is also a Realtor" },
];

export const COMPANY_REVENUE_OPTIONS: SelectOption[] = [
  { value: "under_1m",  label: "Under $1M" },
  { value: "1m_5m",     label: "$1M – $5M" },
  { value: "5m_20m",    label: "$5M – $20M" },
  { value: "20m_50m",   label: "$20M – $50M" },
  { value: "50m_100m",  label: "$50M – $100M" },
  { value: "100m_plus", label: "$100M+" },
];

export const COMPANY_EMPLOYEE_OPTIONS: SelectOption[] = [
  { value: "under_10",   label: "Under 10" },
  { value: "10_50",      label: "10 – 50" },
  { value: "50_200",     label: "50 – 200" },
  { value: "200_1000",   label: "200 – 1,000" },
  { value: "1000_plus",  label: "1,000+" },
];

/* ------------ BIRD DOG OPTIONS ------------ */

export const BD_ACQUISITION_LEVEL_OPTIONS: SelectOption[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "junior",     label: "Junior" },
  { value: "senior",     label: "Senior" },
];

export const TRAINING_STATUS_OPTIONS: SelectOption[] = [
  { value: "no",          label: "No" },
  { value: "in_progress", label: "In progress" },
  { value: "yes",         label: "Yes" },
];

export const US_STATES: SelectOption[] = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
].map((s) => ({ value: s, label: s }));
