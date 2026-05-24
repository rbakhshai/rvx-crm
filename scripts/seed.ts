/**
 * Idempotent seed script — populates lookup tables (deal_statuses, bird_dog_statuses).
 * Run with: npm run seed
 *
 * Values ported from the Ontraport audit (see audit/findings.md and raw/snapshot-2026-05-24.md).
 * Codes are semantic; `label` is the human display string; `legacyOntraportValue` lets the
 * migration script map old values back.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dealStatuses, birdDogStatuses } from "../src/db/schema";

process.loadEnvFile(".env.local");

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

type DealStatusSeed = typeof dealStatuses.$inferInsert;
type BirdDogStatusSeed = typeof birdDogStatuses.$inferInsert;

const DEAL_STATUSES: DealStatusSeed[] = [
  // AM intake
  { code: "incomplete_file",          label: "000 — Incomplete File — see notes", role: "misc",   sortOrder: 5,   legacyOntraportValue: "000 - Incomplete File - See notes" },
  { code: "pace_leads",                label: "001 — Pace leads",                   role: "am",     sortOrder: 7,   legacyOntraportValue: "001 - Pace Leads" },
  { code: "sent_back_to_bd",           label: "0100 — Sent back to BD (waiting)",   role: "am",     sortOrder: 8,   legacyOntraportValue: "0100 - Sent back to BD (waiting)" },
  { code: "new_lead_received",         label: "1. New lead received",               role: "am",     sortOrder: 10,  legacyOntraportValue: "1. New Lead Received" },

  // Closer
  { code: "closer_first_contact_attempted", label: "2a. Closer — first contact attempted", role: "closer", sortOrder: 20, legacyOntraportValue: "2a. Closer - First Contact Attempted" },
  { code: "closer_first_contact_made",      label: "2b. Closer — first contact made",      role: "closer", sortOrder: 21, legacyOntraportValue: "2b. Closer - First Contact Made" },
  { code: "closer_under_negotiation",       label: "2c. Closer — lead under negotiation",  role: "closer", sortOrder: 22, legacyOntraportValue: "2c. Closer - Lead Under Negotiation" },
  { code: "closer_gathering_docs",          label: "2d. Closer — gathering docs",          role: "closer", sortOrder: 23, legacyOntraportValue: "2d. Closer - Gathering Docs" },

  // Underwriting
  { code: "uw_ready_phase_2",          label: "3a. Ready for Phase 2 review",       role: "uw",     sortOrder: 30, legacyOntraportValue: "3a. Ready for Phase 2 Review" },
  { code: "uw_under_phase_2",          label: "3b. Under Phase 2 review",           role: "uw",     sortOrder: 31, legacyOntraportValue: "3b. Under Phase 2 Review" },

  // LOI
  { code: "loi_ready",                 label: "4a. Ready for LOI",                  role: "pm",     sortOrder: 40, legacyOntraportValue: "4a. Ready for LOI" },
  { code: "loi_submitted",             label: "4b. LOI submitted",                  role: "pm",     sortOrder: 41, legacyOntraportValue: "4b. LOI Submitted" },
  { code: "loi_in_negotiation",        label: "4c. LOI in negotiation",             role: "pm",     sortOrder: 42, legacyOntraportValue: "4c. LOI - In Negotiation" },
  { code: "loi_signed_by_seller",      label: "4d. LOI signed by seller",           role: "pm",     sortOrder: 43, legacyOntraportValue: "4d. LOI Signed By Seller" },
  { code: "loi_accepted_both_sides",   label: "4e. LOI — accepted both sides",      role: "pm",     sortOrder: 44, legacyOntraportValue: "4e. LOI - Accepted Both Sides" },

  // PSA / TC
  { code: "tc_writing_psa",            label: "5a. TC — writing PSA",               role: "tc",     sortOrder: 50, legacyOntraportValue: "5a. TC - Writing PSA" },
  { code: "tc_psa_submitted",          label: "5b. TC — PSA submitted",             role: "tc",     sortOrder: 51, legacyOntraportValue: "5b. TC - PSA Submitted" },
  { code: "psa_accepted",              label: "6a. PSA accepted",                   role: "tc",     sortOrder: 60, legacyOntraportValue: "6a. PSA Accepted" },
  { code: "dm_dispo_initiated",        label: "6b. DM — dispo initiated",           role: "dm",     sortOrder: 61, legacyOntraportValue: "6b. DM - Dispo Initiated" },

  // DD / Escrow
  { code: "tc_dd_in_escrow",           label: "7a. TC — DD / in escrow",            role: "tc",     sortOrder: 70, legacyOntraportValue: "7a. TC - DD / In Escrow" },
  { code: "dd_completed_in_escrow",    label: "7b. DD completed / in escrow",       role: "tc",     sortOrder: 71, legacyOntraportValue: "7b. DD Completed / In Escrow" },

  // Closed
  { code: "closed_rvx_acquired",       label: "8a. Deal closed — RVX acquired",     role: "closed", sortOrder: 80, legacyOntraportValue: "8a. Deal Closed - RVX Acquired" },
  { code: "closed_rvx_network",        label: "8b. Deal closed — RVX network",      role: "closed", sortOrder: 81, legacyOntraportValue: "8b. Deal Closed - RVX Network" },

  // Drips
  { code: "drip_7d",                   label: "80. 7-day drip",                     role: "drip",   sortOrder: 90, legacyOntraportValue: "80. 7 Day Drip" },
  { code: "drip_14d",                  label: "81. 14-day drip",                    role: "drip",   sortOrder: 91, legacyOntraportValue: "81. 14 Day Drip" },
  { code: "drip_30d",                  label: "82. 30-day drip",                    role: "drip",   sortOrder: 92, legacyOntraportValue: "82. 30 Day Drip" },
  { code: "drip_45d",                  label: "83. 45-day drip",                    role: "drip",   sortOrder: 93, legacyOntraportValue: "83. 45 Day Drip" },
  { code: "drip_90d",                  label: "84. 90-day drip",                    role: "drip",   sortOrder: 94, legacyOntraportValue: "84. 90 Day Drip" },

  // Parked
  { code: "no_deal_90d_revisit",       label: "95. No deal — 90-day revisit",       role: "parked", sortOrder: 100, legacyOntraportValue: "95. No Deal - 90 Day Revisit" },
  { code: "deal_pending_45d",          label: "96. Deal pending — follow up 45d",   role: "parked", sortOrder: 101, legacyOntraportValue: "96. Deal Pending - Follow up 45 Days" },
  { code: "listing_pulled_90_drip",    label: "97. Off market — listing pulled, 90-day drip", role: "parked", sortOrder: 102, legacyOntraportValue: "97. Off Market - Listing Pulled - 90 Drip" },

  // Dead
  { code: "closed_other_buyer",        label: "98. Deal closed — other buyer",      role: "dead",   sortOrder: 110, legacyOntraportValue: "98. Deal Closed - Other Buyer" },
  { code: "not_pursuing_now",          label: "99a. Not pursuing — now",            role: "dead",   sortOrder: 111, legacyOntraportValue: "99a. Not Pursuing - Now" },
  { code: "not_pursuing_never",        label: "99b. Not pursuing — never",          role: "dead",   sortOrder: 112, legacyOntraportValue: "99b. Not Pursuing - Never" },
];

const BIRD_DOG_STATUSES: BirdDogStatusSeed[] = [
  // Intake / hold
  { code: "hold_see_notes",             label: "1.0 Hold — see notes",             group: "intake",       sortOrder: 5,  legacyOntraportValue: "1.0 HOLD - See notes" },

  // Interview phase
  { code: "email_1_interview",          label: "2.0 Email 1 — interview",          group: "interviewing", sortOrder: 10, legacyOntraportValue: "2.0 Email 1 - interview" },
  { code: "email_2_interview",          label: "2.1 Email 2 — interview",          group: "interviewing", sortOrder: 11, legacyOntraportValue: "2.1 Email 2 - interview" },
  { code: "interview_scheduled",        label: "3.0 Interview scheduled",          group: "interviewing", sortOrder: 20, legacyOntraportValue: "3.0 Interview scheduled" },

  // Agreement
  { code: "agreement_sent",             label: "5.0 Agreement sent",               group: "agreement",    sortOrder: 30, legacyOntraportValue: "5.0 Agreement Sent" },
  { code: "agreement_follow_up",        label: "5.1 Agreement follow-up",          group: "agreement",    sortOrder: 31, legacyOntraportValue: "5.1 Agreement follow up" },

  // Onboarding
  { code: "onboarding_packet_sent",     label: "6.0 Onboarding packet sent",       group: "onboarding",   sortOrder: 40, legacyOntraportValue: "6.0 Onboarding Packet Sent" },
  { code: "onboarding_packet_follow",   label: "6.1 Onboarding packet follow-up",  group: "onboarding",   sortOrder: 41, legacyOntraportValue: "6.1 Onboarding Packet Follow up" },
  { code: "delayed_start",              label: "7.0 Delayed start — see notes",    group: "onboarding",   sortOrder: 45, legacyOntraportValue: "7.0 Delayed Start - See Notes" },
  { code: "taking_break",               label: "7.2 Taking a break — see notes",   group: "paused",       sortOrder: 46, legacyOntraportValue: "7.2. Taking a Break - See notes" },

  // On-watch / no-show
  { code: "on_watch",                   label: "8.0 On watch",                     group: "on_watch",     sortOrder: 50, legacyOntraportValue: "8.0 On - Watch" },
  { code: "interview_no_show",          label: "8.1 Interview no-show",            group: "on_watch",     sortOrder: 51, legacyOntraportValue: "8.1 Interview No Show" },

  // Executive
  { code: "executive_team",             label: "9. Executive team",                group: "executive",    sortOrder: 60, legacyOntraportValue: "9. Executive Team" },

  // Active states (z.* in Ontraport, sorted last by their `z` prefix)
  { code: "active",                     label: "Active",                            group: "active",       sortOrder: 70, legacyOntraportValue: "z.Active" },
  { code: "active_half_time",           label: "Active — half-time commitment",    group: "active_half",  sortOrder: 71, legacyOntraportValue: "z. Active - Half Time Commitment" },
  { code: "no_replies_ghosted",         label: "No replies / ghosted",             group: "inactive",     sortOrder: 80, legacyOntraportValue: "z.No replies / ghosted" },
  { code: "not_active",                 label: "Not active",                       group: "inactive",     sortOrder: 81, legacyOntraportValue: "z.Not Active" },

  // Denied (zz.*)
  { code: "denied_discovery_scammer",   label: "Denied — discovery call scammer",  group: "denied",       sortOrder: 90, legacyOntraportValue: "zz. Denied Discovery Call - Scammer" },
  { code: "denied_not_good_fit",        label: "Denied — not a good fit",          group: "denied",       sortOrder: 91, legacyOntraportValue: "zz. Denied - not a good fit (see notes)" },
  { code: "denied_not_right_now",       label: "Denied — not right now",           group: "denied",       sortOrder: 92, legacyOntraportValue: "zz. Not right now" },
  { code: "denied_non_exclusive_only",  label: "Denied — non-exclusive only",      group: "denied",       sortOrder: 93, legacyOntraportValue: "zz. Non-exclusive only" },
];

async function main() {
  console.log(`Seeding ${DEAL_STATUSES.length} deal statuses...`);
  for (const row of DEAL_STATUSES) {
    await db
      .insert(dealStatuses)
      .values(row)
      .onConflictDoUpdate({
        target: dealStatuses.code,
        set: {
          label: row.label,
          role: row.role,
          sortOrder: row.sortOrder,
          legacyOntraportValue: row.legacyOntraportValue,
        },
      });
  }

  console.log(`Seeding ${BIRD_DOG_STATUSES.length} bird dog statuses...`);
  for (const row of BIRD_DOG_STATUSES) {
    await db
      .insert(birdDogStatuses)
      .values(row)
      .onConflictDoUpdate({
        target: birdDogStatuses.code,
        set: {
          label: row.label,
          group: row.group,
          sortOrder: row.sortOrder,
          legacyOntraportValue: row.legacyOntraportValue,
        },
      });
  }

  console.log("✓ Seed complete.");
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
