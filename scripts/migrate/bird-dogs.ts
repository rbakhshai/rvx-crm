/**
 * Migrate Ontraport bird dogs (objectID 10004) → our `bird_dogs` table.
 * Idempotent on legacy_ontraport_id.
 *
 * Input: raw/ontraport-bird-dogs.json (array of raw Ontraport bird dog rows)
 */
import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { birdDogs } from "../../src/db/schema";
import {
  BIRD_DOG_STATUS_MAP,
  BIRD_DOG_ACQUISITION_LEVEL_MAP,
  BIRD_DOG_TRAINING_DONE_MAP,
  BIRD_DOG_ETHICS_MAP,
  mapValue,
  tsToDate,
  tsToDateStr,
  checkToBool,
  str,
} from "./maps";

process.loadEnvFile(".env.local");

type Raw = Record<string, unknown>;

// Ontraport file fields return "{}" when empty, or a JSON-encoded object/string
// with a URL when populated. Extract a usable string URL, or undefined.
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
  } catch {
    // not JSON — fall through
  }
  return undefined;
}

function mapBirdDog(r: Raw): typeof birdDogs.$inferInsert {
  const opId = Number(r.id);
  const first = str(r.f2999);
  const last = str(r.f3000);
  const acq = BIRD_DOG_ACQUISITION_LEVEL_MAP[String(r.f3082 ?? "")];
  const ethics = BIRD_DOG_ETHICS_MAP[String(r.f3042 ?? "")];
  const completedTraining =
    BIRD_DOG_TRAINING_DONE_MAP[String(r.f3001 ?? "")] ?? false;

  return {
    legacyOntraportId: opId,

    firstName: first,
    lastName: last,
    email: str(r.f2968),
    cellPhone: str(r.f2967),
    facebookUrl: str(r.f3043),
    profileImageUrl: str(r.profile_image),

    statusCode: mapValue(BIRD_DOG_STATUS_MAP, r.f2970),
    acquisitionLevel: acq,

    startDate: tsToDateStr(r.f3066),
    agreementSignDate: tsToDateStr(r.f3076),
    followUpMeetingAt: tsToDate(r.f3069),

    sendAgreement: checkToBool(r.f3079),
    sendOnboardingPacket: checkToBool(r.f3078),
    sendTrainingVideos: checkToBool(r.f3077),
    rvxAgreementSigned: checkToBool(r.f2980),
    autoSendTerminationEmail: checkToBool(r.f2975),
    manuallyRemoveFromTracker: checkToBool(r.f2973),

    isInDiscord: checkToBool(r.f2978),
    kickedFromDiscord: checkToBool(r.f2976),
    giveAccessToTracker: checkToBool(r.f2981),

    resumeUrl: fileUrl(r.f3163),
    w9Url: fileUrl(r.f2977),
    signedAgreementUrl: fileUrl(r.f3124),

    completedTraining,
    ethicsTrainingStatus: ethics,

    whyJoinRvx: str(r.f3044),
    howHeardAboutRvx: str(r.f3038),
    currentW2: str(r.f3039),
    priorW2: str(r.f3040),
    w2Goals: str(r.f3041),
    hospitalityBackground: str(r.f3206),
    businessOpsBackground: str(r.f3207),
    weeklyExecutionPlan: str(r.f3150),
    gamePlanForward: str(r.f3068),

    rvClass: str(r.f3203),
    rvRig: str(r.f3205),
    yearsFullTimeTraveling: str(r.f3204),

    subtoMember: checkToBool(r.f3030),
    subtoSince: str(r.f3034),
    gatorMember: checkToBool(r.f3031),
    gatorSince: str(r.f3035),
    topTierMember: checkToBool(r.f3032),
    topTierSince: str(r.f3036),
    ownersClubMember: checkToBool(r.f3033),
    ownersClubSince: str(r.f3037),
    zeroDownMember: checkToBool(r.f3201),
    zeroDownSince: str(r.f3202),

    // bulk_mail: -2 = opted out, otherwise subscribed
    bulkEmailOptedOut: String(r.bulk_mail ?? "1") === "-2",

    createdAt: tsToDate(r.date) ?? new Date(),
    updatedAt: tsToDate(r.dlm) ?? new Date(),
    lastActivityAt: tsToDate(r.dla),
    lastEmailReceivedAt: tsToDate(r.date_last_email_received),
    lastEmailSentAt: tsToDate(r.date_last_email_sent),
    lastSmsReceivedAt: tsToDate(r.date_last_sms_received),
    lastSmsSentAt: tsToDate(r.date_last_sms_sent),
    lastCallLoggedAt: tsToDate(r.date_last_call_logged),
    lastNote: str(r.last_note),
    ipAddress: str(r.ip_addy),
  };
}

async function main() {
  const file = process.argv[2] ?? "raw/ontraport-bird-dogs.json";
  const dryRun = process.argv.includes("--dry-run");

  console.log(`[migrate:bird-dogs] reading ${file}${dryRun ? " (dry-run)" : ""}`);
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as Raw[];
  console.log(`[migrate:bird-dogs] ${raw.length} input rows`);

  if (dryRun) {
    console.log("[migrate:bird-dogs] sample mapped row:");
    console.log(JSON.stringify(mapBirdDog(raw[0]), null, 2));
    return;
  }

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const r of raw) {
    try {
      const mapped = mapBirdDog(r);
      const [existing] = await db
        .select({ id: birdDogs.id })
        .from(birdDogs)
        .where(eq(birdDogs.legacyOntraportId, mapped.legacyOntraportId!))
        .limit(1);

      if (existing) {
        const { createdAt, ...rest } = mapped;
        void createdAt;
        await db.update(birdDogs).set({ ...rest, updatedAt: new Date() }).where(eq(birdDogs.id, existing.id));
        updated++;
      } else {
        await db.insert(birdDogs).values(mapped);
        inserted++;
      }
    } catch (err) {
      failed++;
      console.error(`[migrate:bird-dogs] failed op_id=${r.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n[migrate:bird-dogs] done — inserted=${inserted} updated=${updated} failed=${failed}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
