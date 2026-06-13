/**
 * Portal queues — generic "deals sitting in my phase" fetchers that power
 * the operational role dashboards (Underwriting, Dispo, Transactions).
 *
 * One shared shape so the portal kit can render any of them identically;
 * each role just hands in the status codes it owns and how to sort.
 */
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";

export type QueueDeal = {
  id: string;
  name: string | null;
  parkAddress: string | null;
  parkCity: string | null;
  parkState: string | null;
  statusCode: string | null;
  listPrice: string | null;
  agreedPurchasePrice: string | null;
  dealPriority: string | null;
  closerLastTouch: Date | null;
  updatedAt: Date;
  psaCoeDate: string | null;
  inspectionPeriodEnd: string | null;
  escrowOpened: string | null;
};

const COLS = {
  id: deals.id,
  name: deals.name,
  parkAddress: deals.parkAddress,
  parkCity: deals.parkCity,
  parkState: deals.parkState,
  statusCode: deals.statusCode,
  listPrice: deals.listPrice,
  agreedPurchasePrice: deals.agreedPurchasePrice,
  dealPriority: deals.dealPriority,
  closerLastTouch: deals.closerLastTouch,
  updatedAt: deals.updatedAt,
  psaCoeDate: deals.psaCoeDate,
  inspectionPeriodEnd: deals.inspectionPeriodEnd,
  escrowOpened: deals.escrowOpened,
};

/**
 * Deals currently in the given stages. `orderBy`:
 *   - "stale"        — oldest closerLastTouch (or updatedAt) first
 *   - "coe"          — soonest psaCoeDate first
 *   - "inspection"   — soonest inspectionPeriodEnd first
 *   - "recent"       — most recently updated first
 */
export async function fetchPhaseQueue(
  stages: string[],
  opts: { ownerId?: string; orderBy?: "stale" | "coe" | "inspection" | "recent"; limit?: number } = {},
): Promise<QueueDeal[]> {
  if (stages.length === 0) return [];
  const { ownerId, orderBy = "recent", limit = 12 } = opts;

  const ownerFilter = ownerId
    ? or(eq(deals.ownerId, ownerId), eq(deals.opsOwnerId, ownerId))
    : undefined;
  const where = and(inArray(deals.statusCode, stages), isNull(deals.deletedAt), ownerFilter);

  const order =
    orderBy === "stale" ? sql`COALESCE(${deals.closerLastTouch}, ${deals.updatedAt}) ASC`
    : orderBy === "coe" ? sql`${deals.psaCoeDate} ASC NULLS LAST`
    : orderBy === "inspection" ? sql`${deals.inspectionPeriodEnd} ASC NULLS LAST`
    : desc(deals.updatedAt);

  return db.select(COLS).from(deals).where(where).orderBy(order).limit(limit);
}

/**
 * Count deals per named bucket of stages, in one round-trip. Returns the
 * counts plus the summed list-price (dollars) across all buckets — the
 * "value sitting on my desk" number.
 */
export async function countStageBuckets(
  buckets: ReadonlyArray<{ key: string; stages: string[] }>,
  ownerId?: string,
): Promise<{ counts: Record<string, number>; totalValue: number }> {
  const allStages = [...new Set(buckets.flatMap((b) => b.stages))];
  if (allStages.length === 0) return { counts: {}, totalValue: 0 };

  const ownerFilter = ownerId
    ? or(eq(deals.ownerId, ownerId), eq(deals.opsOwnerId, ownerId))
    : undefined;

  const rows = await db
    .select({ statusCode: deals.statusCode, listPrice: deals.listPrice })
    .from(deals)
    .where(and(inArray(deals.statusCode, allStages), isNull(deals.deletedAt), ownerFilter));

  const counts: Record<string, number> = Object.fromEntries(buckets.map((b) => [b.key, 0]));
  const stageToBucket = new Map<string, string>();
  for (const b of buckets) for (const s of b.stages) stageToBucket.set(s, b.key);

  let totalValue = 0;
  for (const r of rows) {
    const key = r.statusCode ? stageToBucket.get(r.statusCode) : null;
    if (key) counts[key]++;
    const n = Number(r.listPrice);
    if (Number.isFinite(n)) totalValue += n;
  }
  return { counts, totalValue };
}

export function queueDealTitle(d: QueueDeal): string {
  return d.name || d.parkAddress || "(unnamed deal)";
}

export function queueDealLocation(d: QueueDeal): string {
  return [d.parkCity, d.parkState].filter(Boolean).join(", ");
}
