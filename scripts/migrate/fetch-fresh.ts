/**
 * Fetch fresh data from Ontraport (NEW API) and save to raw/ directory.
 *
 * Uses the new header-authenticated API (Api-Appid / Api-Key) with
 * start/range pagination (50 records max per request). The old
 * query-param API was retired for newly-issued keys, so this is the
 * only path that authenticates now.
 *
 * Object IDs (new API — note Deal/Company are 149/150, swapped vs the
 * legacy API):
 *   0     Contact
 *   149   Deal
 *   150   Company
 *   10004 oBirdDogs
 *   12    Note
 *   2     Staff
 *
 * Usage: npx tsx --env-file=.env.local scripts/migrate/fetch-fresh.ts
 */
import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.ontraport.com/1";
const PAGE = 50; // new-API hard cap per request

type Raw = Record<string, unknown>;

async function fetchAll(
  appId: string,
  apiKey: string,
  objectID: number,
  label: string,
): Promise<Raw[]> {
  const headers = {
    "Api-Appid": appId,
    "Api-Key": apiKey,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const all: Raw[] = [];
  let start = 0;
  for (;;) {
    const params = new URLSearchParams({
      objectID: String(objectID),
      start: String(start),
      range: String(PAGE),
    });
    const url = `${API_BASE}/objects?${params}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ontraport API error (${label}/${objectID}): ${res.status} ${text}`);
    }
    const json = (await res.json()) as { code?: number; data?: Raw[]; message?: string };
    if (json.code !== 0) {
      throw new Error(`Ontraport error (${label}/${objectID}): ${JSON.stringify(json.message)}`);
    }
    const batch = json.data ?? [];
    all.push(...batch);
    process.stdout.write(`\r  ${label}: ${all.length} fetched…`);
    if (batch.length < PAGE) break;
    start += PAGE;
  }
  process.stdout.write(`\r  ${label}: ${all.length} fetched ✓\n`);
  return all;
}

async function main() {
  const appId = process.env.ONTRAPORT_APP_ID;
  const apiKey = process.env.ONTRAPORT_API_KEY;
  if (!appId || !apiKey) throw new Error("Missing ONTRAPORT_APP_ID or ONTRAPORT_API_KEY");

  const rawDir = path.join(process.cwd(), "raw");
  await fs.mkdir(rawDir, { recursive: true });

  // Sequential (not Promise.all) so the progress lines don't interleave
  // and we stay polite to the rate limiter.
  const contacts = await fetchAll(appId, apiKey, 0, "contacts");
  const companies = await fetchAll(appId, apiKey, 150, "companies");
  const deals = await fetchAll(appId, apiKey, 149, "deals");
  const birdDogs = await fetchAll(appId, apiKey, 10004, "bird-dogs");
  const notes = await fetchAll(appId, apiKey, 12, "notes");
  const staff = await fetchAll(appId, apiKey, 2, "staff");

  await Promise.all([
    fs.writeFile(path.join(rawDir, "ontraport-contacts.json"), JSON.stringify(contacts, null, 2)),
    fs.writeFile(path.join(rawDir, "ontraport-companies.json"), JSON.stringify(companies, null, 2)),
    fs.writeFile(path.join(rawDir, "ontraport-deals.json"), JSON.stringify(deals, null, 2)),
    fs.writeFile(path.join(rawDir, "ontraport-bird-dogs.json"), JSON.stringify(birdDogs, null, 2)),
    fs.writeFile(path.join(rawDir, "ontraport-notes.json"), JSON.stringify(notes, null, 2)),
    fs.writeFile(path.join(rawDir, "ontraport-staff.json"), JSON.stringify(staff, null, 2)),
  ]);

  console.log("\n✓ Saved to raw/:");
  console.log(`  ${contacts.length} contacts`);
  console.log(`  ${companies.length} companies`);
  console.log(`  ${deals.length} deals`);
  console.log(`  ${birdDogs.length} bird dogs`);
  console.log(`  ${notes.length} notes`);
  console.log(`  ${staff.length} staff`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error("\n" + e.message);
  process.exit(1);
});
