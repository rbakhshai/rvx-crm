/**
 * Operations portal (bird_dog_manager — Marco / COO).
 *
 * He owns every deal once it's qualified: closing, underwriting, LOI,
 * PSA, escrow, close. The page is a control tower — counts per phase,
 * what's gone stale, and the escrow clocks ticking down.
 */
import { fetchPhaseQueue, countStageBuckets, queueDealTitle, queueDealLocation } from "@/lib/portal-queues";
import { fetchDealStatusLabels } from "@/lib/dashboard-queries";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { StaleBadge, PriorityBadge } from "../../dashboard/widgets";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty, QueueRow, DeadlineBadge, PortalCta } from "../portal-kit";
import { NextActions } from "../next-actions";
import { PortalFooter } from "./portal-common";

const ACCENT = "pink" as const;

const CLOSING = ["closer_first_contact_attempted", "closer_first_contact_made", "closer_under_negotiation", "closer_gathering_docs"];
const UW = ["uw_ready_phase_2", "uw_under_phase_2"];
const LOI = ["loi_ready", "loi_submitted", "loi_in_negotiation", "loi_signed_by_seller", "loi_accepted_both_sides"];
const ESCROW = ["tc_writing_psa", "tc_psa_submitted", "psa_accepted", "tc_dd_in_escrow", "dd_completed_in_escrow"];
const ALL_OPS = [...CLOSING, ...UW, ...LOI, ...ESCROW];
const INSPECTION_STAGES = ["tc_dd_in_escrow", "dd_completed_in_escrow"];

export async function OperationsDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [{ counts }, staleQueue, escrowClocks, labels] = await Promise.all([
    countStageBuckets([
      { key: "closing", stages: CLOSING },
      { key: "uw", stages: UW },
      { key: "loi", stages: LOI },
      { key: "escrow", stages: ESCROW },
    ]).catch(() => ({ counts: {} as Record<string, number>, totalValue: 0 })),
    fetchPhaseQueue(ALL_OPS, { orderBy: "stale", limit: 10 }).catch(() => []),
    fetchPhaseQueue(INSPECTION_STAGES, { orderBy: "inspection", limit: 8 }).catch(() => []),
    fetchDealStatusLabels().catch(() => new Map<string, string>()),
  ]);

  const totalActive = (counts.closing ?? 0) + (counts.uw ?? 0) + (counts.loi ?? 0) + (counts.escrow ?? 0);
  const SEVEN = 7 * 24 * 60 * 60 * 1000;
  const staleCount = staleQueue.filter((d) => {
    const t = (d.closerLastTouch ?? d.updatedAt).getTime();
    return Date.now() - t > SEVEN;
  }).length;

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Operations"
        title="Operations Command"
        tagline="Every deal in motion — closing, underwriting, escrow, close."
        icon="⚙️"
        accent={ACCENT}
      >
        <PortalCta href="/deals/board" accent={ACCENT}>Pipeline board →</PortalCta>
      </PortalHero>

      <NextActions userId={userId} role="bird_dog_manager" />

      <StatStrip>
        <PortalStat accent={ACCENT} emphasize value={totalActive} label="Active deals" hint="post-qualification" />
        <PortalStat accent={ACCENT} value={counts.closing ?? 0} label="In closing" />
        <PortalStat accent={ACCENT} value={counts.uw ?? 0} label="In underwriting" />
        <PortalStat accent={ACCENT} value={counts.loi ?? 0} label="LOIs in play" />
        <PortalStat accent={ACCENT} value={counts.escrow ?? 0} label="PSA / escrow" />
        <PortalStat accent={ACCENT} value={staleCount} label="Stale >7d" hint="needs a nudge" />
      </StatStrip>

      <div className="grid lg:grid-cols-2 gap-4 mb-1">
        <PortalSection title="Going stale" accent={ACCENT} hint="Oldest touch first — keep them moving" className="mb-0">
          <PortalCard accent={ACCENT} lift={staleCount > 0}>
            {staleQueue.length === 0 ? (
              <PortalEmpty>Nothing stalling. Clean board. 🎯</PortalEmpty>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {staleQueue.map((d) => (
                  <QueueRow
                    key={d.id}
                    href={`/deals/${d.id}`}
                    primary={<span className="flex items-center gap-1.5"><PriorityBadge priority={d.dealPriority} /><span className="truncate">{queueDealTitle(d)}</span></span>}
                    secondary={[queueDealLocation(d), d.statusCode ? labels.get(d.statusCode) ?? d.statusCode : null].filter(Boolean).join(" · ")}
                    trailing={<StaleBadge since={d.closerLastTouch ?? d.updatedAt} />}
                  />
                ))}
              </ul>
            )}
          </PortalCard>
        </PortalSection>

        <PortalSection title="Escrow clocks" accent={ACCENT} hint="Inspection deadlines, soonest first" className="mb-0">
          <PortalCard>
            {escrowClocks.length === 0 ? (
              <PortalEmpty>Nothing in escrow right now.</PortalEmpty>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {escrowClocks.map((d) => (
                  <QueueRow
                    key={d.id}
                    href={`/deals/${d.id}`}
                    primary={queueDealTitle(d)}
                    secondary={[queueDealLocation(d), d.psaCoeDate ? `COE ${d.psaCoeDate}` : null].filter(Boolean).join(" · ")}
                    trailing={<DeadlineBadge date={d.inspectionPeriodEnd} />}
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
