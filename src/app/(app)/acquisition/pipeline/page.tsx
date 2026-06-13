import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "@/app/(app)/page-shell";
import { PortalHero, PortalSection, PortalCard, PortalEmpty } from "@/app/(app)/today/portal-kit";
import { fmtDateWithWeekday } from "@/lib/date-format";

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_mission_control"))) notFound();

  return (
    <PageShell title="Pipeline" width="wide">
      <PortalHero
        greeting="Pipeline"
        date={fmtDateWithWeekday(new Date())}
        roleLabel="WORKFLOW"
        title="Pipeline"
        tagline="Scaffolding - details coming soon."
        icon="📈"
        accent="blue"
      />

      <PortalSection title="Content" accent="blue">
        <PortalCard>
          <PortalEmpty>Workflow details and checklists will be configured here.</PortalEmpty>
        </PortalCard>
      </PortalSection>
    </PageShell>
  );
}
