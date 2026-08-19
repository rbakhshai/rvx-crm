/**
 * Finance portal (cfo — Kevin).
 *
 * The money view: pipeline dollars, what's in escrow and closing soon,
 * what closed this month, the buyer network's proof-of-funds, and the
 * reimbursement approvals sitting on his desk.
 */
import { fetchCfoDashboard, fetchPipelineFunnel } from "@/lib/dashboard-queries";
import { getLeadershipQueueForUser } from "@/lib/leadership-queue";
import { moneyShort } from "../../dashboard/widgets";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty, QueueRow, DeadlineBadge } from "../portal-kit";
import { NextActions } from "../next-actions";
import { PortalFooter } from "./portal-common";

const ACCENT = "emerald" as const;

export async function FinanceDashboard({ userId, userName, role }: { userId: string; userName: string; role: string }) {
  const [cfo, funnel, desk] = await Promise.all([
    fetchCfoDashboard().catch(() => null),
    // Same source as Mission Control's funnel so "pipeline value" is one
    // number everywhere (Kevin's beta finding #9: $56M here vs $96.1M there).
    fetchPipelineFunnel().catch(() => null),
    getLeadershipQueueForUser(userId, role).catch(() => []),
  ]);

  const escrowValue = (cfo?.dealsInEscrow ?? []).reduce((sum, d) => sum + (Number(d.agreedPurchasePrice) || 0), 0);

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Finance"
        title="Finance Command"
        tagline="Pipeline dollars, deals in escrow, closings, and the books."
        icon="💵"
        accent={ACCENT}
      ></PortalHero>

      <NextActions userId={userId} role={role} />

      {cfo && (
        <StatStrip>
          <PortalStat accent={ACCENT} emphasize value={moneyShort((funnel?.activeValueCents ?? 0) / 100)} label="Pipeline value" hint="active deals · agreed or list price" />
          <PortalStat accent={ACCENT} value={moneyShort(escrowValue)} label="In escrow $" hint={`${cfo.dealsInEscrow.length} deals`} />
          <PortalStat accent={ACCENT} value={moneyShort(cfo.closedThisMonth.total)} label="Closed · 30d" />
          <PortalStat accent={ACCENT} value={cfo.closedThisMonth.count} label="Closings · 30d" />
          <PortalStat accent={ACCENT} value={moneyShort(cfo.totalPof)} label="Buyer POF" hint="network firepower" />
          <PortalStat accent={ACCENT} value={desk.length} label="Approvals" hint="on your desk" />
        </StatStrip>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mb-1">
        <PortalSection title="Deals in escrow" accent={ACCENT} hint="Closing dates, soonest first" className="mb-0">
          <PortalCard accent={ACCENT} lift={(cfo?.dealsInEscrow.length ?? 0) > 0}>
            {!cfo || cfo.dealsInEscrow.length === 0 ? (
              <PortalEmpty>Nothing in escrow right now.</PortalEmpty>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {cfo.dealsInEscrow.map((d) => (
                  <QueueRow
                    key={d.id}
                    href={`/deals/${d.id}`}
                    primary={d.name || d.parkAddress || "(unnamed deal)"}
                    secondary={d.agreedPurchasePrice ? moneyShort(Number(d.agreedPurchasePrice)) : "price TBD"}
                    trailing={<DeadlineBadge date={d.psaCoeDate} soonDays={14} />}
                  />
                ))}
              </ul>
            )}
          </PortalCard>
        </PortalSection>

        <PortalSection title="Reimbursements & approvals" accent={ACCENT} hint="Waiting on your sign-off" className="mb-0"
          action={<a href="/reimbursements" className="text-[11px] text-muted hover:text-foreground">All →</a>}>
          <PortalCard>
            {desk.length === 0 ? (
              <PortalEmpty>Nothing waiting on you. 🧾</PortalEmpty>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {desk.map((item) => (
                  <QueueRow
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    primary={<><span className="mr-1.5 text-[11px] text-muted uppercase tracking-widest">{item.kind === "hire" ? "Hire" : "Reimb"}</span>{item.title}</>}
                    trailing={<span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold">{item.statusLabel}</span>}
                  />
                ))}
              </ul>
            )}
          </PortalCard>
        </PortalSection>
      </div>

      <PortalFooter userId={userId} />
    </>
  );
}
