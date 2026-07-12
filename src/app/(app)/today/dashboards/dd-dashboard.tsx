/**
 * Due Diligence desk (due_diligence — Kerry).
 *
 * DD lives and dies by the inspection clock. The page leads with the
 * deals in escrow and how many days are left on each, then what just
 * opened and what's about to need a DD kickoff.
 */
import { fetchDueDiligenceDashboard, fetchDealStatusLabels } from "@/lib/dashboard-queries";
import { fmtDateWithWeekday, fmtDate } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty, QueueRow, DeadlineBadge, PortalCta } from "../portal-kit";
import { NextActions } from "../next-actions";
import { PortalFooter } from "./portal-common";

const ACCENT = "gray" as const;

export async function DueDiligenceDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [dd, statusLabels] = await Promise.all([
    fetchDueDiligenceDashboard().catch(() => null),
    fetchDealStatusLabels().catch(() => new Map<string, string>()),
  ]);

  const inDd = dd?.inDd ?? [];
  const opened = dd?.escrowOpenedRecently ?? [];
  const awaiting = dd?.awaitingDdStart ?? [];

  // Count deals whose inspection window is closing within 7 days.
  const closingSoon = inDd.filter((d) => {
    if (!d.inspectionPeriodEnd) return false;
    const days = Math.ceil((new Date(d.inspectionPeriodEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days <= 7;
  }).length;

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Due Diligence"
        title="Due Diligence Desk"
        tagline="Deals in escrow and the inspection clocks ticking on them."
        icon="🔍"
        accent={ACCENT}
      >
        <PortalCta href="/deals?stage=contract" accent={ACCENT}>View deals →</PortalCta>
      </PortalHero>

      <NextActions userId={userId} role="due_diligence" />

      <StatStrip>
        <PortalStat accent={ACCENT} emphasize value={inDd.length} label="In due diligence" />
        <PortalStat accent={ACCENT} value={closingSoon} label="Inspection ≤7d" hint="urgent" />
        <PortalStat accent={ACCENT} value={opened.length} label="Just opened" hint="last 14d" />
        <PortalStat accent={ACCENT} value={awaiting.length} label="Awaiting DD start" />
      </StatStrip>

      <PortalSection title="In due diligence" accent={ACCENT} hint="Inspection deadline, soonest first">
        <PortalCard accent={ACCENT} lift={inDd.length > 0}>
          {inDd.length === 0 ? (
            <PortalEmpty>Nothing in DD right now.</PortalEmpty>
          ) : (
            <ul className="divide-y divide-border -mx-1">
              {inDd.map((d) => (
                <QueueRow
                  key={d.id}
                  href={`/deals/${d.id}`}
                  primary={d.name || d.parkAddress || "(unnamed deal)"}
                  secondary={[
                    d.escrowOpened ? `opened ${d.escrowOpened}` : null,
                    d.psaCoeDate ? `COE ${d.psaCoeDate}` : null,
                  ].filter(Boolean).join(" · ")}
                  trailing={<DeadlineBadge date={d.inspectionPeriodEnd} />}
                />
              ))}
            </ul>
          )}
        </PortalCard>
      </PortalSection>

      <div className="grid lg:grid-cols-2 gap-4 mb-1">
        <PortalSection title="Just opened escrow" accent={ACCENT} hint="Last 14 days — kick off DD" className="mb-0">
          <PortalCard>
            {opened.length === 0 ? (
              <PortalEmpty>Nothing new in escrow.</PortalEmpty>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {opened.map((d) => (
                  <QueueRow
                    key={d.id}
                    href={`/deals/${d.id}`}
                    primary={d.name || d.parkAddress || "(unnamed deal)"}
                    secondary={d.escrowOpened ? `opened ${fmtDate(new Date(d.escrowOpened))}` : undefined}
                  />
                ))}
              </ul>
            )}
          </PortalCard>
        </PortalSection>

        <PortalSection title="Awaiting DD start" accent={ACCENT} hint="Under contract, DD not yet running" className="mb-0">
          <PortalCard>
            {awaiting.length === 0 ? (
              <PortalEmpty>Nothing waiting to start.</PortalEmpty>
            ) : (
              <ul className="divide-y divide-border -mx-1">
                {awaiting.map((d) => (
                  <QueueRow
                    key={d.id}
                    href={`/deals/${d.id}`}
                    primary={d.name || d.parkAddress || "(unnamed deal)"}
                    secondary={d.statusCode ? statusLabels.get(d.statusCode) ?? d.statusCode : undefined}
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
