/**
 * Park Manager portal (park_manager).
 *
 * Lighter than the deal-flow desks — a park manager's day is on-site, so
 * this is a calm home base: the portfolio at a glance, what's coming into
 * the portfolio (escrow), and their own task list.
 */
import { getMissionTiles } from "@/lib/mission-control";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";
import { PortalHero, StatStrip, PortalStat, PortalCta } from "../portal-kit";
import { NextActions } from "../next-actions";
import { PortalFooter } from "./portal-common";

const ACCENT = "pink" as const;

export async function ParkManagerDashboard({ userId, userName }: { userId: string; userName: string }) {
  const tiles = await getMissionTiles().catch(() => null);

  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Park Manager"
        title="Park Operations"
        tagline="Your parks, performance, and what needs attention on-site."
        icon="🏕️"
        accent={ACCENT}
      >
        <PortalCta href="/admin/revenue" accent={ACCENT}>Park Performance →</PortalCta>
      </PortalHero>

      <NextActions userId={userId} role="park_manager" />

      {tiles && (
        <StatStrip>
          <PortalStat accent={ACCENT} emphasize href="/pool"
            value={<>{tiles.parksOwned}<span className="text-sm text-muted font-medium">/{tiles.targetParks}</span></>}
            label="Parks owned" hint="the 10-in-10" />
          <PortalStat accent={ACCENT} value={tiles.inEscrow} label="Coming in (escrow)" />
        </StatStrip>
      )}

      <PortalFooter userId={userId} />
    </>
  );
}
