/**
 * Stripe client. Returns null if STRIPE_SECRET_KEY isn't configured —
 * pages should render a "Connect Stripe" empty state in that case
 * rather than crashing.
 */
import Stripe from "stripe";

let cached: Stripe | null = null;
let initialised = false;

export function getStripe(): Stripe | null {
  if (initialised) return cached;
  initialised = true;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Stripe(key);
  return cached;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Format an amount returned by the Stripe API. Stripe returns amounts in
 * the currency's smallest unit (cents for USD), so /100 for display.
 */
export function fmtStripeAmount(amount: number | null | undefined, currency: string = "usd"): string {
  if (amount == null) return "—";
  const major = amount / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(major);
}

export type RevenueSummary = {
  configured: boolean;
  /** Total charged (succeeded only), last 30 days, in cents. */
  last30dCents: number;
  /** Total charged (succeeded only), this calendar month, in cents. */
  monthToDateCents: number;
  /** All-time succeeded total, in cents. (Limited to first 100 charges per Stripe API call.) */
  allTimeApproxCents: number;
  /** All currency codes seen in the sample. Usually just ["usd"]. */
  currencies: string[];
  /** Recent successful charges, max 25. */
  recent: Array<{
    id: string;
    amount: number; // cents
    currency: string;
    created: Date;
    description: string | null;
    customerEmail: string | null;
    customerName: string | null;
    /** "park_xyz" metadata if set, so we can group by park later */
    parkTag: string | null;
  }>;
  /** Aggregate by parkTag (only present when populated in Stripe). */
  byPark: Array<{ park: string; cents: number; count: number }>;
};

export async function getRevenueSummary(): Promise<RevenueSummary> {
  const stripe = getStripe();
  if (!stripe) {
    return {
      configured: false,
      last30dCents: 0,
      monthToDateCents: 0,
      allTimeApproxCents: 0,
      currencies: [],
      recent: [],
      byPark: [],
    };
  }

  const now = Date.now();
  const thirtyDaysAgoSec = Math.floor((now - 30 * 24 * 60 * 60 * 1000) / 1000);
  const monthStartSec = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

  // Pull recent succeeded charges. Stripe limits page size to 100.
  // For an MVP we sample the most recent 100 — enough to populate the
  // "recent" list and approximate all-time. We can switch to a periodic
  // sync into our own DB once volume grows.
  // Expand customer so we can fall back to customer-level park metadata
  // (handy when one customer pays for one park repeatedly via Checkout).
  const charges = await stripe.charges.list({ limit: 100, expand: ["data.customer"] });

  let last30dCents = 0;
  let monthToDateCents = 0;
  let allTimeApproxCents = 0;
  const currencies = new Set<string>();
  const byPark = new Map<string, { cents: number; count: number }>();

  function extractPark(c: Stripe.Charge): string | null {
    // Look on the charge metadata first (set via payment_intent_data.metadata
    // on a Checkout Session, or directly on a PaymentIntent).
    const onCharge =
      c.metadata?.park ?? c.metadata?.park_id ?? c.metadata?.park_name ?? null;
    if (onCharge) return onCharge;
    // Fall back to the linked Customer's metadata — a one-time tag per
    // customer that propagates to every payment they make.
    const cust = typeof c.customer === "object" && c.customer && !("deleted" in c.customer) ? c.customer : null;
    if (cust?.metadata) {
      return cust.metadata.park ?? cust.metadata.park_id ?? cust.metadata.park_name ?? null;
    }
    return null;
  }

  for (const c of charges.data) {
    if (c.status !== "succeeded") continue;
    if (c.refunded || c.amount_refunded === c.amount) continue;
    const net = c.amount - (c.amount_refunded ?? 0);
    allTimeApproxCents += net;
    currencies.add(c.currency);
    if (c.created >= thirtyDaysAgoSec) last30dCents += net;
    if (c.created >= monthStartSec) monthToDateCents += net;

    const parkTag = extractPark(c);
    if (parkTag) {
      const prev = byPark.get(parkTag) ?? { cents: 0, count: 0 };
      byPark.set(parkTag, { cents: prev.cents + net, count: prev.count + 1 });
    }
  }

  const recent = charges.data
    .filter((c) => c.status === "succeeded")
    .slice(0, 25)
    .map((c) => {
      const parkTag = extractPark(c);
      const customer = typeof c.customer === "object" && c.customer && !("deleted" in c.customer) ? c.customer : null;
      return {
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        created: new Date(c.created * 1000),
        description: c.description ?? null,
        customerEmail: c.billing_details?.email ?? customer?.email ?? null,
        customerName: c.billing_details?.name ?? customer?.name ?? null,
        parkTag,
      };
    });

  return {
    configured: true,
    last30dCents,
    monthToDateCents,
    allTimeApproxCents,
    currencies: Array.from(currencies),
    recent,
    byPark: Array.from(byPark.entries())
      .map(([park, v]) => ({ park, cents: v.cents, count: v.count }))
      .sort((a, b) => b.cents - a.cents),
  };
}
