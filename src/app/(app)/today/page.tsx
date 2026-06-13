/**
 * /today — the role-aware landing page.
 *
 * Every position lands on a dashboard built for THEIR job. This file is
 * just the router: authenticate, resolve the effective role (so the CEO's
 * "View as" faithfully previews each seat), and render that role's
 * cockpit. Each dashboard owns its own hero + layout via the portal kit.
 *
 *   admin                → CEO command center
 *   acquisitions_manager → Growth (BD engine + lead flow)
 *   bird_dog_manager     → Operations (deals in motion)
 *   cfo                  → Finance (the money view)
 *   closer               → Closer cockpit
 *   underwriter          → Underwriting desk
 *   due_diligence        → Due Diligence desk
 *   transaction_coord    → Transaction desk
 *   dispo_manager        → Disposition desk
 *   park_manager         → Park operations
 *   bd_level_1/2/3       → the bird-dog hub (its own greeting shell)
 */
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getEffectiveRole } from "@/lib/view-as";
import { PageShell } from "../page-shell";
import { LocalGreeting } from "@/components/local-greeting";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { BdToday } from "./bd-today";
import { CeoDashboard } from "./dashboards/ceo-dashboard";
import { GrowthDashboard } from "./dashboards/growth-dashboard";
import { OperationsDashboard } from "./dashboards/operations-dashboard";
import { FinanceDashboard } from "./dashboards/finance-dashboard";
import { CloserDashboard } from "./dashboards/closer-dashboard";
import { OpsDeskDashboard } from "./dashboards/ops-desk-dashboard";
import { DueDiligenceDashboard } from "./dashboards/dd-dashboard";
import { ParkManagerDashboard } from "./dashboards/park-dashboard";
import { PortalHero } from "./portal-kit";
import { portalFor } from "@/lib/role-portal";
import { PortalFooter } from "./dashboards/portal-common";

export default async function TodayPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const me = session.user.id;
  const name = session.user.name;
  const role = (await getEffectiveRole((session.user as { role?: string }).role)) ?? "";

  // Bird dogs keep their dedicated motivational hub (goal ring, streak,
  // callbacks, leaderboard) — it carries its own greeting shell.
  if (role === "bd_level_1" || role === "bd_level_2" || role === "bd_level_3") {
    return (
      <PageShell title={<LocalGreeting name={name} />} subtitle={fmtDateWithWeekday(new Date())} width="default">
        <BdToday userId={me} userName={name} role={role} />
      </PageShell>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
      <RoleDashboard userId={me} userName={name} role={role} />
    </div>
  );
}

function RoleDashboard({ userId, userName, role }: { userId: string; userName: string; role: string }) {
  switch (role) {
    case "admin":
      return <CeoDashboard userId={userId} userName={userName} role={role} />;
    case "acquisitions_manager":
      return <GrowthDashboard userId={userId} userName={userName} />;
    case "bird_dog_manager":
      return <OperationsDashboard userId={userId} userName={userName} />;
    case "cfo":
      return <FinanceDashboard userId={userId} userName={userName} role={role} />;
    case "closer":
      return <CloserDashboard userId={userId} userName={userName} />;
    case "underwriter":
    case "dispo_manager":
    case "transaction_coord":
      return <OpsDeskDashboard userId={userId} userName={userName} role={role} />;
    case "due_diligence":
      return <DueDiligenceDashboard userId={userId} userName={userName} />;
    case "park_manager":
      return <ParkManagerDashboard userId={userId} userName={userName} />;
    default:
      return <GenericDashboard userId={userId} userName={userName} role={role} />;
  }
}

/** Fallback for any role without a bespoke cockpit — hero + the basics. */
function GenericDashboard({ userId, userName, role }: { userId: string; userName: string; role: string }) {
  const identity = portalFor(role);
  return (
    <>
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel={identity.roleLabel}
        title={identity.title}
        tagline={identity.tagline}
        icon={identity.icon}
        accent={identity.accent}
      />
      <PortalFooter userId={userId} />
    </>
  );
}
