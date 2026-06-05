/**
 * "What markets have been most fruitful?" — ranks states by:
 *   - total leads submitted
 *   - leads that advanced past first-touch review
 *   - leads that reached LOI or later
 *   - closed wins
 *   - pipeline $ value
 * Quick ad-hoc snapshot of the deal data we migrated from Ontraport.
 */
import { eq, isNotNull, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";

process.loadEnvFile(".env.local");

const ADVANCED_STATUSES = [
  "closer_first_contact_made", "closer_under_negotiation", "closer_gathering_docs",
  "uw_ready_phase_2", "uw_under_phase_2",
  "loi_ready", "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted", "psa_accepted",
  "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

const OFFER_OR_LATER = [
  "loi_ready", "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted", "psa_accepted",
  "dm_dispo_initiated",
  "tc_dd_in_escrow", "dd_completed_in_escrow",
  "closed_rvx_acquired", "closed_rvx_network",
];

const WON = ["closed_rvx_acquired", "closed_rvx_network"];

async function main() {
  // Per-state aggregates
  const perState = await db.execute<{
    state: string;
    total: number;
    advanced: number;
    offer_or_later: number;
    won: number;
    pipeline_value: number;
  }>(sql`
    SELECT
      COALESCE(park_state, '—') AS state,
      COUNT(*)::int AS total,
      SUM(CASE WHEN status_code = ANY(${sql.raw(`ARRAY[${ADVANCED_STATUSES.map((s) => `'${s}'`).join(",")}]`)}) THEN 1 ELSE 0 END)::int AS advanced,
      SUM(CASE WHEN status_code = ANY(${sql.raw(`ARRAY[${OFFER_OR_LATER.map((s) => `'${s}'`).join(",")}]`)}) THEN 1 ELSE 0 END)::int AS offer_or_later,
      SUM(CASE WHEN status_code = ANY(${sql.raw(`ARRAY[${WON.map((s) => `'${s}'`).join(",")}]`)}) THEN 1 ELSE 0 END)::int AS won,
      COALESCE(SUM(CASE WHEN list_price IS NOT NULL THEN list_price::numeric ELSE 0 END), 0)::bigint AS pipeline_value
    FROM deals
    WHERE park_state IS NOT NULL AND park_state <> ''
    GROUP BY park_state
    ORDER BY total DESC
    LIMIT 25
  `);

  const raw = Array.isArray(perState) ? perState : (perState as unknown as { rows?: Record<string, unknown>[] }).rows ?? [];
  const rows = (raw as Record<string, unknown>[]).map((r) => ({
    state: r.state as string,
    total: Number(r.total),
    advanced: Number(r.advanced),
    offerPlus: Number(r.offer_or_later),
    won: Number(r.won),
    pipelineValue: Number(r.pipeline_value),
  }));

  console.log("\n=== States by total leads ===");
  console.table(
    rows.slice(0, 12).map((r) => ({
      State: r.state,
      Leads: r.total,
      Advanced: r.advanced,
      "Offer+": r.offerPlus,
      Won: r.won,
      "Adv %": r.total ? `${Math.round((r.advanced / r.total) * 100)}%` : "—",
      "Pipeline $": r.pipelineValue ? `$${Math.round(r.pipelineValue / 1000)}K` : "—",
    })),
  );

  console.log("\n=== Best advancement rate (min 3 leads) ===");
  const byRate = rows
    .filter((r) => r.total >= 3)
    .map((r) => ({ ...r, rate: r.advanced / r.total }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
  console.table(
    byRate.map((r) => ({
      State: r.state,
      Leads: r.total,
      Advanced: r.advanced,
      "Adv %": `${Math.round(r.rate * 100)}%`,
      Won: r.won,
    })),
  );

  console.log("\n=== Highest pipeline value ===");
  const byValue = [...rows].sort((a, b) => b.pipelineValue - a.pipelineValue).slice(0, 10);
  console.table(
    byValue.map((r) => ({
      State: r.state,
      Leads: r.total,
      "Pipeline $": r.pipelineValue ? `$${(r.pipelineValue / 1_000_000).toFixed(2)}M` : "—",
    })),
  );

  console.log("\n=== States with wins ===");
  const winners = rows.filter((r) => r.won > 0).sort((a, b) => b.won - a.won);
  if (winners.length === 0) {
    console.log("  (no closed wins recorded in the migrated data)");
  } else {
    console.table(
      winners.map((r) => ({
        State: r.state,
        Wins: r.won,
        Leads: r.total,
        "Hit rate": r.total ? `${Math.round((r.won / r.total) * 100)}%` : "—",
      })),
    );
  }

  // Headline numbers
  const totals = rows.reduce(
    (a, r) => ({
      total: a.total + r.total,
      advanced: a.advanced + r.advanced,
      offerPlus: a.offerPlus + r.offerPlus,
      won: a.won + r.won,
      pipeline: a.pipeline + r.pipelineValue,
    }),
    { total: 0, advanced: 0, offerPlus: 0, won: 0, pipeline: 0 },
  );
  console.log("\n=== Totals (across all states) ===");
  console.log(`  ${totals.total} leads · ${totals.advanced} advanced (${Math.round((totals.advanced / totals.total) * 100)}%) · ${totals.offerPlus} at offer or later · ${totals.won} closed wins · $${(totals.pipeline / 1_000_000).toFixed(1)}M pipeline value`);

  // Silence unused-import warning
  void eq; void isNotNull; void inArray;
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
