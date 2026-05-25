/**
 * Migrate Ontraport deals (objectID 149) → our `deals` table.
 * Idempotent on legacy_ontraport_id.
 *
 * Must run AFTER contacts, companies, and bird-dogs because deals reference
 * them via FK (resolved by legacy_ontraport_id lookup at start).
 *
 * Input: raw/ontraport-deals.json (array of raw Ontraport deal rows)
 */
import fs from "node:fs/promises";
import { eq, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { deals, companies, contacts, birdDogs } from "../../src/db/schema";
import {
  DEAL_STATUS_MAP,
  DEAL_LEAD_SOURCE_MAP,
  DEAL_PARK_TYPE_MAP,
  DEAL_PRIORITY_MAP,
  DEAL_DISPO_STAGE_MAP,
  DEAL_CALL_DISPOSITION_MAP,
  DEAL_RECENT_ACTIVITY_MAP,
  DEAL_WEEKLY_REVIEW_MAP,
  DEAL_ESCROW_FEE_MAP,
  DEAL_TRANSFER_TAX_MAP,
  DEAL_TITLE_POLICY_MAP,
  DEAL_AMENITIES_MAP,
  mapValue,
  mapList,
  tsToDate,
  tsToDateStr,
  checkToBool,
  str,
  num,
  price,
} from "./maps";

process.loadEnvFile(".env.local");

type Raw = Record<string, unknown>;

// Ontraport file fields return "{}" when empty.
function fileUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t || t === "{}" || t === "[]" || t === "null") return undefined;
  if (t.startsWith("http")) return t;
  try {
    const parsed = JSON.parse(t);
    if (typeof parsed === "string" && parsed.startsWith("http")) return parsed;
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      const url = obj.url ?? obj.path ?? obj.location;
      if (typeof url === "string" && url.startsWith("http")) return url;
    }
  } catch {}
  return undefined;
}

// Resolve a parent-field Ontraport ID to our UUID via a lookup map.
function resolveFk(opId: unknown, lookup: Map<number, string>): string | undefined {
  if (opId == null || opId === "" || opId === "0") return undefined;
  const n = Number(opId);
  if (!Number.isFinite(n) || n === 0) return undefined;
  return lookup.get(n);
}

interface Lookups {
  companies: Map<number, string>;
  contacts: Map<number, string>;
  birdDogsById: Map<number, string>;
  birdDogsByEmail: Map<string, string>;
}

function mapDeal(r: Raw, l: Lookups): typeof deals.$inferInsert {
  const opId = Number(r.id);

  // Bird dog: prefer FK by legacy id (none on deals in Ontraport), fall back
  // to email lookup against the bird-dogs we just migrated.
  const birdDogEmail = str(r.f2297)?.toLowerCase();
  const birdDogId =
    (birdDogEmail && l.birdDogsByEmail.get(birdDogEmail)) || undefined;

  return {
    legacyOntraportId: opId,

    name: str(r.name),
    profileImageUrl: fileUrl(r.profile_image),

    // PROPERTY
    parkAddress: str(r.f2274),
    parkCity: str(r.f2243),
    parkState: str(r.f2248),
    parkType: mapValue(DEAL_PARK_TYPE_MAP, r.f3175) as never,
    padsCount: num(r.f2469),
    cabinsCount: str(r.f2903),
    tentSitesCount: str(r.f2904),
    hotelMotelCount: str(r.f2905),
    totalUnits: num(r.f2470),
    acresCount: str(r.f3064),
    fullHookupPads: str(r.f3090),
    septicSystemType: str(r.f2887),
    septicCountLastServiced: str(r.f2888),
    electricalDetail: str(r.f2889),
    padsOnSeparateMeters: str(r.f2890),
    occupancyPct: price(r.f3173) as never,
    mixUse: str(r.f3174),
    amenities: mapList(DEAL_AMENITIES_MAP, r.f3085),
    googleMapUrl: str(r.f3161),
    spatialPictureUrl: fileUrl(r.f3162),
    listingLink: str(r.f2249),
    propertyWebsite: str(r.f2458),
    hasRestaurant: checkToBool(r.f3087),
    repairsOrDeferredMaintenance: str(r.f2281),
    whatMakesThisSpecial: str(r.f3160),
    motivationToSell: str(r.f3165),
    lookingToRetire: str(r.f2277),
    ideallyCloseDate: str(r.f2278),
    managerInPlace: str(r.f2522),
    ownsOtherParks: str(r.f3166),
    otherIncomeStreams: str(r.f2694),
    anyOtherDebtsLiens: str(r.f2893),
    taxesCurrent: str(r.f2894),
    ownedTheParkLong: str(r.f2520),
    permissionToShareFinancials: checkToBool(r.f2298),
    importantSellerTerms: str(r.f2282),

    // FINANCIALS — LISTED
    listPrice: price(r.f2237) as never,
    listNoi: price(r.f2241) as never,
    listCapRate: str(r.f2238),
    openToCreative: checkToBool(r.f2239),

    // FINANCIALS — AGREED
    agreedPurchasePrice: price(r.f2626) as never,
    agreedCapRate: str(r.f2625),
    cashOffer: price(r.value) as never,
    sellerFinanceDownPayment: price(r.f3061) as never,
    sellerFinanceAmount: price(r.f3183) as never,
    sellerFinanceInterestRate: str(r.f3048),
    sellerFinanceAmortYears: str(r.f3050),
    sellerFinanceBalloonYears: str(r.f3062),
    hybridPurchasePrice: price(r.calc) as never,
    hybridDownPayment: price(r.f3179) as never,
    hybridInterestRate: price(r.f3178) as never,
    hybridAmortYears: num(r.f3182),
    bankInterestRate: str(r.f3181),
    bankAmortYears: str(r.f3198),
    equityContribution: price(r.f3199) as never,
    totalAssignmentPayout: price(r.weighted_value) as never,
    expectedWinPercent: num(r.expected_win_percent),

    // CURRENT LIABILITIES
    currentMortgageDebt: str(r.f2513),
    currentMortgagePayment: str(r.f2517),
    currentMortgageInterestRate: str(r.f2516),
    currentMortgageBalloonDate: str(r.f2521),

    // WORKFLOW
    statusCode: mapValue(DEAL_STATUS_MAP, r.f2667),
    dispoStage: mapValue(DEAL_DISPO_STAGE_MAP, r.sales_stage) as never,
    dealPriority: mapValue(DEAL_PRIORITY_MAP, r.f2672) as never,
    callDisposition: mapValue(DEAL_CALL_DISPOSITION_MAP, r.expected_close_timeframe) as never,
    weeklyOfferReview: mapValue(DEAL_WEEKLY_REVIEW_MAP, r.f3169) as never,
    recentActivity: mapValue(DEAL_RECENT_ACTIVITY_MAP, r.recent_activity) as never,
    readyForReview: checkToBool(r.f3113),
    updateStatusReadyForUw: checkToBool(r.f3114),

    // SOURCE
    leadSource: mapValue(DEAL_LEAD_SOURCE_MAP, r.f3059) as never,

    // BIRD DOG
    birdDogId,
    birdDogFirstName: str(r.f2275),
    birdDogLastName: str(r.f2296),
    birdDogPhone: str(r.f2276),
    birdDogEmail: str(r.f2297),
    birdDogAdditionalNotes: str(r.f2242),
    birdDogSharedDriveUrl: str(r.f2430),
    updateToBirdDog: str(r.f2690),
    birdDogLeadNonRvx: checkToBool(r.f2948),

    // DOCUMENTS
    marketingPackageUrl: fileUrl(r.f2283),
    pAndLUrl: fileUrl(r.f2370),
    appraisalUrl: fileUrl(r.f2280),
    additionalFinancialsUrl: fileUrl(r.f2284),
    additionalFinancialsUrl2: fileUrl(r.f2303),
    additionalFile1Url: fileUrl(r.f2501),
    additionalFile2Url: fileUrl(r.f2502),
    additionalFile3Url: fileUrl(r.f2247),
    rvxOnePagerUrl: str(r.f2914),
    rvxFivePagerUrl: str(r.f2915),
    buyerLevel1FinancialsUrl: str(r.f2882),
    buyerFullDueDiligenceUrl: str(r.f2886),
    createDataRoomUrl: str(r.f2927),

    // DATES
    emdDueDate: tsToDateStr(r.f2854),
    emdAmount: price(r.f2853) as never,
    emdDeposited: tsToDateStr(r.f2878),
    escrowOpened: tsToDateStr(r.f2318),
    inspectionPeriodEnd: tsToDateStr(r.f2856),
    psaCoeDate: tsToDateStr(r.f2855),
    updatedCoeDate2: tsToDateStr(r.expected_close_date),
    updatedCoeDate3: tsToDateStr(r.actual_close_date),
    closerLastTouch: tsToDate(r.f2947),

    // FEES
    escrowFeeResponsibility: mapValue(DEAL_ESCROW_FEE_MAP, r.f2857) as never,
    transferTaxResponsibility: mapValue(DEAL_TRANSFER_TAX_MAP, r.f2859) as never,
    titlePolicyResponsibility: mapValue(DEAL_TITLE_POLICY_MAP, r.f2858) as never,

    // AI
    shareableAiSummary: str(r.f2901),

    // INTERNAL NOTES
    acquisitionManagerNotes: str(r.f2870),
    offerDeliveryInternalNotes: str(r.f2874),
    closerFinalNotes: str(r.f2897),
    phase4InternalNotes: str(r.f2875),
    phase5InternalNotes: str(r.f2876),

    // RELATIONS — resolved via legacy_ontraport_id lookup
    confirmedBuyerId: resolveFk(r.primary_contact, l.contacts),
    secondaryBuyerId: resolveFk(r.f2585, l.contacts),
    sellerCompanyId: resolveFk(r.company, l.companies),

    // MARKETING
    bulkEmailOptedOut: String(r.bulk_mail ?? "1") === "-2",

    // AUDIT
    createdAt: tsToDate(r.date) ?? new Date(),
    updatedAt: tsToDate(r.dlm) ?? new Date(),
    lastActivityAt: tsToDate(r.dla),
    lastEmailReceivedAt: tsToDate(r.date_last_email_received),
    lastEmailSentAt: tsToDate(r.date_last_email_sent),
    lastSmsReceivedAt: tsToDate(r.date_last_sms_received),
    lastSmsSentAt: tsToDate(r.date_last_sms_sent),
    lastCallLoggedAt: tsToDate(r.date_last_call_logged),
    lastNote: str(r.last_note),
    ipAddress: str(r.ip_addy_display),
  };
}

async function buildLookups(db: ReturnType<typeof drizzle>): Promise<Lookups> {
  const companyRows = await db
    .select({ id: companies.id, legacyOntraportId: companies.legacyOntraportId })
    .from(companies)
    .where(isNotNull(companies.legacyOntraportId));
  const contactRows = await db
    .select({ id: contacts.id, legacyOntraportId: contacts.legacyOntraportId })
    .from(contacts)
    .where(isNotNull(contacts.legacyOntraportId));
  const birdDogRows = await db
    .select({ id: birdDogs.id, legacyOntraportId: birdDogs.legacyOntraportId, email: birdDogs.email })
    .from(birdDogs);

  const companyMap = new Map<number, string>();
  for (const c of companyRows) {
    if (c.legacyOntraportId != null) companyMap.set(c.legacyOntraportId, c.id);
  }
  const contactMap = new Map<number, string>();
  for (const c of contactRows) {
    if (c.legacyOntraportId != null) contactMap.set(c.legacyOntraportId, c.id);
  }
  const birdDogById = new Map<number, string>();
  const birdDogByEmail = new Map<string, string>();
  for (const b of birdDogRows) {
    if (b.legacyOntraportId != null) birdDogById.set(b.legacyOntraportId, b.id);
    if (b.email) birdDogByEmail.set(b.email.toLowerCase(), b.id);
  }

  return {
    companies: companyMap,
    contacts: contactMap,
    birdDogsById: birdDogById,
    birdDogsByEmail: birdDogByEmail,
  };
}

async function main() {
  const file = process.argv[2] ?? "raw/ontraport-deals.json";
  const dryRun = process.argv.includes("--dry-run");

  console.log(`[migrate:deals] reading ${file}${dryRun ? " (dry-run)" : ""}`);
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as Raw[];
  console.log(`[migrate:deals] ${raw.length} input rows`);

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql);

  const lookups = await buildLookups(db);
  console.log(
    `[migrate:deals] lookups: companies=${lookups.companies.size} contacts=${lookups.contacts.size} birdDogs=${lookups.birdDogsById.size} (by email: ${lookups.birdDogsByEmail.size})`,
  );

  if (dryRun) {
    console.log("[migrate:deals] sample mapped row:");
    console.log(JSON.stringify(mapDeal(raw[0], lookups), null, 2));
    await sql.end();
    return;
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const r of raw) {
    try {
      const mapped = mapDeal(r, lookups);
      const [existing] = await db
        .select({ id: deals.id })
        .from(deals)
        .where(eq(deals.legacyOntraportId, mapped.legacyOntraportId!))
        .limit(1);

      if (existing) {
        const { createdAt, ...rest } = mapped;
        void createdAt;
        await db.update(deals).set({ ...rest, updatedAt: new Date() }).where(eq(deals.id, existing.id));
        updated++;
      } else {
        await db.insert(deals).values(mapped);
        inserted++;
      }
    } catch (err) {
      failed++;
      console.error(`[migrate:deals] failed op_id=${r.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n[migrate:deals] done — inserted=${inserted} updated=${updated} failed=${failed}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
