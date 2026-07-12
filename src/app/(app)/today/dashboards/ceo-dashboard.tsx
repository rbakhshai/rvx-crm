/**
 * CEO portal (admin) — the morning glance at the whole company.
 *
 * The six numbers Reza asked for up top (leads today / this week / last
 * week, LOIs out, in escrow, parks owned), then the funnel, the map, and
 * the live pulse. The full RVX OS (operations center) with EOS sheet +
 * per-person rocks lives one click away on /ops/level10 — this page is
 * the fast daily read.
 */
import Link from "next/link";
import { getMissionTiles } from "@/lib/mission-control";
import { fetchActiveDealsForMap, fetchPipelineFunnel } from "@/lib/dashboard-queries";
import { getLeadershipQueueForUser } from "@/lib/leadership-queue";
import { PipelineFunnel } from "@/components/pipeline-funnel";
import { DealsMap } from "@/components/deals-map";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty, QueueRow, PortalCta } from "../portal-kit";
import { NextActions } from "../next-actions";
import { PortalFooter } from "./portal-common";

const ACCENT = "amber" as const;

export async function CeoDashboard({ userId, userName, role }: { userId: string; userName: string; role: string }) {
  const [tiles, funnel, mapPins, deskItems] = await Promise.all([
    getMissionTiles().catch(() => null),
    fetchPipelineFunnel().catch(() => null),
    fetchActiveDealsForMap().catch(() => []),
    getLeadershipQueueForUser(userId, role).catch(() => []),
  ]);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const wow = tiles ? tiles.leadsWeek - tiles.leadsLastWeek : 0;

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel="CEO"
        title="Command Center"
        tagline="The whole company at a glance — leads, pipeline, parks, people."
        icon="🛰️"
        accent={ACCENT}
      >
        <PortalCta href="/ops/level10" accent={ACCENT}>Open RVX OS →</PortalCta>
      </PortalHero>

      <NextActions userId={userId} role={role} />

      {tiles && (
        <StatStrip>
          <PortalStat accent={ACCENT} value={tiles.leadsToday} label="Leads today" hint="qualified subs" />
          <PortalStat accent={ACCENT} value={tiles.leadsWeek} label="Leads · 7d"
            hint={wow === 0 ? "flat vs last wk" : `${wow > 0 ? "▲" : "▼"} ${Math.abs(wow)} vs last wk`} />
          <PortalStat accent={ACCENT} value={tiles.leadsLastWeek} label="Leads · prior 7d" />
          <PortalStat accent={ACCENT} value={tiles.loisOut} label="LOIs out" />
          <PortalStat accent={ACCENT} value={tiles.inEscrow} label="In escrow" />
          <PortalStat accent={ACCENT} emphasize href="/pool"
            value={<>{tiles.parksOwned}<span className="text-sm text-muted font-medium">/{tiles.targetParks}</span></>}
            label="Parks owned" hint="the 10-in-10" />
        </StatStrip>
      )}

      {/* Secondary context — heartbeat + recruiting */}
      {tiles && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <PortalStat accent={ACCENT} value={tiles.dialsToday} label="BD dials today" />
          <PortalStat accent={ACCENT} value={tiles.closerQualifiedWeek} label="Closer-qualified · 7d" />
          <PortalStat accent={ACCENT} value={tiles.bdAppsPending} label="BD applications" href="/bd-team" />
          <PortalStat accent={ACCENT} value={mapPins.length} label="Active parks" />
        </div>
      )}

      {deskItems.length > 0 && (
        <PortalSection title="On your desk" accent={ACCENT} hint="Approvals waiting on you">
          <PortalCard accent={ACCENT} lift>
            <ul className="divide-y divide-border -mx-1">
              {deskItems.map((item) => (
                <QueueRow
                  key={`${item.kind}-${item.id}`}
                  href={item.href}
                  primary={<><span className="mr-1.5 text-[11px] text-muted uppercase tracking-widest">{item.kind === "hire" ? "Hire" : "Reimb"}</span>{item.title}</>}
                  trailing={<span className="shrink-0 inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold">{item.statusLabel}</span>}
                />
              ))}
            </ul>
          </PortalCard>
        </PortalSection>
      )}

      {funnel && (
        <PortalSection title="Pipeline" accent={ACCENT} hint="Value + count across every stage">
          <PipelineFunnel
            stages={funnel.stages}
            totalActiveValueCents={funnel.activeValueCents}
            totalActiveCount={funnel.activeCount}
            closedValueCents={funnel.closedValueCents}
            closedCount={funnel.closedCount}
          />
        </PortalSection>
      )}

      {mapPins.length > 0 && (
        <PortalSection title="Active pipeline — coast to coast" accent={ACCENT}
          action={<span className="text-[11px] text-muted">{mapPins.length} active parks</span>}>
          <DealsMap pins={mapPins} apiKey={mapsApiKey} />
        </PortalSection>
      )}

      <PortalFooter userId={userId} />
    </>
  );
}
