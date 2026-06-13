/**
 * Operational desk portal — one component, three seats.
 *
 * Underwriting, Dispositions, and Transactions all have the same shape:
 * a handful of stage buckets, a "value on my desk" number, and a queue
 * of deals to work, sorted by what matters to that role. Config below
 * gives each its accent, copy, buckets, and sort order.
 */
import { fetchPhaseQueue, countStageBuckets, queueDealTitle, queueDealLocation } from "@/lib/portal-queues";
import { fetchDealStatusLabels } from "@/lib/dashboard-queries";
import { moneyShort, PriorityBadge, StaleBadge } from "../../dashboard/widgets";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { portalFor, type AccentName } from "@/lib/role-portal";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty, QueueRow, DeadlineBadge, PortalCta } from "../portal-kit";
import { PortalFooter } from "./portal-common";

type DeskConfig = {
  buckets: ReadonlyArray<{ key: string; label: string; stages: string[]; emphasize?: boolean }>;
  queueStages: string[];
  queueOrder: "stale" | "coe" | "inspection" | "recent";
  queueTitle: string;
  queueHint: string;
  /** Which trailing badge each queue row shows. */
  trailing: "stale" | "coe" | "inspection";
  cta: { href: string; label: string };
};

const DESKS: Record<string, DeskConfig> = {
  underwriter: {
    buckets: [
      { key: "ready", label: "Awaiting review", stages: ["uw_ready_phase_2"], emphasize: true },
      { key: "active", label: "In review", stages: ["uw_under_phase_2"] },
    ],
    queueStages: ["uw_ready_phase_2", "uw_under_phase_2"],
    queueOrder: "stale",
    queueTitle: "Your underwriting queue",
    queueHint: "Oldest first — clear the backlog",
    trailing: "stale",
    cta: { href: "/triage", label: "Open triage →" },
  },
  dispo_manager: {
    buckets: [
      { key: "ready", label: "Ready to route", stages: ["psa_accepted", "loi_accepted_both_sides"], emphasize: true },
      { key: "active", label: "Dispo in progress", stages: ["dm_dispo_initiated"] },
    ],
    queueStages: ["psa_accepted", "loi_accepted_both_sides", "dm_dispo_initiated"],
    queueOrder: "recent",
    queueTitle: "Deals to route to buyers",
    queueHint: "Match these to the buyer network",
    trailing: "stale",
    cta: { href: "/deals?stage=contract", label: "View deals →" },
  },
  transaction_coord: {
    buckets: [
      { key: "psa", label: "Write PSA", stages: ["tc_writing_psa"], emphasize: true },
      { key: "submitted", label: "PSA submitted", stages: ["tc_psa_submitted"] },
      { key: "escrow", label: "In escrow", stages: ["tc_dd_in_escrow", "dd_completed_in_escrow"] },
    ],
    queueStages: ["tc_writing_psa", "tc_psa_submitted", "psa_accepted", "tc_dd_in_escrow", "dd_completed_in_escrow"],
    queueOrder: "coe",
    queueTitle: "Your paperwork queue",
    queueHint: "Closing dates, soonest first",
    trailing: "coe",
    cta: { href: "/deals?stage=contract", label: "View deals →" },
  },
};

export async function OpsDeskDashboard({ userId, userName, role }: { userId: string; userName: string; role: string }) {
  const cfg = DESKS[role];
  const identity = portalFor(role);
  const accent = identity.accent as AccentName;

  const [{ counts, totalValue }, queue, labels] = await Promise.all([
    countStageBuckets(cfg.buckets.map((b) => ({ key: b.key, stages: b.stages }))).catch(() => ({ counts: {} as Record<string, number>, totalValue: 0 })),
    fetchPhaseQueue(cfg.queueStages, { orderBy: cfg.queueOrder, limit: 14 }).catch(() => []),
    fetchDealStatusLabels().catch(() => new Map<string, string>()),
  ]);

  const totalOnDesk = cfg.buckets.reduce((sum, b) => sum + (counts[b.key] ?? 0), 0);

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel={identity.roleLabel}
        title={identity.title}
        tagline={identity.tagline}
        icon={identity.icon}
        accent={accent}
      >
        <PortalCta href={cfg.cta.href} accent={accent}>{cfg.cta.label}</PortalCta>
      </PortalHero>

      <StatStrip>
        <PortalStat accent={accent} emphasize value={totalOnDesk} label="On your desk" hint="active deals" />
        {cfg.buckets.map((b) => (
          <PortalStat key={b.key} accent={accent} value={counts[b.key] ?? 0} label={b.label} />
        ))}
        <PortalStat accent={accent} value={moneyShort(totalValue)} label="Value on desk" hint="list price" />
      </StatStrip>

      <PortalSection title={cfg.queueTitle} accent={accent} hint={cfg.queueHint}>
        <PortalCard accent={accent} lift={queue.length > 0}>
          {queue.length === 0 ? (
            <PortalEmpty>Queue's clear. Nothing waiting on you. ✅</PortalEmpty>
          ) : (
            <ul className="divide-y divide-border -mx-1">
              {queue.map((d) => (
                <QueueRow
                  key={d.id}
                  href={`/deals/${d.id}`}
                  primary={<span className="flex items-center gap-1.5"><PriorityBadge priority={d.dealPriority} /><span className="truncate">{queueDealTitle(d)}</span></span>}
                  secondary={[queueDealLocation(d), d.statusCode ? labels.get(d.statusCode) ?? d.statusCode : null].filter(Boolean).join(" · ")}
                  trailing={
                    cfg.trailing === "coe" ? <DeadlineBadge date={d.psaCoeDate} soonDays={14} />
                    : cfg.trailing === "inspection" ? <DeadlineBadge date={d.inspectionPeriodEnd} />
                    : <StaleBadge since={d.closerLastTouch ?? d.updatedAt} />
                  }
                />
              ))}
            </ul>
          )}
        </PortalCard>
      </PortalSection>

      <PortalFooter userId={userId} />
    </>
  );
}
