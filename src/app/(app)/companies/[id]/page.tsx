import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageShell } from "../../page-shell";
import { LinkButton } from "@/components/button";
import { DeleteButton } from "@/components/delete-button";
import { ActivityTimeline } from "@/components/activity-timeline";
import { TaskList } from "@/components/task-list";
import { deleteCompanyAction } from "../actions";
import { Badge } from "@/components/badge";
import { Section } from "@/components/section";
import {
  COMPANY_RELATIONSHIP_OPTIONS,
  COMPANY_REVENUE_OPTIONS,
  COMPANY_EMPLOYEE_OPTIONS,
} from "@/lib/options";

const relationshipLabel = new Map(COMPANY_RELATIONSHIP_OPTIONS.map((o) => [o.value, o.label]));
const revenueLabel = new Map(COMPANY_REVENUE_OPTIONS.map((o) => [o.value, o.label]));
const employeeLabel = new Map(COMPANY_EMPLOYEE_OPTIONS.map((o) => [o.value, o.label]));

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-muted font-medium">{label}</dt>
      <dd className="mt-1 text-sm">
        {value === null || value === undefined || value === "" ? <span className="text-muted">—</span> : value}
      </dd>
    </div>
  );
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  if (!company) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const [owner] = company.ownerId
    ? await db.select({ name: user.name, email: user.email }).from(user).where(eq(user.id, company.ownerId)).limit(1)
    : [null];
  const deleteBound = deleteCompanyAction.bind(null, id);

  return (
    <PageShell
      title={company.name}
      subtitle={relationshipLabel.get(company.relationshipToPark) ?? company.relationshipToPark}
      action={
        <div className="flex gap-2 items-center">
          <Link href="/companies" className="text-sm text-muted hover:text-foreground self-center">
            ← Back
          </Link>
          <LinkButton href={`/companies/${company.id}/edit`} variant="secondary" size="sm">
            Edit
          </LinkButton>
          <DeleteButton
            action={deleteBound}
            confirmText={`Delete seller "${company.name}"? This cannot be undone.`}
          />
        </div>
      }
    >
      <Section title="Identity">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Name" value={company.name} />
          <Field label="Relationship" value={<Badge>{relationshipLabel.get(company.relationshipToPark)}</Badge>} />
          <Field label="Seller / broker first name" value={company.sellerFirstName} />
          <Field label="Seller / broker last name" value={company.sellerLastName} />
        </dl>
      </Section>

      <Section title="Contact">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Email" value={company.email} />
          <Field label="Cell phone" value={company.phone} />
          <Field label="Office phone" value={company.officePhone} />
          <Field label="Owner" value={owner ? `${owner.name} (${owner.email})` : null} />
        </dl>
      </Section>

      <Section title="Address">
        <dl className="grid sm:grid-cols-2 gap-4">
          <Field label="Street" value={company.address} />
          <Field label="City" value={company.city} />
          <Field label="State" value={company.state} />
          <Field label="ZIP" value={company.zipcode} />
        </dl>
      </Section>

      <TaskList parentTable="companies" parentId={company.id} currentUserId={session?.user.id} />
      <ActivityTimeline parentTable="companies" parentId={company.id} currentUserId={session?.user.id} />

      {(company.description || company.annualRevenue || company.employeeCount) && (
        <Section title="Metadata">
          <dl className="grid sm:grid-cols-2 gap-4">
            <Field label="Annual revenue" value={company.annualRevenue ? revenueLabel.get(company.annualRevenue) : null} />
            <Field label="Employee count" value={company.employeeCount ? employeeLabel.get(company.employeeCount) : null} />
          </dl>
          {company.description && <p className="mt-3 text-sm whitespace-pre-wrap">{company.description}</p>}
        </Section>
      )}
    </PageShell>
  );
}
