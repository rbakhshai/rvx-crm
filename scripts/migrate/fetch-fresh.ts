/**
 * Fetch fresh data from Ontraport and save to raw/ directory.
 *
 * Pulls contacts, companies, deals, and bird dogs, then runs migrations.
 * Usage: npx tsx --env-file=.env.local scripts/migrate/fetch-fresh.ts
 */
import fs from "node:fs/promises";
import path from "node:path";

const API_BASE = "https://api.ontraport.com/1";

interface FetchOpts {
  appId: string;
  apiKey: string;
  objectID: number;
  limit?: number;
  offset?: number;
  search?: Record<string, unknown>;
}

async function fetchOntraportData(opts: FetchOpts): Promise<unknown[]> {
  const { appId, apiKey, objectID, limit = 5000, offset = 0, search } = opts;

  const params = new URLSearchParams({
    appId,
    key: apiKey,
    action: "getObjects",
    objectID: String(objectID),
    limit: String(limit),
    offset: String(offset),
    ...(search ? { search: JSON.stringify(search) } : {}),
  });

  const url = `${API_BASE}/?${params}`;
  console.log(`Fetching objectID ${objectID}...`);

  const res = await fetch(url, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ontraport API error (${objectID}): ${res.status} ${text}`);
  }

  const json = (await res.json()) as {
    code?: number;
    data?: unknown[];
    message?: string;
  };

  if (json.code !== 0) {
    throw new Error(`Ontraport error (${objectID}): ${json.message}`);
  }

  const data = json.data ?? [];
  console.log(`  → ${data.length} records`);
  return data;
}

async function main() {
  const appId = process.env.ONTRAPORT_APP_ID;
  const apiKey = process.env.ONTRAPORT_API_KEY;

  if (!appId || !apiKey) {
    throw new Error("Missing ONTRAPORT_APP_ID or ONTRAPORT_API_KEY");
  }

  const rawDir = path.join(process.cwd(), "raw");
  await fs.mkdir(rawDir, { recursive: true });

  // Fetch all data
  const [contacts, companies, deals, birdDogs] = await Promise.all([
    fetchOntraportData({ appId, apiKey, objectID: 78 }), // Contacts
    fetchOntraportData({ appId, apiKey, objectID: 149 }), // Companies
    fetchOntraportData({ appId, apiKey, objectID: 150 }), // Deals
    fetchOntraportData({ appId, apiKey, objectID: 155 }), // Bird Dogs
  ]);

  // Save to raw/
  const writes = [
    fs.writeFile(
      path.join(rawDir, "ontraport-contacts.json"),
      JSON.stringify(contacts, null, 2)
    ),
    fs.writeFile(
      path.join(rawDir, "ontraport-companies.json"),
      JSON.stringify(companies, null, 2)
    ),
    fs.writeFile(
      path.join(rawDir, "ontraport-deals.json"),
      JSON.stringify(deals, null, 2)
    ),
    fs.writeFile(
      path.join(rawDir, "ontraport-bird-dogs.json"),
      JSON.stringify(birdDogs, null, 2)
    ),
  ];

  await Promise.all(writes);
  console.log(`\n✓ Saved ${contacts.length} contacts`);
  console.log(`✓ Saved ${companies.length} companies`);
  console.log(`✓ Saved ${deals.length} deals`);
  console.log(`✓ Saved ${birdDogs.length} bird dogs`);
}

main().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
