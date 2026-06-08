/**
 * CSV-row → raw-leads-column mapping.
 *
 * Skip-trace tools and lead vendors use wildly inconsistent column names
 * ("Park Name", "park_name", "PARK", "Property"...). We accept any of
 * them by checking a list of synonyms per field.
 *
 * Anything we don't recognize gets stuffed into rawData (jsonb) so the
 * BD or admin can still see it later — nothing in the CSV is lost.
 */
import Papa from "papaparse";

const COLUMN_SYNONYMS: Record<string, string[]> = {
  parkName:      ["park", "park_name", "parkname", "property", "property_name", "park name", "name"],
  street:        ["street", "address", "street_address", "address1", "address_1", "addr", "street address"],
  city:          ["city", "town"],
  state:         ["state", "st", "state_abbr", "stateabbr"],
  zipCode:       ["zip", "zip_code", "postal", "postal_code", "zipcode"],
  ownerName:     ["owner", "owner_name", "ownername", "contact", "contact_name", "first_name", "last_name"],
  ownerPhone:    ["phone", "owner_phone", "ownerphone", "cell", "mobile", "tel", "phone_number"],
  ownerEmail:    ["email", "owner_email", "owneremail", "e-mail", "contact_email"],
  pads:          ["pads", "pad_count", "padcount", "num_pads", "spaces", "sites", "lots"],
  listingStatus: ["listing_status", "status", "listingstatus", "for_sale"],
  source:        ["source", "data_source", "lead_source"],
  importedNotes: ["notes", "comments", "description"],
};

/** Best-effort string normalization for header lookup. */
function norm(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Build a header → canonical field map. Returns Record<headerInCsv,
 * canonicalField | null>. Headers that don't match any synonym are left
 * with `null` and surface in rawData unchanged.
 */
function buildHeaderMap(headers: string[]): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const h of headers) {
    const n = norm(h);
    let resolved: string | null = null;
    for (const [field, syns] of Object.entries(COLUMN_SYNONYMS)) {
      if (syns.some((s) => norm(s) === n)) {
        resolved = field;
        break;
      }
    }
    map[h] = resolved;
  }
  return map;
}

export type ParsedLeadRow = {
  parkName: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
  ownerEmail: string | null;
  pads: number | null;
  listingStatus: string | null;
  source: string | null;
  importedNotes: string | null;
  rawData: Record<string, string>;
};

export type ParseResult = {
  rows: ParsedLeadRow[];
  /** Headers from the CSV → field they were mapped to (or null). */
  headerMap: Record<string, string | null>;
  /** Headers that didn't match any known synonym. */
  unmappedHeaders: string[];
  /** Rows from the CSV that had no usable identifying info (skipped). */
  skipped: number;
  /** Any non-fatal parser warnings. */
  warnings: string[];
};

export function parseLeadsCsv(text: string): ParseResult {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const rows: ParsedLeadRow[] = [];
  let skipped = 0;
  const warnings: string[] = result.errors.slice(0, 5).map((e) => `Row ${e.row ?? "?"}: ${e.message}`);

  const headers = result.meta.fields ?? [];
  const headerMap = buildHeaderMap(headers);
  const unmappedHeaders = headers.filter((h) => headerMap[h] == null);

  for (const row of result.data) {
    const parsed: ParsedLeadRow = {
      parkName: null,
      street: null,
      city: null,
      state: null,
      zipCode: null,
      ownerName: null,
      ownerPhone: null,
      ownerEmail: null,
      pads: null,
      listingStatus: null,
      source: null,
      importedNotes: null,
      rawData: {},
    };

    for (const [header, rawValue] of Object.entries(row)) {
      const value = (rawValue ?? "").trim();
      if (!value) continue;
      const field = headerMap[header];
      if (!field) {
        parsed.rawData[header] = value;
        continue;
      }
      if (field === "pads") {
        const n = parseInt(value, 10);
        parsed.pads = Number.isNaN(n) ? null : n;
      } else {
        // Type-assert to keep the loop generic; we already restricted
        // 'field' to keys of ParsedLeadRow above.
        (parsed as unknown as Record<string, string | null>)[field] = value;
      }
    }

    // Skip rows with absolutely no identifying info.
    if (!parsed.parkName && !parsed.street && !parsed.ownerPhone && !parsed.ownerEmail) {
      skipped++;
      continue;
    }

    // Normalize state to uppercase 2-letter where possible.
    if (parsed.state) parsed.state = parsed.state.toUpperCase().slice(0, 2);

    rows.push(parsed);
  }

  return { rows, headerMap, unmappedHeaders, skipped, warnings };
}

/**
 * Canonical key used for address dedup. Lowercased, whitespace-collapsed
 * concatenation of (street, city, state). Returns null if any required
 * piece is missing.
 */
export function addressKey(street: string | null, city: string | null, state: string | null): string | null {
  if (!street || !city || !state) return null;
  return [street, city, state]
    .map((s) => s.toLowerCase().trim().replace(/[^\w\s]/g, "").replace(/\s+/g, " "))
    .join("|");
}
