/**
 * Migrate Ontraport contacts → our `contacts` table.
 *
 * Idempotent: looks up by `legacy_ontraport_id`; updates existing rows,
 * inserts new ones. Re-run safely after pulling a fresh raw dump.
 *
 * Input: raw/ontraport-contacts.json (array of raw Ontraport contact rows)
 * Output: migrated rows in `contacts`; summary printed to stdout.
 */
import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { contacts } from "../../src/db/schema";
import {
  BUYER_STATUS_MAP,
  QUALIFICATION_TIER_MAP,
  BUYER_LEAD_SOURCE_MAP,
  DEPLOYABLE_CASH_MAP,
  MAX_DEAL_SIZE_MAP,
  EXCHANGE_1031_MAP,
  FASTEST_TURNAROUND_MAP,
  FINANCING_OPTIONS_MAP,
  GP_LP_MAP,
  PARK_TYPE_MAP,
  INVESTOR_TYPE_MAP,
  FINANCING_RESOURCES_MAP,
  REI_EXPERIENCE_MAP,
  VALUABLE_SKILLS_MAP,
  PADS_DESIRED_MAP,
  RVP_CLOSED_MAP,
  TWELVE_MONTH_GOALS_MAP,
  BULK_MAIL_MAP,
  mapValue,
  mapList,
  tsToDate,
  tsToDateStr,
  checkToBool,
  yesNoToBool,
  str,
  num,
  price,
} from "./maps";

process.loadEnvFile(".env.local");

type Raw = Record<string, unknown>;

function mapContact(r: Raw): typeof contacts.$inferInsert {
  const opId = Number(r.id);
  return {
    legacyOntraportId: opId,

    // identity
    firstName: str(r.firstname),
    lastName: str(r.lastname),
    email: str(r.email),
    phone: undefined,                       // Ontraport doesn't have a "phone" field separate from sms/office
    smsNumber: str(r.sms_number),
    officePhone: str(r.office_phone),
    fax: str(r.fax),
    title: str(r.title),
    timezone: str(r.timezone),
    birthday: tsToDateStr(r.birthday),

    // address
    address: str(r.address),
    address2: str(r.address2),
    city: str(r.city),
    state: str(r.state),
    zip: str(r.zip),
    country: str(r.country),

    // social
    website: str(r.website),
    facebookLink: str(r.facebook_link),
    instagramLink: str(r.instagram_link),
    linkedinLink: str(r.linkedin_link),
    twitterLink: str(r.twitter_link),
    blinqProfile: str(r.f2229),

    // status & qualification (required: openToLeasedLand defaults to false)
    status: mapValue(BUYER_STATUS_MAP, r.f2262) as never,
    qualificationTier: mapValue(QUALIFICATION_TIER_MAP, r.f2668) as never,
    buyerNumber: num(r.f2321),
    topTier: checkToBool(r.f3056),
    buyerLeadSource: mapValue(BUYER_LEAD_SOURCE_MAP, r.f2228) as never,

    // buy box
    parkTypePreferences: mapList(PARK_TYPE_MAP, r.f2450),
    targetStates: targetStatesAsStateCodes(r.f2049),
    strictStates: checkToBool(r.f3153),
    amountOfPadsDesiredBucket: mapValue(PADS_DESIRED_MAP, r.f2912),
    maxDealSize: mapValue(MAX_DEAL_SIZE_MAP, r.f2806) as never,
    minNoiUsd: price(r.f3142),
    parkWithRestaurant: yesNoToBool(r.f2830),
    openToLeasedLand: yesNoToBool(r.f2979) ?? false,

    // capital
    deployableCash: mapValue(DEPLOYABLE_CASH_MAP, r.f3164) as never,
    willUse1031: yesNoToBool(r.f2807),
    using1031Amount: mapValue(EXCHANGE_1031_MAP, r.f2842) as never,
    pofAmount: price(r.f3083),
    canProducePof: yesNoToBool(r.f2832),
    pofFileUrl: str(r.f2685),
    pofAuthFormUrl: str(r.f3122),
    pofConsentFormUrl: str(r.f3119),
    financingOptions: mapValue(FINANCING_OPTIONS_MAP, r.f2839) as never,
    currentFinancingResources: mapList(FINANCING_RESOURCES_MAP, r.f2810),
    fastestTurnaround: mapValue(FASTEST_TURNAROUND_MAP, r.f2811) as never,
    investorType: mapList(INVESTOR_TYPE_MAP, r.f2834),
    gpLp: mapValue(GP_LP_MAP, r.f3152) as never,

    // experience
    reiExperienceOutsideRvp: mapList(REI_EXPERIENCE_MAP, r.f2831),
    rvpClosedInPastBucket: mapValue(RVP_CLOSED_MAP, r.f2836),
    twelveMonthGoalsBucket: mapValue(TWELVE_MONTH_GOALS_MAP, r.f2835),
    buyersValuableSkills: mapList(VALUABLE_SKILLS_MAP, r.f2864),
    describeSkillExperience: str(r.f2865),

    // compliance
    signedNcnda: yesNoToBool(r.f2675) ?? false,
    signedNcndaLink: str(r.f2693),
    ndaAcceptanceCheckbox: checkToBool(r.f2687),
    smsPermission: checkToBool(r.f2157),
    bulkEmailStatus: mapValue(BULK_MAIL_MAP, r.bulk_mail) as never,
    bulkSmsOptedOut: false,  // Ontraport stores bulk_sms differently; default

    // community (Pace Morby ecosystem)
    subtoMember: checkToBool(r.f2231),
    subtoMemberSince: str(r.f3057),
    ownersClubMember: checkToBool(r.f2230),
    gatorMember: checkToBool(r.f3055),
    topTierMember: checkToBool(r.f3056),

    // intake
    intakeInterviewDate: tsToDateStr(r.f2902),
    nameOfLlc: str(r.f2669),
    buyersAdditionalComments: str(r.f2840),
    buyersAnythingElsePopup: str(r.f2186),
    minReturnRequired: str(r.f2510),

    // internal notes
    internalNotesBuyerContact: str(r.f2848),
    internalNotesBuyerCriteria: str(r.f2165),
    internalNotesQualifyCredibility: str(r.f2847),

    // attribution & misc (preserved as-is for audit)
    referringPage: str(r.referral_page),
    ipAddress: str(r.ip_addy_display),
    userAgent: str(r.user_agent),

    // timestamps
    createdAt: tsToDate(r.date) ?? new Date(),
    updatedAt: tsToDate(r.dlm) ?? new Date(),
    lastActivityAt: tsToDate(r.dla),
    lastEmailReceivedAt: tsToDate(r.date_last_email_received),
    lastEmailSentAt: tsToDate(r.date_last_email_sent),
    lastSmsReceivedAt: tsToDate(r.date_last_sms_received),
    lastSmsSentAt: tsToDate(r.date_last_sms_sent),
    lastCallLoggedAt: tsToDate(r.date_last_call_logged),
    lastNote: str(r.last_note),
  };
}

/**
 * Ontraport `f2049` stores state IDs (266=NJ, 289=AZ, etc.) — but our schema
 * stores target_states as ISO state codes (AZ, NJ). Map them here.
 */
const TARGET_STATE_ID_TO_CODE: Record<string, string> = {
  "241": "VT", "242": "SD", "243": "RI", "244": "NH", "245": "MA", "246": "ME",
  "247": "CT", "248": "KS", "249": "MN", "250": "WI", "251": "ND", "252": "NE",
  "253": "MO", "254": "MI", "255": "IN", "256": "IA", "257": "IL", "258": "OH",
  "259": "TX", "260": "OK", "261": "LA", "262": "AR", "263": "TN", "264": "MS",
  "265": "KY", "266": "AL", "267": "DC", "268": "WV", "269": "VA", "270": "SC",
  "271": "NC", "272": "MD", "273": "GA", "274": "FL", "275": "DE", "277": "WA",
  "278": "OR", "279": "HI", "280": "CA", "281": "AK", "282": "WY", "283": "UT",
  "284": "NM", "285": "NV", "286": "MT", "287": "ID", "288": "CO", "289": "AZ",
  "701": "NJ", "702": "PA", "703": "NY",
};

function targetStatesAsStateCodes(v: unknown): string[] {
  const ids = mapList({}, v); // parse but don't map
  // Above always returns [] because empty map; use parser directly
  const parsed = typeof v === "string" ? v.split("*/*").filter((s) => s && s !== "0") : [];
  return parsed.map((id) => TARGET_STATE_ID_TO_CODE[id]).filter((c): c is string => !!c);
}

async function main() {
  const file = process.argv[2] ?? "raw/ontraport-contacts.json";
  const dryRun = process.argv.includes("--dry-run");

  console.log(`[migrate:contacts] reading ${file}${dryRun ? " (dry-run)" : ""}`);
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as Raw[];
  console.log(`[migrate:contacts] ${raw.length} input rows`);

  if (dryRun) {
    const sample = mapContact(raw[0]);
    console.log("[migrate:contacts] sample mapped row:");
    console.log(JSON.stringify(sample, null, 2));
    return;
  }

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const r of raw) {
    try {
      const mapped = mapContact(r);
      const [existing] = await db
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.legacyOntraportId, mapped.legacyOntraportId!))
        .limit(1);

      if (existing) {
        const { createdAt, ...updateFields } = mapped; // keep original createdAt
        void createdAt;
        await db.update(contacts).set({ ...updateFields, updatedAt: new Date() }).where(eq(contacts.id, existing.id));
        updated++;
      } else {
        await db.insert(contacts).values(mapped);
        inserted++;
      }
    } catch (err) {
      failed++;
      console.error(`[migrate:contacts] failed op_id=${r.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n[migrate:contacts] done — inserted=${inserted} updated=${updated} failed=${failed}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
