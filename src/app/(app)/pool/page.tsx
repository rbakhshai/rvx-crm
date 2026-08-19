/**
 * /pool — The Pool: Reza's leadership profit share.
 *
 *   5 parks a year for 4 years. 10% of the portfolio's distributable
 *   cash flow goes into a pool, paid quarterly to leadership members
 *   past their 4-year cliff. Split by years-of-service points.
 *
 * The page's whole job is to make the promise TANGIBLE: parks owned
 * progress, a live pool estimate from real revenue, each member's
 * countdown to their seat at the table, and the payout ledger.
 *
 * Admin-only (Reza, 2026-07-12) — the profit-share terms are not for
 * general leadership viewing during beta. Gate is the REAL role, so
 * view-as previews don't lock the CEO out.
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { POOL_LAUNCHED } from "@/lib/pool-visibility";
import { hasPermission } from "@/lib/has-permission";
import { getEffectiveRole } from "@/lib/view-as";
import { PageShell } from "../page-shell";
import { getPoolData, getPoolDistributions, getEligibleUsers, fmtUsd, type PoolMemberRow } from "@/lib/pool";
import { ROLES } from "@/lib/permissions";
import { EditableBlock } from "@/components/editable-block";
import { PoolAdmin } from "./pool-admin";
import { Avatar } from "@/components/avatar";
import { fmtDate } from "@/lib/date-format";
import { cn } from "@/lib/cn";

const ROLE_LABEL = new Map(ROLES.map((r) => [r.value as string, r.label]));

export default async function PoolPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  const realRole = (session.user as { role?: string }).role;
  const launchedAndAllowed = POOL_LAUNCHED && (await hasPermission(session.user, "view_pool"));
  if (realRole !== "admin" && !launchedAndAllowed) notFound();

  const role = await getEffectiveRole(session.user.role);
  // Only the CEO (admin) can adjust the pool — not Finance, not anyone else.
  const isPoolAdmin = role === "admin";

  const [pool, distributions, eligible] = await Promise.all([
    getPoolData(),
    getPoolDistributions().catch(() => []),
    getEligibleUsers().catch(() => []),
  ]);

  const parksPct = Math.min(100, Math.round((pool.parksOwned / pool.targetParks) * 100));
  const vestedCount = pool.members.filter((m) => m.points > 0).length;

  return (
    <PageShell
      title="Pathway to Partnership"
      subtitle={`5 parks a year · 4 years · ${pool.poolPct}% of my portfolio cashflow, shared quarterly with leadership past the 4-year cliff.`}
      width="default"
    >
      {/* Parks progress hero */}
      <section className="rounded-2xl border border-border bg-gradient-to-br from-amber-50/60 to-background dark:from-amber-500/[0.06] dark:to-background p-5 mb-5">
        <div className="flex items-end justify-between gap-4 mb-2.5">
          <div>
            <div className="text-4xl font-bold tabular-nums leading-none">
              {pool.parksOwned}<span className="text-xl text-muted font-semibold"> / {pool.targetParks}</span>
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1.5">
              Parks owned
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums leading-none">{fmtUsd(pool.quarterlyPoolCents)}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-1.5">
              Est. quarterly pool today
            </div>
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

      {/* Pool math */}
      <section className="rounded-xl border border-border bg-background p-4 mb-5">
        <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-2.5">
          How today&apos;s estimate is computed
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <MathStat
            label="Quarterly cash flow"
            value={pool.manualCashFlow ? fmtUsd(pool.quarterlyCashFlowCents) : "—"}
            hint={pool.manualCashFlow ? "entered by Finance" : "not set yet"}
          />
          <MathStat label="Pool share" value={`${pool.poolPct}%`} hint="of distributable cash" />
          <MathStat label="Quarterly pool" value={fmtUsd(pool.quarterlyPoolCents)} hint="cash flow × pool %" />
          <MathStat label="Vested members" value={`${vestedCount} · ${pool.totalVestedPoints} pts`} hint="splitting the pool" />
        </div>

        {isPoolAdmin && (
          <div className="mt-4 pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <AssumptionField
              label="Parks goal"
              scope="pool.target_parks"
              initial={String(pool.targetParks)}
              placeholder="20"
            />
            <AssumptionField
              label="Pool % of cash flow"
              scope="pool.pool_pct"
              initial={String(pool.poolPct)}
              placeholder="10"
            />
            <AssumptionField
              label="Quarterly distributable cash flow $"
              scope="pool.quarterly_cashflow_usd"
              initial={pool.manualCashFlow ? String(Math.round(pool.quarterlyCashFlowCents / 100)) : ""}
              placeholder="e.g. 150000"
            />
          </div>
        )}
      </section>

      {/* Members */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-block size-2 rounded-full bg-amber-500" />
          <h2 className="text-sm font-bold">Seats at the table</h2>
          <span className="text-xs text-muted tabular-nums">· {pool.members.length}</span>
        </div>
        {pool.members.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-10 text-center text-sm text-muted">
            No members yet. {isPoolAdmin ? "Add the leadership team below — each person's 4-year clock starts from their seat date." : "Leadership will appear here once added."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pool.members.map((m) => (
              <MemberCard key={m.memberId} m={m} />
            ))}
          </div>
        )}
      </section>

      {/* Payout ledger */}
      <section className="mb-5">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="inline-block size-2 rounded-full bg-emerald-500" />
          <h2 className="text-sm font-bold">Distributions</h2>
          <span className="text-xs text-muted tabular-nums">· {distributions.length}</span>
        </div>
        {distributions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-foreground/[0.02] p-6 text-center text-sm text-muted">
            No payouts recorded yet — the ledger starts with the first vested quarter.
          </div>
        ) : (
          <ul className="space-y-2">
            {distributions.map((d) => (
              <li key={d.id} className="rounded-xl border border-border bg-background p-3.5">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-sm font-bold">{d.quarter}</span>
                  <span className="text-sm font-bold tabular-nums">{fmtUsd(d.totalCents)}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-foreground/75">
                  {d.split.map((s) => (
                    <span key={s.userId}>
                      {s.name} <span className="text-muted">({s.points} pts)</span>{" "}
                      <strong className="tabular-nums">{fmtUsd(s.cents)}</strong>
                    </span>
                  ))}
                </div>
                {d.notes && <p className="text-[11px] text-muted mt-1.5">{d.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isPoolAdmin && (
        <PoolAdmin
          eligible={eligible}
          members={pool.members.map((m) => ({
            memberId: m.memberId,
            name: m.name,
            seatStart: m.seatStartAt.toISOString().slice(0, 10),
            active: m.active,
          }))}
        />
      )}
    </PageShell>
  );
}

function MemberCard({ m }: { m: PoolMemberRow }) {
  const msLeft = m.vestAt.getTime() - Date.now();
  const countdown = msLeft > 0 ? fmtCountdown(msLeft) : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        m.vested
          ? "border-amber-300 bg-amber-50/50 dark:border-amber-500/40 dark:bg-amber-500/[0.07]"
          : "border-border bg-background",
        !m.active && "opacity-50",
      )}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar name={m.name} id={m.userId} size="md" />
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{m.name}</div>
          <div className="text-[10px] text-muted uppercase tracking-widest">
            {ROLE_LABEL.get(m.role) ?? m.role} · seated {fmtDate(m.seatStartAt)}
          </div>
        </div>
      </div>

      {!m.active ? (
        <div className="text-xs text-muted">Membership paused — out of the pool.</div>
      ) : m.vested ? (
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full border border-amber-400 bg-amber-100/70 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold">
            ★ Vested · {m.points} {m.points === 1 ? "point" : "points"}
          </span>
          {m.projectedShareCents > 0 && (
            <span className="text-sm font-bold tabular-nums">
              {fmtUsd(m.projectedShareCents)}<span className="text-[10px] text-muted font-medium"> /qtr est.</span>
            </span>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted">Vests {fmtDate(m.vestAt)}</span>
            <span className="font-semibold tabular-nums">{countdown} to your seat</span>
          </div>
          <div className="h-1.5 rounded-full bg-foreground/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400"
              style={{ width: `${Math.min(100, Math.max(2, (m.yearsOfService / 4) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function fmtCountdown(ms: number): string {
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m`;
  return `${days}d`;
}

function MathStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div className="text-base font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mt-0.5">{label}</div>
      <div className="text-[10px] text-muted mt-0.5">{hint}</div>
    </div>
  );
}

function AssumptionField({
  label,
  scope,
  initial,
  placeholder,
}: {
  label: string;
  scope: string;
  initial: string;
  placeholder: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-semibold mb-0.5">{label}</div>
      <EditableBlock
        scope={scope}
        initial={initial}
        revalidate="/pool"
        placeholder={placeholder}
        variant="inline"
        className="tabular-nums"
      />
    </div>
  );
}
