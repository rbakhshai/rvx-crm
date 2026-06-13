import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "../../page-shell";
import { PortalHero, PortalSection, PortalCard, PortalEmpty } from "../../today/portal-kit";
import { fmtDateWithWeekday } from "@/lib/date-format";
import { LocalGreeting } from "@/components/local-greeting";

export default async function PersonalDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_today"))) notFound();

  const userRole = (session.user as { role?: string }).role || "admin";
  const userName = (session.user as { name?: string }).name || "Team";

  return (
    <PageShell title="Personal Dashboard" width="wide">
      <PortalHero
        greeting={<LocalGreeting name={userName} />}
        date={fmtDateWithWeekday(new Date())}
        roleLabel={userRole.replace(/_/g, " ").toUpperCase()}
        title="Your Work"
        tagline="Role-specific metrics and work queue."
        icon="📋"
        accent="amber"
      />

      <PortalSection title="Work Queue" accent="amber">
        <PortalCard>
          <PortalEmpty>Role-specific work items will appear here based on your position and active deals.</PortalEmpty>
        </PortalCard>
      </PortalSection>
    </PageShell>
  );
}
