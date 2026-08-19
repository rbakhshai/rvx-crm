/**
 * /pool — Pathway to Partnership: Reza's leadership profit-share promise.
 *
 *   5 parks a year for 4 years. 10% of the portfolio's distributable
 *   cash flow goes into a pool, paid quarterly to leadership members
 *   past their 4-year cliff. Split by years-of-service points.
 *
 * Deliberately just the promise + parks progress (Reza, 2026-07-12):
 * the estimate calculator, assumptions inputs, member roster,
 * distribution ledger, and CEO manage forms were stripped — restore
 * from git history when the program goes live in earnest.
 *
 * Admin-only until POOL_LAUNCHED flips (lib/pool-visibility.ts). Gate
 * is the REAL role, so view-as previews don't lock the CEO out.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { POOL_LAUNCHED } from "@/lib/pool-visibility";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../page-shell";
import { getPoolData } from "@/lib/pool";

export default async function PoolPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  const realRole = (session.user as { role?: string }).role;
  const launchedAndAllowed = POOL_LAUNCHED && (await hasPermission(session.user, "view_pool"));
  if (realRole !== "admin" && !launchedAndAllowed) notFound();

  const pool = await getPoolData();
  const parksPct = Math.min(100, Math.round((pool.parksOwned / pool.targetParks) * 100));

  return (
    <PageShell
      title="Pathway to Partnership"
      subtitle={`5 parks a year · 4 years · ${pool.poolPct}% of my portfolio cashflow, shared quarterly with leadership past the 4-year cliff.`}
      width="default"
    >
      {/* Parks progress — the one number that makes the promise tangible */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-amber-50/60 to-background dark:from-amber-500/[0.06] dark:to-background p-5">
        <div className="mb-2.5">
          <div className="text-4xl font-bold tabular-nums leading-none">
            {pool.parksOwned}<span className="text-xl text-muted font-semibold"> / {pool.targetParks}</span>
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1.5">
            Parks owned
          </div>
        </div>
        <div className="h-3 rounded-full bg-foreground/[0.07] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
            style={{ width: `${Math.max(parksPct, 2)}%` }}
          />
        </div>
        <p className="text-[11px] text-muted mt-2">
          Every park RVX closes and keeps moves this bar — and grows the pool.
        </p>
      </section>
    </PageShell>
  );
}
