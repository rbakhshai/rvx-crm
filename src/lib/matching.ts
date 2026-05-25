/**
 * Buyer ↔ Deal matching engine.
 *
 * Pure scoring function — takes hydrated buyer + deal records and returns a
 * 0–100 score plus the reasons (for UI display). Easy to tune the weights.
 *
 * The DB layer (rankBuyersForDeal / rankDealsForBuyer) just calls this in a
 * loop. Works fine at our current scale (≤ ~500 buyers × ≤ ~500 active deals).
 */
import type { Contact, Deal } from "@/db/schema";

export type MatchScore = {
  score: number;             // 0–100 (caps at 100)
  reasons: string[];          // positive matches, e.g. "Texas in target states"
  warnings: string[];         // soft mismatches, e.g. "No NCNDA on file"
  disqualified?: string;      // if set, this match is filtered out
};

export type RankedBuyer = { buyer: Contact; match: MatchScore };
export type RankedDeal = { deal: Deal; match: MatchScore };

// ---- bucket helpers ----

/** Max deal size bucket → upper-bound dollar value. */
const MAX_DEAL_SIZE_CEILING: Record<string, number> = {
  under_1m: 1_000_000,
  "1m_5m": 5_000_000,
  "5m_plus": Number.POSITIVE_INFINITY,
};

/** Pads-desired bucket → required minimum/maximum pad count. */
function padsBucketMatch(bucket: string | null | undefined, dealPads: number | null | undefined): boolean | undefined {
  if (!bucket || dealPads == null) return undefined;
  switch (bucket) {
    case "40_or_less": return dealPads <= 50;          // a little tolerance
    case "40_plus":    return dealPads >= 40;
    case "75_plus":    return dealPads >= 75;
    case "100_plus":   return dealPads >= 100;
    default:           return undefined;
  }
}

function num(s: string | null | undefined): number | undefined {
  if (s == null || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

// ---- the main scoring function ----

export function scoreBuyerForDeal(buyer: Contact, deal: Deal): MatchScore {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Hard disqualifiers — these mean "don't ever show"
  if (buyer.status === "disqualified") return { score: 0, reasons: [], warnings: [], disqualified: "Buyer is disqualified" };
  if (buyer.status === "closed_bought_with_us") return { score: 0, reasons: [], warnings: [], disqualified: "Already bought with us" };
  if (buyer.status === "unresponsive") return { score: 0, reasons: [], warnings: [], disqualified: "Unresponsive" };

  // STATE MATCH (heaviest weight — geography is usually a hard constraint)
  if (buyer.targetStates && buyer.targetStates.length > 0 && deal.parkState) {
    const inList = buyer.targetStates.includes(deal.parkState);
    if (inList) {
      score += 30;
      reasons.push(`${deal.parkState} is in target states`);
    } else if (buyer.strictStates) {
      return { score: 0, reasons: [], warnings: [], disqualified: `${deal.parkState} not in strict-state list` };
    } else {
      warnings.push(`${deal.parkState} not in target states (but not strict)`);
    }
  } else if (!buyer.targetStates || buyer.targetStates.length === 0) {
    // open to anywhere — small bonus, not as good as explicit fit
    score += 10;
    reasons.push("No state restriction");
  }

  // PRICE / DEAL SIZE
  const listPrice = num(deal.agreedPurchasePrice) ?? num(deal.listPrice);
  if (buyer.maxDealSize && listPrice != null) {
    const ceiling = MAX_DEAL_SIZE_CEILING[buyer.maxDealSize];
    if (ceiling != null) {
      if (listPrice <= ceiling) {
        score += 15;
        reasons.push(`Within ${buyer.maxDealSize.replace(/_/g, " ")} budget`);
      } else {
        return { score: 0, reasons: [], warnings: [], disqualified: `Deal $${listPrice.toLocaleString()} exceeds ${buyer.maxDealSize} max` };
      }
    }
  }

  // PADS COUNT
  const padsFit = padsBucketMatch(buyer.amountOfPadsDesiredBucket, deal.padsCount);
  if (padsFit === true) {
    score += 10;
    reasons.push(`Pad count matches preference (${buyer.amountOfPadsDesiredBucket?.replace(/_/g, " ")})`);
  } else if (padsFit === false) {
    warnings.push("Pad count outside preferred range");
  }

  // NOI
  const dealNoi = num(deal.listNoi);
  const buyerMinNoi = num(buyer.minNoiUsd);
  if (buyerMinNoi != null && dealNoi != null) {
    if (dealNoi >= buyerMinNoi) {
      score += 10;
      reasons.push(`NOI $${dealNoi.toLocaleString()} ≥ min $${buyerMinNoi.toLocaleString()}`);
    } else {
      warnings.push(`NOI $${dealNoi.toLocaleString()} below preferred $${buyerMinNoi.toLocaleString()}`);
    }
  }

  // LEASED LAND
  if (deal.parkAddress && buyer.openToLeasedLand === false) {
    // We don't reliably know if THIS deal is on leased land from the schema yet, so skip.
    // If a "is_leased_land" field gets added to deals later, gate here.
  }

  // RESTAURANT
  if (deal.hasRestaurant === true && buyer.parkWithRestaurant === true) {
    score += 5;
    reasons.push("Buyer wants a park with a restaurant");
  } else if (deal.hasRestaurant === true && buyer.parkWithRestaurant === false) {
    warnings.push("Deal has a restaurant, buyer prefers no restaurant");
  }

  // CREATIVE FINANCING — deals that are creative-financing-friendly match buyers who require/prefer it
  if (deal.openToCreative === true) {
    if (buyer.financingOptions === "must_be_creative") {
      score += 15;
      reasons.push("Seller is open to creative + buyer requires creative");
    } else if (buyer.financingOptions === "creative_or_conventional") {
      score += 5;
      reasons.push("Seller open to creative (buyer also open)");
    }
  } else if (buyer.financingOptions === "must_be_creative") {
    warnings.push("Deal not flagged open-to-creative; buyer requires creative");
  }

  // QUALIFICATION TIER bonus — A-tier (1) and B-tier (2) buyers get a small boost
  if (buyer.qualificationTier === "tier_1_experienced_rvp_network") {
    score += 5;
    reasons.push("Tier-1 buyer (experienced RVP)");
  } else if (buyer.qualificationTier === "tier_2_experienced_re_new_to_rvp") {
    score += 3;
    reasons.push("Tier-2 buyer (experienced RE)");
  }

  // NCNDA soft-warn (not a disqualifier — financial details just get gated client-side)
  if (!buyer.signedNcnda) warnings.push("No NCNDA on file (financials will be gated)");

  // Cap at 100 for UI sanity
  score = Math.min(100, score);

  return { score, reasons, warnings };
}

// ---- DB-backed rankers (used by detail-page sidebars) ----

export async function rankBuyersForDeal(dealId: string, limit = 20): Promise<RankedBuyer[]> {
  const { db } = await import("@/db");
  const { contacts, deals } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);
  if (!deal) return [];

  const buyers = await db.select().from(contacts);
  return buyers
    .map((b) => ({ buyer: b, match: scoreBuyerForDeal(b, deal) }))
    .filter((r) => !r.match.disqualified && r.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}

export async function rankDealsForBuyer(contactId: string, limit = 20): Promise<RankedDeal[]> {
  const { db } = await import("@/db");
  const { contacts, deals } = await import("@/db/schema");
  const { eq, ne, isNotNull, and } = await import("drizzle-orm");

  const [buyer] = await db.select().from(contacts).where(eq(contacts.id, contactId)).limit(1);
  if (!buyer) return [];

  // Only score against deals that have at least a park_state or list_price — others are too sparse
  const dealRows = await db
    .select()
    .from(deals)
    .where(and(isNotNull(deals.parkState), ne(deals.statusCode, "closed_other_buyer")));

  return dealRows
    .map((d) => ({ deal: d, match: scoreBuyerForDeal(buyer, d) }))
    .filter((r) => !r.match.disqualified && r.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}
