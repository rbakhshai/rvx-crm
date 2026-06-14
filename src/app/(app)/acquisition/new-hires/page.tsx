import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import { PageShell } from "@/app/(app)/page-shell";
import { PortalHero, PortalSection, PortalCard, PortalEmpty } from "@/app/(app)/today/portal-kit";
import { fmtDateWithWeekday } from "@/lib/date-format";

/**
 * /acquisition/new-hires — onboarding new BDs / acquisition team members.
 * Distinct from /hires (the leadership New Hire Request approval workflow).
 */
export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();
  if (!(await hasPermission(session.user, "view_mission_control"))) notFound();

  return (
    <PageShell title="New Hires" width="wide">
      <PortalHero
        greeting="New Hires"
        date={fmtDateWithWeekday(new Date())}
        roleLabel="ACQUISITION"
        title="New Hires"
        tagline="Onboarding new BDs and acquisition team members — scaffolding, details coming soon."
        icon="🧑‍🎓"
        accent="indigo"
      />

      <PortalSection title="Content" accent="indigo">
        <PortalCard>
          <PortalEmpty>BD onboarding steps and checklists will be configured here.</PortalEmpty>
        </PortalCard>
      </PortalSection>
    </PageShell>
  );
}
