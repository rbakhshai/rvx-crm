/**
 * Claude API helper for deal summaries.
 *
 * Uses Haiku (cheapest, fast) for triage-time summaries. Summary is cached
 * on deals.aiSummaryMd so we only pay once per deal until the user
 * regenerates.
 */
import Anthropic from "@anthropic-ai/sdk";

let cached: Anthropic | null = null;
let initialised = false;

export function getAnthropic(): Anthropic | null {
  if (initialised) return cached;
  initialised = true;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Anthropic({ apiKey: key });
  return cached;
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Input for the summary — pass whatever's known; missing fields are fine. */
export type DealSummaryInput = {
  parkName?: string | null;
  parkAddress?: string | null;
  parkCity?: string | null;
  parkState?: string | null;
  padsCount?: number | null;
  totalUnits?: number | null;
  acresCount?: string | null;
  listPrice?: string | null;
  listNoi?: string | null;
  listCapRate?: string | null;
  agreedPurchasePrice?: string | null;
  openToCreative?: boolean | null;
  currentMortgageDebt?: string | null;
  currentMortgagePayment?: string | null;
  currentMortgageInterestRate?: string | null;
  currentMortgageBalloonDate?: string | null;
  hasRestaurant?: boolean | null;
  amenities?: string[] | null;
  motivationToSell?: string | null;
  lookingToRetire?: string | null;
  importantSellerTerms?: string | null;
  whatMakesThisSpecial?: string | null;
  ownedTheParkLong?: string | null;
  ownsOtherParks?: string | null;
  taxesCurrent?: string | null;
  permissionToShareFinancials?: boolean | null;
  birdDogName?: string | null;
  birdDogAdditionalNotes?: string | null;
  sellerName?: string | null;
  sellerRelationship?: string | null; // owner | realtor | owner_realtor
};

function fmtMoney(v: string | null | undefined): string | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `$${n.toLocaleString()}`;
}

function describeDeal(d: DealSummaryInput): string {
  const lines: string[] = [];
  const push = (label: string, v: string | number | boolean | null | undefined) => {
    if (v === null || v === undefined || v === "") return;
    if (typeof v === "boolean") lines.push(`${label}: ${v ? "yes" : "no"}`);
    else lines.push(`${label}: ${v}`);
  };
  push("Park name", d.parkName);
  push("Address", d.parkAddress);
  push("City", d.parkCity);
  push("State", d.parkState);
  push("# of pads", d.padsCount);
  push("Total units", d.totalUnits);
  push("Acres / expansion / permits", d.acresCount);
  push("Asking price", fmtMoney(d.listPrice));
  push("NOI", fmtMoney(d.listNoi));
  push("Cap rate", d.listCapRate);
  push("Agreed purchase price (if any)", fmtMoney(d.agreedPurchasePrice));
  push("Open to creative financing", d.openToCreative);
  push("Current mortgage debt", d.currentMortgageDebt);
  push("Current mortgage payment", d.currentMortgagePayment);
  push("Current mortgage interest rate", d.currentMortgageInterestRate);
  push("Current mortgage balloon date", d.currentMortgageBalloonDate);
  push("Has restaurant", d.hasRestaurant);
  push("Amenities", d.amenities && d.amenities.length > 0 ? d.amenities.join(", ") : null);
  push("Motivation to sell", d.motivationToSell);
  push("Looking to retire?", d.lookingToRetire);
  push("Owned the park long?", d.ownedTheParkLong);
  push("Owns other parks?", d.ownsOtherParks);
  push("Taxes current?", d.taxesCurrent);
  push("Permission to share financials", d.permissionToShareFinancials);
  push("Important seller terms", d.importantSellerTerms);
  push("What makes this special", d.whatMakesThisSpecial);
  push(
    "Seller / contact",
    [d.sellerName, d.sellerRelationship ? `(${d.sellerRelationship})` : null].filter(Boolean).join(" "),
  );
  push("Bird dog who sourced it", d.birdDogName);
  push("Bird dog's notes", d.birdDogAdditionalNotes);
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You write punchy, useful summaries of RV-park acquisition leads for a brokerage closer who is about to call the seller. Your job is to save them 5 minutes of reading and arm them with what to say on the call.

ALWAYS output three sections in this exact format:

**🎯 The seller** — 2-3 sentences. Who they are, why they're selling, urgency level, anything personal the closer should remember. Be specific to the data — never invent details.

**💵 The numbers** — 2-3 sentences. Asking price, NOI, cap rate, pad count, debt situation, financing flexibility. Call out anything unusual or red-flaggy.

**📞 What to ask on the call** — 3 to 5 numbered questions the closer should hit. Make them specific to this deal, not generic. Prioritize questions that surface dealbreakers fast.

Constraints:
- No preamble or sign-off. Start directly with the first heading.
- If a field is missing, don't say "not provided" — just skip it.
- Don't repeat the field values verbatim — synthesize.
- Be concise. The whole thing should fit on a screen.
- Plain markdown only.`;

export async function generateDealSummary(input: DealSummaryInput): Promise<string> {
  const client = getAnthropic();
  if (!client) throw new Error("ANTHROPIC_API_KEY not configured");

  const dealDescription = describeDeal(input);
  if (!dealDescription.trim()) {
    return "_Not enough deal data to summarize yet. Fill in more fields and regenerate._";
  }

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here's everything we know about this lead. Write the summary.\n\n${dealDescription}`,
      },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return text || "_Couldn't generate a summary._";
}
