import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { getMissionTiles } from "@/lib/mission-control";
import { PageShell } from "../../page-shell";
import { PortalHero, StatStrip, PortalStat, PortalSection, PortalCard, PortalEmpty } from "../../today/portal-kit";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";

const ROLE_ACCENTS: Record<string, string> = {
  admin: "amber",
  closer: "green",
  underwriter: "yellow",
  due_diligence: "slate",
  dispo_manager: "lime",
  park_manager: "pink",
  transaction_coord: "pink",
  cfo: "emerald",
  bd_level_1: "purple",
  bd_level_2: "purple",
};

const ROLE_TITLES: Record<string, { title: string; tagline: string; icon: string }> = {
  admin: { title: "Command Center", tagline: "Company health, team performance, growth metrics.", icon: "🛰️" },
  closer: { title: "Deal Pipeline", tagline: "Your deals, buyer relationships, deal momentum.", icon: "📋" },
  underwriter: { title: "LOI Review", tagline: "Underwriting queue, deal analysis, PSA flow.", icon: "📄" },
  due_diligence: { title: "Due Diligence", tagline: "Document review, diligence progress, deal readiness.", icon: "🔍" },
  dispo_manager: { title: "Dispositions", tagline: "Deal outcomes, status flow, resolution tracking.", icon: "✅" },
  park_manager: { title: "Park Operations", tagline: "Owned parks, post-close operations, asset performance.", icon: "🏕️" },
  transaction_coord: { title: "Transactions", tagline: "Close coordination, document management, timelines.", icon: "📆" },
  cfo: { title: "Financial Overview", tagline: "Revenue tracking, deal economics, unit economics.", icon: "💰" },
  bd_level_1: { title: "Lead Sourcing", tagline: "Your submissions, acceptance rate, activity metrics.", icon: "🐕" },
  bd_level_2: { title: "Lead Sourcing", tagline: "Your submissions, acceptance rate, activity metrics.", icon: "🐕" },
};

export default async function MyDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_today"))) notFound();

  const userRole = (session.user as { role?: string }).role || "admin";
  const accentName = (ROLE_ACCENTS[userRole] || "amber") as any;
  const roleInfo = ROLE_TITLES[userRole] || ROLE_TITLES.admin;
  const userName = (session.user as { name?: string }).name || "Team";

  const tiles = await getMissionTiles().catch(() => null);

  return (
    <PageShell title={roleInfo.title} width="wide">
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel={userRole.replace(/_/g, " ").toUpperCase()}
        title={roleInfo.title}
        tagline={roleInfo.tagline}
        icon={roleInfo.icon}
        accent={accentName}
      />

      {tiles && (
        <StatStrip>
          <PortalStat accent={accentName} value={tiles.leadsToday ?? 0} label="Leads Today" />
          <PortalStat accent={accentName} value={tiles.loisOut ?? 0} label="LOIs Out" />
          <PortalStat accent={accentName} value={tiles.inEscrow ?? 0} label="In Escrow" />
        </StatStrip>
      )}

      <PortalSection title="Your Work Queue" accent={accentName}>
        <PortalCard>
          <PortalEmpty>
            Role-specific work queue will display here. Deals in your stage will appear as they progress through the workflow.
          </PortalEmpty>
        </PortalCard>
      </PortalSection>
    </PageShell>
  );
}
