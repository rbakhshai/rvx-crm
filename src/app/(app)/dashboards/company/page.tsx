import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { getMissionTiles } from "@/lib/mission-control";
import { fetchPipelineFunnel } from "@/lib/dashboard-queries";
import { PageShell } from "../../page-shell";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty } from "../../today/portal-kit";
import { PipelineFunnel } from "@/components/pipeline-funnel";
import { fmtDateWithWeekday } from "@/lib/date-format";

const LEADERSHIP_ROLES = ["admin", "acquisitions_manager", "bird_dog_manager", "cfo"];

export default async function CompanyDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_today"))) notFound();

  const userRole = (session.user as { role?: string }).role || "admin";
  const isLeadership = LEADERSHIP_ROLES.includes(userRole);

  const [tiles, funnel] = await Promise.all([
    getMissionTiles().catch(() => null),
    fetchPipelineFunnel().catch(() => null),
  ]);

  return (
    <PageShell title="Company Dashboard" width="wide">
      <PortalHero
        greeting="Company Health"
        date={fmtDateWithWeekday(new Date())}
        roleLabel="Company-Wide"
        title="RVX Metrics"
        tagline="Pipeline value, sourcing activity, parks owned, and team throughput."
        icon="📊"
        accent="amber"
      />

      <StatStrip>
        <PortalStat accent="amber" value={tiles?.leadsToday ?? 0} label="Leads Today" />
        <PortalStat accent="amber" value={tiles?.leadsWeek ?? 0} label="Leads · 7d" />
        <PortalStat accent="amber" value={tiles?.loisOut ?? 0} label="LOIs Out" />
        <PortalStat accent="amber" value={tiles?.inEscrow ?? 0} label="In Escrow" />
        <PortalStat accent="amber" value={tiles?.parksOwned ?? 0} label="Parks Owned" emphasize />
        <PortalStat accent="amber" value={tiles?.bdAppsPending ?? 0} label="BD Apps" />
      </StatStrip>

      {funnel && (
        <PortalSection title="Pipeline Funnel" accent="amber">
          <PortalCard lift accent="amber">
            <PipelineFunnel
              stages={funnel.stages}
              totalActiveValueCents={funnel.activeValueCents}
              totalActiveCount={funnel.activeCount}
              closedValueCents={funnel.closedValueCents}
              closedCount={funnel.closedCount}
            />
          </PortalCard>
        </PortalSection>
      )}

      {isLeadership && (
        <PortalSection title="Leadership Drill-Down" accent="amber" hint="leadership only">
          <PortalCard>
            <PortalEmpty>Click any stat to explore underlying deals and contacts.</PortalEmpty>
          </PortalCard>
        </PortalSection>
      )}

      {!isLeadership && (
        <PortalSection title="Leadership View" accent="amber">
          <PortalCard>
            <PortalEmpty>Detailed drill-down is available to leadership team only.</PortalEmpty>
          </PortalCard>
        </PortalSection>
      )}
    </PageShell>
  );
}
