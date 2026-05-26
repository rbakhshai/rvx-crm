/**
 * Geocode deals missing lat/lng using Nominatim (OpenStreetMap).
 *
 * Free, no API key needed. Rate-limited to 1 req/sec per OSM policy.
 * Run periodically (or on-demand) — idempotent.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/geocode-deals.ts
 *   npx tsx --env-file=.env.local scripts/geocode-deals.ts --all   # re-geocode everything
 */
import { eq, isNull, or, and, isNotNull, ne, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";

process.loadEnvFile(".env.local");

// Only show deals that are still in play — skip dead/closed/lost noise on the map
const ACTIVE_STATUS_CODES = [
  "new_lead_received", "pace_leads", "sent_back_to_bd", "incomplete_file",
  "closer_first_contact_attempted", "closer_first_contact_made",
  "closer_under_negotiation", "closer_gathering_docs",
  "uw_ready_phase_2", "uw_under_phase_2",
  "loi_ready", "loi_submitted", "loi_in_negotiation", "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted", "psa_accepted", "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

type NominatimHit = { lat: string; lon: string };

async function geocodeOne(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us,ca");

  const res = await fetch(url, {
    headers: {
      "User-Agent": "RVX-CRM/1.0 (geocoder; contact reza@rvparkexchange.com)",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) {
    console.error(`  ✗ nominatim ${res.status} for "${query}"`);
    return null;
  }
  const hits = (await res.json()) as NominatimHit[];
  if (!hits.length) return null;
  const { lat, lon } = hits[0];
  return { lat: parseFloat(lat), lng: parseFloat(lon) };
}

async function main() {
  const all = process.argv.includes("--all");

  const where = all
    ? and(isNotNull(deals.parkAddress), inArray(deals.statusCode, ACTIVE_STATUS_CODES))!
    : and(
        isNotNull(deals.parkAddress),
        ne(deals.parkAddress, ""),
        inArray(deals.statusCode, ACTIVE_STATUS_CODES),
        or(isNull(deals.latitude), isNull(deals.longitude)),
      )!;

  const rows = await db
    .select({
      id: deals.id,
      name: deals.name,
      parkAddress: deals.parkAddress,
      parkCity: deals.parkCity,
      parkState: deals.parkState,
    })
    .from(deals)
    .where(where);

  console.log(`[geocode] ${rows.length} active deals to process${all ? " (forced --all)" : ""}`);
  if (!rows.length) return;

  let geocoded = 0;
  let skipped = 0;
  let failed = 0;

  for (const r of rows) {
    const query = [r.parkAddress, r.parkCity, r.parkState].filter(Boolean).join(", ");
    if (!query) { skipped++; continue; }

    const coords = await geocodeOne(query);
    if (!coords) {
      // Fall back to city, state only if full address didn't resolve
      const fallback = [r.parkCity, r.parkState].filter(Boolean).join(", ");
      const fb = fallback && fallback !== query ? await geocodeOne(fallback) : null;
      if (!fb) {
        failed++;
        console.log(`  ✗ ${r.id.slice(0, 8)} "${query.slice(0, 60)}" — no result`);
        await new Promise((r) => setTimeout(r, 1100)); // respect rate limit
        continue;
      }
      await db.update(deals)
        .set({ latitude: String(fb.lat), longitude: String(fb.lng), updatedAt: new Date() })
        .where(eq(deals.id, r.id));
      geocoded++;
      console.log(`  ~ ${r.id.slice(0, 8)} ${r.name?.slice(0, 40) ?? "(unnamed)"} → city-level (${fb.lat.toFixed(3)}, ${fb.lng.toFixed(3)})`);
    } else {
      await db.update(deals)
        .set({ latitude: String(coords.lat), longitude: String(coords.lng), updatedAt: new Date() })
        .where(eq(deals.id, r.id));
      geocoded++;
      console.log(`  ✓ ${r.id.slice(0, 8)} ${r.name?.slice(0, 40) ?? "(unnamed)"} → (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`);
    }

    // Nominatim policy: max 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
  }

  console.log(`\n[geocode] done — geocoded=${geocoded} skipped=${skipped} failed=${failed}`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
