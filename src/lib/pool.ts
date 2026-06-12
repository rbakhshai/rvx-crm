/**
 * The Pool (10-10-10) — data layer.
 *
 * Pool math, in one place:
 *   parks owned        = deals with status closed_rvx_acquired
 *   quarterly cash flow = the manually-entered ops block ONLY for now —
 *                         Reza explicitly parked the Stripe-derived
 *                         estimate (2026-06-11: "dont pull the stripe
 *                         data yet"); the margin% block is kept for
 *                         when that hookup is wanted
 *   pool               = cash flow × pool%
 *   vested             = active member whose seat started ≥ 4 years ago
 *   points             = floor(years of service)  (year 7 → 7 points)
 *   member share       = pool × points / total vested points
 *
 * Assumptions live in ops_content under "pool." so Reza/Kevin can tune
 * them inline without a deploy:
 *   pool.target_parks            default 10
 *   pool.pool_pct                default 10
 *   pool.cashflow_margin_pct     default 50
 *   pool.quarterly_cashflow_usd  optional manual override
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { deals, poolDistributions, poolMembers, user } from "@/db/schema";
import { getOpsBlocks } from "./ops-content";

const CLIFF_YEARS = 4;
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export type PoolMemberRow = {
  memberId: string;
  userId: string;
  name: string;
  role: string;
  seatStartAt: Date;
  active: boolean;
  vestAt: Date;
  vested: boolean;
  yearsOfService: number;
  /** floor(years); 0 until vested for split purposes. */
  points: number;
  /** Projected quarterly share in cents (vested members only). */
  projectedShareCents: number;
};

export type PoolData = {
  parksOwned: number;
  targetParks: number;
  poolPct: number;
  marginPct: number;
  /** True when the cash-flow number is a manual override, not Stripe-derived. */
  manualCashFlow: boolean;
  stripeConfigured: boolean;
  quarterlyCashFlowCents: number;
  quarterlyPoolCents: number;
  members: PoolMemberRow[];
  totalVestedPoints: number;
};

function num(v: string | undefined, fallback: number): number {
  const n = parseFloat(v ?? "");
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getPoolData(): Promise<PoolData> {
  const [blocks, memberRows, parksResult] = await Promise.all([
    getOpsBlocks("pool.").catch(() => new Map<string, string>()),
    db
      .select({
        memberId: poolMembers.id,
        userId: poolMembers.userId,
        seatStartAt: poolMembers.seatStartAt,
        active: poolMembers.active,
        name: user.name,
        role: user.role,
      })
      .from(poolMembers)
      .innerJoin(user, eq(user.id, poolMembers.userId))
      .where(isNull(user.deletedAt)),
    db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(deals)
      .where(and(eq(deals.statusCode, "closed_rvx_acquired"), isNull(deals.deletedAt))),
  ]);

  const targetParks = num(blocks.get("pool.target_parks"), 10);
  const poolPct = num(blocks.get("pool.pool_pct"), 10);
  const marginPct = num(blocks.get("pool.cashflow_margin_pct"), 50);
  const overrideUsd = parseFloat(blocks.get("pool.quarterly_cashflow_usd") ?? "");
  const manualCashFlow = Number.isFinite(overrideUsd) && overrideUsd > 0;

  // Stripe hookup parked — manual figure or nothing.
  const quarterlyCashFlowCents = manualCashFlow ? Math.round(overrideUsd * 100) : 0;
  const quarterlyPoolCents = Math.round(quarterlyCashFlowCents * (poolPct / 100));

  const now = Date.now();
  const prelim = memberRows.map((m) => {
    const start = new Date(m.seatStartAt);
    const years = (now - start.getTime()) / MS_PER_YEAR;
    const vested = m.active && years >= CLIFF_YEARS;
    return {
      memberId: m.memberId,
      userId: m.userId,
      name: m.name,
      role: m.role,
      seatStartAt: start,
      active: m.active,
      vestAt: new Date(start.getTime() + CLIFF_YEARS * MS_PER_YEAR),
      vested,
      yearsOfService: years,
      points: vested ? Math.floor(years) : 0,
    };
  });

  const totalVestedPoints = prelim.reduce((acc, m) => acc + m.points, 0);
  const members: PoolMemberRow[] = prelim
    .map((m) => ({
      ...m,
      projectedShareCents:
        m.points > 0 && totalVestedPoints > 0
          ? Math.round((quarterlyPoolCents * m.points) / totalVestedPoints)
          : 0,
    }))
    // Vested first (by points desc), then soonest-to-vest.
    .sort((a, b) =>
      a.vested !== b.vested ? (a.vested ? -1 : 1)
      : a.vested ? b.points - a.points
      : a.vestAt.getTime() - b.vestAt.getTime());

  return {
    parksOwned: Number(parksResult[0]?.c ?? 0),
    targetParks,
    poolPct,
    marginPct,
    manualCashFlow,
    stripeConfigured: false,
    quarterlyCashFlowCents,
    quarterlyPoolCents,
    members,
    totalVestedPoints,
  };
}

/** Leadership-role users not yet in the pool — feeds the add-member picker. */
export async function getEligibleUsers(): Promise<Array<{ id: string; name: string; role: string }>> {
  const rows = await db.execute(sql`
    SELECT u.id, u.name, u.role::text AS role
    FROM "user" u
    WHERE u.deleted_at IS NULL AND u.suspended_at IS NULL
      AND u.role IN ('admin', 'acquisitions_manager', 'bird_dog_manager', 'cfo', 'due_diligence', 'park_manager')
      AND NOT EXISTS (SELECT 1 FROM pool_members pm WHERE pm.user_id = u.id)
    ORDER BY u.name
  `);
  const raw = ((rows as unknown as { rows?: Array<Record<string, unknown>> }).rows
    ?? (rows as unknown as Array<Record<string, unknown>>)) ?? [];
  return raw.map((r) => ({ id: String(r.id), name: String(r.name), role: String(r.role) }));
}

export type DistributionRow = {
  id: string;
  quarter: string;
  totalCents: number;
  split: Array<{ userId: string; name: string; points: number; cents: number }>;
  notes: string | null;
  createdAt: Date;
};

export async function getPoolDistributions(): Promise<DistributionRow[]> {
  const rows = await db.select().from(poolDistributions).orderBy(desc(poolDistributions.createdAt)).limit(40);
  return rows.map((r) => ({
    id: r.id,
    quarter: r.quarter,
    totalCents: r.totalCents,
    split: (r.split ?? []) as DistributionRow["split"],
    notes: r.notes,
    createdAt: r.createdAt,
  }));
}

export function fmtUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
