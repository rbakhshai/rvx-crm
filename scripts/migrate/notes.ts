/**
 * Migrate Ontraport notes (object 12) → our `notes` table.
 *
 * Polymorphic: each Ontraport note carries `object_type_id` (which kind
 * of record it hangs off) and `contact_id` (that record's Ontraport id,
 * despite the legacy field name). We map:
 *
 *   object_type_id  0     → contacts
 *   object_type_id  149   → deals
 *   object_type_id  150   → companies
 *   object_type_id  10004 → bird_dogs
 *
 * parentId is resolved by looking up each table's legacyOntraportId.
 * Authors are matched to local users by a staff-id → email table for the
 * three staff that still exist (Reza/Erica/Marco); notes from deleted
 * Ontraport staff keep a legacyAuthorName placeholder so the body and
 * timeline position survive even without an author link.
 *
 * Idempotent: keyed on legacyOntraportId. Re-run safely.
 *
 * Input: raw/ontraport-notes.json
 * Usage: npx tsx --env-file=.env.local scripts/migrate/notes.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { notes, contacts, deals, companies, birdDogs, user } from "../../src/db/schema";

process.loadEnvFile(".env.local");

type Raw = Record<string, unknown>;

type ParentTable = "contacts" | "deals" | "companies" | "bird_dogs";

const OBJ_TYPE_TO_PARENT: Record<string, ParentTable> = {
  "0": "contacts",
  "149": "deals",
  "150": "companies",
  "10004": "bird_dogs",
};

/**
 * Ontraport staff id → identity. Only the three still-active staff can be
 * resolved to a local user (by email). Everyone else was deleted in
 * Ontraport and shows up only as an author id with no record, so we keep
 * a human-readable placeholder instead.
 */
const STAFF: Record<string, { email: string; name: string }> = {
  "1": { email: "reza@rvparkexchange.com", name: "Reza Bakhshai" },
  "7": { email: "erica@rvparkexchange.com", name: "Erica Paliuca" },
  "8": { email: "marco@rvparkexchange.com", name: "Marco Behling" },
};

function str(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function tsToDate(v: unknown): Date | null {
  const n = Number(v);
  if (!n || Number.isNaN(n)) return null;
  return new Date(n * 1000);
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const file = path.join(process.cwd(), "raw", "ontraport-notes.json");
  console.log(`[migrate:notes] reading ${path.relative(process.cwd(), file)}`);
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as Raw[];
  console.log(`[migrate:notes] ${raw.length} input rows`);

  // Build legacyOntraportId → localId maps per parent table.
  const [contactRows, dealRows, companyRows, birdDogRows, userRows] = await Promise.all([
    db.select({ id: contacts.id, legacy: contacts.legacyOntraportId }).from(contacts),
    db.select({ id: deals.id, legacy: deals.legacyOntraportId }).from(deals),
    db.select({ id: companies.id, legacy: companies.legacyOntraportId }).from(companies),
    db.select({ id: birdDogs.id, legacy: birdDogs.legacyOntraportId }).from(birdDogs),
    db.select({ id: user.id, email: user.email }).from(user),
  ]);

  const mapOf = (rows: { id: string; legacy: number | null }[]) => {
    const m = new Map<string, string>();
    for (const r of rows) if (r.legacy != null) m.set(String(r.legacy), r.id);
    return m;
  };
  const parentMaps: Record<ParentTable, Map<string, string>> = {
    contacts: mapOf(contactRows),
    deals: mapOf(dealRows),
    companies: mapOf(companyRows),
    bird_dogs: mapOf(birdDogRows),
  };

  // staff id → local user id (by email)
  const emailToUser = new Map(userRows.map((u) => [u.email.toLowerCase(), u.id]));
  const authorToUser = new Map<string, string>();
  for (const [staffId, info] of Object.entries(STAFF)) {
    const uid = emailToUser.get(info.email.toLowerCase());
    if (uid) authorToUser.set(staffId, uid);
  }

  let inserted = 0;
  let updated = 0;
  let skippedEmpty = 0;
  let skippedOrphan = 0;
  let failed = 0;

  for (const r of raw) {
    try {
      const body = str(r.data);
      if (!body) {
        skippedEmpty++;
        continue;
      }

      const parentTable = OBJ_TYPE_TO_PARENT[str(r.object_type_id)];
      if (!parentTable) {
        skippedOrphan++;
        continue;
      }
      const parentId = parentMaps[parentTable].get(str(r.contact_id));
      if (!parentId) {
        skippedOrphan++;
        continue;
      }

      const authorKey = str(r.author);
      const authorId = authorToUser.get(authorKey) ?? null;
      const legacyAuthorName = authorId
        ? null
        : STAFF[authorKey]?.name ?? "Former team member";

      const createdAt = tsToDate(r.time) ?? new Date();
      const legacyOntraportId = Number(r.id);

      const values = {
        parentTable,
        parentId,
        body,
        type: "manual" as const,
        authorId,
        legacyOntraportId,
        legacyAuthorName,
        createdAt,
        updatedAt: tsToDate(r.dlm) ?? createdAt,
      };

      const [existing] = await db
        .select({ id: notes.id })
        .from(notes)
        .where(eq(notes.legacyOntraportId, legacyOntraportId))
        .limit(1);

      if (existing) {
        await db.update(notes).set(values).where(eq(notes.id, existing.id));
        updated++;
      } else {
        await db.insert(notes).values(values);
        inserted++;
      }
    } catch (err) {
      failed++;
      console.error(`[migrate:notes] failed op_id=${r.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(
    `\n[migrate:notes] done — inserted=${inserted} updated=${updated} ` +
      `skippedEmpty=${skippedEmpty} skippedOrphan=${skippedOrphan} failed=${failed}`,
  );
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
