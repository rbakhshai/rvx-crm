/**
 * Combine multiple raw MCP-saved Ontraport JSON dumps into one merged file.
 * Each input is the JSON body of a `get_objects` call: { rows: [...], ... }.
 * De-dupes by `id` (in case batches overlap).
 *
 * Usage: tsx scripts/migrate/combine-saved.ts <out.json> <in1.txt> [in2.txt ...]
 */
import fs from "node:fs/promises";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error("Usage: combine-saved.ts <out.json> <in1.txt> [in2.txt ...]");
    process.exit(1);
  }
  const [outPath, ...inputs] = args;

  const seen = new Map<string, unknown>();

  for (const file of inputs) {
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as { rows?: Array<{ id: string }> };
    if (!parsed.rows) {
      console.warn(`[combine] ${file}: no rows`);
      continue;
    }
    let added = 0;
    for (const row of parsed.rows) {
      if (!seen.has(row.id)) {
        seen.set(row.id, row);
        added++;
      }
    }
    console.log(`[combine] ${file}: +${added} rows (total ${seen.size})`);
  }

  const merged = Array.from(seen.values());
  await fs.writeFile(outPath, JSON.stringify(merged, null, 2));
  console.log(`[combine] wrote ${merged.length} rows -> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
