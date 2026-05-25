/**
 * Migrate Ontraport companies → our `companies` table.
 * Idempotent on legacy_ontraport_id.
 *
 * Input: raw/ontraport-companies.json (array of raw Ontraport company rows)
 */
import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { companies } from "../../src/db/schema";
import {
  COMPANY_RELATIONSHIP_MAP,
  COMPANY_REVENUE_MAP,
  COMPANY_EMPLOYEE_MAP,
  mapValue,
  tsToDate,
  checkToBool,
  str,
} from "./maps";

process.loadEnvFile(".env.local");

type Raw = Record<string, unknown>;

function mapCompany(r: Raw): typeof companies.$inferInsert {
  const opId = Number(r.id);
  const rel =
    COMPANY_RELATIONSHIP_MAP[String(r.industry ?? "")] ??
    // fallback to "owner" when unspecified — most accurate for direct sellers
    "owner";

  const first = str(r.f2866);
  const last = str(r.f2867);
  const personName = [first, last].filter(Boolean).join(" ").trim() || undefined;

  return {
    legacyOntraportId: opId,
    name: str(r.name) ?? personName ?? `(legacy company ${opId})`,
    relationshipToPark: rel,
    sellerFirstName: first,
    sellerLastName: last,

    email: str(r.f2442) ?? str(r.email),
    phone: str(r.phone),
    officePhone: str(r.f2615),

    address: str(r.address),
    city: str(r.city),
    state: str(r.state),
    zipcode: str(r.zipcode) ?? str(r.zip),

    facebookPage: str(r.facebook_page),
    instagramName: str(r.instagram_name),
    description: str(r.description),
    annualRevenue: mapValue(COMPANY_REVENUE_MAP, r.annual_revenue) as never,
    employeeCount: mapValue(COMPANY_EMPLOYEE_MAP, r.employee_count) as never,

    profileImageUrl: str(r.profile_image),
    ipAddress: str(r.ip_addy_display),

    bulkEmailOptedOut: !checkToBool(r.bulk_mail) && String(r.bulk_mail ?? "1") === "-2",

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

async function main() {
  const file = process.argv[2] ?? "raw/ontraport-companies.json";
  const dryRun = process.argv.includes("--dry-run");

  console.log(`[migrate:companies] reading ${file}${dryRun ? " (dry-run)" : ""}`);
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as Raw[];
  console.log(`[migrate:companies] ${raw.length} input rows`);

  if (dryRun) {
    console.log("[migrate:companies] sample mapped row:");
    console.log(JSON.stringify(mapCompany(raw[0]), null, 2));
    return;
  }

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(sql);

  let inserted = 0;
  let updated = 0;
  let failed = 0;

  for (const r of raw) {
    try {
      const mapped = mapCompany(r);
      const [existing] = await db
        .select({ id: companies.id })
        .from(companies)
        .where(eq(companies.legacyOntraportId, mapped.legacyOntraportId!))
        .limit(1);

      if (existing) {
        const { createdAt, ...rest } = mapped;
        void createdAt;
        await db.update(companies).set({ ...rest, updatedAt: new Date() }).where(eq(companies.id, existing.id));
        updated++;
      } else {
        await db.insert(companies).values(mapped);
        inserted++;
      }
    } catch (err) {
      failed++;
      console.error(`[migrate:companies] failed op_id=${r.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\n[migrate:companies] done — inserted=${inserted} updated=${updated} failed=${failed}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
