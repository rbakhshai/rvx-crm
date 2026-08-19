import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { HardRedirect } from "@/components/hard-redirect";

const RESERVED_SUB_ROUTES = new Set(["new"]);
import { db } from "@/db";
import { companies, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { Drawer } from "@/components/drawer";
import { Badge } from "@/components/badge";
import { Avatar } from "@/components/avatar";
import { HardNavButton } from "@/components/hard-nav-button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";
import { requirePagePermission } from "@/lib/page-guard";

const relationshipLabel: Record<string, string> = {
  realtor: "Realtor",
  owner: "Owner",
  owner_realtor: "Owner + Realtor",
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-0.5 text-sm">
        {value == null || value === "" ? <span className="text-muted">—</span> : value}
      </dd>
    </div>
  );
}

export default async function CompanyDrawerPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePagePermission("view_contacts");
  const { id } = await params;
  if (RESERVED_SUB_ROUTES.has(id)) {
    return <HardRedirect to={`/companies/${id}`} />;
  }
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const [owner] = company.ownerId
    ? await db.select({ id: user.id, name: user.name }).from(user).where(eq(user.id, company.ownerId)).limit(1)
    : [null];

  const contactName = [company.sellerFirstName, company.sellerLastName].filter(Boolean).join(" ");
  const sub = [contactName, company.state].filter(Boolean).join(" · ");

  return (
    <Drawer title={company.name} subtitle={sub || undefined} fullHref={`/companies/${id}`} width="600px">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <HardNavButton href={`/companies/${id}/edit`} variant="secondary" size="sm">Edit</HardNavButton>
          <Badge>{relationshipLabel[company.relationshipToPark] ?? company.relationshipToPark}</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Field label="Contact" value={contactName || null} />
          <Field label="Email" value={company.email ?? null} />
          <Field label="Phone" value={company.phone ?? null} />
          <Field label="State" value={company.state ?? null} />
          <Field label="Address" value={company.address ?? null} />
          <Field label="City" value={company.city ?? null} />
        </dl>

        <div className="rounded-lg border border-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted font-medium mb-2">Owner</div>
          {owner ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={owner.name} id={owner.id} size="xs" />
              <span className="text-sm">{owner.name}</span>
            </span>
          ) : <span className="text-sm text-muted">unassigned</span>}
        </div>

        <TaskList parentTable="companies" parentId={company.id} currentUserId={session?.user.id} />
        <ActivityTimeline parentTable="companies" parentId={company.id} currentUserId={session?.user.id} />
      </div>
    </Drawer>
  );
}
